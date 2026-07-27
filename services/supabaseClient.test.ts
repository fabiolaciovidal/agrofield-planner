import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Interaction } from '../types';

const supabaseMocks = vi.hoisted(() => ({
    from: vi.fn(),
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        from: supabaseMocks.from,
    }),
}));

vi.mock('../constants', () => ({
    SUPABASE_URL: 'https://qa.example.supabase.co',
    SUPABASE_ANON_KEY: 'qa-public-key',
}));

import { insertInteraction } from './supabaseClient';

describe('insertInteraction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        supabaseMocks.from.mockReturnValue({ insert: supabaseMocks.insert });
        supabaseMocks.insert.mockReturnValue({ select: supabaseMocks.select });
        supabaseMocks.select.mockReturnValue({ single: supabaseMocks.single });
    });

    it('envía el id porque la tabla interactions lo exige como clave primaria', async () => {
        const interaction: Interaction = {
            id: 123,
            clientId: 456,
            date: '2026-07-27',
            type: 'Note',
            summary: 'Prueba',
            details: 'Interacción QA',
        };
        supabaseMocks.single.mockResolvedValue({ data: interaction, error: null });

        await expect(insertInteraction(interaction)).resolves.toEqual(interaction);
        expect(supabaseMocks.from).toHaveBeenCalledWith('interactions');
        expect(supabaseMocks.insert).toHaveBeenCalledWith(interaction);
    });
});
