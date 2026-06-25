import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import pg from "pg";
import fs from "fs";

// Load environment variables
dotenv.config();

// Automatic high-reliability database schema synchronizer
async function syncDatabaseSchema() {
  console.log("🔍 Checking database auto-sync configuration...");
  let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

  // Smart fallback: try to derive connection string from Supabase URL & database password if available
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DATABASE_PASSWORD;
  
  if (!connectionString && supabaseUrl && dbPassword) {
    const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase/);
    const projectId = match ? match[1] : null;
    if (projectId) {
      connectionString = `postgres://postgres:${encodeURIComponent(dbPassword)}@db.${projectId}.supabase.co:5432/postgres`;
      console.log(`🔌 Derived connection string from Project ID ${projectId} and database password.`);
    }
  }

  if (!connectionString) {
    console.log("⚠️ Central Database Autoforce Sync: No DATABASE_URL or SUPABASE_DB_PASSWORD configured. Skipping background database alignment.");
    return;
  }

  const client = new pg.Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    connectionTimeoutMillis: 15000
  });

  try {
    console.log("⏳ Connecting to central Supabase PostgreSQL to verify schema alignment...");
    await client.connect();
    console.log("🟢 Connected to Supabase PostgreSQL database successfully.");

    const steps = [
      // 1. Create Users Table
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

      // 2. Ensure incentiveThreshold exist
      `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "incentiveThreshold" DOUBLE PRECISION DEFAULT 60000;`,

      // 3. Create Leads Table
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
        "isPresentThisMonth" BOOLEAN DEFAULT false,
        "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
        "assignedTo" UUID REFERENCES public.users(id) ON DELETE SET NULL
      );`,

      // 4. Ensure isPresentThisMonth column exists
      `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "isPresentThisMonth" BOOLEAN DEFAULT false;`,

      // 5. Create Tasks Table
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

      // 6. Create Notifications Table
      `CREATE TABLE IF NOT EXISTS public.notifications (
        id TEXT PRIMARY KEY,
        "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
        read BOOLEAN DEFAULT false
      );`,

      // 7. Disable Row Level Security (RLS) across all user & crm database tables
      `ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;`,

      // 8. Configure Realtime Replication Identity
      `ALTER TABLE public.users REPLICA IDENTITY FULL;`,
      `ALTER TABLE public.leads REPLICA IDENTITY FULL;`,
      `ALTER TABLE public.tasks REPLICA IDENTITY FULL;`,
      `ALTER TABLE public.notifications REPLICA IDENTITY FULL;`,

      // 9. Recreate Realtime Replication Publication channel
      `DROP PUBLICATION IF EXISTS supabase_realtime;`,
      `CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.leads, public.tasks, public.notifications;`
    ];

    console.log("⚡ Executing database alignment SQL queries sequentially...");
    for (const step of steps) {
      await client.query(step);
    }

    console.log("✨ Central Database Synchronizer alignment successfully completed!");
  } catch (err: any) {
    console.error("🔴 Automatic database alignment failed:", err.message || err);
  } finally {
    try {
      await client.end();
    } catch (e) {
      console.error("Fail to end database client:", e);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON payloads
  app.use(express.json());

  // API Health Endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite integration for asset rendering depending on execution mode
  const distPath = path.join(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV !== "production" || !hasDist) {
    console.log("Mounting Vite Server middleware in background (Development Mode or fallback)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production built UI distribution (Production Mode)...");
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express application server running on internal container port ${PORT}`);
    // Start central database auto alignment silently in the background
    syncDatabaseSchema();
  });
}

startServer();
