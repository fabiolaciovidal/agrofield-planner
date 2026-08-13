import { describe, expect, it } from 'vitest';
import { evaluateOfflineReadiness } from './offlineReadiness';

describe('evaluateOfflineReadiness', () => {
  it('declara listo al dispositivo preparado', () => {
    expect(evaluateOfflineReadiness({
      hasSavedSession: true,
      campaignId: 'I26',
      lastSyncAt: Date.now(),
    })).toEqual({ ready: true, missing: [] });
  });

  it('enumera lo que falta antes de salir al campo', () => {
    expect(evaluateOfflineReadiness({
      hasSavedSession: false,
      campaignId: '',
      lastSyncAt: null,
    })).toEqual({
      ready: false,
      missing: ['sesión guardada', 'campaña seleccionada', 'sincronización inicial'],
    });
  });
});
