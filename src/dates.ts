// Dates are stored as local calendar days in 'YYYY-MM-DD' form.
// Arithmetic is done in UTC on those strings so DST shifts never matter.

export type DayStr = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function todayStr(now: Date = new Date()): DayStr {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function toUtcMs(day: DayStr): number {
  const [y, m, d] = day.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUtcMs(ms: number): DayStr {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

const DAY_MS = 86_400_000;

export function addDays(day: DayStr, n: number): DayStr {
  return fromUtcMs(toUtcMs(day) + n * DAY_MS);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: DayStr, b: DayStr): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** A well-formed 'YYYY-MM-DD' string that is also a real calendar day. */
export function isDayStr(v: unknown): v is DayStr {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  return fromUtcMs(toUtcMs(v)) === v;
}
