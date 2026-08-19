import { describe, expect, it } from 'vitest';
import { Visit } from '../types';
import { buildRescheduledVisits } from './visitRescheduling';

const visit: Visit = {
  id: 10,
  clientId: 5,
  date: '2026-08-18',
  timeSlot: '09:00 - 11:00',
  status: 'InProgress',
  checkIn: { time: 1000, coords: { lat: -17.5, lon: -63.1 }, accuracy: 15 },
  notes: 'Cliente visitado.',
  photos: ['evidence'],
  tasks: [],
  commitments: '',
  vendedorId: 'V001',
  campaignId: 'I26',
};

describe('buildRescheduledVisits', () => {
  it('conserva el intento original y crea una nueva visita planificada', () => {
    const result = buildRescheduledVisits(visit, {
      date: '2026-08-21',
      timeSlot: '14:00 - 16:00',
      reason: 'Cliente no disponible',
      currentNotes: visit.notes,
      changedAt: new Date('2026-08-18T14:00:00.000Z'),
    });

    expect(result.cancelledVisit.status).toBe('Cancelled');
    expect(result.cancelledVisit.checkIn).toEqual(visit.checkIn);
    expect(result.cancelledVisit.notes).toContain('Cliente no disponible');
    expect(result.newVisit).toMatchObject({
      clientId: 5,
      date: '2026-08-21',
      timeSlot: '14:00 - 16:00',
      status: 'Planned',
      vendedorId: 'V001',
      campaignId: 'I26',
    });
    expect(result.newVisit).not.toHaveProperty('checkIn');
  });
});
