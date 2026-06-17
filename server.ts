import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import pg from "pg";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON payloads
  app.use(express.json());

  // API Route: Database setup and auto-table creation
  app.post("/api/setup-database", async (req, res) => {
    const { connectionString, password, supabaseUrl } = req.body;
    let targetUri = connectionString;

    // Check if the user has supplied a password to derive the connection string
    if (!targetUri && password && supabaseUrl) {
      const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase/);
      const projectId = match ? match[1] : null;
      if (!projectId) {
        return res.status(400).json({ 
          error: "Invalid Supabase URL format. Could not extract project ID." 
        });
      }
      targetUri = `postgres://postgres:${encodeURIComponent(password)}@db.${projectId}.supabase.co:5432/postgres`;
    }

    if (!targetUri) {
      return res.status(400).json({ 
        error: "Please provide either a direct PostgreSQL connection URI or your Supabase Project Database Password." 
      });
    }

    // Initialize PostgreSQL Client
    const client = new pg.Client({
      connectionString: targetUri,
      ssl: {
        rejectUnauthorized: false
      },
      connectionTimeoutMillis: 10000 // 10s connection timeout
    });

    try {
      console.log("Connecting to Supabase PostgreSQL database to run schema setup...");
      await client.connect();

      // SQL statements to run sequentially to avoid partial execution lockouts
      const schemaSqlStatements = [
        // 1. Create the Users Table
        `CREATE TABLE IF NOT EXISTS public.users (
          id UUID PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          name TEXT,
          password TEXT NOT NULL,
          role TEXT DEFAULT 'executive',
          "incentiveThreshold" DOUBLE PRECISION DEFAULT 60000,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );`,

        // 2. Create the Leads Table
        `CREATE TABLE IF NOT EXISTS public.leads (
          id TEXT PRIMARY KEY,
          "leadId" TEXT UNIQUE,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          company TEXT,
          status TEXT DEFAULT 'New',
          value DOUBLE PRECISION DEFAULT 0,
          source TEXT,
          notes TEXT,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          "followUpDate" TEXT,
          website TEXT,
          "alternateMobileNumber" TEXT,
          "lostReason" TEXT,
          "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
          "assignedTo" UUID REFERENCES public.users(id) ON DELETE SET NULL
        );`,

        // 3. Create the Tasks Table
        `CREATE TABLE IF NOT EXISTS public.tasks (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT,
          "leadId" TEXT REFERENCES public.leads(id) ON DELETE CASCADE,
          "dueDate" TEXT NOT NULL,
          priority TEXT DEFAULT 'Medium',
          status TEXT DEFAULT 'Pending',
          "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
          "assignedTo" UUID REFERENCES public.users(id) ON DELETE SET NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
        );`,

        // 4. Create the Notifications Table
        `CREATE TABLE IF NOT EXISTS public.notifications (
          id TEXT PRIMARY KEY,
          "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          type TEXT DEFAULT 'info',
          "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
          read BOOLEAN DEFAULT false
        );`,

        // 5. Configure Supabase Realtime Replication Publication
        `DROP PUBLICATION IF EXISTS supabase_realtime;`,
        `CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.leads, public.tasks, public.notifications;`
      ];

      console.log("Executing SQL creation blocks...");
      for (const statement of schemaSqlStatements) {
        await client.query(statement);
      }

      console.log("Supabase database successfully initialized with matching schema!");
      res.json({ 
        success: true, 
        message: "Database successfully initialized! All required schemas and real-time publications are now active and synchronized." 
      });
    } catch (dbErr: any) {
      console.error("Database schema setup failed:", dbErr);
      res.status(500).json({ 
        error: `Failed to execute schema setup scripts. DB Error details: ${dbErr.message || dbErr}`
      });
    } finally {
      try {
        await client.end();
      } catch (endErr) {
        console.error("Error closing database connection client:", endErr);
      }
    }
  });

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite integration for asset rendering depending on execution mode
  if (process.env.NODE_ENV !== "production") {
    console.log("Mounting Vite Server middleware in background (Development Mode)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production built UI distribution (Production Mode)...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application server running on internal container port ${PORT}`);
  });
}

startServer();
