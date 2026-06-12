export type LeadStatus = 'Prospect' | 'Active' | 'Inactive' | 'Lost';
export type ClientPriority = 'High' | 'Medium' | 'Low';

export interface Client {
  id: number;
  name: string;
  farmName: string;
  address: string;
  coords: {
    lat: number;
    lon: number;
  };
  contactPerson: string;
  phone: string;
  accountStatus: 'OK' | 'Overdue' | 'At Risk';
  leadStatus: LeadStatus;
  priority: ClientPriority;
  lastVisit?: string;
  crops: string[];
  erpCode?: string;
  vendedorId?: string; // ID del vendedor asociado en Supabase
}

export interface Interaction {
  id: number;
  clientId: number;
  date: string;
  type: 'Call' | 'Email' | 'Meeting' | 'Note';
  summary: string;
  details: string;
}

export interface Visit {
  id: number;
  clientId: number;
  date: string; // YYYY-MM-DD
  timeSlot: string; // e.g., "09:00 - 11:00"
  status: 'Planned' | 'InProgress' | 'Completed' | 'Cancelled';
  checkIn?: {
    time: number;
    coords: { lat: number; lon: number };
  };
  checkOut?: {
    time: number;
  };
  notes: string;
  photos: string[]; // URLs or base64 strings
  tasks: Task[];
  commitments: string;
  clientSignature?: string; // base64 string
  vendedorId?: string;
  campaignId?: string;
}

export interface Task {
  id: number;
  clientId?: number; // Optional, can be related to a client
  visitId?: number;  // Optional, can be related to a specific visit
  description: string;
  dueDate: string;
  completed: boolean;
}

export interface User {
  id?: string;
  name: string;
  role: string;
  username?: string;
  sellerCode?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Gerente' | 'Vendedor';
  sellerCode: string;
  active: boolean;
  createdAt?: string;
  passwordHash?: string;
}

export interface Campaign {
    id: string;
    name: string;
    season: 'Invierno' | 'Verano';
    year: number;
    active: boolean;
}

export interface SalesPlan {
    id: string;
    vendedorId: string;
    campaignId: string;
    targetValue: number;
    currentProgress: number;
}

export enum View {
  DASHBOARD = 'DASHBOARD',
  ADMIN_COMMERCIAL = 'ADMIN_COMMERCIAL',
  PLANNER = 'PLANNER',
  VISIT_DETAIL = 'VISIT_DETAIL',
  CLIENTS = 'CLIENTS',
  CLIENT_DETAIL = 'CLIENT_DETAIL', // New view for CRM client profile
  INTERACTIONS = 'INTERACTIONS', 
  ADMIN_IMPORT = 'ADMIN_IMPORT',
  ADMIN_USERS = 'ADMIN_USERS',
  ADMIN_HOME = 'ADMIN_HOME',
}


export interface SyncAction {
    id: string; 
    type: 'UPDATE_VISIT' | 'CREATE_VISIT' | 'CREATE_CLIENT' | 'UPDATE_CLIENT' | 'DELETE_CLIENT' | 'CREATE_INTERACTION' | 'UPDATE_TASK' | 'CREATE_TASK' | 'DELETE_TASK';
    payload: any; 
    timestamp: number;
}
