export interface StoredPosition {
  coords: {
    lat: number;
    lon: number;
  };
  timestamp: number;
}

export interface ResolvedPosition {
  coords: {
    lat: number;
    lon: number;
  };
  timestamp: number;
  source: 'live' | 'cached';
}

const STORAGE_KEY = 'agrofield_last_known_position';

const readStoredPosition = (): StoredPosition | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPosition;
    if (
      typeof parsed?.coords?.lat !== 'number' ||
      typeof parsed?.coords?.lon !== 'number' ||
      typeof parsed?.timestamp !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const saveLastKnownPosition = (coords: { lat: number; lon: number }, timestamp = Date.now()) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords, timestamp }));
  } catch {
    // Ignore storage failures and rely on the live position only.
  }
};

const getCachedPosition = (maxAgeMs: number): ResolvedPosition | null => {
  const stored = readStoredPosition();
  if (!stored) return null;
  if (Date.now() - stored.timestamp > maxAgeMs) return null;
  return { ...stored, source: 'cached' };
};

export const getBestEffortCurrentPosition = async (
  options?: {
    timeoutMs?: number;
    maxCachedAgeMs?: number;
  }
): Promise<ResolvedPosition> => {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const maxCachedAgeMs = options?.maxCachedAgeMs ?? 15 * 60 * 1000;

  if (!navigator.geolocation) {
    throw new Error('Este dispositivo no soporta geolocalización.');
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: timeoutMs,
        maximumAge: 0,
      });
    });

    const resolved: ResolvedPosition = {
      coords: {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
      },
      timestamp: position.timestamp,
      source: 'live',
    };
    saveLastKnownPosition(resolved.coords, resolved.timestamp);
    return resolved;
  } catch (error) {
    const cached = getCachedPosition(maxCachedAgeMs);
    if (cached) {
      return cached;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('No se pudo obtener la ubicación actual.');
  }
};
