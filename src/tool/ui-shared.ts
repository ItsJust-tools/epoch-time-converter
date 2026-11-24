import { DEFAULT_STATE, type Mode, type ToolState } from './types';

export const MODES: { value: Mode; label: string; hint: string }[] = [
  { value: 'epochToDate', label: 'Epoch → Date', hint: 'timestamp to readable date' },
  { value: 'dateToEpoch', label: 'Date → Epoch', hint: 'date to s/ms (UTC)' },
];

export function isState(value: unknown): value is ToolState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Partial<ToolState>;
  return (
    typeof v.mode === 'string' && typeof v.epochInput === 'string' && DEFAULT_STATE !== undefined
  );
}
