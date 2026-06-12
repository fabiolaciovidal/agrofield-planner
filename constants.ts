
import { Client, Visit } from './types';

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export let MOCK_CLIENTS: Client[] = [
  {
    id: 1,
    name: 'Carlos Rodriguez',
    farmName: 'Finca La Esperanza',
    address: 'Ruta 5, Km 120, Canelones',
    coords: { lat: -34.5, lon: -56.2 },
    contactPerson: 'Carlos Rodriguez',
    phone: '099 123 456',
    accountStatus: 'OK',
    leadStatus: 'Active',
    priority: 'High',
    lastVisit: '2024-07-15',
    crops: ['Soybean', 'Corn'],
  },
  {
    id: 2,
    name: 'Ana García',
    farmName: 'Estancia El Progreso',
    address: 'Camino Los Horneros, Maldonado',
    coords: { lat: -34.8, lon: -55.0 },
    contactPerson: 'Ana García',
    phone: '098 765 432',
    accountStatus: 'Overdue',
    leadStatus: 'Active',
    priority: 'Medium',
    lastVisit: '2024-07-10',
    crops: ['Wheat', 'Sunflower'],
  },
  {
    id: 3,
    name: 'Jorge Martinez',
    farmName: 'Los Girasoles S.A.',
    address: 'Ruta 8, Km 250, Treinta y Tres',
    coords: { lat: -33.2, lon: -54.4 },
    contactPerson: 'Encargado Ramirez',
    phone: '091 234 567',
    accountStatus: 'At Risk',
    leadStatus: 'Prospect',
    priority: 'Low',
    lastVisit: '2024-06-20',
    crops: ['Rice'],
  },
];


export let MOCK_VISITS: Visit[] = [
  {
    id: 101,
    clientId: 1,
    date: new Date().toISOString().split('T')[0],
    timeSlot: '09:00 - 11:00',
    status: 'Planned',
    notes: '',
    photos: [],
    tasks: [],
    commitments: '',
  },
  {
    id: 102,
    clientId: 2,
    date: new Date().toISOString().split('T')[0],
    timeSlot: '14:00 - 16:00',
    status: 'Planned',
    notes: 'Revisar estado de cuenta y discutir plan de pagos. Presentar nueva campaña de fungicidas.',
    photos: [],
    tasks: [{ id: 1, description: 'Enviar cotización de fungicida', dueDate: '2024-08-01', completed: false }],
    commitments: '',
  },
   {
    id: 103,
    clientId: 3,
    date: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
    timeSlot: '10:00 - 12:00',
    status: 'Planned',
    notes: '',
    photos: [],
    tasks: [],
    commitments: '',
  },
  {
    id: 104,
    clientId: 1,
    date: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString().split('T')[0],
    timeSlot: '11:00 - 12:00',
    status: 'Planned',
    notes: 'Seguimiento de aplicación de herbicida.',
    photos: [],
    tasks: [],
    commitments: '',
  }
];
