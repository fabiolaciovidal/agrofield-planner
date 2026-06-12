
import { SyncAction, Visit, Client, Interaction, Task } from '../types';
import * as db from './db';
import * as supabaseClient from './supabaseClient';

export const queueAction = async (action: SyncAction): Promise<void> => {
    await db.addToSyncQueue(action);
    console.log("SYNC: Action queued:", action);
};

export const processSyncQueue = async (): Promise<void> => {
    let queue = await db.getSyncQueue();
    if (queue.length === 0) return;

    console.log(`SYNC: Processing ${queue.length} actions.`);
    
    if (!supabaseClient.isSupabaseConfigured()) {
        console.warn("SYNC: Supabase not configured. Keeping items in queue for local persistence.");
        return;
    }
    
    for (const action of queue) {
        try {
            let success = false;
            switch (action.type) {
                case 'UPDATE_VISIT':
                case 'CREATE_VISIT':
                    await supabaseClient.upsertVisit(action.payload as Visit);
                    success = true;
                    break;
                case 'CREATE_CLIENT':
                    await supabaseClient.insertClient(action.payload as Client);
                    success = true;
                    break;
                case 'UPDATE_CLIENT':
                    await supabaseClient.updateClient(action.payload as Client);
                    success = true;
                    break;
                case 'DELETE_CLIENT':
                    await supabaseClient.deleteClient(action.payload as number);
                    success = true;
                    break;
                case 'CREATE_INTERACTION':
                    await supabaseClient.insertInteraction(action.payload as Interaction);
                    success = true;
                    break;
                case 'UPDATE_TASK':
                case 'CREATE_TASK':
                    await supabaseClient.upsertTask(action.payload as Task);
                    success = true;
                    break;
                case 'DELETE_TASK':
                    await supabaseClient.deleteTask(action.payload as number);
                    success = true;
                    break;
            }
            
            if (success) {
                await db.removeFromSyncQueue(action.id);
                console.log(`SYNC: Action ${action.id} processed and removed from queue.`);
            }
        } catch (error) {
            console.error(`SYNC: Failed to process action ${action.id}. It will be retried later.`, error);
        }
    }
     console.log("SYNC: Queue processing finished.");
};

export const getQueueCount = async (): Promise<number> => {
    const queue = await db.getSyncQueue();
    return queue.length;
};

