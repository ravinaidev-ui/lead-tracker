import React, { useMemo, useState, useEffect, useRef } from 'react';
import { toPng } from 'html-to-image';
import { Lead, LeadStatus, Task, User } from '../types';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  PhoneCall,
  CheckSquare,
  Calendar,
  X,
  Download,
  Upload,
  ShieldCheck,
  UserCheck,
  Zap,
  PieChart as PieChartIcon,
  Filter,
  Check,
  BarChart2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  leads: Lead[];
  tasks: Task[];
  users: User[];
  currentUser: User;
  onUpdateLead?: (lead: Lead) => void;
  onDeleteLead?: (id: string) => void;
  onViewAllLeads?: () => void;
  onViewAllTasks?: () => void;
  onExportData?: (copyToClipboard?: boolean) => Promise<boolean>;
  onImportData?: (data: string) => void;
}

function TakeActionMenu({ 
  lead, 
  onUpdateLead, 
  onDeleteLead, 
  isOpen, 
  onToggle 
}: { 
  lead: Lead, 
  onUpdateLead?: (lead: Lead) => void, 
  onDeleteLead?: (id: string) => void,
  isOpen: boolean,
  onToggle: () => void
}) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);
  const [followUpDate, setFollowUpDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="relative">
      <button 
        onClick={onToggle}
        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
      >
        <MoreVertical size={16} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => {
                onToggle();
                setShowDatePicker(false);
                setShowTrashConfirm(false);
              }} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-full mr-2 top-0 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-1 overflow-hidden"
            >
              {!showDatePicker && !showTrashConfirm ? (
                <>
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-50">
                    Take Action
                  </div>
                  <button 
                    onClick={() => setShowDatePicker(true)}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <PhoneCall size={14} className="text-blue-500" />
                    Mark Contacted
                  </button>
                  <button 
                    onClick={() => {
                      onUpdateLead?.({ ...lead, status: 'Won', updatedAt: new Date().toISOString() });
                      onToggle();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <CheckCircle size={14} className="text-green-500" />
                    Mark Won
                  </button>
                  <button 
                    onClick={() => {
                      onUpdateLead?.({ ...lead, status: 'Lost', updatedAt: new Date().toISOString() });
                      onToggle();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                  >
                    <XCircle size={14} className="text-red-500" />
                    Mark Lost
                  </button>
                  <div className="border-t border-slate-50 my-1" />
                  <button 
                    onClick={() => setShowTrashConfirm(true)}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 size={14} />
                    Move to Trash
                  </button>
                </>
              ) : showTrashConfirm ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Move to Trash?</span>
                    <button onClick={() => setShowTrashConfirm(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">This lead will be moved to Trash. You can restore it later.</p>
                  <button 
                    onClick={() => {
                      onUpdateLead?.({ ...lead, status: 'Trash', updatedAt: new Date().toISOString() });
                      onToggle();
                      setShowTrashConfirm(false);
                    }}
                    className="w-full py-2 bg-red-500 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                  >
                    Confirm Move
                  </button>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Follow-up</span>
                    <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={14} />
                    </button>
                  </div>
                  <input 
                    type="date" 
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button 
                    onClick={() => {
                      onUpdateLead?.({ 
                        ...lead, 
                        status: 'Contacted', 
                        followUpDate,
                        updatedAt: new Date().toISOString() 
                      });
                      onToggle();
                      setShowDatePicker(false);
                    }}
                    className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors"
                  >
                    Confirm & Update
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Dashboard({ 
  leads, 
  tasks, 
  users,
  currentUser,
  onUpdateLead, 
  onDeleteLead,
  onViewAllLeads,
  onViewAllTasks,
  onExportData,
  onImportData
}: DashboardProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [comparisonMetric, setComparisonMetric] = useState<'performance' | 'activity'>('performance');
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [showAgentFilter, setShowAgentFilter] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });
  const comparisonChartRef = useRef<HTMLDivElement>(null);

  const handleDownloadChart = async () => {
    if (comparisonChartRef.current === null) return;
    
    try {
      const dataUrl = await toPng(comparisonChartRef.current, { 
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          padding: '20px',
          borderRadius: '2.5rem'
        }
      });
      const link = document.createElement('a');
      link.download = `executive-performance-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download chart', err);
    }
  };

  const executives = useMemo(() => users.filter(u => u.role === 'executive'), [users]);

  // Initialize selectedAgentIds with all executives on first load
  useEffect(() => {
    if (selectedAgentIds.length === 0 && executives.length > 0) {
      setSelectedAgentIds(executives.map(u => u.id));
    }
  }, [executives]);

  const comparisonData = useMemo(() => {
    return executives
      .filter(u => selectedAgentIds.includes(u.id))
      .map(user => {
        const userLeads = leads.filter(l => {
          const isAssigned = l.assignedTo === user.id || (l.createdBy === user.id && !l.assignedTo);
          const isNotTrash = l.status !== 'Trash';
          
          if (!isAssigned || !isNotTrash) return false;
          
          if (dateRange.start || dateRange.end) {
            const leadDate = l.createdAt.split('T')[0];
            if (dateRange.start && leadDate < dateRange.start) return false;
            if (dateRange.end && leadDate > dateRange.end) return false;
          }
          
          return true;
        });
        
        const wonLeads = userLeads.filter(l => l.status === 'Won');
        const totalWonValue = wonLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
        const threshold = user.incentiveThreshold || 60000;
        const conversionRate = userLeads.length > 0 ? (wonLeads.length / userLeads.length) * 100 : 0;
        
        return {
          name: user.name,
          wonValue: totalWonValue,
          target: threshold,
          leadsCount: userLeads.length,
          conversionRate: Math.round(conversionRate * 10) / 10,
          wonCount: wonLeads.length
        };
      });
  }, [executives, selectedAgentIds, leads, dateRange]);

  const userLeads = useMemo(() => {
    return leads.filter(l => (currentUser.role === 'admin' || l.createdBy === currentUser.id || l.assignedTo === currentUser.id) && l.status !== 'Trash');
  }, [leads, currentUser]);

  const userTasks = useMemo(() => {
    return tasks.filter(t => currentUser.role === 'admin' || t.createdBy === currentUser.id || t.assignedTo === currentUser.id);
  }, [tasks, currentUser]);

  const recentLeads = userLeads.slice(0, 5);
  const recentTasks = userTasks.slice(0, 5);

  const hasTasks = userTasks.length > 0;
  const hasLeads = userLeads.length > 0;

  const reminders = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    return userLeads.filter(l => {
      if (!l.followUpDate) return false;
      if (l.status === 'Won' || l.status === 'Lost') return false;
      
      return l.followUpDate <= todayStr;
    }).sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));
  }, [userLeads]);

  const allReminders = useMemo(() => {
    return userLeads.filter(l => l.followUpDate && l.status !== 'Won' && l.status !== 'Lost')
      .sort((a, b) => (a.followUpDate || '').localeCompare(b.followUpDate || ''));
  }, [userLeads]);

  const taskAlerts = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    return userTasks.filter(t => {
      if (t.status === 'Completed') return false;
      return t.dueDate <= todayStr;
    }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [userTasks]);

  const todayStr = new Date().toLocaleDateString('sv-SE');

  const adminLeads = useMemo(() => {
    const adminIds = users.filter(u => u.role === 'admin').map(u => u.id);
    return leads.filter(l => adminIds.includes(l.createdBy) && l.status !== 'Trash');
  }, [leads, users]);

  const executiveLeads = useMemo(() => {
    const executiveIds = users.filter(u => u.role === 'executive').map(u => u.id);
    return leads.filter(l => executiveIds.includes(l.createdBy) && l.status !== 'Trash');
  }, [leads, users]);

  const calculateBasicIncentive = (amount: number) => {
    if (amount >= 80000) return amount * 0.05;
    if (amount >= 50000) return amount * 0.03;
    if (amount >= 25000) return amount * 0.02;
    return 0;
  };

  const calculateStandbyIncentive = (amount: number, isPresent: boolean) => {
    return isPresent ? amount * 0.015 : 0;
  };

  const userIncentives = useMemo(() => {
    const wonLeads = userLeads.filter(l => l.status === 'Won');
    let totalBasic = 0;
    let totalStandby = 0;
    
    wonLeads.forEach(lead => {
      totalBasic += calculateBasicIncentive(lead.value);
      totalStandby += calculateStandbyIncentive(lead.value, !!lead.isPresentThisMonth);
    });

    return { totalBasic, totalStandby, total: totalBasic + totalStandby };
  }, [userLeads]);

  const stats = [
    { 
      label: 'Total Leads', 
      value: userLeads.length, 
      icon: <Users size={20} />, 
      color: 'from-primary to-primary/60',
      trend: '+12%',
      trendUp: true,
      description: 'Total leads in pipeline'
    },
    ...(currentUser.role === 'admin' ? [
      { 
        label: 'Admin Leads', 
        value: adminLeads.length, 
        icon: <ShieldCheck size={20} />, 
        color: 'from-indigo-500 to-blue-400',
        trend: `${Math.round((adminLeads.length / (leads.length || 1)) * 100)}%`,
        trendUp: true,
        description: 'Created by admins'
      },
      { 
        label: 'Executive Leads', 
        value: executiveLeads.length, 
        icon: <UserCheck size={20} />, 
        color: 'from-amber-500 to-orange-400',
        trend: `${Math.round((executiveLeads.length / (leads.length || 1)) * 100)}%`,
        trendUp: true,
        description: 'Created by executives'
      }
    ] : []),
    { 
      label: 'Won Leads', 
      value: userLeads.filter(l => l.status === 'Won').length, 
      icon: <CheckCircle2 size={20} />, 
      color: 'from-emerald-500 to-teal-400',
      trend: '+5%',
      trendUp: true,
      description: 'Successfully closed'
    },
    { 
      label: 'Your Incentive', 
      value: `₹${userIncentives.total.toLocaleString()}`, 
      icon: <Zap size={20} />, 
      color: 'from-secondary to-secondary/60',
      trend: `${Math.round((userIncentives.total / (userLeads.filter(l => l.status === 'Won').reduce((acc, l) => acc + l.value, 0) || 1)) * 100)}%`,
      trendUp: true,
      description: 'Earned + Standby'
    },
  ];

  const ownershipData = [
    { name: 'Admin Created', value: adminLeads.length, color: '#6366f1' },
    { name: 'Executive Created', value: executiveLeads.length, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'New', value: userLeads.filter(l => l.status === 'New').length, color: '#2596be' },
    { name: 'Contacted', value: userLeads.filter(l => l.status === 'Contacted').length, color: '#e45729' },
    { name: 'Qualified', value: userLeads.filter(l => l.status === 'Qualified').length, color: '#8b5cf6' },
    { name: 'Won', value: userLeads.filter(l => l.status === 'Won').length, color: '#10b981' },
    { name: 'Lost', value: userLeads.filter(l => l.status === 'Lost').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Urgent Alerts Banner */}
      {(reminders.length > 0 || taskAlerts.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-600 text-white p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <AlertCircle size={24} className="text-white" />
            </div>
            <div>
              <h4 className="font-bold text-lg leading-tight">Attention Required</h4>
              <p className="text-rose-100 text-sm">
                You have {reminders.length} lead follow-ups {taskAlerts.length > 0 && `and ${taskAlerts.length} ${currentUser.role === 'admin' ? 'tasks' : 'assigned tasks'}`} that need immediate attention.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {taskAlerts.length > 0 && (
              <button 
                onClick={onViewAllTasks}
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-50 transition-colors"
              >
                View Tasks
              </button>
            )}
            <button 
              onClick={onViewAllLeads}
              className="flex-1 sm:flex-none px-4 py-2 bg-rose-500 text-white rounded-xl font-bold text-sm hover:bg-rose-400 transition-colors border border-rose-400"
            >
              View Leads
            </button>
            {currentUser.role === 'admin' && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => onExportData?.()}
                  className="flex-1 sm:flex-none px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                  title="Export Data Backup"
                >
                  <Download size={16} />
                  <span className="sm:hidden lg:inline">Export</span>
                </button>
                <label className="flex-1 sm:flex-none px-4 py-2 bg-white text-slate-800 border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                  <Upload size={16} />
                  <span className="sm:hidden lg:inline">Import</span>
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
            )}
          </div>
        </motion.div>
      )}

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 relative overflow-hidden"
          >
            <div className={cn(
              "absolute top-0 right-0 w-24 h-24 bg-gradient-to-br opacity-[0.03] -mr-8 -mt-8 rounded-full transition-transform group-hover:scale-150 duration-500",
              stat.color
            )} />
            
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className={cn("p-2.5 rounded-2xl text-white shadow-lg bg-gradient-to-br", stat.color)}>
                {stat.icon}
              </div>
              <div className={cn(
                "flex items-center text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider",
                stat.trendUp ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
              )}>
                {stat.trend}
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tight">{stat.value}</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic">{stat.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {currentUser.role === 'admin' && ownershipData.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Ownership Comparison</h3>
                <p className="text-slate-500 text-sm font-medium">Admin vs Executive created leads</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <PieChartIcon size={24} />
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ownershipData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="none"
                  >
                    {ownershipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="p-4 bg-indigo-50 rounded-2xl">
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Admin</p>
                <p className="text-2xl font-black text-indigo-900">{adminLeads.length}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Executive</p>
                <p className="text-2xl font-black text-amber-900">{executiveLeads.length}</p>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Lead Status Distribution</h3>
              <p className="text-slate-500 text-sm font-medium">Current pipeline health</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <PieChartIcon size={24} />
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Executive Comparison Chart (Admin Only) */}
      {currentUser.role === 'admin' && executives.length > 0 && (
        <motion.div 
          ref={comparisonChartRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Executive Performance Comparison</h3>
              <p className="text-slate-500 text-sm font-medium">Compare targets, conversion rates, and activity</p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button 
                  onClick={() => setComparisonMetric('performance')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    comparisonMetric === 'performance' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Performance
                </button>
                <button 
                  onClick={() => setComparisonMetric('activity')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                    comparisonMetric === 'activity' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  Activity
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1 px-2">
                  <Calendar size={14} className="text-slate-400" />
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-24"
                  />
                </div>
                <span className="text-slate-300">|</span>
                <div className="flex items-center gap-1 px-2">
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-transparent text-[10px] font-bold text-slate-600 outline-none w-24"
                  />
                </div>
                {(dateRange.start || dateRange.end) && (
                  <button 
                    onClick={() => setDateRange({ start: '', end: '' })}
                    className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-rose-500 transition-all"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative">
                <button 
                  onClick={() => setShowAgentFilter(!showAgentFilter)}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all flex items-center gap-2",
                    showAgentFilter ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-primary"
                  )}
                >
                  <Filter size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Agents</span>
                </button>

                <AnimatePresence>
                  {showAgentFilter && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setShowAgentFilter(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-30 p-4"
                      >
                        <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select Agents</span>
                          <button 
                            onClick={() => setSelectedAgentIds(executives.map(u => u.id))}
                            className="text-[10px] font-bold text-primary hover:underline"
                          >
                            Select All
                          </button>
                        </div>
                        <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                          {executives.map(exec => (
                            <button 
                              key={exec.id}
                              onClick={() => {
                                if (selectedAgentIds.includes(exec.id)) {
                                  if (selectedAgentIds.length > 1) {
                                    setSelectedAgentIds(selectedAgentIds.filter(id => id !== exec.id));
                                  }
                                } else {
                                  setSelectedAgentIds([...selectedAgentIds, exec.id]);
                                }
                              }}
                              className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                  {exec.name.charAt(0)}
                                </div>
                                <span className="text-sm font-bold text-slate-700">{exec.name}</span>
                              </div>
                              {selectedAgentIds.includes(exec.id) && (
                                <Check size={16} className="text-primary" />
                              )}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={handleDownloadChart}
                className="p-2.5 rounded-xl border bg-white text-slate-600 border-slate-200 hover:border-primary hover:text-primary transition-all flex items-center gap-2"
                title="Download as Image"
              >
                <Download size={18} />
                <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Download</span>
              </button>
            </div>
          </div>

          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }}
                  tickFormatter={(value) => comparisonMetric === 'performance' ? `₹${(value / 1000)}k` : value}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '20px', 
                    border: 'none', 
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                    padding: '16px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Won Value' || name === 'Target') return [`₹${value.toLocaleString()}`, name];
                    if (name === 'Conversion Rate') return [`${value}%`, 'Conversion Rate'];
                    if (name === 'Total Leads') return [value, 'Total Leads'];
                    if (name === 'Won Leads') return [value, 'Won Leads'];
                    return [value, name];
                  }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px' }}
                />
                {comparisonMetric === 'performance' ? (
                  <>
                    <Bar 
                      dataKey="wonValue" 
                      name="Won Value" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={32}
                      label={{ 
                        position: 'top', 
                        fill: '#10b981', 
                        fontSize: 10, 
                        fontWeight: 'bold',
                        formatter: (val: number) => `₹${(val / 1000).toFixed(1)}k`
                      }}
                    />
                    <Bar 
                      dataKey="target" 
                      name="Target" 
                      radius={[6, 6, 0, 0]} 
                      barSize={32}
                      fill="#ef4444"
                    >
                      {comparisonData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.wonValue >= entry.target ? '#10b981' : '#ef4444'} 
                          style={entry.wonValue >= entry.target ? { filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.4))' } : {}}
                        />
                      ))}
                    </Bar>
                  </>
                ) : (
                  <>
                    <Bar 
                      dataKey="leadsCount" 
                      name="Total Leads" 
                      fill="#6366f1" 
                      radius={[6, 6, 0, 0]} 
                      barSize={24}
                    />
                    <Bar 
                      dataKey="wonCount" 
                      name="Won Leads" 
                      fill="#10b981" 
                      radius={[6, 6, 0, 0]} 
                      barSize={24}
                    />
                    <Bar 
                      dataKey="conversionRate" 
                      name="Conversion %" 
                      fill="#f59e0b" 
                      radius={[6, 6, 0, 0]} 
                      barSize={24}
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <TrendingUp size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Top Performer</span>
              </div>
              {comparisonData.length > 0 ? (
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {[...comparisonData].sort((a, b) => b.wonValue - a.wonValue)[0].name}
                  </p>
                  <p className="text-sm text-emerald-600 font-bold">
                    ₹{[...comparisonData].sort((a, b) => b.wonValue - a.wonValue)[0].wonValue.toLocaleString()} Won
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">No data available</p>
              )}
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                  <BarChart2 size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Best Conversion</span>
              </div>
              {comparisonData.length > 0 ? (
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {[...comparisonData].sort((a, b) => b.conversionRate - a.conversionRate)[0].name}
                  </p>
                  <p className="text-sm text-indigo-600 font-bold">
                    {[...comparisonData].sort((a, b) => b.conversionRate - a.conversionRate)[0].conversionRate}% Rate
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">No data available</p>
              )}
            </div>

            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                  <Users size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Most Active</span>
              </div>
              {comparisonData.length > 0 ? (
                <div>
                  <p className="text-lg font-black text-slate-900">
                    {[...comparisonData].sort((a, b) => b.leadsCount - a.leadsCount)[0].name}
                  </p>
                  <p className="text-sm text-amber-600 font-bold">
                    {[...comparisonData].sort((a, b) => b.leadsCount - a.leadsCount)[0].leadsCount} Total Leads
                  </p>
                </div>
              ) : (
                <p className="text-slate-400 text-sm italic">No data available</p>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Reminders Section */}
      {reminders.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden">
          <div className="p-6 border-b border-red-50 flex justify-between items-center bg-red-50/30">
            <div className="flex items-center gap-2">
              <AlertCircle size={20} className="text-red-500" />
              <h3 className="text-lg font-bold text-slate-800">Follow-up Reminders</h3>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAllReminders(true)}
                className="text-sm text-red-600 font-bold hover:underline"
              >
                View All
              </button>
              <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-full uppercase tracking-wider">
                {reminders.length} Pending
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Lead Name</th>
                  <th className="px-6 py-4 font-semibold">Company</th>
                  <th className="px-6 py-4 font-semibold">Follow-up Date</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {reminders.map((lead) => {
                  const isPast = (lead.followUpDate || '') < todayStr;
                  const isToday = lead.followUpDate === todayStr;
                  
                  return (
                    <tr 
                      key={lead.id} 
                      className={cn(
                        "hover:bg-red-50/20 transition-colors",
                        isToday && "animate-pulse bg-orange-50/30"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                            isToday ? "bg-orange-100 text-orange-600" : "bg-red-50 text-red-600"
                          )}>
                            {lead.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{lead.name}</p>
                            <p className="text-xs text-slate-400">{lead.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{lead.company}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-sm font-medium flex items-center gap-2",
                          isPast ? "text-red-600 font-bold" : "text-orange-600 font-bold"
                        )}>
                          {isToday && <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping" />}
                          {lead.followUpDate}
                          {isPast && " (Overdue)"}
                          {isToday && " (Today)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                          {lead.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <TakeActionMenu 
                          lead={lead}
                          onUpdateLead={onUpdateLead}
                          onDeleteLead={onDeleteLead}
                          isOpen={activeMenu === lead.id}
                          onToggle={() => setActiveMenu(activeMenu === lead.id ? null : lead.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Alerts Section */}
      {taskAlerts.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 overflow-hidden">
          <div className="p-6 border-b border-indigo-50 flex justify-between items-center bg-indigo-50/30">
            <div className="flex items-center gap-2">
              <CheckSquare size={20} className="text-indigo-500" />
              <h3 className="text-lg font-bold text-slate-800">Task Alerts</h3>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full uppercase tracking-wider">
              {taskAlerts.length} Critical
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Task</th>
                  <th className="px-6 py-4 font-semibold">Due Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Priority</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {taskAlerts.map((task) => {
                  const isPast = task.dueDate < todayStr;
                  const isToday = task.dueDate === todayStr;
                  
                  return (
                    <tr 
                      key={task.id} 
                      className={cn(
                        "hover:bg-indigo-50/20 transition-colors",
                        isToday && "bg-amber-50/30"
                      )}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center",
                            isPast ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-600"
                          )}>
                            <CheckSquare size={14} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                            <p className="text-xs text-slate-400">{task.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-sm font-medium flex items-center gap-2",
                          isPast ? "text-rose-600 font-bold" : "text-amber-600 font-bold"
                        )}>
                          {isToday && <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />}
                          {task.dueDate}
                          {isPast && " (Overdue)"}
                          {isToday && " (Today)"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                          task.priority === 'High' ? "text-rose-600 bg-rose-50 border-rose-100" :
                          task.priority === 'Medium' ? "text-amber-600 bg-amber-50 border-amber-100" :
                          "text-emerald-600 bg-emerald-50 border-emerald-100"
                        )}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Leads & Tasks Grid */}
      <div className={cn(
        "grid gap-8",
        (hasTasks && hasLeads) ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"
      )}>
        {/* Recent Leads Table */}
        <div className={cn(
          "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden",
          (hasTasks && hasLeads) ? "lg:col-span-2" : "grid-cols-1"
        )}>
          <div className="p-6 border-b border-slate-50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-800">Recent Leads</h3>
            <button 
              onClick={onViewAllLeads}
              className="text-sm text-primary font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Lead Name</th>
                  {(!hasTasks) && <th className="px-6 py-4 font-semibold">Company</th>}
                  <th className="px-6 py-4 font-semibold">Status</th>
                  {(!hasTasks) && <th className="px-6 py-4 font-semibold">Value</th>}
                  {(!hasTasks) && <th className="px-6 py-4 font-semibold">Date</th>}
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={(hasTasks) ? 3 : 6} className="px-6 py-8 text-center text-slate-400 text-sm">
                      No leads found.
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => (
                    <tr 
                      key={lead.id} 
                      className={cn(
                        "transition-all hover:shadow-md",
                        lead.status === 'Won' ? "bg-emerald-50/50 hover:bg-emerald-100/50" :
                        lead.status === 'Lost' ? "bg-rose-50/50 hover:bg-rose-100/50" :
                        lead.status === 'New' ? "bg-blue-50/50 hover:bg-blue-100/50" :
                        lead.status === 'Contacted' ? "bg-orange-50/50 hover:bg-orange-100/50" :
                        lead.status === 'Qualified' ? "bg-purple-50/50 hover:bg-purple-100/50" :
                        "hover:bg-slate-50/50"
                      )}
                    >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                                lead.status === 'Won' ? "bg-emerald-200 text-emerald-700" :
                                lead.status === 'Lost' ? "bg-rose-200 text-rose-700" :
                                lead.status === 'New' ? "bg-blue-200 text-blue-700" :
                                lead.status === 'Contacted' ? "bg-orange-200 text-orange-700" :
                                lead.status === 'Qualified' ? "bg-purple-200 text-purple-700" :
                                "bg-blue-50 text-primary"
                              )}>
                                {lead.name.charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800 truncate max-w-[120px]">{lead.name}</p>
                                <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{lead.email}</p>
                              </div>
                            </div>
                          </td>
                          {(!hasTasks) && <td className="px-6 py-4 text-sm text-slate-600">{lead.company}</td>}
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider",
                              lead.status === 'Won' && "bg-green-100 text-green-700",
                              lead.status === 'Lost' && "bg-red-100 text-red-700",
                              lead.status === 'New' && "bg-blue-100 text-blue-700",
                              lead.status === 'Contacted' && "bg-orange-100 text-orange-700",
                              lead.status === 'Qualified' && "bg-purple-100 text-purple-700",
                            )}>
                              {lead.status}
                            </span>
                          </td>
                          {(!hasTasks) && <td className="px-6 py-4 text-sm font-bold text-slate-800">₹{lead.value.toLocaleString()}</td>}
                          {(!hasTasks) && (
                            <td className="px-6 py-4 text-xs text-slate-400">
                              {new Date(lead.createdAt).toLocaleDateString()}
                            </td>
                          )}
                          <td className="px-6 py-4 text-right">
                            <TakeActionMenu 
                              lead={lead}
                              onUpdateLead={onUpdateLead}
                              onDeleteLead={onDeleteLead}
                              isOpen={activeMenu === `recent-${lead.id}`}
                              onToggle={() => setActiveMenu(activeMenu === `recent-${lead.id}` ? null : `recent-${lead.id}`)}
                            />
                          </td>
                        </tr>
                      ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tasks Table */}
        {hasTasks && (
          <div className={cn(
            "bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden",
            !hasLeads && hasTasks && "lg:col-span-3"
          )}>
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Recent Tasks</h3>
              <button 
                onClick={onViewAllTasks}
                className="text-sm text-primary font-medium hover:underline"
              >
                View All
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="px-6 py-4 font-semibold">Task</th>
                    <th className="px-6 py-4 font-semibold">Due Date</th>
                    <th className="px-6 py-4 font-semibold text-right">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTasks.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 text-sm">
                        No tasks found.
                      </td>
                    </tr>
                  ) : (
                      recentTasks.map((task) => {
                        const isOverdue = task.dueDate < todayStr && task.status !== 'Completed';
                        const isDueToday = task.dueDate === todayStr && task.status !== 'Completed';

                        return (
                          <tr key={task.id} className={cn(
                            "hover:bg-slate-50/50 transition-colors",
                            isOverdue && "bg-rose-50/30",
                            isDueToday && "bg-amber-50/30"
                          )}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center relative",
                                  task.status === 'Completed' ? "bg-emerald-50 text-emerald-600" : 
                                  isOverdue ? "bg-rose-100 text-rose-600" :
                                  isDueToday ? "bg-amber-100 text-amber-600" :
                                  "bg-indigo-50 text-indigo-600"
                                )}>
                                  <CheckSquare size={14} />
                                  {(isOverdue || isDueToday) && (
                                    <span className={cn(
                                      "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white",
                                      isOverdue ? "bg-rose-500" : "bg-amber-500"
                                    )} />
                                  )}
                                </div>
                                <div>
                                  <p className={cn(
                                    "text-sm font-semibold text-slate-800 truncate max-w-[150px]",
                                    task.status === 'Completed' && "line-through text-slate-400"
                                  )}>
                                    {task.title}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{task.description}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className={cn(
                                "flex items-center gap-1.5 text-[11px] font-medium",
                                isOverdue ? "text-rose-600" : isDueToday ? "text-amber-600" : "text-slate-500"
                              )}>
                                <Calendar size={12} />
                                {new Date(task.dueDate).toLocaleDateString()}
                                {isOverdue && <span className="text-[9px] font-bold uppercase">(Overdue)</span>}
                                {isDueToday && <span className="text-[9px] font-bold uppercase">(Today)</span>}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                                task.priority === 'High' ? "text-rose-600 bg-rose-50 border-rose-100" :
                                task.priority === 'Medium' ? "text-amber-600 bg-amber-50 border-amber-100" :
                                "text-emerald-600 bg-emerald-50 border-emerald-100"
                              )}>
                                {task.priority}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAllReminders && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAllReminders(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">All Follow-up Reminders</h3>
                    <p className="text-sm text-slate-500 font-medium">{allReminders.length} leads scheduled for follow-up</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowAllReminders(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {allReminders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Clock size={48} className="mb-4 opacity-20" />
                    <p className="italic">No follow-up reminders found.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allReminders.map((lead) => {
                      const isPast = (lead.followUpDate || '') < todayStr;
                      const isToday = lead.followUpDate === todayStr;
                      
                      return (
                        <motion.div 
                          key={lead.id}
                          whileHover={{ y: -4 }}
                          className={cn(
                            "bg-white rounded-2xl border p-5 shadow-sm transition-all hover:shadow-md relative group",
                            isPast ? "border-red-100 bg-red-50/10" : isToday ? "border-orange-100 bg-orange-50/10" : "border-slate-100"
                          )}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm",
                                isPast ? "bg-red-100 text-red-600" : isToday ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-600"
                              )}>
                                {lead.name.charAt(0)}
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-slate-800 leading-tight">{lead.name}</h4>
                                <p className="text-[10px] text-slate-400 font-medium truncate max-w-[120px]">{lead.email}</p>
                              </div>
                            </div>
                            <TakeActionMenu 
                              lead={lead}
                              onUpdateLead={onUpdateLead}
                              onDeleteLead={onDeleteLead}
                              isOpen={activeMenu === `all-reminders-${lead.id}`}
                              onToggle={() => setActiveMenu(activeMenu === `all-reminders-${lead.id}` ? null : `all-reminders-${lead.id}`)}
                            />
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                              <span className="text-slate-400">Company</span>
                              <span className="text-slate-600 truncate max-w-[100px]">{lead.company}</span>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Status</span>
                              <span className={cn(
                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                lead.status === 'New' && "bg-blue-100 text-blue-700",
                                lead.status === 'Contacted' && "bg-orange-100 text-orange-700",
                                lead.status === 'Qualified' && "bg-purple-100 text-purple-700",
                              )}>
                                {lead.status}
                              </span>
                            </div>

                            <div className={cn(
                              "mt-4 pt-4 border-t flex flex-col gap-1",
                              isPast ? "border-red-100" : isToday ? "border-orange-100" : "border-slate-50"
                            )}>
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Follow-up Date</span>
                              <div className={cn(
                                "text-xs font-black flex items-center gap-1.5",
                                isPast ? "text-red-600" : isToday ? "text-orange-600" : "text-slate-600"
                              )}>
                                <Clock size={12} />
                                {lead.followUpDate}
                                {isPast && <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-md ml-auto">OVERDUE</span>}
                                {isToday && <span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded-md ml-auto">TODAY</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Copyright Footer */}
      <div className="pt-12 pb-6 border-t border-slate-100 flex flex-col items-center gap-2">
        <a 
          href="https://techandgoo.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] hover:text-primary transition-colors cursor-pointer"
        >
          @Ravins Tech and Goo Pvt Limited. All Rights Reserved - Developed by Ravin.N
        </a>
        <div className="flex items-center gap-4 text-[10px] text-slate-300 font-bold">
          <span className="hover:text-primary cursor-pointer transition-colors">Privacy Policy</span>
          <span className="w-1 h-1 rounded-full bg-slate-200" />
          <span className="hover:text-primary cursor-pointer transition-colors">Terms of Service</span>
          <span className="w-1 h-1 rounded-full bg-slate-200" />
          <span className="hover:text-primary cursor-pointer transition-colors">Support</span>
        </div>
      </div>
    </div>
  );
}
