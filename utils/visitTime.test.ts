import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VISIT_TIME_RANGE,
  formatVisitTimeSlot,
  getVisitTimeRange,
  isValidVisitTimeRange,
  parseVisitTimeSlot,
} from './visitTime';

describe('visit time helpers', () => {
  it('mantiene el formato existente de los horarios', () => {
    expect(formatVisitTimeSlot('09:00', '11:00')).toBe('09:00 - 11:00');
  });

  it('recupera inicio y fin de una visita existente', () => {
    expect(parseVisitTimeSlot('14:30 - 16:15')).toEqual({
      startTime: '14:30',
      endTime: '16:15',
    });
  });

  it('acepta horarios antiguos aunque no tengan espacios', () => {
    expect(parseVisitTimeSlot('08:00-09:00')).toEqual({
      startTime: '08:00',
      endTime: '09:00',
    });
  });

  it('rechaza una hora final igual o anterior a la inicial', () => {
    expect(isValidVisitTimeRange('11:00', '11:00')).toBe(false);
    expect(isValidVisitTimeRange('12:00', '11:00')).toBe(false);
  });

  it('usa un horario seguro si un registro antiguo no puede interpretarse', () => {
    expect(getVisitTimeRange('horario por confirmar')).toEqual(DEFAULT_VISIT_TIME_RANGE);
  });
});
