import { ValueTransformer } from 'typeorm';

// Milliseconds since epoch avoid server/driver timezone differences for leases
// and scheduled instants. API/domain values remain Date objects.
export const instantTransformer: ValueTransformer = {
  to: (value: Date | null | undefined): number | null =>
    value?.getTime() ?? null,
  from: (value: string | number | null): Date | null =>
    value === null ? null : new Date(Number(value)),
};
