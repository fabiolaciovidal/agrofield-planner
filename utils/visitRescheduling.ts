import { Visit } from '../types';

export interface RescheduleInput {
  date: string;
  timeSlot: string;
  reason: string;
  currentNotes?: string;
  changedAt?: Date;
}

export const buildRescheduledVisits = (
  visit: Visit,
  input: RescheduleInput
): { cancelledVisit: Visit; newVisit: Omit<Visit, 'id'> } => {
  const reason = input.reason.trim();
  const timeSlot = input.timeSlot.trim();
  const changedAt = (input.changedAt || new Date()).toISOString();
  const auditNote = `[Reprogramada ${changedAt}] Motivo: ${reason}. Nueva fecha: ${input.date}, ${timeSlot}.`;

  return {
    cancelledVisit: {
      ...visit,
      status: 'Cancelled',
      notes: [input.currentNotes?.trim(), auditNote].filter(Boolean).join('\n'),
    },
    newVisit: {
      clientId: visit.clientId,
      date: input.date,
      timeSlot,
      status: 'Planned',
      notes: `Visita reprogramada. Motivo del intento anterior: ${reason}.`,
      photos: [],
      tasks: [],
      commitments: '',
      vendedorId: visit.vendedorId,
      campaignId: visit.campaignId,
    },
  };
};
