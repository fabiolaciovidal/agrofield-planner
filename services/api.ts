import { GoogleGenAI } from "@google/genai";
import { MOCK_CLIENTS, MOCK_VISITS } from '../constants';
import { Client, Visit, User, Interaction, Task, Campaign, SalesPlan, AppUser } from '../types';
import * as db from './db';
import * as sync from './sync';
import * as supabaseClient from './supabaseClient';

import { exportToCSV } from '../utils/export';

const SIMULATED_DELAY = 300; 

export const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === 'string') return error;
    if (error && typeof error === 'object') {
        const maybeError = error as { message?: unknown; error_description?: unknown; details?: unknown; hint?: unknown; code?: unknown };
        const parts = [maybeError.message, maybeError.error_description, maybeError.details, maybeError.hint, maybeError.code]
            .filter((part): part is string | number => typeof part === 'string' || typeof part === 'number')
            .map(String);
        if (parts.length > 0) return parts.join(' | ');
    }
    return fallback;
};

const hashPassword = async (password: string): Promise<string> => {
    const data = new TextEncoder().encode(password);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const forceSyncAll = async (userId?: string): Promise<void> => {
    // 1. Process local queue (Push)
    await sync.processSyncQueue();
    
    // 2. Fetch remote data (Pull)
    if (navigator.onLine) {
        if (supabaseClient.isSupabaseConfigured()) {
            try {
                const cloudClients = await supabaseClient.fetchClients(userId);
                await db.saveClients(cloudClients);
                
                const cloudVisits = await supabaseClient.fetchVisits(userId, undefined);
                await db.saveVisits(cloudVisits);
            } catch (e) {
                 console.error("Error pulling data during force sync:", e);
            }
        } else {
             console.log("SYNC: Supabase not configured. Using local data only.");
        }
    }
};

export const login = async (email: string, password?: string): Promise<User> => {
    if (supabaseClient.isSupabaseConfigured()) {
        if (!password) {
            throw new Error("Debes ingresar la contraseña para autenticar con Supabase.");
        }
        try {
            const { data, error } = await supabaseClient.signIn(email, password);
            if (error) throw error;
            if (data.user) {
                const sellerCode = data.user.user_metadata?.seller_code || email.split('@')[0];
                return { 
                    id: data.user.id,
                    name: data.user.user_metadata?.full_name || email.split('@')[0], 
                    role: data.user.user_metadata?.role || 'Vendedor',
                    username: email,
                    sellerCode
                };
            }
        } catch (e) {
            console.error("Supabase login failed", e);
            try {
                const passwordHash = await hashPassword(password);
                const appUser = await supabaseClient.fetchAppUserByCredentials(email, passwordHash);
                if (appUser) {
                    return {
                        id: appUser.id,
                        name: appUser.name,
                        role: appUser.role,
                        username: appUser.email,
                        sellerCode: appUser.sellerCode
                    };
                }
            } catch (fallbackError) {
                console.error("App user login failed", fallbackError);
            }
            throw new Error("No se pudo iniciar sesión. Verifica usuario, contraseña y que el usuario esté activo.");
        }
    }

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ id: 'mock-123', name: 'Ing. Agrónomo', role: 'Vendedor', username: email, sellerCode: email.split('@')[0] });
        }, SIMULATED_DELAY);
    });
};

// --- USERS / SELLERS ---
export const getAppUsers = async (): Promise<AppUser[]> => {
    if (supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.fetchAppUsers();
        } catch (e) {
            console.warn("Supabase fetch app users failed", e);
        }
    }
    return [];
};

export const createAppUser = async (
    input: Omit<AppUser, 'id' | 'createdAt'>,
    password: string
): Promise<AppUser> => {
    if (!supabaseClient.isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado. No se pueden crear usuarios reales.');
    }

    const id = input.sellerCode || `user-${Date.now()}`;
    const existingUsers = await supabaseClient.fetchAppUsers();
    if (input.sellerCode && existingUsers.some(u => u.id === id || u.sellerCode === input.sellerCode)) {
        throw new Error(`Ya existe un usuario con el código de vendedor "${input.sellerCode}". Usa otro código.`);
    }
    if (input.email && existingUsers.some(u => u.email?.toLowerCase() === input.email.toLowerCase())) {
        throw new Error(`Ya existe un usuario con el email "${input.email}".`);
    }

    const appUser: AppUser = {
        ...input,
        id,
        createdAt: new Date().toISOString(),
        passwordHash: await hashPassword(password),
    };

    return await supabaseClient.upsertAppUser(appUser);
};

// --- DATA INITIALIZATION ---
const initializeDataIfNeeded = async () => {
    const INITIALIZED_KEY = 'agro_crm_v1_initialized';
    const isInitialized = localStorage.getItem(INITIALIZED_KEY);

    if (!isInitialized) {
        console.log("CRM: First run detected. Loading mocks.");
        await db.saveClients(MOCK_CLIENTS);
        await db.saveVisits(MOCK_VISITS);
        localStorage.setItem(INITIALIZED_KEY, 'true');
    }
};

// --- CLIENTS ---
export const getClients = async (isOnline: boolean, userId?: string): Promise<Client[]> => {
    await initializeDataIfNeeded();
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            const cloudClients = await supabaseClient.fetchClients(userId);
            await db.saveClients(cloudClients);
            return cloudClients;
        } catch (e) {
            console.warn("Supabase fetch failed, using local cache", e);
        }
    }
    const localClients = await db.getClients();
    return userId ? localClients.filter(c => c.vendedorId === userId || !c.vendedorId) : localClients;
};

export const bulkImport = async (type: string, data: any[]): Promise<void> => {
    if (type === 'Clientes') {
        const clients: Client[] = data.map((row: any, i) => ({
            id: Date.now() + i,
            name: row.nombre_dueno || row.nombre_dueño || row.cliente || row.nombre || 'Desconocido',
            farmName: row.nombre_finca || row.finca || 'Finca Sin Nombre',
            address: row.direccion || row.address || 'No especificada',
            coords: {
                lat: Number(row.latitud || row.lat || -16.5 + (Math.random() * 0.1)),
                lon: Number(row.longitud || row.lon || row.lng || -68.15 + (Math.random() * 0.1)),
            },
            contactPerson: row.contacto || row.nombre_dueno || row.nombre_dueño || row.cliente || 'Desconocido',
            phone: String(row.telefono || row.phone || ''),
            accountStatus: (row.estado_cuenta || row.accountStatus || 'OK') as Client['accountStatus'],
            vendedorId: row.vendedor_codigo || row.vendedorId || null,
            leadStatus: (row.estado_lead || row.leadStatus || 'Prospect') as Client['leadStatus'],
            priority: (row.prioridad || row.priority || 'Medium') as Client['priority'],
            crops: String(row.cultivos || row.crops || '').split('|').map((crop) => crop.trim()).filter(Boolean),
            erpCode: row.codigo_erp || row.erpCode || ''
        }));
        
        const existing = await db.getClients();
        await db.saveClients([...existing, ...clients]);
        
        if (supabaseClient.isSupabaseConfigured()) {
            for (const c of clients) {
                try {
                   await supabaseClient.insertClient(c);
                } catch(e) { 
                    console.error("Supabase insert client error:", e); 
                    throw e; // Lanza el error para que AdminImport lo muestre
                }
            }
        }
    }
    if (type === 'Campañas') {
        const campaigns: Campaign[] = data.map((row: any, i) => ({
            id: String(row.codigo || row.id || `camp-${Date.now()}-${i}`),
            name: row.nombre || row.name || `Campaña ${i + 1}`,
            season: (row.temporada || row.season || 'Verano') as Campaign['season'],
            year: Number(row.anio || row.year || new Date().getFullYear()),
            active: String(row.activa || row.active || '').toLowerCase() === 'true' || i === 0
        }));

        if (supabaseClient.isSupabaseConfigured()) {
            for (const campaign of campaigns) {
                await supabaseClient.upsertCampaign(campaign);
            }
        }
        return;
    }
    if (type === 'Plan de Ventas') {
        const salesPlans: SalesPlan[] = data.map((row: any, i) => ({
            id: String(row.id || `${row.codigo_vendedor || row.vendedorId || 'vendedor'}-${row.codigo_campana || row.campaignId || 'camp'}-${i}`),
            vendedorId: String(row.codigo_vendedor || row.vendedorId || row.vendedor_id || ''),
            campaignId: String(row.codigo_campana || row.campaignId || row.campaign_id || ''),
            targetValue: Number(row.monto_objetivo || row.targetValue || 0),
            currentProgress: Number(row.avance_actual || row.currentProgress || 0),
        }));

        if (supabaseClient.isSupabaseConfigured()) {
            for (const salesPlan of salesPlans) {
                await supabaseClient.upsertSalesPlan(salesPlan);
            }
        }
        return;
    }
    if (type === 'Vendedores') {
        for (const row of data) {
            const email = row.email || row.correo;
            const password = row.password || row.contrasena || row.contraseña;
            if (!email || !password) {
                throw new Error('Cada vendedor necesita email y password/contrasena.');
            }
            await createAppUser({
                name: row.nombre || row.name || email,
                email,
                role: (row.rol || row.role || 'Vendedor') as AppUser['role'],
                sellerCode: row.codigo || row.sellerCode || row.vendedor_codigo || email.split('@')[0],
                active: String(row.activo || row.active || 'true').toLowerCase() !== 'false'
            }, password);
        }
        return;
    }
    // Se podrían agregar Campañas, Vendedores, Plan de Ventas aquí siguiendo la misma lógica.
};

export const purgeAllClients = async (): Promise<void> => {
    // Borrar local (guarda array vacío)
    await db.saveClients([]);
    
    // Borrar nube si está configurado
    if (supabaseClient.isSupabaseConfigured()) {
        try {
            await supabaseClient.deleteAllClients();
        } catch (e) {
            console.error("Error purging remote clients:", e);
        }
    }
}

export const createClient = async (newClientData: Omit<Client, 'id'>, isOnline: boolean): Promise<Client> => {
    const newClient: Client = { ...newClientData, id: Date.now() };
    await db.createClient(newClient);

    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.insertClient(newClient);
        } catch (e) {
            console.error("Supabase insert failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `client-create-${newClient.id}`,
        type: 'CREATE_CLIENT',
        payload: newClient,
        timestamp: Date.now()
    });
    return newClient;
};

export const updateClient = async (updatedClient: Client, isOnline: boolean): Promise<Client> => {
    await db.updateClient(updatedClient);
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.updateClient(updatedClient);
        } catch (e) {
            console.error("Supabase update failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `client-update-${updatedClient.id}`,
        type: 'UPDATE_CLIENT',
        payload: updatedClient,
        timestamp: Date.now()
    });
    return updatedClient;
};

export const deleteClient = async (clientId: number, isOnline: boolean): Promise<void> => {
    await db.deleteClient(clientId);
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            await supabaseClient.deleteClient(clientId);
            return;
        } catch (e) {
            console.error("Supabase delete client failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `client-delete-${clientId}`,
        type: 'DELETE_CLIENT',
        payload: clientId,
        timestamp: Date.now()
    });
};

// --- VISITS ---
export const getVisits = async (isOnline: boolean, userId?: string, campaignId?: string): Promise<Visit[]> => {
    await initializeDataIfNeeded();
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            const cloudVisits = await supabaseClient.fetchVisits(userId, campaignId);
            await db.saveVisits(cloudVisits);
            return cloudVisits;
        } catch (e) {
            console.warn("Supabase fetch failed, using local cache", e);
        }
    }
    const localVisits = await db.getVisits();
    let filtered = localVisits;
    if (userId) filtered = filtered.filter(v => v.vendedorId === userId || !v.vendedorId);
    if (campaignId) filtered = filtered.filter(v => v.campaignId === campaignId || !v.campaignId);
    return filtered;
};

export const createVisit = async (newVisitData: Omit<Visit, 'id'>, isOnline: boolean): Promise<Visit> => {
    const newVisit: Visit = { ...newVisitData, id: Date.now() };
    await db.createVisit(newVisit);

    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.upsertVisit(newVisit);
        } catch (e) {
            console.error("Supabase upsert failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `visit-create-${newVisit.id}`,
        type: 'CREATE_VISIT',
        payload: newVisit,
        timestamp: Date.now()
    });
    return newVisit;
};

export const updateVisit = async (updatedVisit: Visit, isOnline: boolean): Promise<Visit> => {
    await db.saveVisit(updatedVisit);
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.upsertVisit(updatedVisit);
        } catch (e) {
            console.error("Supabase upsert failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `visit-update-${updatedVisit.id}`,
        type: 'UPDATE_VISIT',
        payload: updatedVisit,
        timestamp: Date.now()
    });
    return updatedVisit;
};

// --- INTERACTIONS ---
export const getInteractions = async (isOnline: boolean, clientId?: number): Promise<Interaction[]> => {
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            const cloudInteractions = await supabaseClient.fetchInteractions();
            // Optional: Update local DB with only relevant interactions or all
            // For now, return all cloud interactions
            return clientId ? cloudInteractions.filter(i => i.clientId === clientId) : cloudInteractions;
        } catch (e) {
            console.warn("Supabase fetch failed, using local cache", e);
        }
    }
    return db.getInteractions(clientId);
};

export const createInteraction = async (interactionData: Omit<Interaction, 'id'>, isOnline: boolean): Promise<Interaction> => {
    const newInteraction: Interaction = { ...interactionData, id: Date.now() };
    await db.createInteraction(newInteraction);

    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.insertInteraction(newInteraction);
        } catch (e) {
            console.error("Supabase insert failed, queuing action", e);
        }
    }

    await sync.queueAction({
        id: `interaction-create-${newInteraction.id}`,
        type: 'CREATE_INTERACTION',
        payload: newInteraction,
        timestamp: Date.now()
    });
    return newInteraction;
};

// --- TASKS ---
export const getTasks = async (isOnline: boolean, clientId?: number): Promise<Task[]> => {
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            const cloudTasks = await supabaseClient.fetchTasks();
            return clientId ? cloudTasks.filter(t => t.clientId === clientId) : cloudTasks;
        } catch (e) {
            console.warn("Supabase fetch failed", e);
        }
    }
    return db.getTasks(clientId);
};

export const upsertTask = async (task: Task | Omit<Task, 'id'>, isOnline: boolean): Promise<Task> => {
    const taskToSave: Task = ('id' in task) ? task : { ...task, id: Date.now() };
    await db.saveTask(taskToSave);

    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.upsertTask(taskToSave);
        } catch (e) {
            console.error("Supabase upsert failed", e);
        }
    }

    await sync.queueAction({
        id: `task-upsert-${taskToSave.id}`,
        type: 'UPDATE_TASK', // Using UPDATE for upsert in sync queue
        payload: taskToSave,
        timestamp: Date.now()
    });
    return taskToSave;
};

export const deleteTask = async (taskId: number, isOnline: boolean): Promise<void> => {
    await db.deleteTask(taskId);
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            await supabaseClient.deleteTask(taskId);
            return;
        } catch (e) {
            console.error("Supabase delete failed", e);
        }
    }

    await sync.queueAction({
        id: `task-delete-${taskId}`,
        type: 'DELETE_TASK',
        payload: taskId,
        timestamp: Date.now()
    });
};

// --- CAMPAIGNS & PLANS ---
export const getCampaigns = async (isOnline: boolean): Promise<Campaign[]> => {
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.fetchCampaigns();
        } catch (e) {
            console.warn("Supabase fetch campaigns failed", e);
        }
    }
    // Default fallback campaigns
    return [
        { id: 'c-2024-v', name: 'Campaña Verano 2024', season: 'Verano', year: 2024, active: true },
        { id: 'c-2024-i', name: 'Campaña Invierno 2024', season: 'Invierno', year: 2024, active: false }
    ];
};

export const getSalesPlans = async (isOnline: boolean, userId?: string, campaignId?: string): Promise<SalesPlan[]> => {
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            return await supabaseClient.fetchSalesPlans(userId, campaignId);
        } catch (e) {
            console.warn("Supabase fetch sales plans failed", e);
        }
    }
    // Mock sales plan for demo
    return [{
        id: 'plan-1',
        vendedorId: userId || 'V001',
        campaignId: campaignId || 'c-2024-v',
        targetValue: 500000,
        currentProgress: 325000
    }];
};

// --- AI SERVICE ---
const API_KEY = import.meta.env.VITE_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (API_KEY) ai = new GoogleGenAI({ apiKey: API_KEY });

export const getAgronomicSuggestion = async (crop: string, stage: string, problem: string): Promise<string> => {
    if (!ai) return "AI Assistant is disabled (API Key missing).";
    try {
        const prompt = `Act as an expert agronomist. Crop: ${crop}, Stage: ${stage}, Problem: ${problem}. Provide technical advice in markdown.`;
        const result = await ai.models.generateContent({ 
            model: 'gemini-1.5-flash', 
            contents: [{ role: 'user', parts: [{ text: prompt }] }] 
        });
        // Handling different SDK versions gracefully
        const text = (result as any).text || (result as any).response?.text?.() || "No se pudo generar respuesta.";
        return text;
    } catch (e) {
        console.error("AI Error:", e);
        return "Error consultando a la IA.";
    }
};

// --- REPORTING ---
export const exportVisitsReport = async () => {
    const visits = await db.getVisits();
    const headers = ['id', 'clientId', 'date', 'status', 'notes', 'commitments'];
    exportToCSV(`reporte_visitas_${new Date().toISOString().split('T')[0]}.csv`, headers, visits);
};

export const exportInteractionsReport = async () => {
    const interactions = await db.getInteractions();
    const headers = ['id', 'clientId', 'date', 'type', 'summary', 'details'];
    exportToCSV(`reporte_interacciones_${new Date().toISOString().split('T')[0]}.csv`, headers, interactions);
};
