
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';
import { Client, Visit, Interaction, Task, Campaign, SalesPlan, AppUser } from '../types';

let supabase: any = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

export const isSupabaseConfigured = () => !!supabase;

export const signIn = async (email: string, password?: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    return await supabase.auth.signInWithPassword({ email, password });
};

export const signUpUser = async (user: Omit<AppUser, 'id' | 'createdAt'>, password: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    return await supabase.auth.signUp({
        email: user.email,
        password,
        options: {
            data: {
                full_name: user.name,
                role: user.role,
                seller_code: user.sellerCode,
            }
        }
    });
};

// --- App Users / Sellers ---
export const fetchAppUsers = async (): Promise<AppUser[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('app_users').select('*').order('name', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        sellerCode: row.sellerCode,
        active: row.active,
        createdAt: row.createdAt,
        passwordHash: row.passwordHash,
    }));
};

export const fetchAppUserByCredentials = async (email: string, passwordHash: string): Promise<AppUser | null> => {
    if (!supabase) return null;
    const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('email', email)
        .eq('passwordHash', passwordHash)
        .eq('active', true)
        .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        sellerCode: data.sellerCode,
        active: data.active,
        createdAt: data.createdAt,
        passwordHash: data.passwordHash,
    };
};

export const upsertAppUser = async (user: AppUser): Promise<AppUser> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('app_users').upsert(user).select().single();
    if (error) throw error;
    return data as AppUser;
};

// --- Clients ---
export const fetchClients = async (vendedorId?: string): Promise<Client[]> => {
    if (!supabase) return [];
    let query = supabase.from('clients').select('*');
    if (vendedorId) query = query.eq('vendedorId', vendedorId);
    const { data, error } = await query;
    if (error) throw error;
    return data as Client[];
};

export const insertClient = async (client: Client): Promise<Client> => {
    if (!supabase) throw new Error("Supabase not configured");
    // Extraemos campos que no están en Supabase para evitar Error 400
    const { erpCode, ...clientData } = client; 
    const { data, error } = await supabase.from('clients').insert(clientData).select().single();
    if (error) throw error;
    return data as Client;
};

export const updateClient = async (client: Client): Promise<Client> => {
     if (!supabase) throw new Error("Supabase not configured");
     const { erpCode, ...clientData } = client;
     const { data, error } = await supabase.from('clients').update(clientData).eq('id', client.id).select().single();
    if (error) throw error;
    return data as Client;
}

export const deleteClient = async (clientId: number): Promise<void> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('clients').delete().eq('id', clientId);
    if (error) throw error;
};

export const deleteAllClients = async (): Promise<void> => {
    if (!supabase) throw new Error("Supabase not configured");
    // Eliminamos todos los registros (eq('id', id) is typically required for deletes in Supabase without admin roles, we might need explicitly to delete not null or bypass RLS if open)
    const { error } = await supabase.from('clients').delete().not('id', 'is', null);
    if (error) throw error;
};


// --- Visits ---
export const fetchVisits = async (vendedorId?: string, campaignId?: string): Promise<Visit[]> => {
    if (!supabase) return [];
    let query = supabase.from('visits').select('*');
    if (vendedorId) query = query.or(`vendedorId.eq.${vendedorId},vendedorId.is.null`);
    if (campaignId) query = query.or(`campaignId.eq.${campaignId},campaignId.is.null`);
    const { data, error } = await query;
    if (error) throw error;
    return data as Visit[];
};

export const upsertVisit = async (visit: Visit): Promise<Visit> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('visits').upsert(visit).select().single();
    if (error) throw error;
    return data as Visit;
};

// --- Interactions ---
export const fetchInteractions = async (): Promise<Interaction[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('interactions').select('*');
    if (error) throw error;
    return data as Interaction[];
};

export const insertInteraction = async (interaction: Interaction): Promise<Interaction> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { id, ...data } = interaction;
    const { data: result, error } = await supabase.from('interactions').insert(data).select().single();
    if (error) throw error;
    return result as Interaction;
};

// --- Tasks ---
export const fetchTasks = async (): Promise<Task[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('tasks').select('*');
    if (error) throw error;
    return data as Task[];
};

export const upsertTask = async (task: Task): Promise<Task> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('tasks').upsert(task).select().single();
    if (error) throw error;
    return data as Task;
};

export const deleteTask = async (taskId: number): Promise<void> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) throw error;
};
// --- Campaigns ---
export const fetchCampaigns = async (): Promise<Campaign[]> => {
    if (!supabase) return [];
    const { data, error } = await supabase.from('campaigns').select('*').order('year', { ascending: false });
    if (error) throw error;
    return data as Campaign[];
};

export const upsertCampaign = async (campaign: Campaign): Promise<Campaign> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('campaigns').upsert(campaign).select().single();
    if (error) throw error;
    return data as Campaign;
};

// --- Sales Plans ---
export const fetchSalesPlans = async (vendedorId?: string, campaignId?: string): Promise<SalesPlan[]> => {
    if (!supabase) return [];
    let query = supabase.from('sales_plans').select('*');
    if (vendedorId) query = query.eq('vendedorId', vendedorId);
    if (campaignId) query = query.eq('campaignId', campaignId);
    const { data, error } = await query;
    if (error) throw error;
    return data as SalesPlan[];
};

export const upsertSalesPlan = async (salesPlan: SalesPlan): Promise<SalesPlan> => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.from('sales_plans').upsert(salesPlan).select().single();
    if (error) throw error;
    return data as SalesPlan;
};
