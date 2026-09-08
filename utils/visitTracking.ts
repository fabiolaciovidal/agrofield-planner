import { Visit } from '../types';

export const isRescheduledVisit = (visit: Visit): boolean =>
  visit.status === 'Cancelled' && visit.notes.includes('[Reprogramada ');

export const getVisitDurationMinutes = (visit: Visit): number | null => {
  if (!visit.checkIn || !visit.checkOut) return null;
  return Math.max(0, Math.round((visit.checkOut.time - visit.checkIn.time) / 60000));
};

export interface VisitTrackingSummary {
  total: number;
  planned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  rescheduled: number;
  completionRate: number;
  uniqueClientsVisited: number;
  withResult: number;
  averageDurationMinutes: number | null;
}

export const summarizeVisits = (visits: Visit[]): VisitTrackingSummary => {
  const completed = visits.filter((visit) => visit.status === 'Completed');
  const durations = completed
    .map(getVisitDurationMinutes)
    .filter((duration): duration is number => duration !== null);

  return {
    total: visits.length,
    planned: visits.filter((visit) => visit.status === 'Planned').length,
    inProgress: visits.filter((visit) => visit.status === 'InProgress').length,
    completed: completed.length,
    cancelled: visits.filter((visit) => visit.status === 'Cancelled').length,
    rescheduled: visits.filter(isRescheduledVisit).length,
    completionRate: visits.length > 0 ? Math.round((completed.length / visits.length) * 100) : 0,
    uniqueClientsVisited: new Set(completed.map((visit) => visit.clientId)).size,
    withResult: completed.filter((visit) =>
      Boolean(visit.notes.trim() || visit.commitments.trim() || visit.productiveSurvey)
    ).length,
    averageDurationMinutes: durations.length > 0
      ? Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length)
      : null,
  };
};
