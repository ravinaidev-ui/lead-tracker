import React, { useState, useMemo } from 'react';
import { Task, TaskPriority, TaskStatus, Lead, User } from '../types';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Calendar,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Flag,
  Link as LinkIcon,
  CheckSquare,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, generateId } from '../lib/utils';

interface TaskManagementProps {
  tasks: Task[];
  leads: Lead[];
  users: User[];
  currentUser: User;
  onAddTask: (task: Task) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

const PRIORITY_OPTIONS: TaskPriority[] = ['Low', 'Medium', 'High'];
const STATUS_OPTIONS: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];

export default function TaskManagement({ 
  tasks, 
  leads, 
  users, 
  currentUser, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask 
}: TaskManagementProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || task.status === statusFilter;
      
      // Access control: admins see all, users see their own or assigned tasks
      const isVisible = currentUser.role === 'admin' || 
                        task.createdBy === currentUser.id || 
                        task.assignedTo === currentUser.id;
                        
      return matchesSearch && matchesStatus && isVisible;
    });
  }, [tasks, searchTerm, statusFilter, currentUser]);

  const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      
      const taskData: Partial<Task> = {
        title: formData.get('title') as string,
        description: formData.get('description') as string,
        leadId: formData.get('leadId') as string || undefined,
        dueDate: formData.get('dueDate') as string,
        priority: formData.get('priority') as TaskPriority,
        status: formData.get('status') as TaskStatus,
        assignedTo: formData.get('assignedTo') as string || (currentUser.role === 'executive' ? currentUser.id : undefined),
      };

      if (editingTask) {
        await onUpdateTask({
          ...editingTask,
          ...taskData,
          updatedAt: new Date().toISOString(),
        } as Task);
      } else {
        await onAddTask({
          ...taskData,
          id: generateId(),
          createdBy: currentUser.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as Task);
      }
      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error: any) {
      console.error('Error saving task:', error);
      alert(`Error saving task: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleTaskStatus = (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    onUpdateTask({
      ...task,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    });
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case 'High': return 'text-rose-600 bg-rose-50 border-rose-100';
      case 'Medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'Low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'Completed': return <CheckCircle2 size={18} className="text-emerald-500" />;
      case 'In Progress': return <Clock size={18} className="text-amber-500" />;
      case 'Pending': return <AlertCircle size={18} className="text-slate-400" />;
    }
  };

  const taskStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const userTasks = tasks.filter(t => 
      currentUser.role === 'admin' || t.assignedTo === currentUser.id
    );
    
    const overdue = userTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate).setHours(0,0,0,0) < today.getTime()).length;
    const dueToday = userTasks.filter(t => t.status !== 'Completed' && new Date(t.dueDate).setHours(0,0,0,0) === today.getTime()).length;
    const completed = userTasks.filter(t => t.status === 'Completed').length;
    
    return { overdue, dueToday, completed };
  }, [tasks, currentUser]);

  return (
    <div className="space-y-6">
      {/* Task Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          taskStats.overdue > 0 ? "bg-rose-50 border-rose-100 shadow-sm" : "bg-white border-slate-100"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg", taskStats.overdue > 0 ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-400")}>
              <AlertCircle size={18} />
            </div>
            <span className="text-sm font-medium text-slate-500">Overdue</span>
          </div>
          <p className={cn("text-2xl font-bold", taskStats.overdue > 0 ? "text-rose-600" : "text-slate-800")}>
            {taskStats.overdue}
          </p>
        </div>

        <div className={cn(
          "p-4 rounded-2xl border transition-all",
          taskStats.dueToday > 0 ? "bg-amber-50 border-amber-100 shadow-sm" : "bg-white border-slate-100"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className={cn("p-2 rounded-lg", taskStats.dueToday > 0 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-400")}>
              <Clock size={18} />
            </div>
            <span className="text-sm font-medium text-slate-500">Due Today</span>
          </div>
          <p className={cn("text-2xl font-bold", taskStats.dueToday > 0 ? "text-amber-600" : "text-slate-800")}>
            {taskStats.dueToday}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-emerald-500 p-2 rounded-lg text-white">
              <CheckCircle2 size={18} />
            </div>
            <span className="text-sm font-medium text-slate-500">Completed</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{taskStats.completed}</p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 w-full sm:max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="All">All Status</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          
          {currentUser.role === 'admin' && (
            <button 
              onClick={() => {
                setEditingTask(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all shadow-sm hover:shadow-md active:scale-95 text-sm font-medium whitespace-nowrap"
            >
              <Plus size={18} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.length > 0 ? (
          filteredTasks.map((task) => {
            const lead = leads.find(l => l.id === task.leadId);
            const assignedUser = users.find(u => u.id === task.assignedTo);
            
            return (
              <motion.div 
                layout
                key={task.id}
                className={cn(
                  "bg-white p-5 rounded-2xl border transition-all hover:shadow-md group",
                  task.status === 'Completed' ? "border-slate-100 opacity-75" : 
                  (new Date(task.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) ? "border-rose-200 bg-rose-50/10" :
                  (new Date(task.dueDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)) ? "border-amber-200 bg-amber-50/10" :
                  "border-slate-200"
                )}
              >
                <div className="flex items-start gap-4">
                  <button 
                    onClick={() => toggleTaskStatus(task)}
                    className="mt-1 text-slate-400 hover:text-primary transition-colors"
                  >
                    {task.status === 'Completed' ? <CheckSquare size={22} className="text-primary" /> : <Square size={22} />}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className={cn(
                          "font-semibold text-slate-800 truncate",
                          task.status === 'Completed' && "line-through text-slate-400"
                        )}>
                          {task.title}
                        </h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {(currentUser.role === 'admin' || task.assignedTo === currentUser.id) && (
                          <button 
                            onClick={() => {
                              setEditingTask(task);
                              setIsModalOpen(true);
                            }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all"
                            title="Update Status"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {currentUser.role === 'admin' && (
                          <button 
                            onClick={() => onDeleteTask(task.id)}
                            className="p-2 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-all"
                            title="Delete Task"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 mt-4">
                      <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
                        getPriorityColor(task.priority)
                      )}>
                        <Flag size={12} />
                        {task.priority}
                      </div>
                      
                      <div className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        task.status !== 'Completed' && (new Date(task.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) ? "text-rose-600" :
                        task.status !== 'Completed' && (new Date(task.dueDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)) ? "text-amber-600" :
                        "text-slate-500"
                      )}>
                        <Calendar size={14} />
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                        {task.status !== 'Completed' && (new Date(task.dueDate).setHours(0,0,0,0) < new Date().setHours(0,0,0,0)) && (
                          <span className="text-[10px] font-bold uppercase ml-1">(Overdue)</span>
                        )}
                        {task.status !== 'Completed' && (new Date(task.dueDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0)) && (
                          <span className="text-[10px] font-bold uppercase ml-1">(Today)</span>
                        )}
                      </div>
                      
                      {lead && (
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium bg-primary/5 px-2 py-1 rounded-lg">
                          <LinkIcon size={14} />
                          Lead: {lead.name}
                        </div>
                      )}
                      
                      {assignedUser && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                            {assignedUser.name.charAt(0)}
                          </div>
                          {assignedUser.name}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1.5 ml-auto">
                        {getStatusIcon(task.status)}
                        <span className="text-xs font-medium text-slate-600">{task.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="bg-white py-12 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500">
            <CheckSquare size={48} className="text-slate-200 mb-4" />
            <p className="text-lg font-medium">No tasks found</p>
            <p className="text-sm">Try adjusting your search or add a new task</p>
          </div>
        )}
      </div>

      {/* Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h2 className="text-xl font-bold text-slate-800">
                  {editingTask ? 'Edit Task' : 'Create New Task'}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-600 transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveTask} className="p-6 space-y-4">
                {currentUser.role === 'admin' ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Task Title</label>
                      <input 
                        name="title"
                        required
                        defaultValue={editingTask?.title}
                        placeholder="What needs to be done?"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                      <textarea 
                        name="description"
                        rows={3}
                        defaultValue={editingTask?.description}
                        placeholder="Add more details..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Due Date</label>
                        <input 
                          name="dueDate"
                          type="date"
                          required
                          defaultValue={editingTask?.dueDate || new Date().toLocaleDateString('sv-SE')}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Priority</label>
                        <select 
                          name="priority"
                          defaultValue={editingTask?.priority || 'Medium'}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          {PRIORITY_OPTIONS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Related Lead</label>
                        <select 
                          name="leadId"
                          defaultValue={editingTask?.leadId || ''}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          <option value="">None</option>
                          {leads.map(l => (
                            <option key={l.id} value={l.id}>{l.name} ({l.company})</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Assign To</label>
                        <select 
                          name="assignedTo"
                          defaultValue={editingTask?.assignedTo || ''}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        >
                          <option value="">Unassigned</option>
                          {users.filter(u => u.role === 'executive').map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                    <h4 className="font-bold text-slate-800">{editingTask?.title}</h4>
                    <p className="text-sm text-slate-500 mt-1">{editingTask?.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                      <Calendar size={14} />
                      Due: {editingTask?.dueDate}
                    </div>
                    {/* Hidden inputs for executive to preserve existing values */}
                    <input type="hidden" name="title" value={editingTask?.title || ''} />
                    <input type="hidden" name="description" value={editingTask?.description || ''} />
                    <input type="hidden" name="dueDate" value={editingTask?.dueDate || ''} />
                    <input type="hidden" name="priority" value={editingTask?.priority || 'Medium'} />
                    <input type="hidden" name="leadId" value={editingTask?.leadId || ''} />
                    <input type="hidden" name="assignedTo" value={editingTask?.assignedTo || ''} />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Status</label>
                  <select 
                    name="status"
                    defaultValue={editingTask?.status || 'Pending'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  >
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] px-4 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isSubmitting ? 'Saving...' : (editingTask ? 'Update Task' : 'Create Task')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
