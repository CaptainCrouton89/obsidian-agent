import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

interface State {
  lastRunTimestamp: number;
  lastRunDate: string;
}

export class StateManager {
  private statePath: string;

  constructor(stateDir: string) {
    this.statePath = join(stateDir, '.obsidian-agent-state.json');
  }

  /**
   * Get the last run timestamp, or null if this is the first run
   */
  getLastRun(): Date | null {
    if (!existsSync(this.statePath)) {
      logger.info('No previous run found - this is the first run');
      return null;
    }

    const state = this.readState();
    return new Date(state.lastRunTimestamp);
  }

  /**
   * Update the last run timestamp to now
   */
  updateLastRun(): void {
    const now = Date.now();
    const state: State = {
      lastRunTimestamp: now,
      lastRunDate: new Date(now).toISOString(),
    };

    writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
    logger.info(`State updated: ${state.lastRunDate}`);
  }

  private readState(): State {
    const content = readFileSync(this.statePath, 'utf-8');
    return JSON.parse(content);
  }
}
