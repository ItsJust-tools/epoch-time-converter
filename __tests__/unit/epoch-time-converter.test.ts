import { describe, it, expect } from 'vitest';
import {
  parseEpochInput,
  parseDateStringUTC,
  formatUTCDateTimeLocal,
  epochPartsFor,
  formatRFC2822,
  formatISO,
  relativeTime,
  deriveResult,
  summaryText,
  historyText,
  PRESETS,
} from '@/tool/types';
import {
  deserializeState,
  serializeState,
  withHistory,
  roundTrips,
  epochTimeConverterTool,
} from '@/tool/tool-definition';
import { DEFAULT_STATE, MAX_HISTORY, type ToolState } from '@/tool/types';

const state = (patch: Partial<ToolState> = {}): ToolState => ({ ...DEFAULT_STATE, ...patch });

describe('parseEpochInput scale detection', () => {
  it('scales seconds to ms', () => {
    const r = parseEpochInput('1700000000');
    expect(r.ok).toBe(true);
    expect(r.ms).toBe(1700000000000);
    expect(r.unit).toBe('seconds');
  });

  it('accepts milliseconds unchanged', () => {
    const r = parseEpochInput('1700000000000');
    expect(r.ok).toBe(true);
    expect(r.ms).toBe(1700000000000);
    expect(r.unit).toBe('milliseconds');
  });

  it('scales microseconds to ms', () => {
    const r = parseEpochInput('1700000000000000');
    expect(r.ok).toBe(true);
    expect(r.ms).toBe(1700000000000);
    expect(r.unit).toBe('microseconds');
  });

  it('scales nanoseconds to ms', () => {
    const r = parseEpochInput('1700000000000000000');
    expect(r.ok).toBe(true);
    expect(r.ms).toBe(1700000000000);
    expect(r.unit).toBe('nanoseconds');
  });

  it('handles negative epochs and decimals', () => {
    expect(parseEpochInput('-1000')?.ms).toBe(-1000000);
    expect(parseEpochInput('1700000000.5')?.ms).toBe(1700000000500);
  });
});

describe('parseEpochInput validation', () => {
  it('rejects empty and non-numeric input with errors, not NaN', () => {
    for (const bad of ['', '   ', 'abc', '12,5', '1.2.3', '--5', 'NaN']) {
      const r = parseEpochInput(bad);
      expect(r.ok).toBe(false);
      expect(r.error).toBeTruthy();
      expect(r.ms).toBeUndefined();
    }
  });

  it('rejects absurdly large inputs as out of range', () => {
    const r = parseEpochInput('9'.repeat(30));
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/range/i);
  });
});

describe('date to epoch', () => {
  it('matches Date.parse for sample dates in UTC', () => {
    const samples = [
      '2020-01-01T00:00',
      '2000-02-29T12:30:59',
      '1970-01-01T00:00',
      '2026-11-24T10:00',
    ];
    for (const s of samples) {
      const d = parseDateStringUTC(s);
      expect(d).not.toBeNull();
      expect(d?.getTime()).toBe(
        Date.parse(`${s.startsWith('Z') ? s : s + 'Z'}`.replace('Z', s.includes(':00Z') ? '' : 'Z'))
      );
    }
  });

  it('rejects invalid strings incl. Feb 30 and malformed text', () => {
    expect(parseDateStringUTC('not a date')).toBeNull();
    expect(parseDateStringUTC('2026-11-31T00:00')).toBeNull();
    expect(parseDateStringUTC('2026-02-30T00:00')).toBeNull();
    expect(parseDateStringUTC('')).toBeNull();
  });

  it('dateToEpoch summary text uses Date.parse value', () => {
    const s = state({ mode: 'dateToEpoch', dateInput: '2020-01-01T00:00' });
    expect(Date.parse('2020-01-01T00:00:00Z')).toBe(1577836800000);
    expect(summaryText(s)).toContain('1577836800000');
  });
});

describe('formatting', () => {
  it('formats epoch parts from an ms value', () => {
    const parts = epochPartsFor(1700000000123);
    expect(parts.seconds).toBe('1700000000.123');
    expect(parts.milliseconds).toBe('1700000000123');
  });

  it('round-trips UTC datetime-local formatting for whole seconds', () => {
    const ms = 1700000000000;
    expect(formatUTCDateTimeLocal(ms)).toBe('2023-11-14T22:13:20');
    expect(parseDateStringUTC(formatUTCDateTimeLocal(ms))?.getTime()).toBe(ms);
  });

  it('formats ISO 8601 and RFC 2822', () => {
    expect(formatISO(0)).toBe('1970-01-01T00:00:00.000Z');
    expect(formatRFC2822(0)).toBe('Thu, 01 Jan 1970 00:00:00 GMT');
  });
});

describe('relativeTime labels', () => {
  const now = 1700000000000;
  it('labels past timestamps with ago', () => {
    expect(relativeTime(now - 3000, now)).toBe('3 seconds ago');
    expect(relativeTime(now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(relativeTime(now - 3 * 86_400_000, now)).toBe('3 days ago');
  });

  it('labels future timestamps with in', () => {
    expect(relativeTime(now + 5 * 3_600_000, now)).toBe('in 5 hours');
    expect(relativeTime(now + 86_400_000, now)).toBe('in 1 day');
  });

  it('uses just now at the boundary', () => {
    expect(relativeTime(now, now)).toBe('just now');
  });
});

describe('deriveResult', () => {
  it('derives all values for a valid ms timestamp', () => {
    const d = deriveResult(0, 0);
    expect(d?.iso).toBe('1970-01-01T00:00:00.000Z');
    expect(d?.relative).toBe('just now');
    expect(d?.parts.milliseconds).toBe('0');
  });

  it('returns null outside the JS Date range', () => {
    expect(deriveResult(9e15, 0)).toBeNull();
  });
});

describe('presets', () => {
  it('carry the expected epoch values', () => {
    const labels = Object.fromEntries(PRESETS.map((p) => [p.label, p.epochMs]));
    const y2k = labels['Y2K'] ?? 0;
    expect(labels['Unix epoch']).toBe(0);
    expect(labels['Y2K']).toBe(946684800000);
    expect(labels['1 day']).toBe(86400000);
    expect(labels['1 week']).toBe(604800000);
    expect(labels['1 year']).toBe(31536000000);
    expect(new Date(y2k).toISOString()).toBe('2000-01-01T00:00:00.000Z');
  });

  it('summaryText reflects preset insertion in epochToDate mode', () => {
    const s = state({ mode: 'epochToDate', epochInput: '946684800000' });
    expect(summaryText(s)).toContain('2000-01-01T00:00:00.000Z');
  });
});

describe('serialization round-trip', () => {
  it('serialize/deserialize preserves state', () => {
    const s = state({
      mode: 'dateToEpoch',
      epochInput: '123',
      dateInput: '1999-12-31T23:59',
      history: [{ text: 'x', createdAt: '2026-11-24T00:00:00.000Z' }],
    });
    expect(roundTrips(s)).toBe(true);
    const restored = deserializeState(JSON.parse(serializeState(s)));
    expect(restored.success).toBe(true);
    if (restored.success) expect(restored.data).toEqual(s);
  });

  it('repairs invalid payloads with defaults', () => {
    const r = deserializeState({ nope: true, epochInput: 42, history: 'bad' });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.mode).toBe(DEFAULT_STATE.mode);
      expect(r.data.epochInput).toBe(DEFAULT_STATE.epochInput);
      expect(r.data.history).toEqual([]);
    }
  });

  it('rejects non-object payloads', () => {
    expect(deserializeState('nope').success).toBe(false);
    expect(deserializeState(null).success).toBe(false);
    expect(deserializeState([1]).success).toBe(false);
  });

  it('tool definition stays wired to the shared config', () => {
    expect(epochTimeConverterTool.id).toBe('epoch-time-converter');
    expect(epochTimeConverterTool.name).toBe('Epoch Time Converter');
    expect(epochTimeConverterTool.initialState).toEqual(DEFAULT_STATE);
    expect(serializeState(DEFAULT_STATE)).toContain('"epochInput":"0"');
  });
});

describe('history helpers', () => {
  it('caps history at MAX_HISTORY', () => {
    let s = state();
    for (let i = 0; i < MAX_HISTORY + 5; i++) {
      s = withHistory(s, `entry ${i}`, new Date(2026, 0, 1));
    }
    expect(s.history).toHaveLength(MAX_HISTORY);
    expect(s.history[0]?.text).toBe(`entry ${MAX_HISTORY + 4}`);
  });

  it('historyText mirrors summaryText', () => {
    const s = state({ epochInput: 'abc' });
    expect(historyText(s)).toBe(summaryText(s));
  });
});
