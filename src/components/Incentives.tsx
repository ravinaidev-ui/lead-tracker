import React, { useMemo, useState, useEffect } from 'react';
import { Lead, User, IncentiveSlab } from '../types';
import { 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  IndianRupee,
  Calendar,
  UserCheck,
  Zap,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Edit2,
  Save,
  X,
  Download
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface IncentivesProps {
  leads: Lead[];
  users: User[];
  currentUser: User;
  onUpdateLead: (lead: Lead) => void;
  onUpdateUser: (user: User) => void;
}

export default function Incentives({ leads, users, currentUser, onUpdateLead, onUpdateUser }: IncentivesProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [pendingThresholdUpdate, setPendingThresholdUpdate] = useState<{ user: User, newValue: number } | null>(null);
  
  const [slabs, setSlabs] = useState<IncentiveSlab[]>(() => {
    const saved = localStorage.getItem('incentive_slabs');
    if (saved) return JSON.parse(saved);
    return [
      { id: '3', minAmount: 80000, percentage: 5, label: 'High Performance' },
      { id: '2', minAmount: 50000, percentage: 3, label: 'Mid Range' },
      { id: '1', minAmount: 25000, percentage: 2, label: 'Base Slab' }
    ];
  });

  const [isEditingSlabs, setIsEditingSlabs] = useState(false);
  const [editingSlabs, setEditingSlabs] = useState<IncentiveSlab[]>([]);
  const [pendingSlabUpdate, setPendingSlabUpdate] = useState<IncentiveSlab[] | null>(null);

  useEffect(() => {
    localStorage.setItem('incentive_slabs', JSON.stringify(slabs));
  }, [slabs]);

  const wonLeads = useMemo(() => {
    return leads.filter(l => {
      if (l.status !== 'Won') return false;
      const leadDate = new Date(l.updatedAt || l.createdAt);
      return leadDate.getMonth() === selectedDate.getMonth() && 
             leadDate.getFullYear() === selectedDate.getFullYear();
    });
  }, [leads, selectedDate]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const yearList = [];
    for (let y = currentYear + 1; y >= startYear; y--) {
      yearList.push(y);
    }
    return yearList;
  }, []);

  const handlePrevMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const calculateBasicIncentive = (amount: number) => {
    const sortedSlabs = [...slabs].sort((a, b) => b.minAmount - a.minAmount);
    const slab = sortedSlabs.find(s => amount >= s.minAmount);
    return slab ? amount * (slab.percentage / 100) : 0;
  };

  const calculateStandbyIncentive = (amount: number, isPresent: boolean) => {
    return isPresent ? amount * 0.015 : 0;
  };

  const userIncentives = useMemo(() => {
    const targetUsers = currentUser.role === 'admin' ? users : [currentUser];
    
    return targetUsers.map(user => {
      const userLeads = wonLeads.filter(l => l.assignedTo === user.id || (l.createdBy === user.id && !l.assignedTo));
      
      const totalWonValue = userLeads.reduce((sum, l) => sum + l.value, 0);
      const threshold = user.incentiveThreshold || 60000;
      const isEligible = totalWonValue >= threshold;
      
      let totalBasic = 0;
      let totalStandby = 0;
      let currentSlabLevel = 'None';
      
      if (isEligible) {
        userLeads.forEach(lead => {
          totalBasic += calculateBasicIncentive(lead.value);
          totalStandby += calculateStandbyIncentive(lead.value, !!lead.isPresentThisMonth);
          
          // Determine highest slab level reached for any lead
          const sortedSlabs = [...slabs].sort((a, b) => b.minAmount - a.minAmount);
          const highestSlab = sortedSlabs.find(s => lead.value >= s.minAmount);
          if (highestSlab) {
            const currentHighestMin = sortedSlabs.find(s => currentSlabLevel.includes(s.label))?.minAmount || 0;
            if (highestSlab.minAmount >= currentHighestMin) {
              currentSlabLevel = `${highestSlab.label} (${highestSlab.percentage}%)`;
            }
          }
        });
      }

      return {
        user,
        leads: userLeads,
        totalWonValue,
        threshold,
        isEligible,
        currentSlabLevel,
        remainingTarget: Math.max(0, threshold - totalWonValue),
        totalBasic,
        totalStandby,
        total: totalBasic + totalStandby
      };
    });
  }, [wonLeads, users, currentUser]);

  const togglePresence = (lead: Lead) => {
    if (currentUser.role !== 'admin') return;
    onUpdateLead({
      ...lead,
      isPresentThisMonth: !lead.isPresentThisMonth,
      updatedAt: new Date().toISOString()
    });
  };

  const handleDownloadReport = () => {
    const headers = [
      'Executive Name',
      'Total Won Value (₹)',
      'Target Threshold (₹)',
      'Basic Incentive (₹)',
      'Standby Incentive (₹)',
      'Total Incentive (₹)',
      'Eligibility',
      'Slab Level'
    ];

    const rows = userIncentives.map(data => [
      data.user.name,
      data.totalWonValue,
      data.threshold,
      data.totalBasic,
      data.totalStandby,
      data.total,
      data.isEligible ? 'Eligible' : 'Not Eligible',
      data.currentSlabLevel
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const fileName = `Incentive_Report_${months[selectedDate.getMonth()]}_${selectedDate.getFullYear()}.csv`;
    
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8">
      {/* Month/Year Selector */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Incentive Dashboard</h2>
          <p className="text-slate-400 text-sm font-medium">Tracking performance and rewards for {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100">
          <button 
            onClick={handlePrevMonth}
            className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-primary"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className="flex items-center gap-2 px-4">
            <select 
              value={selectedDate.getMonth()}
              onChange={(e) => {
                const d = new Date(selectedDate);
                d.setMonth(parseInt(e.target.value));
                setSelectedDate(d);
              }}
              className="bg-transparent font-black text-slate-900 outline-none cursor-pointer appearance-none text-sm"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
            <select 
              value={selectedDate.getFullYear()}
              onChange={(e) => {
                const d = new Date(selectedDate);
                d.setFullYear(parseInt(e.target.value));
                setSelectedDate(d);
              }}
              className="bg-transparent font-black text-slate-900 outline-none cursor-pointer appearance-none text-sm"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button 
            onClick={handleNextMonth}
            className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-primary"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {currentUser.role === 'admin' && (
          <button 
            onClick={handleDownloadReport}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center gap-2"
          >
            <Download size={18} />
            Download Report
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {userIncentives.map(({ user, totalBasic, totalStandby, total, isEligible, remainingTarget, totalWonValue, threshold, currentSlabLevel }) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Zap size={80} />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{user.name}</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{user.role}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {isEligible ? (
                  <div className="px-2 py-1 bg-green-100 text-green-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Eligible
                  </div>
                ) : (
                  <div className="px-2 py-1 bg-orange-100 text-orange-600 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <Clock size={12} />
                    Pending
                  </div>
                )}
                <div className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                  {currentSlabLevel}
                </div>
              </div>
            </div>

            {/* Threshold Adjustment (Admin Only) */}
            {currentUser.role === 'admin' && (
              <div className="mb-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Incentive Target (Threshold)</label>
                <div className="flex items-center gap-2">
                  <IndianRupee size={14} className="text-slate-400" />
                  <input 
                    type="number"
                    defaultValue={threshold}
                    onBlur={(e) => {
                      const newVal = Number(e.target.value);
                      if (newVal !== threshold) {
                        setPendingThresholdUpdate({ user, newValue: newVal });
                      }
                    }}
                    className="bg-transparent font-black text-slate-900 outline-none w-full text-sm"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="mb-4">
                <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                  <span>Eligibility Progress</span>
                  <span>{Math.min(100, Math.round((totalWonValue / threshold) * 100))}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (totalWonValue / threshold) * 100)}%` }}
                    className={cn(
                      "h-full rounded-full",
                      isEligible ? "bg-green-500" : "bg-orange-500"
                    )}
                  />
                </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Total Won</span>
                <span className="text-sm font-black text-slate-900">₹{totalWonValue.toLocaleString()}</span>
              </div>
              {!isEligible && (
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-2xl border border-orange-100">
                  <span className="text-xs font-bold text-orange-600">Target to Complete</span>
                  <span className="text-sm font-black text-orange-700">₹{remainingTarget.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Earned Incentive</span>
                <span className="text-sm font-black text-slate-900">₹{totalBasic.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl">
                <span className="text-xs font-bold text-slate-500">Standby Incentive</span>
                <span className="text-sm font-black text-secondary">₹{totalStandby.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-slate-800">Total Incentive</span>
                <span className="text-xl font-black text-primary">₹{total.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Won Clients List for Admin to select Presence */}
      {currentUser.role === 'admin' && (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Won Clients List</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Select clients present for this month for Standby Incentive (1.5%)</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-full text-[10px] font-black uppercase tracking-widest">
              <Calendar size={14} />
              {months[selectedDate.getMonth()]} {selectedDate.getFullYear()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Name</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Package Amount</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned To</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Present this Month?</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Incentives</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {wonLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400 italic">
                      No won leads found to calculate incentives.
                    </td>
                  </tr>
                ) : (
                  wonLeads.map((lead) => {
                    const basic = calculateBasicIncentive(lead.value);
                    const standby = calculateStandbyIncentive(lead.value, !!lead.isPresentThisMonth);
                    const assignedUser = users.find(u => u.id === lead.assignedTo || u.id === lead.createdBy);

                    return (
                      <tr key={lead.id} className="hover:bg-emerald-50/30 transition-all group bg-emerald-50/10">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                              {lead.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-800">{lead.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-500 font-medium">{lead.company}</td>
                        <td className="px-8 py-4">
                          <span className="font-black text-slate-900">₹{lead.value.toLocaleString()}</span>
                        </td>
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                              {assignedUser?.name.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-600">{assignedUser?.name || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-center">
                          {currentUser.role === 'admin' ? (
                            <button 
                              onClick={() => togglePresence(lead)}
                              className={cn(
                                "w-10 h-6 rounded-full relative transition-all duration-300",
                                lead.isPresentThisMonth ? "bg-secondary" : "bg-slate-200"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300",
                                lead.isPresentThisMonth ? "left-5" : "left-1"
                              )} />
                            </button>
                          ) : (
                            <div className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              lead.isPresentThisMonth ? "bg-secondary/10 text-secondary" : "bg-slate-100 text-slate-400"
                            )}>
                              {lead.isPresentThisMonth ? <UserCheck size={12} /> : <Users size={12} />}
                              {lead.isPresentThisMonth ? 'Present' : 'Not Present'}
                            </div>
                          )}
                        </td>
                        <td className="px-8 py-4 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-primary">Basic: ₹{basic.toLocaleString()}</span>
                            {standby > 0 && <span className="text-[10px] font-black text-secondary">Standby: ₹{standby.toLocaleString()}</span>}
                          </div>
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

      {/* Slab Info */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp size={120} />
        </div>
        <div className="flex justify-between items-center mb-6 relative z-10">
          <h4 className="text-lg font-black flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            Incentive Slab Structure
          </h4>
          {currentUser.role === 'admin' && (
            <button 
              onClick={() => {
                if (isEditingSlabs) {
                  setIsEditingSlabs(false);
                } else {
                  setEditingSlabs([...slabs]);
                  setIsEditingSlabs(true);
                }
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              {isEditingSlabs ? <X size={20} /> : <Edit2 size={20} />}
            </button>
          )}
        </div>

        {isEditingSlabs ? (
          <div className="space-y-4 relative z-10">
            {editingSlabs.map((slab, index) => (
              <div key={slab.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Label</label>
                  <input 
                    type="text"
                    value={slab.label}
                    onChange={(e) => {
                      const newSlabs = [...editingSlabs];
                      newSlabs[index] = { ...slab, label: e.target.value };
                      setEditingSlabs(newSlabs);
                    }}
                    className="bg-transparent font-black text-white outline-none w-full border-b border-white/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Min Amount (₹)</label>
                  <input 
                    type="number"
                    value={slab.minAmount}
                    onChange={(e) => {
                      const newSlabs = [...editingSlabs];
                      newSlabs[index] = { ...slab, minAmount: parseInt(e.target.value) || 0 };
                      setEditingSlabs(newSlabs);
                    }}
                    className="bg-transparent font-black text-white outline-none w-full border-b border-white/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Percentage (%)</label>
                  <input 
                    type="number"
                    value={slab.percentage}
                    onChange={(e) => {
                      const newSlabs = [...editingSlabs];
                      newSlabs[index] = { ...slab, percentage: parseFloat(e.target.value) || 0 };
                      setEditingSlabs(newSlabs);
                    }}
                    className="bg-transparent font-black text-white outline-none w-full border-b border-white/20 focus:border-primary transition-all"
                  />
                </div>
              </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
              <button 
                onClick={() => setIsEditingSlabs(false)}
                className="px-6 py-2 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => setPendingSlabUpdate(editingSlabs)}
                className="px-6 py-2 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <Save size={18} />
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
            {[...slabs].sort((a, b) => b.minAmount - a.minAmount).map((slab, index) => (
              <div key={slab.id} className="p-4 bg-white/5 rounded-2xl border border-white/10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{slab.label}</p>
                <p className="text-xl font-black">₹{slab.minAmount.toLocaleString()} +</p>
                <p className={cn(
                  "text-3xl font-black mt-2",
                  index === 0 ? "text-yellow-400" : index === 1 ? "text-orange-400" : "text-primary"
                )}>{slab.percentage}%</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 pt-8 border-t border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-secondary/20 text-secondary flex items-center justify-center shrink-0">
            <UserCheck size={24} />
          </div>
          <div>
            <p className="font-bold text-slate-200">Standby Incentive</p>
            <p className="text-sm text-slate-400">Flat <span className="text-secondary font-black">1.5%</span> for clients marked as "Present this Month" by Admin.</p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {pendingThresholdUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Update Threshold?</h3>
            <p className="text-slate-500 font-medium mb-8">
              Are you sure you want to change the incentive threshold for <span className="text-slate-900 font-bold">{pendingThresholdUpdate.user.name}</span> to <span className="text-primary font-black">₹{pendingThresholdUpdate.newValue.toLocaleString()}</span>?
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setPendingThresholdUpdate(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onUpdateUser({ 
                    ...pendingThresholdUpdate.user, 
                    incentiveThreshold: pendingThresholdUpdate.newValue 
                  });
                  setPendingThresholdUpdate(null);
                }}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Slab Update Confirmation Modal */}
      {pendingSlabUpdate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100"
          >
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            
            <h3 className="text-2xl font-black text-slate-900 mb-2">Update Slab Structure?</h3>
            <p className="text-slate-500 font-medium mb-8">
              Are you sure you want to update the incentive slab structure? This will affect how all future incentives are calculated.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setPendingSlabUpdate(null)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setSlabs(pendingSlabUpdate);
                  setPendingSlabUpdate(null);
                  setIsEditingSlabs(false);
                }}
                className="flex-1 py-4 bg-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
