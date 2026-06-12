
import { Client, Visit, Interaction, Task, SyncAction } from '../types';
import { db } from './db.dexie';

// --- Client Data ---
export const saveClients = async (clients: Client[]): Promise<void> => {
  await db.clients.clear();
  await db.clients.bulkAdd(clients);
};

export const getClients = async (): Promise<Client[]> => {
  return db.clients.toArray();
};

export const createClient = async (client: Client): Promise<void> => {
  await db.clients.add(client);
};

export const updateClient = async (client: Client): Promise<void> => {
  await db.clients.put(client);
};

export const deleteClient = async (clientId: number): Promise<void> => {
    await db.transaction('rw', [db.clients, db.visits, db.interactions, db.tasks], async () => {
        await db.clients.delete(clientId);
        await db.visits.where('clientId').equals(clientId).delete();
        await db.interactions.where('clientId').equals(clientId).delete();
        await db.tasks.where('clientId').equals(clientId).delete();
    });
};


// --- Visit Data ---
export const saveVisits = async (visits: Visit[]): Promise<void> => {
  await db.visits.clear();
  await db.visits.bulkAdd(visits);
};

export const getVisits = async (): Promise<Visit[]> => {
  return db.visits.toArray();
};

export const saveVisit = async (visit: Visit): Promise<void> => {
  await db.visits.put(visit);
};

export const createVisit = async (visit: Visit): Promise<void> => {
  await db.visits.add(visit);
}

// --- Interaction Data ---
export const getInteractions = async (clientId?: number): Promise<Interaction[]> => {
  if (clientId) {
    return db.interactions.where('clientId').equals(clientId).toArray();
  }
  return db.interactions.toArray();
};

export const createInteraction = async (interaction: Interaction): Promise<void> => {
  await db.interactions.add(interaction);
};

// --- Task Data ---
export const getTasks = async (clientId?: number): Promise<Task[]> => {
  if (clientId) {
    return db.tasks.where('clientId').equals(clientId).toArray();
  }
  return db.tasks.toArray();
};

export const saveTask = async (task: Task): Promise<void> => {
  await db.tasks.put(task);
};

export const deleteTask = async (id: number): Promise<void> => {
  await db.tasks.delete(id);
};

// --- Sync Queue ---
export const getSyncQueue = async (): Promise<SyncAction[]> => {
  return db.syncQueue.orderBy('timestamp').toArray();
};

export const saveSyncQueue = async (queue: SyncAction[]): Promise<void> => {
  await db.syncQueue.clear();
  await db.syncQueue.bulkAdd(queue);
};

export const addToSyncQueue = async (action: SyncAction): Promise<void> => {
    await db.syncQueue.put(action);
};

export const removeFromSyncQueue = async (id: string): Promise<void> => {
    await db.syncQueue.delete(id);
};
