export type TimeRange = { start: Date; end: Date };

export type WorkingWindow = {
  start: string; // HH:mm
  end: string; // HH:mm
  breakStart?: string;
  breakEnd?: string;
};

export type Resource = {
  id: string;
  type: 'EMPLOYEE' | 'WORKSTATION';
};

export type ExistingReservation = TimeRange & { resourceId: string; resourceType: Resource['type'] };

export type AvailabilityRequest = {
  date: string; // YYYY-MM-DD in business timezone
  durationMinutes: number;
  windows: WorkingWindow[];
  reservations: ExistingReservation[];
  resources: Resource[];
  slotStepMinutes?: number;
  timezone: string;
};

export type AvailableSlot = TimeRange & {
  resourceIds: string[];
};
