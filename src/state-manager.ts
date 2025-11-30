import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

interface State {
  lastRunTimestamp: number;
  lastRunDate: string;
}

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 100;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class StateManager {
  private statePath: string;

  constructor(stateDir: string) {
    this.statePath = join(stateDir, '.obsidian-agent-state.json');
  }

  /**
   * Get the last run timestamp, or null if this is the first run
   */
  async getLastRun(): Promise<Date | null> {
    if (!existsSync(this.statePath)) {
      logger.info('No previous run found - this is the first run');
      return null;
    }

    const state = await this.readStateWithRetry();
    if (!state) {
      return null;
    }
    return new Date(state.lastRunTimestamp);
  }

  /**
   * Update the last run timestamp to now
   */
  async updateLastRun(): Promise<void> {
    const now = Date.now();
    const state: State = {
      lastRunTimestamp: now,
      lastRunDate: new Date(now).toISOString(),
    };

    await this.writeStateWithRetry(state);
    logger.info(`State updated: ${state.lastRunDate}`);
  }

  private async readStateWithRetry(): Promise<State | null> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const content = readFileSync(this.statePath, 'utf-8');
        return JSON.parse(content) as State;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Failed to read state file (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    logger.error(`Failed to read state file after ${MAX_RETRIES} attempts: ${lastError?.message}. Treating as first run.`);
    return null;
  }

  private async writeStateWithRetry(state: State): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        writeFileSync(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);
        logger.warn(`Failed to write state file (attempt ${attempt + 1}/${MAX_RETRIES}): ${lastError.message}. Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }

    throw new Error(`Failed to write state file after ${MAX_RETRIES} attempts: ${lastError?.message}`);
  }
}
