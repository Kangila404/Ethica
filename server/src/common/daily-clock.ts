import { Temporal } from '@js-temporal/polyfill';

/** Resolve wall-clock schedules through DST gaps/overlaps exactly once. */
export function dailyBoundary(
  now: Date,
  time: string,
  zone: string,
  tomorrow = false,
): Date {
  const local = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(zone);
  let day = local.toPlainDate();
  if (tomorrow) day = day.add({ days: 1 });
  let boundary = day.toPlainDateTime(time.slice(0, 5)).toZonedDateTime(zone);
  if (!tomorrow && boundary.epochMilliseconds > now.getTime()) {
    day = day.subtract({ days: 1 });
    boundary = day.toPlainDateTime(time.slice(0, 5)).toZonedDateTime(zone);
  }
  return new Date(boundary.epochMilliseconds);
}
export function nextDailyBoundary(now: Date, time: string, zone: string): Date {
  const local = Temporal.Instant.fromEpochMilliseconds(
    now.getTime(),
  ).toZonedDateTimeISO(zone);
  const today = local
    .toPlainDate()
    .toPlainDateTime(time.slice(0, 5))
    .toZonedDateTime(zone);
  return today.epochMilliseconds > now.getTime()
    ? new Date(today.epochMilliseconds)
    : dailyBoundary(now, time, zone, true);
}
export function dailyDate(now: Date, zone: string): string {
  return Temporal.Instant.fromEpochMilliseconds(now.getTime())
    .toZonedDateTimeISO(zone)
    .toPlainDate()
    .toString();
}
