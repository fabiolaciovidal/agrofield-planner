export interface VisitTimeRange {
  startTime: string;
  endTime: string;
}

export const DEFAULT_VISIT_TIME_RANGE: VisitTimeRange = {
  startTime: '09:00',
  endTime: '11:00',
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const TIME_SLOT_PATTERN = /^\s*([0-2]\d:[0-5]\d)\s*-\s*([0-2]\d:[0-5]\d)\s*$/;

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return (hours * 60) + minutes;
};

export const isValidVisitTimeRange = (startTime: string, endTime: string) => (
  TIME_PATTERN.test(startTime)
  && TIME_PATTERN.test(endTime)
  && toMinutes(endTime) > toMinutes(startTime)
);

export const formatVisitTimeSlot = (startTime: string, endTime: string) => `${startTime} - ${endTime}`;

export const parseVisitTimeSlot = (timeSlot?: string): VisitTimeRange | null => {
  const match = timeSlot?.match(TIME_SLOT_PATTERN);
  if (!match || !isValidVisitTimeRange(match[1], match[2])) return null;

  return {
    startTime: match[1],
    endTime: match[2],
  };
};

export const getVisitTimeRange = (timeSlot?: string): VisitTimeRange => (
  parseVisitTimeSlot(timeSlot) || { ...DEFAULT_VISIT_TIME_RANGE }
);
