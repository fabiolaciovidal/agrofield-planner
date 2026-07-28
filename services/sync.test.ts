import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Client, SyncAction } from '../types';

const mocks = vi.hoisted(() => ({
    getSyncQueue: vi.fn(),
    removeFromSyncQueue: vi.fn(),
    insertClient: vi.fn(),
    isSupabaseConfigured: vi.fn(),
}));

vi.mock('./db', () => ({
    getSyncQueue: mocks.getSyncQueue,
    removeFromSyncQueue: mocks.removeFromSyncQueue,
    addToSyncQueue: vi.fn(),
}));

vi.mock('./supabaseClient', () => ({
    isSupabaseConfigured: mocks.isSupabaseConfigured,
    insertClient: mocks.insertClient,
    upsertVisit: vi.fn(),
    updateClient: vi.fn(),
    deleteClient: vi.fn(),
    insertInteraction: vi.fn(),
    upsertTask: vi.fn(),
    deleteTask: vi.fn(),
}));

import { processSyncQueue } from './sync';

const client: Client = {
    id: 10,
    name: 'Cliente QA',
    farmName: 'Finca QA',
    address: '',
    coords: { lat: -17.7, lon: -63.1 },
    contactPerson: 'Cliente QA',
    phone: '',
    accountStatus: 'OK',
    leadStatus: 'Prospect',
    priority: 'Medium',
    crops: [],
    vendedorId: 'V001',
};

const action: SyncAction = {
    id: 'client-create-10',
    type: 'CREATE_CLIENT',
    payload: client,
    timestamp: 1,
};

describe('processSyncQueue', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.isSupabaseConfigured.mockReturnValue(true);
    });

    it('conserva la acción pendiente y devuelve el error real de Supabase', async () => {
        mocks.getSyncQueue.mockResolvedValue([action]);
        mocks.insertClient.mockRejectedValue({ message: 'new row violates row-level security policy' });

        const result = await processSyncQueue();

        expect(result).toMatchObject({ processed: 0, failed: 1, remaining: 1 });
        expect(result.errors).toEqual([{
            actionId: action.id,
            actionType: action.type,
            message: 'new row violates row-level security policy',
        }]);
        expect(mocks.removeFromSyncQueue).not.toHaveBeenCalled();
    });
});
