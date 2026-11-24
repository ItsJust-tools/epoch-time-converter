'use client';

import React from 'react';
import { PRESETS, type ToolState } from '../types';

interface SidebarProps {
  state: ToolState;
  onChange: (next: ToolState) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ state, onChange }) => {
  return (
    <div className="p-4 space-y-6 text-sm overflow-y-auto h-full" data-testid="epoch-sidebar">
      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Modes</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <span>Epoch → Date</span>
            <span className="text-gray-500 dark:text-gray-400">timestamp to readable date</span>
          </li>
          <li>
            <span>Date → Epoch</span>
            <span className="text-gray-500 dark:text-gray-400">date to s/ms (UTC)</span>
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Presets</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          {PRESETS.map((preset) => (
            <li key={preset.label} className="flex justify-between gap-2">
              <button
                type="button"
                data-testid={`sidebar-preset-${preset.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                onClick={() =>
                  onChange({ ...state, mode: 'epochToDate', epochInput: String(preset.epochMs) })
                }
                className="underline-offset-2 hover:underline"
              >
                {preset.label}
              </button>
              <span className="font-mono text-gray-500 dark:text-gray-400">{preset.hint}</span>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Saved results</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300" data-testid="sidebar-history-count">
          {state.history.length} entr{state.history.length === 1 ? 'y' : 'ies'} in history
          {state.history.length > 0 ? ' (newest first)' : ''}
        </p>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Keyboard shortcuts</h3>
        <ul className="space-y-1 text-xs text-gray-600 dark:text-gray-300">
          <li>
            <kbd>E</kbd> — Epoch → Date mode
          </li>
          <li>
            <kbd>D</kbd> — Date → Epoch mode
          </li>
          <li>
            <kbd>Y</kbd> — Copy result
          </li>
        </ul>
      </div>

      <div>
        <h3 className="mb-2 font-medium text-gray-900 dark:text-gray-100">Share</h3>
        <p className="text-xs text-gray-600 dark:text-gray-300">
          Use the toolbar share button to create a URL containing the current inputs; open it to
          restore this conversion.
        </p>
      </div>
    </div>
  );
};
