import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, LogIn, User as UserIcon, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (username?: string, password?: string, role?: 'admin' | 'executive') => Promise<any>;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<'admin' | 'executive'>('admin');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await onLogin(username, password, role);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await onLogin();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white flex font-sans overflow-hidden">
      {/* Left Side: Image & Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-900">
        <img 
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1920"
          alt="Sales and Business"
          className="absolute inset-0 w-full h-full object-cover opacity-60 scale-105 hover:scale-100 transition-transform duration-[10s] ease-out"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
        
        <div className="relative z-10 p-16 flex flex-col justify-between h-full w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 blue-orange-gradient rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-primary/30">
              <TrendingUp size={24} />
            </div>
            <span className="text-xl font-black text-white tracking-tighter uppercase">RAVINS TECH</span>
          </div>

          <div className="max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-5xl font-black text-white leading-tight mb-6 tracking-tighter">
                Accelerate Your <br />
                <span className="text-primary italic">DLP Management</span>
              </h2>
              <p className="text-slate-300 text-lg font-medium leading-relaxed">
                Empower your team with real-time insights, lead management, and performance tracking in one powerful DLP Portal.
              </p>
            </motion.div>
          </div>

          <a 
            href="https://techandgoo.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors cursor-pointer"
          >
            @Ravins Tech and Goo Pvt Limited. All Rights Reserved
          </a>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative bg-slate-50">
        {/* Background Elements for Mobile */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden lg:hidden">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-secondary/5 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-md relative z-10"
        >
          <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/50 p-10 border border-slate-100">
            <div className="flex flex-col items-center mb-10 lg:hidden">
              <div className="w-16 h-16 blue-orange-gradient rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-primary/30 mb-4">
                <TrendingUp size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">RAVINS TECH</h1>
              <p className="text-slate-500 font-bold text-[10px] uppercase tracking-widest mt-1">DLP Portal</p>
            </div>

            <div className="mb-10">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Welcome Back</h2>
              <p className="text-slate-500 font-medium mt-2">Please enter your details to sign in</p>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-6">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl mb-8">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    role === 'admin' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole('executive')}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    role === 'executive' 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Executive
                </button>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-rose-100"
                >
                  <AlertCircle size={18} />
                  {error}
                </motion.div>
              )}

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      placeholder="Enter your username or email"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                      required
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4.5 bg-primary text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-primary/20 mt-8"
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In to Portal
                    <LogIn size={20} />
                  </>
                )}
              </button>
            </form>
          </div>

          <a 
            href="https://techandgoo.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-center mt-8 text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] lg:hidden hover:text-primary transition-colors cursor-pointer"
          >
            @Ravins Tech and Goo Pvt Limited. All Rights Reserved
          </a>
        </motion.div>
      </div>
    </div>
  );
}
