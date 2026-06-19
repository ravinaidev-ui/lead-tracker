import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Toaster, toast } from 'sonner';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings as SettingsIcon, 
  LogOut, 
  Bell, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Menu,
  X,
  CheckSquare,
  Trash2,
  RefreshCcw,
  Zap,
  Database,
  Key,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Lead, User, Notification, LeadStatus, Task } from './types';
import { cn, generateId } from './lib/utils';
import Dashboard from './components/Dashboard';
import LeadManagement from './components/LeadManagement';
import TaskManagement from './components/TaskManagement';
import Reports from './components/Reports';
import Incentives from './components/Incentives';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import ErrorBoundary from './components/ErrorBoundary';
import { 
  getSupabase, 
  loginWithEmail,
  logout,
  isSupabaseConfigured
} from './supabase';
import { Session } from '@supabase/supabase-js';

const ADMIN_EMAILS = ['ravinnarasimman@gmail.com', 'ravrav94@gmail.com'];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // High-reliability references to prevent stale render closures in background polling and websocket subscriptions
  const currentUserRef = useRef<User | null>(null);
  currentUserRef.current = currentUser;
  
  const fetchDataRef = useRef<() => Promise<void>>(undefined);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leads' | 'tasks' | 'reports' | 'settings' | 'users' | 'incentives' | 'trash'>('dashboard');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const addedNotificationsRef = useRef<Set<string>>(new Set());

  const trashCount = useMemo(() => {
    return leads.filter(l => {
      const isTrash = l.status === 'Trash';
      const hasAccess = currentUser?.role === 'admin' || 
                       l.createdBy === currentUser?.id || 
                       l.assignedTo === currentUser?.id;
      return isTrash && hasAccess;
    }).length;
  }, [leads, currentUser]);

  const handleLogin = async (username?: string, password?: string, role?: 'admin' | 'executive') => {
    try {
      if (!username || !password) {
        throw new Error('Please enter both username/email and password');
      }

      let userData: User | null = null;
      let databaseErrorToThrow: any = null;
      let userFoundInDb = false;
      
      try {
        // Query Supabase for the user by username or email
        const { data: userDoc, error } = await getSupabase()
          .from('users')
          .select('*')
          .or(`username.eq.${username},email.eq.${username}`)
          .maybeSingle();

        if (error) {
          console.error('Supabase query error:', error);
          if (error.message && (error.message.includes('NetworkError') || error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
            databaseErrorToThrow = error;
          } else {
            throw new Error(`Database error: ${error.message}`);
          }
        } else if (userDoc) {
          userFoundInDb = true;
          // STRICT validation against the database: check if typed password matches stored password
          if (userDoc.password === password) {
            userData = {
              ...userDoc,
              role: (userDoc as any).role
            } as User;
          } else {
            throw new Error('Invalid password. Please check your password and try again.');
          }
        }
      } catch (dbErr: any) {
        console.warn('Database login failed (network or other issue):', dbErr);
        // If password strictly failed above, rethrow it so we don't bypass with fallback
        if (dbErr.message && dbErr.message.includes('Invalid password')) {
          throw dbErr;
        }
        databaseErrorToThrow = dbErr;
      }

      // Check local cache if database didn't return user, OR if there was a database/network error
      if (!userData && !userFoundInDb) {
        let foundUser: User | null = null;
        const cachedUsersStr = localStorage.getItem('cached_users');
        if (cachedUsersStr) {
          try {
            const cachedUsers = JSON.parse(cachedUsersStr) as User[];
            // Look up the user in cache
            const matched = cachedUsers.find(u => 
              u.username === username || u.email === username
            );
            if (matched) {
              foundUser = matched;
            }
          } catch (e) {
            console.error('Failed to parse cached users:', e);
          }
        }

        if (foundUser) {
          // Validate password against cache copy strictly
          if (foundUser.password === password) {
            console.log('User found in local cache with matching credentials:', foundUser.username);
            userData = foundUser;
          } else {
            throw new Error('Invalid password. Please check your password and try again.');
          }
        }
      }

      // Fallback: If no user was found anywhere, check for default hardcoded admin
      if (!userData && !userFoundInDb && username === 'admin' && password === 'admin') {
        userData = {
          id: '00000000-0000-0000-0000-000000000000',
          username: 'admin',
          password: 'admin',
          role: 'admin',
          name: 'System Admin',
          email: 'admin@ravins.tech',
          incentiveThreshold: 60000,
          createdAt: new Date().toISOString()
        };
      }

      // If they are not found and the password is correct/wrong, don't allow synthesis of untrusted sessions
      if (!userData) {
        throw new Error('Invalid username or password. Please verify your credentials.');
      }

      // Check if role matches
      if (userData.role !== role) {
        throw new Error(`Invalid credentials for ${role} login. User role is ${userData.role}.`);
      }

      setCurrentUser(userData);
      localStorage.setItem('crm_user', JSON.stringify(userData));
      toast.success(`Welcome back, ${userData.name}!`);
    } catch (error) {
      console.error('Login failed:', error);
      toast.error(error instanceof Error ? error.message : 'Login failed');
      throw error;
    }
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    if (!currentUser) return;
    try {
      const payload = {
        name: currentUser.name,
        email: currentUser.email,
        password: currentUser.password,
        ...updatedData
      };

      const { error } = await getSupabase()
        .from('users')
        .update(payload)
        .eq('id', currentUser.id);

      if (error) {
        throw new Error(`Database Sync Failed: ${error.message}`);
      }

      const newUser = { ...currentUser, ...updatedData };
      setCurrentUser(newUser);
      localStorage.setItem('crm_user', JSON.stringify(newUser));
      
      // Always update in cached users list
      const cachedUsersStr = localStorage.getItem('cached_users');
      let updatedUsersList: User[] = [];
      if (cachedUsersStr) {
        try {
          const cachedUsers = JSON.parse(cachedUsersStr) as User[];
          const exists = cachedUsers.some((u: User) => u.id === currentUser.id);
          if (exists) {
            updatedUsersList = cachedUsers.map((u: User) => u.id === currentUser.id ? { ...u, ...updatedData } : u);
          } else {
            updatedUsersList = [...cachedUsers, { ...currentUser, ...updatedData }];
          }
        } catch (e) {
          console.error('Error updating cached users:', e);
          updatedUsersList = [{ ...currentUser, ...updatedData }];
        }
      } else {
        updatedUsersList = [{ ...currentUser, ...updatedData }];
      }
      localStorage.setItem('cached_users', JSON.stringify(updatedUsersList));
      setUsers(updatedUsersList);
      
      toast.success('Profile updated successfully in the centralized database!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(error.message || 'Failed to update profile in database.');
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('crm_user');
      await logout();
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (!isSupabaseConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100 text-center">
          <div className="w-20 h-20 bg-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto mb-6">
            <Database size={40} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Supabase Setup Required</h2>
          <p className="text-slate-600 mb-8 font-medium leading-relaxed">
            To use this application, you need to connect your Supabase project. Please set the following environment variables in your project settings:
          </p>
          
          <div className="space-y-3 mb-8 text-left">
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                <ExternalLink size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variable Name</p>
                <p className="text-sm font-mono font-bold text-slate-700">VITE_SUPABASE_URL</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm">
                <Key size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variable Name</p>
                <p className="text-sm font-mono font-bold text-slate-700">VITE_SUPABASE_ANON_KEY</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 mb-8 text-left border border-amber-100">
            <div className="flex gap-3">
              <ShieldCheck className="text-amber-600 shrink-0" size={20} />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                After adding these variables, please restart the development server or reload the page.
              </p>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98]"
          >
            <RefreshCcw size={20} />
            I've set the variables, reload
          </button>
        </div>
      </div>
    );
  }

  // Handle Auth State
  useEffect(() => {
    const verifyUser = async () => {
      // Check for local storage user first (for hardcoded login)
      const savedUser = localStorage.getItem('crm_user');
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          
          try {
            // Verify user exists in DB
            const { data: userDoc, error } = await getSupabase()
              .from('users')
              .select('*')
              .eq('id', parsedUser.id)
              .maybeSingle();
            
            if (userDoc) {
              const userData = {
                ...userDoc,
                role: userDoc.role
              } as User;
              setCurrentUser(userData);
              localStorage.setItem('crm_user', JSON.stringify(userData));
            } else {
              if (parsedUser.username === 'admin') {
                setCurrentUser(parsedUser);
              } else {
                console.warn('Session user not found in database, clearing session');
                localStorage.removeItem('crm_user');
                setCurrentUser(null);
                toast.error('Your session has expired or your account was removed.');
              }
            }
          } catch (dbErr) {
            console.warn('Database session verification failed (network/offline fallbacks):', dbErr);
            // If network/offline, keep the local user signed in
            setCurrentUser(parsedUser);
          }
        } catch (e) {
          console.error('Error parsing saved user:', e);
          localStorage.removeItem('crm_user');
        }
      }

      let subscription: any = null;
      
      try {
        const { data } = getSupabase().auth.onAuthStateChange(async (event, session) => {
          if (session?.user) {
            try {
              const { data: userDoc, error: fetchError } = await getSupabase()
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .maybeSingle();

              let userData: User;

              if (userDoc) {
                userData = {
                  ...userDoc,
                  role: userDoc.role
                } as User;
                setCurrentUser(userData);
                localStorage.setItem('crm_user', JSON.stringify(userData));
              } else if (!localStorage.getItem('crm_user')) {
                // Create new user document if they have a Supabase Auth session but no profile
                const initialRole = ADMIN_EMAILS.includes(session.user.email || '') ? 'admin' : 'executive';
                userData = {
                  id: session.user.id,
                  username: session.user.email?.split('@')[0] || 'user',
                  role: initialRole,
                  name: session.user.user_metadata.full_name || 'User',
                  email: session.user.email || '',
                  createdAt: new Date().toISOString()
                };
                
                await getSupabase().from('users').insert(userData);
                setCurrentUser(userData);
                localStorage.setItem('crm_user', JSON.stringify(userData));
              }
            } catch (error: any) {
              console.error('Error fetching user data:', error);
              if (error.message === 'Failed to fetch') {
                setCurrentUser(null);
              }
            }
          } else {
            // Only clear if not hardcoded admin
            if (!localStorage.getItem('crm_user')) {
              setCurrentUser(null);
            }
          }
          setIsAuthReady(true);
        });
        subscription = data.subscription;
      } catch (error) {
        console.error('Supabase initialization error:', error);
        setIsAuthReady(true);
      }

      return () => {
        if (subscription) subscription.unsubscribe();
      };
    };

    verifyUser();
  }, []);

  // Ensure system admin exists
  useEffect(() => {
    const initAdmin = async () => {
      try {
        const { data } = await getSupabase()
          .from('users')
          .select('*')
          .eq('username', 'admin')
          .maybeSingle();
        
        if (!data) {
          await getSupabase().from('users').insert({
            id: '00000000-0000-0000-0000-000000000000',
            username: 'admin',
            password: 'admin',
            role: 'admin',
            name: 'System Admin',
            email: 'admin@ravins.tech',
            incentiveThreshold: 60000,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        console.error('Error initializing admin:', err);
      }
    };
    initAdmin();
  }, []);

  // Real-time Data Sync
  const fetchData = async () => {
    const activeUser = currentUserRef.current;
    if (!activeUser) return;
    try {
      const { data: leadsData, error: leadsError } = await getSupabase().from('leads').select('*').order('createdAt', { ascending: false });
      if (leadsError) throw leadsError;
      
      // Merge with local presence data as fallback for missing DB column
      const localPresence = JSON.parse(localStorage.getItem('lead_presence') || '{}');
      
      // Ensure all leads have a DLP formatted ID
      const sortedByDate = [...(leadsData || [])].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      
      const existingDlpIds = new Set(sortedByDate.map(l => l.leadId).filter(id => id && /^DLP\d+$/.test(id)));
      let dlpCounter = 1;
      
      const processedLeads = sortedByDate.map((l: any) => {
        let leadId = l.leadId;
        
        if (!leadId || !/^DLP\d+$/.test(leadId)) {
          while (existingDlpIds.has(`DLP${dlpCounter.toString().padStart(3, '0')}`)) {
            dlpCounter++;
          }
          leadId = `DLP${dlpCounter.toString().padStart(3, '0')}`;
          existingDlpIds.add(leadId);
          dlpCounter++;
        }
        
        return {
          ...l,
          leadId,
          isPresentThisMonth: l.isPresentThisMonth !== undefined ? l.isPresentThisMonth : (localPresence[l.id] || false)
        };
      });

      // Sort back to DESC for display
      processedLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setLeads(processedLeads as Lead[]);

      const { data: tasksData, error: tasksError } = await getSupabase().from('tasks').select('*').order('createdAt', { ascending: false });
      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      const { data: usersData, error: usersError } = await getSupabase().from('users').select('*');
      if (usersError) throw usersError;
      
      let mergedUsers: User[] = [];
      if (usersData) {
        // Merge with local thresholds
        const localThresholds = JSON.parse(localStorage.getItem('user_thresholds') || '{}');
        mergedUsers = (usersData as User[]).map(u => ({
          ...u,
          role: u.role,
          incentiveThreshold: u.incentiveThreshold !== undefined ? u.incentiveThreshold : (localThresholds[u.id] || 60000)
        }));
        setUsers(mergedUsers);

        // SYNC CURRENT LOGGED-IN SESSION IN REAL-TIME IF UPDATED FROM ANOTHER DEVICE
        if (activeUser) {
          const remoteCurrentUser = mergedUsers.find(u => u.id === activeUser.id);
          if (remoteCurrentUser) {
            if (
              remoteCurrentUser.password !== activeUser.password ||
              remoteCurrentUser.name !== activeUser.name ||
              remoteCurrentUser.role !== activeUser.role ||
              remoteCurrentUser.email !== activeUser.email
            ) {
              console.log('Real-time database sync: profile info updated centrally, synchronizing logged-in session state.');
              setCurrentUser(remoteCurrentUser);
              localStorage.setItem('crm_user', JSON.stringify(remoteCurrentUser));
              toast.info('Your profile settings have been updated in real-time from the database.');
            }
          } else {
            // Delete check
            const isNotDefaultAdmin = activeUser.id !== '00000000-0000-0000-0000-000000000000';
            if (isNotDefaultAdmin) {
              console.warn('Real-time database sync: logged-in user removed centrally, performing logout.');
              setTimeout(() => {
                handleLogout();
                toast.error('Your user account has been deleted by an administrator.');
              }, 100);
            }
          }
        }
      }

      const { data: notificationsData, error: notifError } = await getSupabase()
        .from('notifications')
        .select('*')
        .eq('userId', activeUser.id)
        .order('createdAt', { ascending: false });
      if (notifError) throw notifError;
      setNotifications(notificationsData || []);

      // SAVE TO LOCAL STORAGE CACHE ON SUCCESS
      localStorage.setItem('cached_leads', JSON.stringify(processedLeads));
      localStorage.setItem('cached_tasks', JSON.stringify(tasksData || []));
      localStorage.setItem('cached_users', JSON.stringify(mergedUsers));
      localStorage.setItem('cached_notifications', JSON.stringify(notificationsData || []));
    } catch (error) {
      console.error('Error fetching data:', error);
      
      // LOAD FROM LOCAL STORAGE CACHES ON FAIL
      const cachedLeads = localStorage.getItem('cached_leads');
      if (cachedLeads) {
        setLeads(JSON.parse(cachedLeads));
      }
      
      const cachedTasks = localStorage.getItem('cached_tasks');
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
      }
      
      const cachedUsers = localStorage.getItem('cached_users');
      if (cachedUsers) {
        setUsers(JSON.parse(cachedUsers));
      } else {
        // Default users list if cache is empty
        setUsers([
          {
            id: '00000000-0000-0000-0000-000000000000',
            username: 'admin',
            password: 'admin',
            role: 'admin',
            name: 'System Admin',
            email: 'admin@ravins.tech',
            incentiveThreshold: 60000,
            createdAt: new Date().toISOString()
          }
        ]);
      }
      
      const cachedNotifications = localStorage.getItem('cached_notifications');
      if (cachedNotifications) {
        setNotifications(JSON.parse(cachedNotifications));
      }
    }
  };

  // Sync the latest fetchData callback to dynamic ref reader
  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (!currentUser || !isAuthReady) return;

    // Trigger initial load
    if (fetchDataRef.current) {
      fetchDataRef.current();
    }

    console.log('Initializing Centralized High-Reliability Sync Polling App & Realtime Listening...');

    // 1. WebSocket Live Realtime changes (works on top of PostgreSQL replica changes logs)
    let dbChannel: any = null;
    try {
      if (isSupabaseConfigured()) {
        console.log('🔌 Registering Supabase Postgres WebSocket Realtime Channels...');
        dbChannel = getSupabase()
          .channel('realtime-db-changes')
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'users' },
            (payload) => {
              console.log('⚡ Realtime "users" mutation received:', payload);
              if (fetchDataRef.current) {
                fetchDataRef.current();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'leads' },
            (payload) => {
              console.log('⚡ Realtime "leads" mutation received:', payload);
              if (fetchDataRef.current) {
                fetchDataRef.current();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'tasks' },
            (payload) => {
              console.log('⚡ Realtime "tasks" mutation received:', payload);
              if (fetchDataRef.current) {
                fetchDataRef.current();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications' },
            (payload) => {
              console.log('⚡ Realtime "notifications" mutation received:', payload);
              if (fetchDataRef.current) {
                fetchDataRef.current();
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public' },
            (payload) => {
              console.log('⚡ Realtime generic public schema mutation received:', payload);
              if (fetchDataRef.current) {
                fetchDataRef.current();
              }
            }
          )
          .subscribe((status) => {
            console.log(`🔌 Supabase Realtime Subscription status:`, status);
          });
      }
    } catch (e) {
      console.error('Failed to init live realtime changes channel:', e);
    }

    // 2. High-reliability Polling Sync (syncs everything every 10 seconds as a strong fallback)
    const pollInterval = setInterval(() => {
      console.log('🔄 Centralized background sync: Checking for database mutations...');
      if (fetchDataRef.current) {
        fetchDataRef.current();
      }
    }, 10000);

    return () => {
      console.log('Tearing down background sync and realtime channels...');
      clearInterval(pollInterval);
      if (dbChannel) {
        try {
          dbChannel.unsubscribe();
        } catch (unsubErr) {
          console.error('Error unsubscribing channel:', unsubErr);
        }
      }
    };
  }, [currentUser?.id, isAuthReady]);

  // Redirect non-admin users from restricted tabs
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin') {
      if (activeTab === 'settings') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Check for follow-up and task notifications
  useEffect(() => {
    if (!currentUser || !isAuthReady) return;
    
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    // Lead follow-ups
    leads.forEach(l => {
      if (!l.followUpDate) return;
      if (l.status === 'Won' || l.status === 'Lost' || l.status === 'Trash') return;
      
      if (l.followUpDate <= todayStr && (l.createdBy === currentUser.id || l.assignedTo === currentUser.id || currentUser.role === 'admin')) {
        const isOverdue = l.followUpDate < todayStr;
        const message = isOverdue 
          ? `Overdue follow-up for ${l.name} (${l.company})`
          : `Follow-up reminder for ${l.name} (${l.company})`;
        const notifKey = `followup-${l.id}-${todayStr}`;
        
        if (!addedNotificationsRef.current.has(notifKey) && !notifications.some(n => n.message === message && n.createdAt.startsWith(todayStr))) {
          addedNotificationsRef.current.add(notifKey);
          addNotification({
            id: generateId(),
            userId: currentUser.id,
            message,
            type: 'warning',
            createdAt: new Date().toISOString(),
            read: false
          });
          toast.warning(message, { duration: 5000 });
        }
      }
    });

    // Task deadlines
    tasks.forEach(t => {
      if (t.status === 'Completed') return;
      
      if (t.dueDate <= todayStr && (t.createdBy === currentUser.id || t.assignedTo === currentUser.id || currentUser.role === 'admin')) {
        const isOverdue = t.dueDate < todayStr;
        const message = isOverdue
          ? `Overdue task: ${t.title}`
          : `Task deadline today: ${t.title}`;
        const notifKey = `task-${t.id}-${todayStr}`;
        
        if (!addedNotificationsRef.current.has(notifKey) && !notifications.some(n => n.message === message && n.createdAt.startsWith(todayStr))) {
          addedNotificationsRef.current.add(notifKey);
          addNotification({
            id: generateId(),
            userId: currentUser.id,
            message,
            type: 'info',
            createdAt: new Date().toISOString(),
            read: false
          });
          toast.info(message, { duration: 5000 });
        }
      }
    });
  }, [leads, tasks, currentUser, isAuthReady, notifications]);

  const addNotification = async (notif: Notification) => {
    try {
      console.log('Adding notification:', notif);
      try {
        const { error } = await getSupabase().from('notifications').insert(notif);
        if (error) {
          console.error('Supabase error adding notification:', error);
          throw error;
        }
      } catch (dbErr) {
        console.warn('Supabase insert failed, storing notification locally:', dbErr);
        const currentNotifications = JSON.parse(localStorage.getItem('cached_notifications') || '[]');
        const updatedLocal = [notif, ...currentNotifications];
        localStorage.setItem('cached_notifications', JSON.stringify(updatedLocal));
        setNotifications(updatedLocal);
      }
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  };

  const addLead = async (lead: Lead) => {
    try {
      if (!currentUser) {
        throw new Error('You must be logged in to add a lead.');
      }

      console.log('Adding lead:', lead);
      
      // Handle local presence fallback
      if (lead.isPresentThisMonth !== undefined) {
        const localPresence = JSON.parse(localStorage.getItem('lead_presence') || '{}');
        localPresence[lead.id] = lead.isPresentThisMonth;
        localStorage.setItem('lead_presence', JSON.stringify(localPresence));
      }

      // Ensure createdBy is set to current user ID
      const leadToInsert = {
        ...lead,
        createdBy: currentUser.id
      };

      // Try inserting with all fields
      const { error } = await getSupabase().from('leads').insert(leadToInsert);
      
      if (error) {
        if (error.code === '23503') {
          // Foreign key violation - user might have been deleted
          console.error('Foreign key violation:', error);
          toast.error('Your session is invalid. Please log in again.');
          handleLogout();
          throw new Error('Session invalid. Please log in again.');
        }
        
        console.warn('Initial insert failed, retrying with sanitized data:', error);
        // Retry without potentially missing columns
        const { isPresentThisMonth, lostReason, website, alternateMobileNumber, followUpDate, leadId, ...essentialLead } = leadToInsert as any;
        const { error: retryError } = await getSupabase().from('leads').insert(essentialLead);
        if (retryError) throw retryError;
      }
      
      console.log('Lead added successfully');
      toast.success('Lead records updated and synced!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error adding lead:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database connection under Settings.`);
      throw error;
    }
  };

  const updateLead = async (updatedLead: Lead) => {
    try {
      // Handle local presence fallback
      if (updatedLead.isPresentThisMonth !== undefined) {
        const localPresence = JSON.parse(localStorage.getItem('lead_presence') || '{}');
        localPresence[updatedLead.id] = updatedLead.isPresentThisMonth;
        localStorage.setItem('lead_presence', JSON.stringify(localPresence));
      }

      // Try updating with all fields
      const { error } = await getSupabase().from('leads').update(updatedLead).eq('id', updatedLead.id);
      
      if (error) {
        console.warn('Initial update failed, retrying with sanitized data:', error);
        // Retry without potentially missing columns
        const { isPresentThisMonth, ...dbLead } = updatedLead as any;
        
        // If it's still failing, it might be other fields. 
        // Let's try to be more surgical if we can detect the column name in the error
        const { error: retryError } = await getSupabase().from('leads').update(dbLead).eq('id', updatedLead.id);
        
        if (retryError) {
          // Last resort: only update essential fields that are almost certainly there
          const essentialFields = {
            name: updatedLead.name,
            email: updatedLead.email,
            phone: updatedLead.phone,
            company: updatedLead.company,
            status: updatedLead.status,
            value: updatedLead.value,
            updatedAt: updatedLead.updatedAt,
            notes: updatedLead.notes
          };
          const { error: finalRetryError } = await getSupabase().from('leads').update(essentialFields).eq('id', updatedLead.id);
          if (finalRetryError) throw finalRetryError;
        }
      }
      
      toast.success('Lead changes updated globally!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error updating status/lead:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const deleteLead = async (id: string) => {
    try {
      const { error } = await getSupabase().from('leads').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Lead deleted from central server!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error deleting lead:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const addTask = async (task: Task) => {
    try {
      console.log('Adding task:', task);
      const { error } = await getSupabase().from('tasks').insert(task);
      if (error) {
        console.error('Supabase error adding task:', error);
        throw error;
      }
      toast.success('Task scheduled and synced across all devices!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error adding task:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Make sure the target lead exists.`);
      throw error;
    }
  };

  const updateTask = async (updatedTask: Task) => {
    try {
      const { error } = await getSupabase().from('tasks').update(updatedTask).eq('id', updatedTask.id);
      if (error) throw error;
      
      toast.success('Task progress updated globally!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error updating task:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await getSupabase().from('tasks').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('Task removed!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error deleting task:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const addUser = async (user: User) => {
    try {
      const { error } = await getSupabase().from('users').insert(user);
      if (error) throw error;
      
      toast.success('User updated successfully!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error adding user:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const updateUser = async (updatedUser: User) => {
    try {
      // Local storage fallback for incentive threshold
      if (updatedUser.incentiveThreshold !== undefined) {
        const thresholds = JSON.parse(localStorage.getItem('user_thresholds') || '{}');
        thresholds[updatedUser.id] = updatedUser.incentiveThreshold;
        localStorage.setItem('user_thresholds', JSON.stringify(thresholds));
      }

      const { error } = await getSupabase().from('users').update(updatedUser).eq('id', updatedUser.id);
      
      if (error) {
        console.warn('User update failed, retrying with sanitized data:', error);
        const { incentiveThreshold, ...sanitizedUser } = updatedUser as any;
        const { error: retryError } = await getSupabase().from('users').update(sanitizedUser).eq('id', updatedUser.id);
        if (retryError) throw retryError;
      }
      
      toast.success('User threshold settings updated globally!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const { error } = await getSupabase().from('users').delete().eq('id', id);
      if (error) throw error;
      
      toast.success('User removed from centralized server!');
      await fetchData(); // Force refresh
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const markNotificationRead = async (id: string) => {
    try {
      const { error } = await getSupabase().from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
      await fetchData(); // Refresh local state
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await getSupabase().from('notifications').delete().eq('id', id);
      if (error) throw error;
      await fetchData(); // Refresh local state
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!currentUser) return;
    try {
      const { error } = await getSupabase().from('notifications').delete().eq('userId', currentUser.id);
      if (error) throw error;
      await fetchData(); // Refresh local state
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      toast.error(`Database Sync Failed: ${error.message || error}. Check database schema under Settings.`);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return leads;
    return leads.filter(l => l.createdBy === currentUser.id || l.assignedTo === currentUser.id);
  }, [leads, currentUser]);

  const filteredTasks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return tasks;
    return tasks.filter(t => t.createdBy === currentUser.id || t.assignedTo === currentUser.id);
  }, [tasks, currentUser]);

  const filteredNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(n => n.userId === currentUser.id);
  }, [notifications, currentUser]);

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const remindersCount = useMemo(() => {
    if (!currentUser) return 0;
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    const leadReminders = leads.filter(l => {
      if (!l.followUpDate) return false;
      if (l.status === 'Won' || l.status === 'Lost') return false;
      const isRelevant = currentUser.role === 'admin' || l.createdBy === currentUser.id || l.assignedTo === currentUser.id;
      return isRelevant && l.followUpDate <= todayStr;
    }).length;

    const taskReminders = tasks.filter(t => {
      if (t.status === 'Completed') return false;
      const isRelevant = currentUser.role === 'admin' || t.createdBy === currentUser.id || t.assignedTo === currentUser.id;
      return isRelevant && t.dueDate <= todayStr;
    }).length;

    return leadReminders + taskReminders;
  }, [leads, tasks, currentUser]);

  const exportData = async (copyToClipboard = false) => {
    const data = {
      leads,
      tasks,
      users,
      notifications,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
    const jsonString = JSON.stringify(data, null, 2);
    
    if (copyToClipboard) {
      try {
        await navigator.clipboard.writeText(jsonString);
        return true;
      } catch (err) {
        console.error('Failed to copy:', err);
        return false;
      }
    } else {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `crm-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    }
  };

  const importData = async (jsonData: string) => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.leads || !data.tasks) {
        throw new Error('Invalid backup file format');
      }

      // Import leads
      if (data.leads) {
        await getSupabase().from('leads').upsert(data.leads);
      }
      // Import tasks
      if (data.tasks) {
        await getSupabase().from('tasks').upsert(data.tasks);
      }
      // Import users (if admin)
      if (currentUser?.role === 'admin' && data.users) {
        await getSupabase().from('users').upsert(data.users);
      }

      alert('Data imported successfully!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data. Please check the file format.');
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold animate-pulse">Initializing DLP Portal...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster position="top-right" richColors />
      <div className="min-h-screen bg-slate-50 flex font-sans">
        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className="bg-slate-900 text-white flex flex-col shadow-2xl z-20 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
          
          <div className="h-20 flex items-center px-6 border-b border-white/5 mb-4 relative z-10">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 blue-orange-gradient rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                <TrendingUp size={20} />
              </div>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex flex-col"
                >
                  <span className="text-sm font-black text-white tracking-tighter leading-none">RAVINS TECH</span>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">DLP Portal</span>
                </motion.div>
              )}
            </div>
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4">
            <SidebarItem 
              icon={<LayoutDashboard size={22} />} 
              label="Dashboard" 
              active={activeTab === 'dashboard'} 
              onClick={() => setActiveTab('dashboard')}
              isOpen={isSidebarOpen}
              badge={remindersCount}
            />
            <SidebarItem 
              icon={<Users size={22} />} 
              label="Leads" 
              active={activeTab === 'leads'} 
              onClick={() => setActiveTab('leads')}
              isOpen={isSidebarOpen}
            />
            <SidebarItem 
              icon={<CheckSquare size={22} />} 
              label="Tasks" 
              active={activeTab === 'tasks'} 
              onClick={() => setActiveTab('tasks')}
              isOpen={isSidebarOpen}
            />
            <SidebarItem 
              icon={<TrendingUp size={22} />} 
              label="Reports" 
              active={activeTab === 'reports'} 
              onClick={() => setActiveTab('reports')}
              isOpen={isSidebarOpen}
            />
            <SidebarItem 
              icon={<Zap size={22} />} 
              label="Incentives" 
              active={activeTab === 'incentives'} 
              onClick={() => setActiveTab('incentives')}
              isOpen={isSidebarOpen}
            />
            <SidebarItem 
              icon={<Trash2 size={22} />} 
              label="Trash" 
              active={activeTab === 'trash'} 
              onClick={() => setActiveTab('trash')}
              isOpen={isSidebarOpen}
              badge={trashCount > 0 ? trashCount : undefined}
            />
            {currentUser.role === 'admin' && (
              <SidebarItem 
                icon={<ShieldCheck size={22} />} 
                label="Executives" 
                active={activeTab === 'users'} 
                onClick={() => setActiveTab('users')}
                isOpen={isSidebarOpen}
              />
            )}
            <SidebarItem 
              icon={<SettingsIcon size={22} />} 
              label="Settings" 
              active={activeTab === 'settings'} 
              onClick={() => setActiveTab('settings')}
              isOpen={isSidebarOpen}
            />
          </nav>

          <div className="p-4 border-t border-white/10">
            <button 
              onClick={handleLogout}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all duration-200 font-bold",
                !isSidebarOpen && "justify-center"
              )}
            >
              <LogOut size={20} />
              {isSidebarOpen && <span>Logout</span>}
            </button>
          </div>
        </motion.aside>

        {/* Main Content */}
        <main className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          isSidebarOpen ? "ml-[280px]" : "ml-[80px]"
        )}>
          {/* Header */}
          <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{activeTab}</h2>
              {remindersCount > 0 && (
                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Clock size={12} />
                  {remindersCount} Actions Due
                </div>
              )}
            </div>

            <div className="flex items-center gap-6">
              <div className="relative hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search leads, tasks..." 
                  className="pl-12 pr-6 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all w-64 font-medium"
                />
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-3 hover:bg-slate-50 rounded-2xl text-slate-400 relative transition-all active:scale-95"
                >
                  <Bell size={22} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-50"
                    >
                      <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-900 tracking-tight">Notifications</h3>
                        <div className="flex items-center gap-2">
                          {filteredNotifications.length > 0 && (
                            <button 
                              onClick={clearAllNotifications}
                              className="text-[10px] font-bold text-rose-600 uppercase tracking-widest hover:underline"
                            >
                              Clear All
                            </button>
                          )}
                          <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                          <div className="p-12 text-center text-slate-400 italic">
                            <Bell size={32} className="mx-auto mb-3 opacity-20" />
                            No notifications
                          </div>
                        ) : (
                          filteredNotifications.map(notif => (
                            <div 
                              key={notif.id} 
                              className={cn(
                                "p-4 hover:bg-slate-50 transition-colors cursor-pointer",
                                !notif.read && "bg-blue-50/50"
                              )}
                              onClick={() => {
                                markNotificationRead(notif.id);
                                setSelectedNotification(notif);
                                setShowNotifications(false);
                              }}
                            >
                              <div className="flex justify-between items-start gap-3">
                                <div className="flex gap-3">
                                  <div className={cn(
                                    "w-2 h-2 rounded-full mt-2 shrink-0",
                                    notif.type === 'warning' ? "bg-orange-500" : "bg-blue-500",
                                    notif.read && "bg-slate-300"
                                  )} />
                                  <div>
                                    <p className={cn(
                                      "text-sm text-slate-700 font-medium",
                                      notif.read && "text-slate-400 font-normal"
                                    )}>{notif.message}</p>
                                    <span className="text-[10px] text-slate-400 mt-1 block">
                                      {new Date(notif.createdAt).toLocaleTimeString()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {!notif.read && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        markNotificationRead(notif.id);
                                      }}
                                      className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-primary transition-all"
                                      title="Mark as read"
                                    >
                                      <CheckSquare size={14} />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteNotification(notif.id);
                                    }}
                                    className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-800">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{currentUser.role}</p>
                </div>
                <div className="w-9 h-9 bg-primary text-white rounded-full flex items-center justify-center font-bold">
                  {currentUser.name.charAt(0)}
                </div>
              </div>
            </div>
          </header>

          {/* Viewport */}
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Dashboard 
                    leads={leads} 
                    tasks={tasks}
                    users={users}
                    currentUser={currentUser}
                    onUpdateLead={updateLead}
                    onDeleteLead={deleteLead}
                    onViewAllLeads={() => setActiveTab('leads')}
                    onViewAllTasks={() => setActiveTab('tasks')}
                    onExportData={exportData}
                    onImportData={importData}
                  />
                </motion.div>
              )}
              {activeTab === 'leads' && (
                <motion.div 
                  key="leads"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <LeadManagement 
                    leads={filteredLeads} 
                    users={users}
                    currentUser={currentUser}
                    onAddLead={addLead}
                    onUpdateLead={updateLead}
                    onDeleteLead={deleteLead}
                  />
                </motion.div>
              )}
              {activeTab === 'tasks' && (
                <motion.div 
                  key="tasks"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <TaskManagement 
                    tasks={tasks}
                    leads={leads}
                    users={users}
                    currentUser={currentUser}
                    onAddTask={addTask}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                  />
                </motion.div>
              )}
              {activeTab === 'reports' && (
                <motion.div 
                  key="reports"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Reports leads={leads} currentUser={currentUser} users={users} />
                </motion.div>
              )}
              {activeTab === 'incentives' && (
                <motion.div 
                  key="incentives"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Incentives 
                    leads={leads} 
                    users={users} 
                    currentUser={currentUser} 
                    onUpdateLead={updateLead} 
                    onUpdateUser={updateUser}
                  />
                </motion.div>
              )}
              {activeTab === 'trash' && (
                <motion.div 
                  key="trash"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <LeadManagement 
                    leads={filteredLeads} 
                    users={users}
                    currentUser={currentUser}
                    onAddLead={addLead}
                    onUpdateLead={updateLead}
                    onDeleteLead={deleteLead}
                    initialStatusFilter="Trash"
                  />
                </motion.div>
              )}
              {activeTab === 'users' && currentUser.role === 'admin' && (
                <motion.div 
                  key="users"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <UserManagement />
                </motion.div>
              )}
              {activeTab === 'settings' && (
                <motion.div 
                  key="settings"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <Settings 
                    currentUser={currentUser}
                    onExportData={exportData}
                    onImportData={importData}
                    onUpdateProfile={handleUpdateProfile}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        {/* Notification Detail Modal */}
        <AnimatePresence>
          {selectedNotification && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedNotification(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
              >
                <div className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={cn(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg",
                      selectedNotification.type === 'warning' ? "bg-orange-500" : "bg-blue-500"
                    )}>
                      <Bell size={28} />
                    </div>
                    <button 
                      onClick={() => setSelectedNotification(null)}
                      className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Notification Details</h3>
                  <p className="text-slate-500 font-medium mb-8">{selectedNotification.message}</p>
                  
                  <div className="bg-slate-50 rounded-3xl p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Received At</span>
                      <span className="text-sm font-bold text-slate-700">{new Date(selectedNotification.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Type</span>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        selectedNotification.type === 'warning' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                      )}>
                        {selectedNotification.type}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedNotification(null)}
                    className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all active:scale-[0.98]"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

function SidebarItem({ icon, label, active, onClick, isOpen, badge }: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void,
  isOpen: boolean,
  badge?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full p-3 rounded-xl transition-all duration-300 group relative",
        active 
          ? "bg-white/10 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]" 
          : "text-slate-400 hover:bg-white/5 hover:text-white"
      )}
    >
      {active && (
        <motion.div 
          layoutId="active-pill"
          className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
        />
      )}
      <div className={cn("shrink-0 relative transition-transform duration-300", active ? "scale-110 text-primary" : "group-hover:scale-110")}>
        {icon}
      </div>
      {isOpen && (
        <div className="flex-1 flex items-center justify-between overflow-hidden">
          <span className={cn("font-bold text-sm tracking-tight transition-colors", active ? "text-white" : "text-inherit")}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-secondary text-white text-[10px] font-black px-2 py-0.5 rounded-lg shadow-lg shadow-secondary/20">
              {badge}
            </span>
          )}
        </div>
      )}
      {!isOpen && (
        <div className="absolute left-full ml-4 px-3 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-2xl border border-white/5">
          {label}
        </div>
      )}
    </button>
  );
}
