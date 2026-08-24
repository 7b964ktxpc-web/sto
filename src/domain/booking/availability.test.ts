import { describe, expect, it } from 'vitest';
import { getAvailableSlots } from './availability';

describe('getAvailableSlots', () => {
  it('does not return slots overlapping a reservation', () => {
    const slots = getAvailableSlots({
      date: '2026-08-24',
      durationMinutes: 60,
      windows: [{ start: '09:00', end: '12:00' }],
      resources: [{ id: 'post-1', type: 'WORKSTATION' }],
      reservations: [{
        resourceId: 'post-1', resourceType: 'WORKSTATION',
        start: new Date('2026-08-24T10:00:00Z'), end: new Date('2026-08-24T11:00:00Z'),
      }],
      timezone: 'UTC',
      slotStepMinutes: 60,
    });
    expect(slots).toHaveLength(2);
    expect(slots.map(x => x.start.toISOString())).toEqual([
      '2026-08-24T09:00:00.000Z',
      '2026-08-24T11:00:00.000Z',
    ]);
  });

  it('allows a slot ending exactly when the technical break starts', () => {
    const slots = getAvailableSlots({
      date: '2026-08-24',
      durationMinutes: 60,
      windows: [{ start: '09:00', end: '14:00', breakStart: '12:00', breakEnd: '13:00' }],
      resources: [{ id: 'post-1', type: 'WORKSTATION' }],
      reservations: [],
      timezone: 'UTC',
      slotStepMinutes: 60,
    });
    expect(slots.map(x => x.start.toISOString())).toEqual([
      '2026-08-24T09:00:00.000Z',
      '2026-08-24T10:00:00.000Z',
      '2026-08-24T11:00:00.000Z',
      '2026-08-24T13:00:00.000Z',
    ]);
  });

  it('excludes slots that actually overlap a technical break', () => {
    const slots = getAvailableSlots({
      date: '2026-08-24',
      durationMinutes: 90,
      windows: [{ start: '09:00', end: '14:00', breakStart: '12:00', breakEnd: '13:00' }],
      resources: [{ id: 'post-1', type: 'WORKSTATION' }],
      reservations: [],
      timezone: 'UTC',
      slotStepMinutes: 30,
    });
    expect(slots.map(x => x.start.toISOString())).toEqual([
      '2026-08-24T09:00:00.000Z',
      '2026-08-24T09:30:00.000Z',
      '2026-08-24T10:00:00.000Z',
      '2026-08-24T10:30:00.000Z',
      '2026-08-24T13:00:00.000Z',
    ]);
  });
});
