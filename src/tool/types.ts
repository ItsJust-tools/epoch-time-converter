export type Mode = 'epochToDate' | 'dateToEpoch';

export interface HistoryEntry {
  /** Short human readable description of the conversion. */
  text: string;
  /** ISO timestamp when the entry was saved. */
  createdAt: string;
}

export interface ToolState {
  /** Active conversion direction. */
  mode: Mode;
  /** Epoch input string in epochToDate mode. */
  epochInput: string;
  /** Date-time-local input string in dateToEpoch mode (UTC). */
  dateInput: string;
  /** Saved conversion history, newest first. */
  history: HistoryEntry[];
}

export const DEFAULT_STATE: ToolState = {
  mode: 'epochToDate',
  epochInput: '0',
  dateInput: '1970-01-01T00:00',
  history: [],
};

export const MAX_HISTORY = 20;

/** Epoch presets shipped with the tool. */
export const PRESETS: { label: string; epochMs: number; hint: string }[] = [
  { label: 'Unix epoch', epochMs: 0, hint: '0 ms — 1970-01-01T00:00:00Z' },
  { label: 'Y2K', epochMs: 946684800000, hint: '2000-01-01T00:00:00Z' },
  { label: '1 day', epochMs: 86400000, hint: '01 Jan 1970 00:00:00 +1 day' },
  { label: '1 week', epochMs: 604800000, hint: 'Unix epoch + 1 week' },
  { label: '1 year', epochMs: 31536000000, hint: 'Unix epoch + 365 days' },
];

export type EpochUnit = 'seconds' | 'milliseconds' | 'microseconds' | 'nanoseconds';

export interface ParseEpochResult {
  ok: boolean;
  /** Value scaled to milliseconds (may be fractional). */
  ms?: number;
  unit?: EpochUnit;
  error?: string;
}

/** Parse an epoch input and auto-detect second/ms/µs/ns scale, returning ms. */
export function parseEpochInput(input: string): ParseEpochResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'Enter a numeric epoch timestamp.' };
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return {
      ok: false,
      error: 'Invalid number: use digits with an optional sign and decimal part.',
    };
  }
  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'Invalid number: value is not finite.' };
  }
  const abs = Math.abs(value);
  if (abs >= 1.7e19) {
    return {
      ok: false,
      error: 'Out of range: nanosecond timestamps beyond year 2262 are not supported.',
    };
  }
  if (abs >= 1e17) return { ok: true, ms: value / 1e6, unit: 'nanoseconds' };
  if (abs >= 1e14) return { ok: true, ms: value / 1e3, unit: 'microseconds' };
  if (abs >= 1e11) return { ok: true, ms: value, unit: 'milliseconds' };
  return { ok: true, ms: value * 1000, unit: 'seconds' };
}

/** Human-readable scale label for a parsed epoch unit. */
export function unitLabel(unit: EpochUnit): string {
  switch (unit) {
    case 'seconds':
      return 'seconds';
    case 'milliseconds':
      return 'milliseconds';
    case 'microseconds':
      return 'microseconds';
    case 'nanoseconds':
      return 'nanoseconds';
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Parse a date-time-local string as UTC; null when invalid. */
export function parseDateStringUTC(input: string): Date | null {
  const m = DATE_RE.exec(input.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(mo) - 1, Number(d));
  date.setUTCHours(Number(h), Number(mi), s ? Number(s) : 0, 0);
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date.getTime() >= -8.64e15 && date.getTime() <= 8.64e15 ? date : null;
}

/** Format an epoch ms value as a UTC date-time-local string. */
export function formatUTCDateTimeLocal(ms: number): string {
  if (!Number.isFinite(ms) || ms < -8.64e15 || ms > 8.64e15) return '';
  const d = new Date(ms);
  return (
    `${String(d.getUTCFullYear()).padStart(4, '0')}-` +
    `${String(d.getUTCMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getUTCDate()).padStart(2, '0')}T` +
    `${String(d.getUTCHours()).padStart(2, '0')}:` +
    `${String(d.getUTCMinutes()).padStart(2, '0')}` +
    `:${String(d.getUTCSeconds()).padStart(2, '0')}`
  );
}

/** Format epoch s/ms/µs/ns derived from an ms value. */
export function epochPartsFor(ms: number): {
  seconds: string;
  milliseconds: string;
  microseconds: string;
  nanoseconds: string;
} {
  const seconds = ms / 1000;
  const ns = Math.round(ms * 1e6);
  return {
    seconds: Number.isInteger(seconds) ? String(seconds) : String(Number(seconds.toFixed(3))),
    milliseconds: Number.isInteger(ms) ? String(ms) : String(Number(ms.toFixed(3))),
    microseconds: String(ns / 1e3).replace(/\.0$/, ''),
    nanoseconds: String(ns),
  };
}

/** RFC 2822 style UTC date string. */
export function formatRFC2822(ms: number): string {
  const d = new Date(ms);
  return d.toUTCString();
}

/** ISO 8601 UTC string. */
export function formatISO(ms: number): string {
  return new Date(ms).toISOString();
}

/** Relative time label like "3 days ago" / "in 5 hours". */
export function relativeTime(ms: number, now: number): string {
  const diff = ms - now;
  const future = diff > 0;
  const seconds = Math.round(Math.abs(diff) / 1000);
  if (seconds === 0) return 'just now';
  const steps: [number, string][] = [
    [1, 'second'],
    [60, 'minute'],
    [3600, 'hour'],
    [86400, 'day'],
    [604800, 'week'],
    [2629800, 'month'],
    [31557600, 'year'],
  ];
  let value = seconds;
  let unit = 'second';
  for (const [divisor, nextUnit] of steps) {
    if (seconds >= divisor) {
      value = Math.round(seconds / divisor);
      unit = nextUnit;
    }
  }
  const label = value === 1 ? unit : `${unit}s`;
  return future ? `in ${value} ${label}` : `${value} ${label} ago`;
}

/** Full derived result set for an epoch ms value. */
export interface DerivedResult {
  iso: string;
  rfc2822: string;
  relative: string;
  parts: ReturnType<typeof epochPartsFor>;
}

/** Compute derived values for an epoch ms timestamp. */
export function deriveResult(ms: number, now: number): DerivedResult | null {
  if (!Number.isFinite(ms) || ms < -8.64e15 || ms > 8.64e15) return null;
  return {
    iso: formatISO(ms),
    rfc2822: formatRFC2822(ms),
    relative: relativeTime(ms, now),
    parts: epochPartsFor(ms),
  };
}

/** Human-readable summary of the active conversion. */
export function summaryText(state: ToolState, now = Date.now()): string {
  if (state.mode === 'epochToDate') {
    const parsed = parseEpochInput(state.epochInput);
    if (!parsed.ok) return `Epoch to date: ${parsed.error}`;
    const derived = deriveResult(parsed.ms ?? NaN, now);
    return derived === null
      ? 'Epoch to date: enter a numeric epoch timestamp'
      : `Epoch to date: ${derived.iso}`;
  }
  const date = parseDateStringUTC(state.dateInput);
  if (date === null) return 'Date to epoch: enter a valid date in UTC';
  return `Date to epoch: ${date.getTime()} ms`;
}

/** Build a history entry text for the current state. */
export function historyText(state: ToolState, now = Date.now()): string {
  return summaryText(state, now);
}
