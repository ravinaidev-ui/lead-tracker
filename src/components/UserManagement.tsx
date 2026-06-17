import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Search, Filter, MoreVertical, 
  Mail, Shield, Trash2, Edit2, X, Check, AlertCircle,
  Key, Eye, EyeOff
} from 'lucide-react';
import { User } from '../types';
import { getSupabase, signUpUser } from '../supabase';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // New User Form State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'executive' as 'admin' | 'executive',
    username: ''
  });

  const [editFormData, setEditFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'executive' as 'admin' | 'executive',
    username: ''
  });

  useEffect(() => {
    fetchUsers();

    console.log('Initializing User Management High-Reliability Sync Polling Layout...');

    // High-reliability Polling (syncs Team members list every 6 seconds)
    const pollInterval = setInterval(() => {
      console.log('🔄 User Management background sync: Refreshing users database list...');
      fetchUsers();
    }, 6000);

    return () => {
      console.log('Tearing down User Management background timers...');
      clearInterval(pollInterval);
    };
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await getSupabase()
        .from('users')
        .select('*')
        .order('name');
      
      if (error) throw error;
      const normalizedData = (data || []).map(u => ({
        ...u,
        role: u.role
      })) as User[];
      setUsers(normalizedData);
      localStorage.setItem('cached_users', JSON.stringify(normalizedData));
    } catch (err: any) {
      console.error('Error fetching users:', err);
      const cachedUsersStr = localStorage.getItem('cached_users');
      if (cachedUsersStr) {
        try {
          const cachedUsers = JSON.parse(cachedUsersStr) as User[];
          setUsers(cachedUsers);
        } catch (e) {
          console.error('Error parsing cached users:', e);
        }
      } else {
        // Fallback default admin user
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
      if (err.message && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        setError('Could not connect to Supabase. Loaded from offline cache.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const generatedId = crypto.randomUUID();
    const newUserRecord: User = {
      id: generatedId,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      username: newUser.username || newUser.email.split('@')[0],
      password: newUser.password, // Store password in the table for demo purposes
      createdAt: new Date().toISOString()
    };

    try {
      const { error: dbError } = await getSupabase()
        .from('users')
        .insert(newUserRecord);

      if (dbError) throw dbError;

      // Sync local cached users list - only on complete success
      const cachedUsersStr = localStorage.getItem('cached_users');
      let currentCached: User[] = [];
      if (cachedUsersStr) {
        try {
          currentCached = JSON.parse(cachedUsersStr) as User[];
        } catch (e) {
          console.error(e);
        }
      }
      const updatedLocal = [...currentCached, newUserRecord];
      localStorage.setItem('cached_users', JSON.stringify(updatedLocal));

      setShowAddModal(false);
      setNewUser({ email: '', password: '', name: '', role: 'executive', username: '' });
      toast.success('User registered successfully in the centralized database!');
      fetchUsers();
    } catch (err: any) {
      console.error('Error adding user:', err);
      const errMsg = err.message || 'Failed to create user.';
      setError(`Database Error: ${errMsg}. Please check your database connection or settings.`);
      toast.error(`Database Error: ${errMsg}. Check database settings.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (user: User) => {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      password: user.password || '',
      name: user.name,
      role: user.role,
      username: user.username
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    setIsSubmitting(true);
    setError(null);

    const updatedUserRecord: User = {
      ...editingUser,
      email: editFormData.email,
      name: editFormData.name,
      role: editFormData.role,
      username: editFormData.username,
      password: editFormData.password
    };

    try {
      const { error: dbError } = await getSupabase()
        .from('users')
        .update(updatedUserRecord)
        .eq('id', editingUser.id);

      if (dbError) throw dbError;

      // Sync local cached users list - only on complete success
      const cachedUsersStr = localStorage.getItem('cached_users');
      if (cachedUsersStr) {
        try {
          const cachedUsers = JSON.parse(cachedUsersStr) as User[];
          const updatedLocal = cachedUsers.map(u => u.id === editingUser.id ? updatedUserRecord : u);
          localStorage.setItem('cached_users', JSON.stringify(updatedLocal));
        } catch (e) {
          console.error(e);
        }
      } else {
        localStorage.setItem('cached_users', JSON.stringify([updatedUserRecord]));
      }

      setShowEditModal(false);
      setEditingUser(null);
      toast.success('User updated successfully in the centralized database!');
      fetchUsers();
    } catch (err: any) {
      console.error('Error updating user:', err);
      const errMsg = err.message || 'Failed to update user.';
      setError(`Database Error: ${errMsg}. Please check your database connection or settings.`);
      toast.error(`Database Error: ${errMsg}. Check database settings.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: dbError } = await getSupabase()
        .from('users')
        .delete()
        .eq('id', userToDelete.id);
      
      if (dbError) throw dbError;

      // Sync local cached users list - only on complete success
      const cachedUsersStr = localStorage.getItem('cached_users');
      if (cachedUsersStr) {
        try {
          const cachedUsers = JSON.parse(cachedUsersStr) as User[];
          const updatedLocal = cachedUsers.filter(u => u.id !== userToDelete.id);
          localStorage.setItem('cached_users', JSON.stringify(updatedLocal));
        } catch (e) {
          console.error(e);
        }
      }
      
      setShowDeleteModal(false);
      setUserToDelete(null);
      toast.success('User deleted successfully from centralized database!');
      fetchUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      const errMsg = err.message || 'Failed to delete user.';
      setError(`Database Error: ${errMsg}. Make sure they are not linked to tasks or leads.`);
      toast.error(`Database Error: ${errMsg}. Ensure user has no active assigned tasks or leads.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium">Manage team members and access levels</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-black hover:bg-primary/90 transition-all active:scale-[0.98] shadow-xl shadow-primary/20"
        >
          <UserPlus size={20} />
          Add New User
        </button>
      </div>

      {/* Stats & Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Users</p>
              <p className="text-2xl font-black text-slate-900">{users.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 text-secondary rounded-2xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Executives</p>
              <p className="text-2xl font-black text-slate-900">{users.filter(u => u.role === 'executive').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center px-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Role</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Username</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-slate-400">Loading users...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <p className="text-slate-400 font-bold">No users found</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <motion.tr 
                    layout
                    key={user.id} 
                    className="group hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 font-black text-xs">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 tracking-tight">{user.name}</p>
                          <p className="text-xs font-medium text-slate-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        user.role === 'admin' 
                          ? "bg-secondary/10 text-secondary" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-bold text-slate-600">@{user.username}</span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(user)}
                          className="p-2 hover:bg-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Add New User</h3>
                    <p className="text-slate-500 font-medium text-sm">Create a new account for a team member</p>
                  </div>
                  <button 
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {error && (
                  <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border border-rose-100">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleAddUser} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={newUser.name}
                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <input 
                        type="text"
                        required
                        value={newUser.username}
                        onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="johndoe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        required
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="••••••••"
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

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                    <div className="flex gap-3">
                      {(['executive', 'admin'] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewUser({...newUser, role})}
                          className={cn(
                            "flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                            newUser.role === role 
                              ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <span className="capitalize">{role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-2 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={20} />
                          Create User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Edit User</h3>
                    <p className="text-slate-500 font-medium text-sm">Update team member information</p>
                  </div>
                  <button 
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>

                {error && (
                  <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 border border-rose-100">
                    <AlertCircle size={20} />
                    {error}
                  </div>
                )}

                <form onSubmit={handleUpdateUser} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                      <input 
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                      <input 
                        type="text"
                        required
                        value={editFormData.username}
                        onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                        className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="johndoe"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
                        className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type={showEditPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={editFormData.password}
                        onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                        className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showEditPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                    <div className="flex gap-3">
                      {(['executive', 'admin'] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setEditFormData({...editFormData, role})}
                          className={cn(
                            "flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2",
                            editFormData.role === role 
                              ? "bg-primary border-primary text-white shadow-lg shadow-primary/20" 
                              : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                          )}
                        >
                          <span className="capitalize">{role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setShowEditModal(false)}
                      className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-2 py-4 bg-primary text-white rounded-2xl font-black hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Check size={20} />
                          Update User
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && userToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={40} />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Delete User?</h3>
                <p className="text-slate-500 font-medium mb-8">
                  Are you sure you want to delete <span className="font-black text-slate-900">{userToDelete.name}</span>? 
                  This action cannot be undone and will remove them from the DLP Portal database.
                </p>

                {error && (
                  <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-3 border border-rose-100 text-left">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <div className="flex gap-4">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDeleteUser}
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-black hover:bg-rose-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-rose-200"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Delete User'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
