export const CHANGE_TYPES = {
  conflict:         { label: 'Conflict', icon: '⚡', colorVar: 'conflict' },
  upstream:         { label: 'Upstream', icon: '↑',  colorVar: 'upstream' },
  new_upstream:     { label: 'New',      icon: '★',  colorVar: 'new'      },
  local:            { label: 'Local',    icon: '↓',  colorVar: 'local'    },
  deleted_upstream: { label: 'Removed',  icon: '✕',  colorVar: 'removed'  },
} as const;

export type ChangeType = keyof typeof CHANGE_TYPES;
