'use client';

import React from 'react';
import { PRESETS, parseEpochInput, epochPartsFor, unitLabel, relativeTime } from '../types';
import type { ToolState } from '../types';

interface CanvasProps {
  state: ToolState;
  onChange?: (state: ToolState) => void;
  onSaveHistory?: (text: string) => void;
}

const inputClass =
  'mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100';

export const CopyButton: React.FC<{ value: string; testid?: string }> = ({ value, testid }) => {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }, [value]);
  return (
    <button
      type="button"
      onClick={handleCopy}
      data-testid={testid}
      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Copy value"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

const DerivedRow: React.FC<{ label: string; value: string; testid: string }> = ({
  label,
  value,
  testid,
}) => (
  <div className="flex items-center justify-between gap-2" data-testid={testid}>
    <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    <span className="flex items-center gap-2">
      <span className="font-mono text-xs text-gray-900 dark:text-gray-100">{value}</span>
      <CopyButton value={value} testid={`copy-${testid}`} />
    </span>
  </div>
);

export const Canvas: React.FC<CanvasProps> = ({ state, onChange, onSaveHistory }) => {
  const update = (patch: Partial<ToolState>) => onChange?.({ ...state, ...patch });
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (state.mode !== 'epochToDate') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [state.mode]);

  const parsed = state.mode === 'epochToDate' ? parseEpochInput(state.epochInput) : null;
  const ms = parsed?.ok ? parsed.ms : undefined;
  const utc = parsed?.ok && ms !== undefined ? new Date(ms) : null;
  const local = parsed?.ok && ms !== undefined ? new Date(ms) : null;
  const derived = parsed?.ok && ms !== undefined ? epochPartsFor(ms) : null;
  const relative = parsed?.ok && ms !== undefined ? relativeTime(ms, now) : null;
  const rangeError =
    parsed?.ok && ms !== undefined && ms < -8.64e15
      ? 'Warning: timestamp is outside the representable date range.'
      : null;

  const dateError =
    state.mode === 'dateToEpoch' && state.dateInput.trim() !== ''
      ? (() => {
          const d = new Date(`${state.dateInput}:00Z`);
          if (Number.isNaN(d.getTime()))
            return 'Invalid date — use the picker or YYYY-MM-DDTHH:MM format.';
          if (Math.abs(d.getTime()) > 8.64e15) return 'Out of range date.';
          return null;
        })()
      : null;
  const dateValue =
    state.mode === 'dateToEpoch' && !dateError && state.dateInput.trim() !== ''
      ? new Date(`${state.dateInput}:00Z`).getTime()
      : null;

  const insertPreset = (presetMs: number) => {
    update({ mode: 'epochToDate', epochInput: String(presetMs) });
  };

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full" data-testid="epoch-canvas">
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Conversion direction"
        data-testid="mode-tabs"
      >
        <button
          type="button"
          role="tab"
          aria-selected={state.mode === 'epochToDate'}
          data-testid="mode-tab-epochToDate"
          onClick={() => update({ mode: 'epochToDate' })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.mode === 'epochToDate'
              ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          Epoch → Date
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={state.mode === 'dateToEpoch'}
          data-testid="mode-tab-dateToEpoch"
          onClick={() => update({ mode: 'dateToEpoch' })}
          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
            state.mode === 'dateToEpoch'
              ? 'border-violet-500 bg-violet-50 text-violet-800 dark:bg-violet-900/40 dark:text-violet-100'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400'
          }`}
        >
          Date → Epoch
        </button>
      </div>

      {state.mode === 'epochToDate' ? (
        <>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Epoch timestamp (auto-detects s / ms / µs / ns)
            <input
              type="text"
              inputMode="numeric"
              value={state.epochInput}
              onChange={(e) => update({ epochInput: e.target.value })}
              data-testid="input-epoch"
              className={inputClass}
            />
          </label>
          {parsed && !parsed.ok ? (
            <p
              className="text-xs text-red-600 dark:text-red-400"
              data-testid="epoch-error"
              role="alert"
            >
              {parsed.error}
            </p>
          ) : null}
          {parsed?.ok ? (
            <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="epoch-unit">
              Detected unit: {parsed.unit ? unitLabel(parsed.unit) : '—'}
            </p>
          ) : null}
          {rangeError ? (
            <p
              className="text-xs text-amber-600 dark:text-amber-400"
              data-testid="range-warning"
              role="alert"
            >
              {rangeError}
            </p>
          ) : null}

          {parsed?.ok && utc && derived && relative ? (
            <>
              <div className="flex flex-wrap items-center gap-2" data-testid="now-section">
                <span className="text-xs text-gray-600 dark:text-gray-300">Now:</span>
                <button
                  type="button"
                  onClick={() => update({ epochInput: String(Math.floor(now / 1000)) })}
                  data-testid="btn-now-seconds"
                  className="rounded-md border border-gray-300 px-2 py-1 font-mono text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {Math.floor(now / 1000)} s
                </button>
                <button
                  type="button"
                  onClick={() => update({ epochInput: String(now) })}
                  data-testid="btn-now-ms"
                  className="rounded-md border border-gray-300 px-2 py-1 font-mono text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {now} ms
                </button>
              </div>

              <div className="flex flex-wrap gap-2" data-testid="preset-buttons">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    title={preset.hint}
                    onClick={() => insertPreset(preset.epochMs)}
                    data-testid={`preset-${preset.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div
                className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
                data-testid="result-card"
                role="status"
              >
                <span className="mb-2 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  UTC
                </span>
                <span className="block font-mono text-lg font-bold" data-testid="result-utc">
                  {utc.toISOString().replace('Z', ' UTC')}
                </span>
                <span className="mt-3 mb-1 block text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  Local ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </span>
                <span className="block font-mono text-sm" data-testid="result-local">
                  {local ? local.toLocaleString() : '—'}
                </span>
                <span className="mt-1 block text-xs text-gray-500" data-testid="result-relative">
                  {relative}
                </span>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2 dark:border-gray-800 dark:bg-gray-900/50">
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Derived values
                </h3>
                <DerivedRow label="Epoch (s)" value={derived.seconds} testid="value-epoch-s" />
                <DerivedRow
                  label="Epoch (ms)"
                  value={derived.milliseconds}
                  testid="value-epoch-ms"
                />
                <DerivedRow label="ISO 8601" value={utc.toISOString()} testid="value-iso" />
                <DerivedRow label="RFC 2822" value={utc.toUTCString()} testid="value-rfc2822" />
                <DerivedRow label="Relative" value={relative} testid="value-relative" />
              </div>
            </>
          ) : null}
        </>
      ) : (
        <>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Date and time (interpreted as UTC)
            <input
              type="datetime-local"
              step={1}
              value={state.dateInput}
              onChange={(e) => update({ dateInput: e.target.value })}
              data-testid="input-date"
              className={inputClass}
            />
          </label>
          {dateError ? (
            <p
              className="text-xs text-red-600 dark:text-red-400"
              data-testid="date-error"
              role="alert"
            >
              {dateError}
            </p>
          ) : null}
          {dateValue !== null ? (
            <div
              className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900"
              data-testid="result-card"
              role="status"
            >
              <DerivedRow
                label="Epoch (ms)"
                value={String(dateValue)}
                testid="date-value-epoch-ms"
              />
              <DerivedRow
                label="Epoch (s)"
                value={String(Math.floor(dateValue / 1000))}
                testid="date-value-epoch-s"
              />
              <DerivedRow
                label="ISO 8601"
                value={new Date(dateValue).toISOString()}
                testid="date-value-iso"
              />
              <DerivedRow
                label="Local"
                value={new Date(dateValue).toLocaleString()}
                testid="date-value-local"
              />
            </div>
          ) : (
            <p
              className="text-center text-xs text-gray-500 dark:text-gray-400"
              data-testid="date-hint"
            >
              Pick a date to see its epoch value in seconds and milliseconds (UTC).
            </p>
          )}
        </>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          History
        </h3>
        {state.history.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="history-empty">
            No saved conversions yet.
          </p>
        ) : (
          <ul className="space-y-1" data-testid="history-list">
            {state.history.map((entry, i) => (
              <li
                key={`${entry.createdAt}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-xs dark:border-gray-800"
              >
                <span className="text-gray-700 dark:text-gray-300">{entry.text}</span>
                <CopyButton value={entry.text} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {onSaveHistory && parsed?.ok && utc ? (
        <button
          type="button"
          data-testid="btn-save-history"
          onClick={() => onSaveHistory(`${state.epochInput} → ${utc.toISOString()}`)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Save to history
        </button>
      ) : null}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400">
        All conversions run locally in your browser; nothing is uploaded.
      </p>
    </div>
  );
};
