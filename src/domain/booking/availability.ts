import type { AvailabilityRequest, AvailableSlot, ExistingReservation, Resource, TimeRange } from './types';

const toMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
};

const overlaps = (a: TimeRange, b: TimeRange) => a.start < b.end && b.start < a.end;

const localDateTime = (date: string, minutes: number) => {
  const hours = Math.floor(minutes / 60).toString().padStart(2, '0');
  const mins = (minutes % 60).toString().padStart(2, '0');
  return `${date}T${hours}:${mins}:00`;
};

/**
 * Generate candidate slots from business-local windows and assign a set of
 * resources that can satisfy the booking. Database exclusion constraints are
 * the final concurrency guard; this function is intentionally side-effect free.
 */
export function getAvailableSlots(input: AvailabilityRequest): AvailableSlot[] {
  if (input.durationMinutes <= 0) throw new Error('durationMinutes must be positive');
  const step = input.slotStepMinutes ?? 15;
  if (step <= 0) throw new Error('slotStepMinutes must be positive');

  const results: AvailableSlot[] = [];
  const byResource = new Map<string, ExistingReservation[]>();
  for (const reservation of input.reservations) {
    const key = `${reservation.resourceType}:${reservation.resourceId}`;
    const list = byResource.get(key) ?? [];
    list.push(reservation);
    byResource.set(key, list);
  }

  for (const window of input.windows) {
    const start = toMinutes(window.start);
    const end = toMinutes(window.end);
    const breaks = window.breakStart && window.breakEnd
      ? { start: toMinutes(window.breakStart), end: toMinutes(window.breakEnd) }
      : null;

    for (let cursor = start; cursor + input.durationMinutes <= end; cursor += step) {
      const slot: TimeRange = {
        start: new Date(`${localDateTime(input.date, cursor)}${input.timezone === 'UTC' ? 'Z' : ''}`),
        end: new Date(`${localDateTime(input.date, cursor + input.durationMinutes)}${input.timezone === 'UTC' ? 'Z' : ''}`),
      };

      if (breaks && cursor < breaks.end && cursor + input.durationMinutes > breaks.start) continue;

      const free = input.resources.filter(resource => {
        const reservations = byResource.get(`${resource.type}:${resource.id}`) ?? [];
        return !reservations.some(reservation => overlaps(slot, reservation));
      });

      if (free.length === 0) continue;
      results.push({ start: slot.start, end: slot.end, resourceIds: free.map(resource => resource.id) });
    }
  }

  return results;
}
