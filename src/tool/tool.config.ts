import type { ToolConfig } from '@itsjust/core';

const toolConfig: ToolConfig = {
  id: 'epoch-time-converter',
  name: 'Epoch Time Converter',
  description:
    'Convert Unix epoch timestamps to human-readable dates and back, with timezone and millisecond/second support.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#7c3aed',
    accentHover: '#6d28d9',
    brand: 'Epoch Time Converter',
    icon: '⏱️',
  },
};

export default toolConfig;
