import { describe, expect, it } from 'vitest';
import { Visit } from '../types';
import { isRescheduledVisit, summarizeVisits } from './visitTracking';

const visit = (overrides: Partial<Visit>): Visit => ({
  id: 1,
  clientId: 10,
  date: '2026-09-08',
  timeSlot: '09:00 - 10:00',
  status: 'Planned',
  notes: '',
  photos: [],
  tasks: [],
  commitments: '',
  ...overrides,
});

describe('visit tracking metrics', () => {
  it('calculates execution and result indicators', () => {
    const summary = summarizeVisits([
      visit({ id: 1, status: 'Completed', notes: 'Pedido potencial', checkIn: { time: 0, coords: { lat: 0, lon: 0 } }, checkOut: { time: 30 * 60_000 } }),
      visit({ id: 2, clientId: 11, status: 'Completed', commitments: 'Enviar cotización', checkIn: { time: 0, coords: { lat: 0, lon: 0 } }, checkOut: { time: 60 * 60_000 } }),
      visit({ id: 3, status: 'Cancelled', notes: '[Reprogramada 2026-09-08] Motivo: cliente ausente.' }),
      visit({ id: 4 }),
    ]);

    expect(summary).toMatchObject({
      total: 4,
      completed: 2,
      planned: 1,
      cancelled: 1,
      rescheduled: 1,
      completionRate: 50,
      uniqueClientsVisited: 2,
      withResult: 2,
      averageDurationMinutes: 45,
    });
  });

  it('only classifies audited cancellations as rescheduled', () => {
    expect(isRescheduledVisit(visit({ status: 'Cancelled', notes: 'Cliente canceló.' }))).toBe(false);
  });
});
