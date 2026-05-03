export const DEMO_PDF_URL = '/saws2plus.pdf';

export const APP_CONFIG = {
  storageKey: 'formflow-session',
  storeVersion: 1,
  maxFileSizeMB: 20,
} as const;

export const STATUS_COLORS = {
  missing: 'yellow',
  complete: 'green',
  needs_confirmation: 'orange',
  inferred: 'blue',
  conflicting: 'red',
} as const;
