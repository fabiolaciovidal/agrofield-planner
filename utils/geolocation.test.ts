import { describe, expect, it } from 'vitest';
import { requireLiveVisitPosition } from './geolocation';

describe('requireLiveVisitPosition', () => {
  it('acepta una ubicación GPS en vivo con precisión suficiente', () => {
    const position = requireLiveVisitPosition({
      coords: { lat: -17.516, lon: -63.167 },
      timestamp: Date.now(),
      source: 'live',
      accuracy: 18,
    });
    expect(position.accuracy).toBe(18);
  });

  it('rechaza una ubicación guardada aunque sea reciente', () => {
    expect(() => requireLiveVisitPosition({
      coords: { lat: -17.516, lon: -63.167 },
      timestamp: Date.now(),
      source: 'cached',
      accuracy: 10,
    })).toThrow('ubicación GPS actual');
  });

  it('rechaza una lectura con precisión mayor a cien metros', () => {
    expect(() => requireLiveVisitPosition({
      coords: { lat: -17.516, lon: -63.167 },
      timestamp: Date.now(),
      source: 'live',
      accuracy: 145,
    })).toThrow('100 m o menos');
  });
});
