import React, { useState, useMemo, useEffect } from 'react';
import { Lead, LeadStatus, User } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Mail, 
  Phone, 
  Building2, 
  Calendar,
  IndianRupee,
  X,
  ChevronDown,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Clock,
  AlertCircle,
  Users,
  Zap,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateId } from '../lib/utils';

interface LeadManagementProps {
  leads: Lead[];
  onAddLead: (lead: Lead) => void;
  onUpdateLead: (lead: Lead) => void;
  onDeleteLead: (id: string) => void;
  currentUser: User;
  users: User[];
  initialStatusFilter?: LeadStatus | 'All';
}

const STATUS_OPTIONS: LeadStatus[] = ['New', 'Contacted', 'Qualified', 'Won', 'Lost', 'Trash'];

export default function LeadManagement({ 
  leads, 
  onAddLead, 
  onUpdateLead, 
  onDeleteLead, 
  currentUser, 
  users,
  initialStatusFilter = 'All'
}: LeadManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'All'>(initialStatusFilter);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [activeFollowUpLead, setActiveFollowUpLead] = useState<Lead | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showWonCongrats, setShowWonCongrats] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus>('New');

  useEffect(() => {
    if (editingLead) {
      setSelectedStatus(editingLead.status);
    } else {
      setSelectedStatus('New');
    }
  }, [editingLead]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Advanced Filter State Variables
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [assignedExecutiveFilter, setAssignedExecutiveFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [leadSourceFilter, setLeadSourceFilter] = useState<string>('All');
  const [minValue, setMinValue] = useState<string>('');
  const [maxValue, setMaxValue] = useState<string>('');

  const leadSources = useMemo(() => {
    const sources = new Set<string>();
    leads.forEach(lead => {
      if (lead.source) sources.add(lead.source);
    });
    return Array.from(sources);
  }, [leads]);

  const executives = useMemo(() => {
    return users.filter(u => u.role === 'executive' || u.role === 'admin');
  }, [users]);

  const calculateBasicIncentive = (amount: number) => {
    if (amount >= 80000) return amount * 0.05;
    if (amount >= 50000) return amount * 0.03;
    if (amount >= 25000) return amount * 0.02;
    return 0;
  };

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (lead.leadId && lead.leadId.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === 'All' 
        ? lead.status !== 'Trash' 
        : lead.status === statusFilter;

      const matchesExecutive = assignedExecutiveFilter === 'All'
        ? true
        : lead.assignedTo === assignedExecutiveFilter;

      let matchesDateRange = true;
      if (startDate) {
        const leadDate = new Date(lead.createdAt).getTime();
        const filterStart = new Date(startDate + 'T00:00:00').getTime();
        matchesDateRange = matchesDateRange && (leadDate >= filterStart);
      }
      if (endDate) {
        const leadDate = new Date(lead.createdAt).getTime();
        const filterEnd = new Date(endDate + 'T23:59:59').getTime();
        matchesDateRange = matchesDateRange && (leadDate <= filterEnd);
      }

      const matchesSource = leadSourceFilter === 'All'
        ? true
        : lead.source === leadSourceFilter;

      let matchesValue = true;
      if (minValue) {
        matchesValue = matchesValue && (lead.value >= Number(minValue));
      }
      if (maxValue) {
        matchesValue = matchesValue && (lead.value <= Number(maxValue));
      }

      const hasAccess = currentUser.role === 'admin' || 
                       lead.createdBy === currentUser.id || 
                       lead.assignedTo === currentUser.id;

      return matchesSearch && matchesStatus && matchesExecutive && matchesDateRange && matchesSource && matchesValue && hasAccess;
    });
  }, [leads, searchTerm, statusFilter, assignedExecutiveFilter, startDate, endDate, leadSourceFilter, minValue, maxValue, currentUser]);

  const handleSaveLead = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const followUpDateVal = formData.get('followUpDate') as string;
      const leadData: Partial<Lead> = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        company: formData.get('company') as string,
        status: formData.get('status') as LeadStatus,
        value: Number(formData.get('value')),
        source: formData.get('source') as string,
        notes: formData.get('notes') as string,
        followUpDate: followUpDateVal || undefined,
        website: formData.get('website') as string,
        alternateMobileNumber: formData.get('alternateMobileNumber') as string,
        assignedTo: formData.get('assignedTo') as string || (currentUser.role === 'executive' ? currentUser.id : undefined),
        lostReason: formData.get('lostReason') as string || undefined,
      };

      if (editingLead) {
        const isNowWon = leadData.status === 'Won' && editingLead.status !== 'Won';
        
        await onUpdateLead({
          ...editingLead,
          ...leadData,
          updatedAt: new Date().toISOString(),
        } as Lead);
        
        if (isNowWon) {
          setShowWonCongrats(true);
        }
      } else {
        // Generate DLPXXX ID
        const dlpLeads = leads.filter(l => l.leadId && /^DLP\d+$/.test(l.leadId));
        
        let nextNumber = 1;
        if (dlpLeads.length > 0) {
          const numbers = dlpLeads.map(l => {
            const match = l.leadId!.match(/\d+/);
            return match ? parseInt(match[0]) : 0;
          });
          nextNumber = Math.max(...numbers) + 1;
        }
        
        const formattedId = `DLP${nextNumber.toString().padStart(3, '0')}`;

        await onAddLead({
          ...leadData,
          id: generateId(),
          leadId: formattedId,
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Lead);
      }
      setIsModalOpen(false);
      setEditingLead(null);
    } catch (error: any) {
      console.error('Error saving lead:', error);
      alert(`Error saving lead: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeFollowUpLead || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const action = formData.get('action') as string;
      const nextDate = formData.get('nextFollowUpDate') as string;
      let newStatus = formData.get('newStatus') as LeadStatus;
      const actionNotes = formData.get('actionNotes') as string;
      const lostReason = formData.get('lostReason') as string;

      // Automatic status progression logic
      if (newStatus === activeFollowUpLead.status) {
        if (activeFollowUpLead.status === 'New' && (action === 'Call' || action === 'WhatsApp' || action === 'Email')) {
          newStatus = 'Contacted';
        } else if (activeFollowUpLead.status === 'Contacted' && action === 'Meeting') {
          newStatus = 'Qualified';
        }
      }

      const updatedNotes = `${activeFollowUpLead.notes}\n\n[${new Date().toLocaleString()}] Action: ${action}\nNotes: ${actionNotes}`;
      
      const updatedLead: Lead = {
        ...activeFollowUpLead,
        status: newStatus,
        followUpDate: nextDate || undefined,
        notes: updatedNotes,
        lostReason: newStatus === 'Lost' ? lostReason : activeFollowUpLead.lostReason,
        updatedAt: new Date().toISOString(),
      };

      await onUpdateLead(updatedLead);
      
      if (newStatus === 'Won' && activeFollowUpLead.status !== 'Won') {
        setShowWonCongrats(true);
      }

      setIsFollowUpModalOpen(false);
      setActiveFollowUpLead(null);
    } catch (error) {
      console.error('Error updating follow-up:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const [followUpStatus, setFollowUpStatus] = useState<LeadStatus>('New');

  useEffect(() => {
    if (activeFollowUpLead) {
      setFollowUpStatus(activeFollowUpLead.status);
    }
  }, [activeFollowUpLead]);

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search leads by name, ID, email or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all active:scale-95 cursor-pointer",
              showAdvancedFilters || statusFilter !== 'All' || assignedExecutiveFilter !== 'All' || startDate || endDate || leadSourceFilter !== 'All' || minValue || maxValue
                ? "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            )}
          >
            <Filter size={16} />
            <span>Advanced Filters</span>
            {(statusFilter !== 'All' || assignedExecutiveFilter !== 'All' || startDate || endDate || leadSourceFilter !== 'All' || minValue || maxValue) && (
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            )}
          </button>
          {initialStatusFilter !== 'Trash' && (
            <button 
              onClick={() => {
                setEditingLead(null);
                setIsModalOpen(true);
              }}
              className="bg-primary hover:bg-dark text-white px-4 py-2 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap text-sm font-semibold cursor-pointer"
            >
              <Plus size={18} />
              Add Lead
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filter Panel */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0, y: -10 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</label>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    {initialStatusFilter !== 'Trash' && <option value="All">All Statuses</option>}
                    {STATUS_OPTIONS.filter(s => initialStatusFilter === 'Trash' ? s === 'Trash' : s !== 'Trash').map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Assigned Executive Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Executive</label>
                <div className="relative">
                  <select
                    value={assignedExecutiveFilter}
                    onChange={(e) => setAssignedExecutiveFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="All">All Executives</option>
                    {executives.map(exec => (
                      <option key={exec.id} value={exec.id}>{exec.name} ({exec.role})</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Creation Date Range */}
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creation Date Range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-slate-600"
                  />
                  <span className="text-slate-400 text-xs font-medium">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm text-slate-600"
                  />
                </div>
              </div>

              {/* Lead Source Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Lead Source</label>
                <div className="relative">
                  <select
                    value={leadSourceFilter}
                    onChange={(e) => setLeadSourceFilter(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="All">All Sources</option>
                    {leadSources.map(src => (
                      <option key={src} value={src}>{src}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                </div>
              </div>

              {/* Value Range Filter */}
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Value (INR)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minValue}
                    onChange={(e) => setMinValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                  <span className="text-slate-400 text-xs font-medium">-</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxValue}
                    onChange={(e) => setMaxValue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
                  />
                </div>
              </div>

              {/* Clear Action */}
              <div className="flex items-end justify-end">
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setAssignedExecutiveFilter('All');
                    setStartDate('');
                    setEndDate('');
                    setLeadSourceFilter('All');
                    setMinValue('');
                    setMaxValue('');
                    setSearchTerm('');
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <X size={16} />
                  Reset Filters
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Badges */}
      {(statusFilter !== 'All' || assignedExecutiveFilter !== 'All' || startDate || endDate || leadSourceFilter !== 'All' || minValue || maxValue) && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600">
          <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] mr-1">Active Filters:</span>
          
          {statusFilter !== 'All' && (
            <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm font-medium">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter('All')} className="hover:text-primary transition-colors ml-1 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {assignedExecutiveFilter !== 'All' && (
            <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm font-medium">
              Executive: {users.find(u => u.id === assignedExecutiveFilter)?.name || assignedExecutiveFilter}
              <button onClick={() => setAssignedExecutiveFilter('All')} className="hover:text-primary transition-colors ml-1 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {(startDate || endDate) && (
            <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm font-medium">
              Created: {startDate || '...'} to {endDate || '...'}
              <button onClick={() => { setStartDate(''); setEndDate(''); }} className="hover:text-primary transition-colors ml-1 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {leadSourceFilter !== 'All' && (
            <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm font-medium">
              Source: {leadSourceFilter}
              <button onClick={() => setLeadSourceFilter('All')} className="hover:text-primary transition-colors ml-1 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          {(minValue || maxValue) && (
            <span className="flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-sm font-medium">
              Value: {minValue ? `₹${minValue}` : '0'} - {maxValue ? `₹${maxValue}` : '∞'}
              <button onClick={() => { setMinValue(''); setMaxValue(''); }} className="hover:text-primary transition-colors ml-1 cursor-pointer">
                <X size={12} />
              </button>
            </span>
          )}

          <button 
            onClick={() => {
              setStatusFilter('All');
              setAssignedExecutiveFilter('All');
              setStartDate('');
              setEndDate('');
              setLeadSourceFilter('All');
              setMinValue('');
              setMaxValue('');
            }}
            className="text-primary hover:underline font-semibold ml-auto text-[11px] px-2 cursor-pointer"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Leads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredLeads.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full py-20 text-center bg-white rounded-2xl border border-dashed border-slate-200"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                <Users size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">No leads found</h3>
              <p className="text-slate-400 text-sm mt-1">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            filteredLeads.map((lead) => (
              <motion.div 
                key={lead.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn(
                  "rounded-2xl shadow-sm border transition-all group overflow-hidden hover:shadow-xl relative",
                  lead.status === 'Won' ? "bg-emerald-50 border-emerald-200 hover:border-emerald-400" :
                  lead.status === 'Lost' ? "bg-rose-50 border-rose-200 hover:border-rose-400" :
                  lead.status === 'New' ? "bg-blue-50 border-blue-200 hover:border-blue-400" :
                  lead.status === 'Contacted' ? "bg-orange-50 border-orange-200 hover:border-orange-400" :
                  lead.status === 'Qualified' ? "bg-purple-50 border-purple-200 hover:border-purple-400" :
                  lead.status === 'Trash' ? "bg-slate-50 border-slate-200 hover:border-slate-400 opacity-75" :
                  "bg-white border-slate-100 hover:border-primary/20"
                )}
              >
                {/* Status Watermark Icon */}
                <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none">
                  {lead.status === 'Won' && <CheckCircle2 size={120} />}
                  {lead.status === 'Lost' && <XCircle size={120} />}
                  {lead.status === 'New' && <Zap size={120} />}
                  {lead.status === 'Contacted' && <PhoneCall size={120} />}
                  {lead.status === 'Qualified' && <UserCheck size={120} />}
                  {lead.status === 'Trash' && <Trash2 size={120} />}
                </div>

                <div className="p-6 relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg transition-colors",
                        lead.status === 'Won' ? "bg-emerald-200 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white" :
                        lead.status === 'Lost' ? "bg-rose-200 text-rose-700 group-hover:bg-rose-600 group-hover:text-white" :
                        lead.status === 'New' ? "bg-blue-200 text-blue-700 group-hover:bg-blue-600 group-hover:text-white" :
                        lead.status === 'Contacted' ? "bg-orange-200 text-orange-700 group-hover:bg-orange-600 group-hover:text-white" :
                        lead.status === 'Qualified' ? "bg-purple-200 text-purple-700 group-hover:bg-purple-600 group-hover:text-white" :
                        lead.status === 'Trash' ? "bg-slate-200 text-slate-700 group-hover:bg-slate-600 group-hover:text-white" :
                        "bg-blue-50 text-primary group-hover:bg-primary group-hover:text-white"
                      )}>
                        {lead.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800 text-lg leading-tight">{lead.name}</h4>
                          {lead.leadId && (
                            <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {lead.leadId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                          <Building2 size={12} />
                          {lead.company}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1",
                        lead.status === 'Won' && "bg-green-100 text-green-700",
                        lead.status === 'Lost' && "bg-red-100 text-red-700",
                        lead.status === 'New' && "bg-primary/10 text-primary",
                        lead.status === 'Contacted' && "bg-secondary/10 text-secondary",
                        lead.status === 'Qualified' && "bg-purple-100 text-purple-700",
                        lead.status === 'Trash' && "bg-slate-100 text-slate-700",
                      )}>
                        {lead.status === 'Won' && <CheckCircle2 size={10} />}
                        {lead.status === 'Lost' && <XCircle size={10} />}
                        {lead.status === 'New' && <Zap size={10} />}
                        {lead.status === 'Contacted' && <PhoneCall size={10} />}
                        {lead.status === 'Qualified' && <UserCheck size={10} />}
                        {lead.status === 'Trash' && <Trash2 size={10} />}
                        {lead.status}
                      </span>
                      <p className="text-sm font-bold text-primary">₹{lead.value.toLocaleString()}</p>
                      {lead.status === 'Won' && (
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-black text-secondary flex items-center gap-1">
                            <Zap size={10} />
                            Incentive: ₹{calculateBasicIncentive(lead.value).toLocaleString()}
                          </span>
                          {lead.isPresentThisMonth && (
                            <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                              <UserCheck size={10} />
                              + Standby: ₹{(lead.value * 0.015).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {lead.status === 'Lost' && lead.lostReason && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Reason for Loss</p>
                      <p className="text-sm text-red-700 italic">"{lead.lostReason}"</p>
                    </div>
                  )}

                  <div className="space-y-3 mt-6">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Mail size={14} />
                      </div>
                      <span className="truncate">{lead.email}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Phone size={14} />
                      </div>
                      <span>{lead.phone}</span>
                    </div>
                    {lead.website && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Building2 size={14} />
                        </div>
                        <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                          {lead.website}
                        </a>
                      </div>
                    )}
                    {lead.alternateMobileNumber && (
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <Phone size={14} />
                        </div>
                        <span className="truncate">Alt: {lead.alternateMobileNumber}</span>
                      </div>
                    )}
                    {lead.followUpDate && (
                      <div className="flex items-center gap-3 text-sm text-secondary font-medium bg-secondary/10 p-2 rounded-lg">
                        <Clock size={14} />
                        <span>Follow-up: {new Date(lead.followUpDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {lead.assignedTo && (
                      <div className="flex items-center gap-3 text-sm text-blue-600 font-medium bg-blue-50 p-2 rounded-lg">
                        <Users size={14} />
                        <span>Assigned to: {users.find(u => u.id === lead.assignedTo)?.name || 'Unknown'}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50/50 p-4 border-t border-slate-50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">
                    Created {new Date(lead.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-2">
                    {lead.status === 'Trash' ? (
                      <button 
                        onClick={() => onUpdateLead({ ...lead, status: 'New', updatedAt: new Date().toISOString() })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        title="Restore Lead"
                      >
                        <Zap size={14} />
                        Restore
                      </button>
                    ) : (
                      lead.status !== 'Won' && lead.status !== 'Lost' && (
                        <button 
                          onClick={() => {
                            setActiveFollowUpLead(lead);
                            setIsFollowUpModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                        >
                          <Zap size={14} />
                          Take Action
                        </button>
                      )
                    )}
                    {currentUser.role === 'admin' && lead.status === 'Won' && (
                      <button 
                        onClick={() => onUpdateLead({ ...lead, isPresentThisMonth: !lead.isPresentThisMonth, updatedAt: new Date().toISOString() })}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                          lead.isPresentThisMonth 
                            ? "bg-secondary text-white shadow-lg shadow-secondary/20" 
                            : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                        )}
                        title={lead.isPresentThisMonth ? "Mark as Not Present" : "Mark as Present this Month"}
                      >
                        <UserCheck size={14} />
                        {lead.isPresentThisMonth ? 'Present' : 'Standby?'}
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setEditingLead(lead);
                        setIsModalOpen(true);
                      }}
                      className="p-2 hover:bg-white hover:text-primary rounded-lg text-slate-400 transition-all shadow-sm hover:shadow-md"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setShowDeleteConfirm(lead.id)}
                      className="p-2 hover:bg-white hover:text-red-500 rounded-lg text-slate-400 transition-all shadow-sm hover:shadow-md"
                      title={lead.status === 'Trash' ? "Delete Permanently" : "Move to Trash"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Lead Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
              onAnimationComplete={() => {
                if (isModalOpen && editingLead) {
                  setSelectedStatus(editingLead.status);
                } else if (isModalOpen && !editingLead) {
                  setSelectedStatus('New');
                }
              }}
            >
              <div className="blue-orange-gradient p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingLead ? 'Edit Lead' : 'Add New Lead'}</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveLead} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Full Name</label>
                    <input 
                      name="name"
                      defaultValue={editingLead?.name}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Company</label>
                    <input 
                      name="company"
                      defaultValue={editingLead?.company}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                    <input 
                      name="email"
                      type="email"
                      defaultValue={editingLead?.email}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="john@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                    <input 
                      name="phone"
                      defaultValue={editingLead?.phone}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lead Status</label>
                    <select 
                      name="status"
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as LeadStatus)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                      {STATUS_OPTIONS.filter(s => s !== 'Trash').map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                  {selectedStatus === 'Lost' && (
                    <div className="space-y-2 col-span-full">
                      <label className="text-sm font-semibold text-slate-700">Reason for Loss</label>
                      <textarea 
                        name="lostReason"
                        required
                        defaultValue={editingLead?.lostReason}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                        placeholder="Why was this lead lost?"
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Estimated Value (₹)</label>
                    <input 
                      name="value"
                      type="number"
                      defaultValue={editingLead?.value}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Lead Source</label>
                    <input 
                      name="source"
                      defaultValue={editingLead?.source}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="Website, Referral, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Website</label>
                    <input 
                      name="website"
                      defaultValue={editingLead?.website}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="www.example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Alternate Mobile Number</label>
                    <input 
                      name="alternateMobileNumber"
                      defaultValue={editingLead?.alternateMobileNumber}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      placeholder="+1 234 567 890"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Follow-up Date</label>
                    <input 
                      name="followUpDate"
                      type="date"
                      defaultValue={editingLead?.followUpDate}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                  {currentUser.role === 'admin' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Assign To</label>
                      <select 
                        name="assignedTo"
                        defaultValue={editingLead?.assignedTo || ''}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      >
                        <option value="">Unassigned</option>
                        {users.filter(u => u.role === 'executive').map(user => (
                          <option key={user.id} value={user.id}>{user.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Notes</label>
                  <textarea 
                    name="notes"
                    defaultValue={editingLead?.notes}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                    placeholder="Add any additional details..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-2.5 bg-primary hover:bg-dark text-white rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? 'Saving...' : (editingLead ? 'Update Lead' : 'Create Lead')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Follow-up Action Modal */}
      <AnimatePresence>
        {isFollowUpModalOpen && activeFollowUpLead && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFollowUpModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Zap className="text-primary" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Follow-up Action</h3>
                    <p className="text-xs text-slate-400">Updating: {activeFollowUpLead.name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleFollowUpAction} className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Action Taken</label>
                    <select 
                      name="action"
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                      <option value="Call">Marked as Call</option>
                      <option value="Email">Sent Email</option>
                      <option value="Meeting">Held Meeting</option>
                      <option value="WhatsApp">Sent WhatsApp</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Update Status</label>
                    <select 
                      name="newStatus"
                      value={followUpStatus}
                      onChange={(e) => setFollowUpStatus(e.target.value as LeadStatus)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    >
                      {STATUS_OPTIONS.filter(s => s !== 'Trash').map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  {followUpStatus === 'Lost' && (
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Reason for Loss</label>
                      <select 
                        name="lostReason"
                        required
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      >
                        <option value="">Select a reason...</option>
                        <option value="Price too high">Price too high</option>
                        <option value="Competitor chosen">Competitor chosen</option>
                        <option value="No requirement now">No requirement now</option>
                        <option value="Not reachable">Not reachable</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Next Follow-up Date (Optional)</label>
                    <input 
                      name="nextFollowUpDate"
                      type="date"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Notes for this action</label>
                    <textarea 
                      name="actionNotes"
                      rows={3}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      placeholder="What happened during this follow-up?"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsFollowUpModalOpen(false)}
                    className="flex-1 px-6 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-primary hover:bg-dark text-white rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : 'Update Lead'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Won Congratulations Modal */}
      <AnimatePresence>
        {showWonCongrats && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWonCongrats(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 10 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 text-center shadow-2xl overflow-hidden"
            >
              {/* Confetti-like background elements */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500" />
              
              <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                <CheckCircle2 size={48} />
              </div>
              
              <h2 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Congratulations! 🎉</h2>
              <p className="text-slate-600 text-lg mb-8">
                You've successfully won this lead! Great job on closing the deal.
              </p>
              
              <button 
                onClick={() => setShowWonCongrats(false)}
                className="w-full py-4 bg-primary hover:bg-dark text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-95"
              >
                Awesome!
              </button>
              
              {/* Decorative elements */}
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-secondary/5 rounded-full blur-3xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-8 text-center shadow-2xl"
            >
              {(() => {
                const leadToDelete = leads.find(l => l.id === showDeleteConfirm);
                const isTrash = leadToDelete?.status === 'Trash';
                
                return (
                  <>
                    <div className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                      isTrash ? "bg-red-50 text-red-500" : "bg-orange-50 text-orange-500"
                    )}>
                      {isTrash ? <AlertCircle size={32} /> : <Trash2 size={32} />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {isTrash ? 'Delete Permanently?' : 'Move to Trash?'}
                    </h3>
                    <p className="text-slate-500 mt-2">
                      {isTrash 
                        ? 'This action cannot be undone. This lead will be removed forever.' 
                        : 'This lead will be moved to Trash. You can restore it later if needed.'}
                    </p>
                    <div className="flex flex-col gap-2 mt-8">
                      <button 
                        onClick={() => {
                          if (isTrash) {
                            onDeleteLead(showDeleteConfirm);
                          } else if (leadToDelete) {
                            onUpdateLead({ 
                              ...leadToDelete, 
                              status: 'Trash', 
                              updatedAt: new Date().toISOString() 
                            });
                          }
                          setShowDeleteConfirm(null);
                        }}
                        className={cn(
                          "w-full py-3 text-white rounded-xl font-bold transition-all",
                          isTrash ? "bg-red-500 hover:bg-red-600" : "bg-orange-500 hover:bg-orange-600"
                        )}
                      >
                        {isTrash ? 'Yes, Delete Forever' : 'Move to Trash'}
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(null)}
                        className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
