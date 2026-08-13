export const OFFLINE_LAST_SYNC_KEY = 'agrofield_last_successful_sync';

export interface OfflineReadinessInput {
  hasSavedSession: boolean;
  campaignId?: string;
  lastSyncAt?: number | null;
}

export interface OfflineReadinessResult {
  ready: boolean;
  missing: string[];
}

export const evaluateOfflineReadiness = ({
  hasSavedSession,
  campaignId,
  lastSyncAt,
}: OfflineReadinessInput): OfflineReadinessResult => {
  const missing: string[] = [];
  if (!hasSavedSession) missing.push('sesión guardada');
  if (!campaignId) missing.push('campaña seleccionada');
  if (!lastSyncAt) missing.push('sincronización inicial');

  return { ready: missing.length === 0, missing };
};

export const countCachedMapTiles = async (): Promise<number> => {
  if (typeof caches === 'undefined') return 0;
  try {
    const cache = await caches.open('map-tiles');
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
};
