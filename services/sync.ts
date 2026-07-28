
import { SyncAction, Visit, Client, Interaction, Task } from '../types';
import * as db from './db';
import * as supabaseClient from './supabaseClient';

export interface SyncErrorDetail {
    actionId: string;
    actionType: SyncAction['type'];
    message: string;
}

export interface SyncResult {
    processed: number;
    failed: number;
    remaining: number;
    errors: SyncErrorDetail[];
}

export const queueAction = async (action: SyncAction): Promise<void> => {
    await db.addToSyncQueue(action);
    console.log("SYNC: Action queued:", action);
};

export const processSyncQueue = async (): Promise<SyncResult> => {
    const queue = await db.getSyncQueue();
    if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0, errors: [] };

    console.log(`SYNC: Processing ${queue.length} actions.`);
    
    if (!supabaseClient.isSupabaseConfigured()) {
        console.warn("SYNC: Supabase not configured. Keeping items in queue for local persistence.");
        return { processed: 0, failed: 0, remaining: queue.length, errors: [] };
    }

    let processed = 0;
    let failed = 0;
    const errors: SyncErrorDetail[] = [];

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
                processed += 1;
                console.log(`SYNC: Action ${action.id} processed and removed from queue.`);
            }
        } catch (error) {
            failed += 1;
            const message = error instanceof Error
                ? error.message
                : typeof error === 'object' && error !== null && 'message' in error
                    ? String((error as { message: unknown }).message)
                    : String(error);
            errors.push({ actionId: action.id, actionType: action.type, message });
            console.error(`SYNC: Failed to process action ${action.id}. It will be retried later.`, error);
        }
    }
     console.log("SYNC: Queue processing finished.");
     return { processed, failed, remaining: (await db.getSyncQueue()).length, errors };
};

export const getQueueCount = async (): Promise<number> => {
    const queue = await db.getSyncQueue();
    return queue.length;
};

