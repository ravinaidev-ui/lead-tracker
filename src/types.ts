export type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost' | 'Trash';

export interface Lead {
  id: string;
  leadId?: string; // Formatted ID like TGDLP001
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  value: number;
  source: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  followUpDate?: string;
  website?: string;
  alternateMobileNumber?: string;
  createdBy: string; // User ID
  assignedTo?: string; // User ID
  lostReason?: string;
  isPresentThisMonth?: boolean;
}

export interface IncentiveSlab {
  id: string;
  minAmount: number;
  percentage: number;
  label: string;
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'admin' | 'executive';
  name: string;
  email: string;
  incentiveThreshold?: number;
  createdAt?: string;
}

export interface Notification {
  id: string;
  userId: string; // Target user ID
  message: string;
  type: 'info' | 'warning' | 'success';
  createdAt: string;
  read: boolean;
}

export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';

export interface Task {
  id: string;
  title: string;
  description: string;
  leadId?: string; // Optional link to a lead
  dueDate: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdBy: string; // User ID
  assignedTo?: string; // User ID
  createdAt: string;
  updatedAt: string;
}
