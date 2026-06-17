import React, { useMemo, useState } from 'react';
import { Lead, User } from '../types';
import * as XLSX from 'xlsx';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  XCircle, 
  Clock,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format, startOfDay, startOfWeek, startOfMonth, subDays, isWithinInterval, parseISO } from 'date-fns';

interface ReportsProps {
  leads: Lead[];
  currentUser: User;
  users: User[];
}

export default function Reports({ leads, currentUser, users }: ReportsProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [isExporting, setIsExporting] = useState(false);

  const filteredLeads = useMemo(() => {
    return leads.filter(l => currentUser.role === 'admin' || l.createdBy === currentUser.id || l.assignedTo === currentUser.id);
  }, [leads, currentUser]);

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      // 1. Prepare Leads Data
      const leadsData = filteredLeads.map(l => {
        const creator = users.find(u => u.id === l.createdBy);
        const assignee = users.find(u => u.id === l.assignedTo);
        
        return {
          ID: l.leadId,
          Name: l.name,
          Email: l.email,
          Phone: l.phone,
          Status: l.status,
          Source: l.source,
          Value: l.value,
          'Created At': format(parseISO(l.createdAt), 'yyyy-MM-dd HH:mm'),
          'Follow-up Date': l.followUpDate || 'N/A',
          'Created By': creator ? creator.name : 'System',
          'Assigned To': assignee ? assignee.name : '-'
        };
      });

      // 2. Prepare Summary Data
      const totalLeads = filteredLeads.length;
      const wonLeads = filteredLeads.filter(l => l.status === 'Won').length;
      const totalValue = filteredLeads.filter(l => l.status === 'Won').reduce((acc, l) => acc + l.value, 0);
      const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

      const summaryData = [
        { Metric: 'Total Leads', Value: totalLeads },
        { Metric: 'Won Leads', Value: wonLeads },
        { Metric: 'Conversion Rate', Value: `${conversionRate.toFixed(2)}%` },
        { Metric: 'Total Revenue', Value: totalValue },
        { Metric: 'Report Timeframe', Value: timeframe },
        { Metric: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm') }
      ];

      // 3. Create Workbook and Sheets
      const wb = XLSX.utils.book_new();
      
      const wsLeads = XLSX.utils.json_to_sheet(leadsData);
      XLSX.utils.book_append_sheet(wb, wsLeads, "Leads Data");

      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, "Executive Summary");

      // 4. Save File
      XLSX.writeFile(wb, `sales-report-${timeframe}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const reportData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    let dateFormat: string;
    let points: number;

    if (timeframe === 'daily') {
      startDate = subDays(now, 7);
      dateFormat = 'EEE';
      points = 7;
    } else if (timeframe === 'weekly') {
      startDate = subDays(now, 28);
      dateFormat = 'dd MMM';
      points = 4;
    } else {
      startDate = subDays(now, 180);
      dateFormat = 'MMM';
      points = 6;
    }

    const dataMap = new Map();
    
    // Initialize data points
    for (let i = 0; i < points; i++) {
      let date: Date;
      if (timeframe === 'daily') date = subDays(now, i);
      else if (timeframe === 'weekly') date = subDays(now, i * 7);
      else date = subDays(now, i * 30);
      
      const label = format(date, dateFormat);
      dataMap.set(label, { name: label, leads: 0, won: 0, value: 0 });
    }

    filteredLeads.forEach(lead => {
      const leadDate = parseISO(lead.createdAt);
      const label = format(leadDate, dateFormat);
      if (dataMap.has(label)) {
        const current = dataMap.get(label);
        current.leads += 1;
        if (lead.status === 'Won') {
          current.won += 1;
          current.value += lead.value;
        }
      }
    });

    return Array.from(dataMap.values()).reverse();
  }, [filteredLeads, timeframe]);

  const analysis = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const wonLeads = filteredLeads.filter(l => l.status === 'Won').length;
    const lostLeads = filteredLeads.filter(l => l.status === 'Lost').length;
    const conversionRate = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;

    let insight = "";
    if (conversionRate > 20) insight = "Excellent conversion rate! Your sales process is highly effective.";
    else if (conversionRate > 10) insight = "Good performance. There's room to optimize lead nurturing.";
    else insight = "Conversion rate is low. Consider reviewing lead quality and follow-up strategy.";

    return {
      insight,
      topSource: filteredLeads.reduce((acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      statusDistribution: [
        { name: 'New', value: filteredLeads.filter(l => l.status === 'New').length },
        { name: 'Contacted', value: filteredLeads.filter(l => l.status === 'Contacted').length },
        { name: 'Qualified', value: filteredLeads.filter(l => l.status === 'Qualified').length },
        { name: 'Won', value: wonLeads },
        { name: 'Lost', value: lostLeads },
      ]
    };
  }, [filteredLeads]);

  const COLORS = ['#0e9bcf', '#de5c00', '#8b5cf6', '#10b981', '#ef4444'];

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Sales Performance Reports</h2>
          <p className="text-sm text-slate-500 mt-1">Track your lead conversion and revenue growth</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl border border-slate-200">
            {(['daily', 'weekly', 'monthly'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize",
                  timeframe === t 
                    ? "bg-white text-primary shadow-sm" 
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={exportToExcel}
            disabled={isExporting}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            <Download size={18} />
            {isExporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="space-y-8 p-6 bg-white rounded-3xl border border-slate-100">
        <div className="border-b border-slate-100 pb-6 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Sales Analysis Report</h1>
          <p className="text-slate-500">Generated on {format(new Date(), 'PPPP')} • Timeframe: <span className="capitalize font-semibold text-primary">{timeframe}</span></p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard label="Total Leads" value={filteredLeads.length} icon={<TrendingUp size={20} />} color="blue" />
          <StatCard label="Won Leads" value={filteredLeads.filter(l => l.status === 'Won').length} icon={<CheckCircle2 size={20} />} color="green" />
          <StatCard label="Conversion Rate" value={(filteredLeads.length > 0 ? (filteredLeads.filter(l => l.status === 'Won').length / filteredLeads.length) * 100 : 0).toFixed(1) + '%'} icon={<Clock size={20} />} color="orange" />
          <StatCard label="Revenue" value={`₹${filteredLeads.filter(l => l.status === 'Won').reduce((acc, l) => acc + l.value, 0).toLocaleString()}`} icon={<TrendingUp size={20} />} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Lead Volume Chart */}
          <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-slate-800">Lead Volume Trend</h3>
            </div>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData}>
                  <defs>
                    <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0e9bcf" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0e9bcf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="leads" stroke="#0e9bcf" strokeWidth={3} fillOpacity={1} fill="url(#colorLeads)" isAnimationActive={!isExporting} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue Growth Chart */}
          <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-bold text-slate-800">Revenue Growth (₹)</h3>
            </div>
            <div className="h-[300px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={reportData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" fill="#de5c00" radius={[6, 6, 0, 0]} isAnimationActive={!isExporting} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Strategic Analysis</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Performance Insight</h4>
                  <p className="text-sm text-slate-600 mt-1">{analysis.insight}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-white rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                  <Filter size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800">Top Lead Sources</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(analysis.topSource).map(([source, count]) => (
                      <span key={source} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        {source}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-slate-50/50 p-8 rounded-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Status Distribution</h3>
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.statusDistribution}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    isAnimationActive={!isExporting}
                  >
                    {analysis.statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {analysis.statusDistribution.map((item, index) => (
                <div key={item.name} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-slate-600">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", colors[color])}>
        {icon}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <h4 className="text-xl font-bold text-slate-800 mt-1">{value}</h4>
    </div>
  );
}
