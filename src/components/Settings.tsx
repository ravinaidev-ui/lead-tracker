import React, { useState } from 'react';
import { User } from '../types';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Shield, 
  Key, 
  Mail, 
  User as UserIcon, 
  Settings as SettingsIcon,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Download,
  Upload,
  Database,
  Copy,
  Check,
  Eye,
  EyeOff,
  Phone,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface SettingsProps {
  currentUser: User;
  onExportData?: (copyToClipboard?: boolean) => Promise<boolean>;
  onImportData?: (data: string) => void;
  onUpdateProfile?: (data: Partial<User>) => Promise<void>;
}

export default function Settings({ 
  currentUser, 
  onExportData, 
  onImportData,
  onUpdateProfile
}: SettingsProps) {
  const [successMessage, setSuccessMessage] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlCode = `-- CENTRALIZED REAL-TIME DATABASE SETUP & SYNCHRONIZATION SCHEMA
-- Paste this schema directly into your Supabase Dashboard -> SQL Editor and click RUN.
-- This ensures instant real-time broadcasts, drops security roadblocks, and setups replication.

-- 1. Create the Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT,
  name TEXT,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'executive',
  "incentiveThreshold" DOUBLE PRECISION DEFAULT 60000,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure "incentiveThreshold" column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "incentiveThreshold" DOUBLE PRECISION DEFAULT 60000;

-- 2. Create the Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
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
);

-- Ensure "isPresentThisMonth" column exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS "isPresentThisMonth" BOOLEAN DEFAULT false;

-- 3. Create the Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
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
);

-- 4. Create the Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  "userId" UUID REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  read BOOLEAN DEFAULT false
);

-- 5. Disable Row Level Security (RLS) across all tables
-- This ensures multi-system concurrent users instantly sync without database roadblocks.
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 6. Configure Replica Identity to FULL for WebSocket decoding
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 7. Register or recreate Realtime Publication Channel
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.users, 
  public.leads, 
  public.tasks, 
  public.notifications;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    toast.success('Centralized Real-Time DB Schema SQL copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleCopyJson = async () => {
    if (onExportData) {
      const success = await onExportData(true);
      if (success) {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      }
    }
  };

  const isAdmin = currentUser.role === 'admin';

  const handleUpdateProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const updatedData: Partial<User> = { name, email };
    if (password) {
      updatedData.password = password;
    }

    if (onUpdateProfile) {
      await onUpdateProfile(updatedData);
      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Success Message */}
      <AnimatePresence>
        {successMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-100 text-green-600 p-4 rounded-xl flex items-center gap-3 shadow-sm"
          >
            <CheckCircle2 size={20} />
            <span className="font-medium">{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Profile Settings */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-blue-50 text-primary rounded-xl flex items-center justify-center">
                <UserIcon size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">My Profile</h3>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Full Name</label>
                  <input 
                    name="name"
                    defaultValue={currentUser.name}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Email Address</label>
                  <input 
                    name="email"
                    type="email"
                    defaultValue={currentUser.email}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Username</label>
                  <input 
                    disabled
                    defaultValue={currentUser.username}
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">New Password</label>
                  <div className="relative">
                    <input 
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Leave blank to keep current"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  type="submit"
                  className="bg-primary hover:bg-dark text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Save Profile
                </button>
              </div>
            </form>
          </div>

          {/* Data Management Section */}
          {isAdmin && (
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Data Management</h3>
                      <p className="text-xs text-slate-400">Export or import your DLP data for backups or external use</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Download size={18} className="text-primary" />
                        Export Data
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Download all leads, tasks, and user data as a JSON file. This can be used as a backup or imported into other systems.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => onExportData?.()}
                          className="flex-1 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-dark transition-all flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Download JSON
                        </button>
                        <button 
                          onClick={handleCopyJson}
                          className="px-4 py-2.5 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                          title="Copy to clipboard"
                        >
                          {copySuccess ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Upload size={18} className="text-secondary" />
                        Import Data
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Restore your data from a previous backup file. Warning: This will overwrite existing records with matching IDs.
                      </p>
                      <label className="block w-full py-2.5 bg-white text-slate-800 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 cursor-pointer text-center">
                        <Upload size={16} />
                        Upload Backup
                        <input 
                          type="file" 
                          accept=".json" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const content = event.target?.result as string;
                                onImportData?.(content);
                              };
                              reader.readAsText(file);
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex gap-3">
                      <AlertCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-blue-900">System Integration Tip</p>
                        <p className="text-[10px] text-blue-700 leading-relaxed">
                          The exported JSON can be used in systems like Excel (Data &gt; Get Data &gt; From File &gt; From JSON) or custom Python/Node scripts for advanced reporting and automation.
                        </p>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Centralized Real-Time Synchronizer SQL Card */}
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Database size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Supabase Centralized Real-Time Sync Setup</h3>
                    <p className="text-xs text-slate-400">Forces complete synchronization and instant WebSocket replication on all systems</p>
                  </div>
                </div>

                <div className="p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                  <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    Centralized & Active Multi-Client Sync Engine
                  </h4>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    By default, Supabase does not stream changes over WebSockets unless explicitly configured. 
                    Running this SQL in your Supabase Dashboard is <strong>mandatory</strong> to allow 100+ concurrent systems 
                    to view, edit, and coordinate leads, tasks, and users in absolute real-time.
                  </p>
                  <p className="text-[11px] text-slate-500 font-medium font-sans">
                    🔍 <strong>How it works:</strong> It disables Row Level Security (RLS) so users share the same data, 
                    configures <em>Replica Identity</em> to <strong>FULL</strong> to broadcast the full data context, 
                    and publishes real-time hooks so all other systems update themselves automatically.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">DATABASE CENTRALIZATION SQL QUERY</label>
                    <button
                      onClick={handleCopySql}
                      className={cn(
                        "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 hover:scale-[1.02]",
                        copiedSql 
                          ? "bg-green-500 text-white" 
                          : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                    >
                      {copiedSql ? (
                        <>
                          <Check size={14} />
                          SQL Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          Copy Updated SQL Query
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-950 font-mono text-xs text-slate-300 leading-normal">
                    <div className="max-h-[220px] overflow-y-auto p-4 select-all scrollbar-thin scrollbar-thumb-slate-800 whitespace-pre">
                      {sqlCode}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="flex gap-3">
                    <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-amber-900">Important Instruction</p>
                      <p className="text-[10px] text-amber-700 leading-relaxed">
                        Go to your <strong>Supabase Project Dashboard</strong> &gt; <strong>SQL Editor</strong> &gt; 
                        paste the copied query above &gt; <strong>Click Run</strong>. All active systems (open in any other tab, browser, or device) 
                        will immediately register changes and synchronize instantly from that moment on!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <SettingsIcon size={16} className="text-primary" />
              System Preferences
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Follow-up Alerts</span>
                <Toggle checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Notification Reminder</span>
                <Toggle checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Lead Assignment Alerts</span>
                <Toggle checked={true} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Performance Milestones</span>
                <Toggle checked={true} />
              </div>
            </div>
          </div>

          <div className="blue-orange-gradient p-6 rounded-2xl text-white shadow-lg shadow-primary/20">
            <h4 className="font-bold mb-2">Need Help?</h4>
            <p className="text-xs text-white/80 leading-relaxed mb-4">
              Contact Ravins Tech Support for any technical issues or feature requests.
            </p>
            <button 
              onClick={() => setShowSupportModal(true)}
              className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all"
            >
              Contact Support
            </button>
          </div>

          {/* Support Modal */}
          <AnimatePresence>
            {showSupportModal && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowSupportModal(false)}
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
                />
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden"
                >
                  <div className="blue-orange-gradient p-8 text-white relative">
                    <button 
                      onClick={() => setShowSupportModal(false)}
                      className="absolute right-6 top-6 p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <X size={20} />
                    </button>
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                      <MessageSquare size={32} />
                    </div>
                    <h3 className="text-2xl font-black tracking-tight">Contact Support</h3>
                    <p className="text-white/80 text-sm font-medium">Get in touch with our development team</p>
                  </div>
                  
                  <div className="p-8 space-y-6">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary shrink-0">
                        <UserIcon size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Developer</p>
                        <p className="text-sm font-bold text-slate-900">Dr.Ravin.N</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary shrink-0">
                        <Phone size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</p>
                        <p className="text-sm font-bold text-slate-900">+91 90 924 924 64</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary shrink-0">
                        <Mail size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Address</p>
                        <p className="text-sm font-bold text-slate-900">director@techandgoo.com</p>
                      </div>
                    </div>

                    <button 
                      onClick={() => setShowSupportModal(false)}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-200"
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  const [isOn, setIsOn] = useState(checked);
  return (
    <button 
      onClick={() => setIsOn(!isOn)}
      className={cn(
        "w-10 h-6 rounded-full transition-all duration-200 relative",
        isOn ? "bg-primary" : "bg-slate-200"
      )}
    >
      <div className={cn(
        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200",
        isOn ? "left-5" : "left-1"
      )} />
    </button>
  );
}
