export interface StoredPosition {
  coords: {
    lat: number;
    lon: number;
  };
  timestamp: number;
  accuracy?: number;
}

export interface ResolvedPosition {
  coords: {
    lat: number;
    lon: number;
  };
  timestamp: number;
  source: 'live' | 'cached';
  accuracy?: number;
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

export const saveLastKnownPosition = (
  coords: { lat: number; lon: number },
  timestamp = Date.now(),
  accuracy?: number
) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ coords, timestamp, accuracy }));
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
    allowCached?: boolean;
  }
): Promise<ResolvedPosition> => {
  const timeoutMs = options?.timeoutMs ?? 12000;
  const maxCachedAgeMs = options?.maxCachedAgeMs ?? 15 * 60 * 1000;
  const allowCached = options?.allowCached ?? true;

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
      accuracy: position.coords.accuracy,
    };
    saveLastKnownPosition(resolved.coords, resolved.timestamp, resolved.accuracy);
    return resolved;
  } catch (error) {
    if (allowCached) {
      const cached = getCachedPosition(maxCachedAgeMs);
      if (cached) {
        return cached;
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error('No se pudo obtener la ubicación actual.');
  }
};

export const requireLiveVisitPosition = (
  position: ResolvedPosition,
  maxAccuracyMeters = 100
): ResolvedPosition & { source: 'live'; accuracy: number } => {
  if (position.source !== 'live') {
    throw new Error('Se necesita una ubicación GPS actual para registrar la visita.');
  }

  if (typeof position.accuracy !== 'number' || !Number.isFinite(position.accuracy)) {
    throw new Error('El GPS no informó la precisión. Vuelve a intentarlo al aire libre.');
  }

  if (position.accuracy > maxAccuracyMeters) {
    throw new Error(`La señal GPS tiene una precisión de ${Math.round(position.accuracy)} m. Se requieren 100 m o menos.`);
  }

  return position as ResolvedPosition & { source: 'live'; accuracy: number };
};
