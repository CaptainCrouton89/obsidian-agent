import { homedir } from 'os';
import { join } from 'path';

export const config = {
  // Obsidian vault path
  vaultPath: join(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Silas Rhyneer'),

  // Nightly cleanup schedule (4:30 AM every day)
  nightlySchedule: '30 4 * * *',

  // Enable file watching (for future features)
  enableWatching: true,

  // Logging
  logLevel: 'info' as const,
} as const;
