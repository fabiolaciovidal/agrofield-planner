import { GoogleGenAI } from "@google/genai";
import { MOCK_CLIENTS, MOCK_VISITS } from '../constants';
import { Client, Visit, User, Interaction, Task, Campaign, SalesPlan, AppUser, SyncAction } from '../types';
import * as db from './db';
import * as sync from './sync';
import * as supabaseClient from './supabaseClient';

import { exportToCSV } from '../utils/export';

const DEMO_DATA_ENABLED = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true';

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

export const getUserFacingSyncError = (error: unknown): string => {
    const detail = getErrorMessage(error, 'No se pudo completar la sincronización.');
    const normalized = detail.toLowerCase();

    if (normalized.includes('sin conexión') || normalized.includes('offline')) {
        return 'No hay conexión. Tus cambios siguen guardados en este dispositivo.';
    }
    if (normalized.includes('row-level security') || normalized.includes('permission denied') || normalized.includes('42501')) {
        return 'No pudimos enviar algunos datos por un problema de permisos. Permanecen guardados en este dispositivo; vuelve a iniciar sesión y reintenta.';
    }
    if (normalized.includes('foreign key') || normalized.includes('23503')) {
        return 'Falta sincronizar un registro relacionado. Tus cambios siguen guardados; vuelve a intentar la sincronización.';
    }

    return 'No se pudo completar la sincronización. Tus cambios permanecen guardados en este dispositivo.';
};

export const isAuthenticationSessionError = (error: unknown): boolean => {
    const detail = getErrorMessage(error, '').toLowerCase();
    return detail.includes('invalid refresh token')
        || detail.includes('refresh token not found')
        || detail.includes('auth session missing')
        || detail.includes('jwt expired');
};


export const reconcileClients = (cloudClients: Client[], actions: SyncAction[]): Client[] => {
    const merged = new Map(cloudClients.map((client) => [client.id, client]));

    for (const action of actions) {
        if (action.type === 'CREATE_CLIENT' || action.type === 'UPDATE_CLIENT') {
            const client = action.payload as Client;
            merged.set(client.id, client);
        } else if (action.type === 'DELETE_CLIENT') {
            merged.delete(action.payload as number);
        }
    }

    return [...merged.values()];
};

export const reconcileVisits = (cloudVisits: Visit[], actions: SyncAction[]): Visit[] => {
    const merged = new Map(cloudVisits.map((visit) => [visit.id, visit]));

    for (const action of actions) {
        if (action.type === 'CREATE_VISIT' || action.type === 'UPDATE_VISIT') {
            const visit = action.payload as Visit;
            merged.set(visit.id, visit);
        }
    }

    return [...merged.values()];
};

export const forceSyncAll = async (userId?: string): Promise<void> => {
    if (!navigator.onLine) {
        throw new Error('Sin conexión a internet. Tus acciones siguen guardadas y se reintentará la sincronización cuando vuelva la conexión.');
    }

    // 1. Process local queue (Push)
    const syncResult = await sync.processSyncQueue(userId);
    
    // 2. Fetch remote data (Pull)
    if (navigator.onLine) {
        if (supabaseClient.isSupabaseConfigured()) {
            try {
                const cloudClients = await supabaseClient.fetchClients(userId);
                const cloudVisits = await supabaseClient.fetchVisits(userId, undefined);
                const pendingActions = await db.getSyncQueue();
                const clients = reconcileClients(cloudClients, pendingActions);
                const clientIds = new Set(clients.map((client) => client.id));
                const visits = reconcileVisits(cloudVisits, pendingActions)
                    .filter((visit) => clientIds.has(visit.clientId));

                await Promise.all([
                    db.saveClients(clients),
                    db.saveVisits(visits),
                ]);
            } catch (e) {
                 console.error("Error pulling data during force sync:", e);
                 throw e;
            }
        } else {
             console.log("SYNC: Supabase not configured. Using local data only.");
        }
    }

    if (syncResult.failed > 0) {
        console.error('SYNC: Pending actions failed.', syncResult.errors);
        const actionTypes = [...new Set(syncResult.errors.map((error) => error.actionType))].join(', ');
        throw new Error(
            `${syncResult.failed} acción(es) no pudieron sincronizarse y siguen pendientes.` +
            (actionTypes ? ` Código de soporte: ${actionTypes}.` : '')
        );
    }
};

export const restoreSession = async (): Promise<User | null> => {
    if (!supabaseClient.isSupabaseConfigured()) return null;
    const authUser = await supabaseClient.getCurrentAuthUser();
    if (!authUser?.email) return null;
    const profile = await supabaseClient.fetchCurrentAppUser(authUser.id, authUser.email);
    if (!profile) {
        await supabaseClient.signOut();
        return null;
    }

    return {
        id: authUser.id,
        name: profile.name,
        role: profile.role,
        username: authUser.email,
        sellerCode: profile.sellerCode,
    };
};

export const logout = async (): Promise<void> => {
    if (!supabaseClient.isSupabaseConfigured()) return;
    try {
        await supabaseClient.signOut();
    } catch (error) {
        console.warn("Supabase logout failed", error);
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
                const profile = await supabaseClient.fetchCurrentAppUser(data.user.id, email);
                if (!profile) {
                    await supabaseClient.signOut();
                    throw new Error('El usuario no está habilitado en AgroField.');
                }
                return { 
                    id: data.user.id,
                    name: profile.name,
                    role: profile.role,
                    username: email,
                    sellerCode: profile.sellerCode,
                };
            }
        } catch (e) {
            console.error("Supabase login failed", e);
            throw new Error("No se pudo iniciar sesión. Verifica usuario, contraseña y que el usuario esté activo.");
        }
    }

    throw new Error("Supabase no está configurado. Configura el entorno antes de iniciar sesión.");
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

    const accessToken = await supabaseClient.getAccessToken();
    if (!accessToken) {
        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    const response = await fetch('/api/admin-users', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: input.name,
            email: input.email,
            password,
            role: input.role,
            sellerCode: input.sellerCode,
            active: input.active,
        }),
    });

    const result = await response.json() as AppUser & { error?: string };
    if (!response.ok) {
        throw new Error(result.error || 'No se pudo crear el usuario.');
    }
    return result;
};

export const setAppUserActive = async (id: string, active: boolean): Promise<AppUser> => {
    const accessToken = await supabaseClient.getAccessToken();
    if (!accessToken) {
        throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }

    const response = await fetch('/api/admin-users', {
        method: 'PATCH',
        headers: {
            'Authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, active }),
    });

    const result = await response.json() as AppUser & { error?: string };
    if (!response.ok) {
        throw new Error(result.error || 'No se pudo actualizar el usuario.');
    }
    return result;
};

// --- DATA INITIALIZATION ---
const initializeDataIfNeeded = async () => {
    const INITIALIZED_KEY = 'agro_crm_v1_initialized';
    const isInitialized = localStorage.getItem(INITIALIZED_KEY);

    if (!isInitialized && DEMO_DATA_ENABLED) {
        console.log("CRM: First run detected. Loading mocks.");
        await db.saveClients(MOCK_CLIENTS);
        await db.saveVisits(MOCK_VISITS);
        localStorage.setItem(INITIALIZED_KEY, 'true');
    } else if (!isInitialized) {
        localStorage.setItem(INITIALIZED_KEY, 'true');
    }
};

// --- CLIENTS ---
export const getClients = async (isOnline: boolean, userId?: string): Promise<Client[]> => {
    await initializeDataIfNeeded();
    if (isOnline && supabaseClient.isSupabaseConfigured()) {
        try {
            const cloudClients = await supabaseClient.fetchClients(userId);
            const pendingActions = await db.getSyncQueue();
            const clients = reconcileClients(cloudClients, pendingActions);
            await db.saveClients(clients);
            return userId
                ? clients.filter((client) => client.vendedorId === userId || !client.vendedorId)
                : clients;
        } catch (e) {
            console.warn("Supabase fetch failed, using local cache", e);
        }
    }
    const localClients = await db.getClients();
    return userId ? localClients.filter(c => c.vendedorId === userId || !c.vendedorId) : localClients;
};

const getImportCoordinate = (
    row: Record<string, unknown>,
    keys: string[],
    label: string,
    rowNumber: number,
    min: number,
    max: number,
): number => {
    const raw = keys
        .map((key) => row[key])
        .find((value) => value !== undefined && value !== null && String(value).trim() !== '');

    if (raw === undefined) {
        throw new Error(`Fila ${rowNumber}: falta ${label}. Usa la plantilla de clientes.`);
    }

    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) {
        throw new Error(`Fila ${rowNumber}: ${label} inválida (${String(raw)}).`);
    }
    return value;
};

export const parseImportedClients = (
    data: Record<string, unknown>[],
    baseId = Date.now(),
): Client[] => {
    if (data.length === 0) {
        throw new Error('El archivo de clientes no contiene registros.');
    }

    return data.map((row, i) => ({
        id: baseId + i,
        name: String(row.nombre_dueno || row.nombre_dueño || row.cliente || row.nombre || 'Desconocido').trim(),
        farmName: String(row.nombre_finca || row.finca || 'Finca Sin Nombre').trim(),
        address: String(row.direccion || row.address || 'No especificada').trim(),
        coords: {
            lat: getImportCoordinate(row, ['latitud', 'lat'], 'latitud', i + 2, -90, 90),
            lon: getImportCoordinate(row, ['longitud', 'lon', 'lng'], 'longitud', i + 2, -180, 180),
        },
        contactPerson: String(row.contacto || row.nombre_dueno || row.nombre_dueño || row.cliente || 'Desconocido').trim(),
        phone: String(row.telefono || row.phone || '').trim(),
        accountStatus: (row.estado_cuenta || row.accountStatus || 'OK') as Client['accountStatus'],
        vendedorId: String(row.vendedor_codigo || row.vendedorId || '').trim() || undefined,
        leadStatus: (row.estado_lead || row.leadStatus || 'Prospect') as Client['leadStatus'],
        priority: (row.prioridad || row.priority || 'Medium') as Client['priority'],
        crops: String(row.cultivos || row.crops || '').split('|').map((crop) => crop.trim()).filter(Boolean),
        erpCode: String(row.codigo_erp || row.erpCode || '').trim(),
    }));
};

export const bulkImport = async (
    type: string,
    data: Record<string, unknown>[],
    isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
): Promise<void> => {
    if (type === 'Clientes') {
        const clients = parseImportedClients(data);
        const existing = await db.getClients();

        if (supabaseClient.isSupabaseConfigured() && isOnline) {
            await supabaseClient.upsertClients(clients);
        } else if (supabaseClient.isSupabaseConfigured()) {
            for (const client of clients) {
                await sync.queueAction({
                    id: `client-create-${client.id}`,
                    type: 'CREATE_CLIENT',
                    payload: client,
                    timestamp: Date.now(),
                });
            }
        }

        await db.saveClients([...existing, ...clients]);
        return;
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
            const email = String(row.email || row.correo || '').trim();
            const password = String(row.password || row.contrasena || row.contraseña || '');
            if (!email || !password) {
                throw new Error('Cada vendedor necesita email y password/contrasena.');
            }
            const sellerCode = String(row.codigo || row.sellerCode || row.vendedor_codigo || '').trim()
                || email.split('@')[0];
            await createAppUser({
                name: String(row.nombre || row.name || email).trim(),
                email,
                role: (row.rol || row.role || 'Vendedor') as AppUser['role'],
                sellerCode,
                active: String(row.activo || row.active || 'true').toLowerCase() !== 'false'
            }, password);
        }
        return;
    }
    // Se podrían agregar Campañas, Vendedores, Plan de Ventas aquí siguiendo la misma lógica.
};

export const purgeAllClients = async (
    isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true,
): Promise<void> => {
    if (supabaseClient.isSupabaseConfigured()) {
        if (!isOnline) {
            throw new Error('Necesitas conexión para borrar todos los clientes de forma segura.');
        }
        await supabaseClient.deleteAllClients();
    }

    await db.saveClients([]);
};

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
            const localVisits = await db.getVisits();
            const remoteById = new Map(localVisits.map((visit) => [visit.id, visit]));
            cloudVisits.forEach((visit) => remoteById.set(visit.id, visit));
            const pendingActions = await db.getSyncQueue();
            const visits = reconcileVisits([...remoteById.values()], pendingActions);
            await db.saveVisits(visits);

            return visits.filter((visit) =>
                (!userId || visit.vendedorId === userId || !visit.vendedorId)
                && (!campaignId || visit.campaignId === campaignId || !visit.campaignId)
            );
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
            await db.saveInteractions(cloudInteractions);
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
            await db.saveTasks(cloudTasks);
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
    if (!DEMO_DATA_ENABLED) return [];
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
    if (!DEMO_DATA_ENABLED) return [];
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
