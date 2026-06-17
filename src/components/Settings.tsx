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

  const sqlCode = `-- Supabase Central Database Schema Setup Script
-- Copy this entire text and paste it into public schema of Supabase SQL Editor to make it live!

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
  "createdBy" UUID REFERENCES public.users(id) ON DELETE SET NULL,
  "assignedTo" UUID REFERENCES public.users(id) ON DELETE SET NULL
);

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

-- 5. Enable Realtime Replication Publication
-- Ensures all devices receive live events in real-time instantly!
BEGIN;
  -- Remove tables if they were in any previous publication (avoids errors)
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime FOR TABLE public.users, public.leads, public.tasks, public.notifications;
COMMIT;`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    toast.success('Database initialization SQL schema copied to clipboard!');
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const [dbPassword, setDbPassword] = useState('');
  const [manualUri, setManualUri] = useState('');
  const [isUriMode, setIsUriMode] = useState(false);
  const [isAutoSetupRunning, setIsAutoSetupRunning] = useState(false);
  const [autoSetupError, setAutoSetupError] = useState('');
  const [autoSetupSuccess, setAutoSetupSuccess] = useState('');

  const handleAutoSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAutoSetupRunning(true);
    setAutoSetupError('');
    setAutoSetupSuccess('');

    try {
      const response = await fetch('/api/setup-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          connectionString: isUriMode ? manualUri : '',
          password: !isUriMode ? dbPassword : '',
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL || ''
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initialize database.');
      }

      setAutoSetupSuccess(result.message || 'Database successfully configured!');
      toast.success('Central database synchronized successfully in real-time!');
      setDbPassword('');
      setManualUri('');
      
      // Force reload or state pull to sync the live DB instantly
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setAutoSetupError(err.message || 'An unexpected error occurred during set up.');
      toast.error('Automated Database Sync Setup Failed.');
    } finally {
      setIsAutoSetupRunning(false);
    }
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
            )}

            {/* Supabase Database Schema Sync Card (Admin Only) */}
            {isAdmin && (
              <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">1-Click Centralized Database Sync</h3>
                      <p className="text-xs text-slate-400">Initialize central database tables with zero manual SQL commands</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase rounded-full">Automated Mode</span>
                </div>

                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3 text-amber-800">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1.5 font-medium leading-relaxed">
                    <p className="font-bold text-amber-900">Why are my devices not synchronizing?</p>
                    <p>
                      When the central Supabase database is empty, each system is forced to save and load data locally. To unify your data so additions, deletions, and password modifications automatically sync across all computers instantly, you must initialize these tables.
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-gradient-to-r from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100/60 space-y-4">
                  <div className="flex gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">⚡</span>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-emerald-900">Instant Automated Provisioning</h4>
                      <p className="text-xs text-emerald-700/90 leading-relaxed">
                        Specify your password to automatically build the required <code className="bg-emerald-100/80 px-1 rounded font-mono font-bold">users</code>, <code className="bg-emerald-100/80 px-1 rounded font-mono font-bold">leads</code>, <code className="bg-emerald-100/80 px-1 rounded font-mono font-bold">tasks</code>, and <code className="bg-emerald-100/80 px-1 rounded font-mono font-bold">notifications</code> tables. No manual terminal steps!
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAutoSetup} className="p-5 bg-white rounded-xl border border-slate-100 space-y-4 shadow-sm">
                    {/* Setup Mode Toggle */}
                    <div className="flex gap-4 border-b border-slate-100 pb-3 mb-1">
                      <button
                        type="button"
                        onClick={() => setIsUriMode(false)}
                        className={cn(
                          "pb-2 font-bold text-xs border-b-2 transition-all cursor-pointer",
                          !isUriMode ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Project DB Password (Recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsUriMode(true)}
                        className={cn(
                          "pb-2 font-bold text-xs border-b-2 transition-all cursor-pointer",
                          isUriMode ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
                        )}
                      >
                        Direct Connection URI
                      </button>
                    </div>

                    {!isUriMode ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-bold text-slate-700">Supabase Database Password</label>
                          <a 
                            href="https://supabase.com" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-primary hover:underline font-bold cursor-pointer"
                          >
                            Find Password on Supabase ↗
                          </a>
                        </div>
                        <input
                          type="password"
                          placeholder="Enter your central database password"
                          value={dbPassword}
                          onChange={(e) => setDbPassword(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs transition-all font-medium text-slate-800"
                          required={!isUriMode}
                        />
                        <p className="text-[10px] text-slate-450 leading-normal">
                          This is the password you set while creating the database. Target endpoint: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[9px] text-slate-650">{import.meta.env.VITE_SUPABASE_URL || 'Not Configured'}</code>
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-700">Postgre Connection URI</label>
                        <input
                          type="text"
                          placeholder="postgres://postgres:[password]@db.[project-id].supabase.co:5432/postgres"
                          value={manualUri}
                          onChange={(e) => setManualUri(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-xs transition-all font-mono text-slate-850"
                          required={isUriMode}
                        />
                        <p className="text-[10px] text-slate-450 leading-normal">
                          Found under Project Settings &gt; Database &gt; Connection string &gt; URI. Replace the placeholder password with your actual password.
                        </p>
                      </div>
                    )}

                    {autoSetupError && (
                      <div className="p-3 bg-red-50 text-red-700 rounded-lg text-[11px] font-bold flex items-center gap-2 border border-red-100">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{autoSetupError}</span>
                      </div>
                    )}

                    {autoSetupSuccess && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-2 border border-emerald-100">
                        <Check size={14} className="shrink-0" />
                        <span className="leading-relaxed">{autoSetupSuccess}</span>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isAutoSetupRunning}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold text-xs text-white shadow-lg cursor-pointer shadow-emerald-500/15 flex items-center justify-center gap-2 transition-all active:scale-95",
                        isAutoSetupRunning ? "bg-emerald-400 cursor-not-allowed animate-pulse" : "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {isAutoSetupRunning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Provisioning Tables & Realtime Replication...</span>
                        </>
                      ) : (
                        <span>Setup Schema & Enable Realtime Sync</span>
                      )}
                    </button>
                  </form>
                </div>

                <details className="group border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <summary className="p-4 flex justify-between items-center font-bold text-xs text-slate-600 cursor-pointer select-none hover:bg-slate-50 transition-colors">
                    <span className="flex items-center gap-2">
                      <span>⚙️</span> Need Manual Control? View SQL Schema Script
                    </span>
                    <span className="text-xs transition-transform group-open:rotate-180">▼</span>
                  </summary>
                  <div className="p-5 border-t border-slate-100 bg-white space-y-4">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      If you prefer manual configuration, you raw install SQL script is compiled below. Copy and execute it directly inside your Supabase Project SQL terminal:
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Database Schema Setup Script:</span>
                        <button 
                          onClick={handleCopySql}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {copiedSql ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                          {copiedSql ? 'Copied Script!' : 'Copy SQL Script'}
                        </button>
                      </div>
                      <pre className="bg-slate-950 text-slate-300 font-mono text-[10px] p-5 rounded-2xl overflow-x-auto max-h-64 leading-relaxed border border-slate-800 select-all shadow-inner">
                        {sqlCode}
                      </pre>
                    </div>
                  </div>
                </details>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-bold">
                  <span>Target Protocol: Supabase REST API & Replication Pub</span>
                  <span className="text-emerald-500 flex items-center gap-1 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                    High-Reliability Ready
                  </span>
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
