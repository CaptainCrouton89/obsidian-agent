import { config } from '../config.js';
import { logger } from '../logger.js';
import { StateManager } from '../state-manager.js';
import { runNightlyCleanup } from './nightly-cleanup.js';

const stateManager = new StateManager(config.vaultPath);

/**
 * Checks if cleanup should run and executes it if needed.
 * Called once at startup - runs cleanup if enough time has passed since last run.
 */
export async function checkAndRunCleanupIfNeeded(): Promise<void> {
  const lastRun = await stateManager.getLastRun();
  const now = Date.now();
  const minIntervalMs = config.cleanupMinIntervalHours * 60 * 60 * 1000;

  if (lastRun === null) {
    logger.info('First run detected - running cleanup');
    await runNightlyCleanup();
    return;
  }

  const hoursSinceLastRun = (now - lastRun.getTime()) / (1000 * 60 * 60);

  if (hoursSinceLastRun >= config.cleanupMinIntervalHours) {
    logger.info(`${hoursSinceLastRun.toFixed(1)} hours since last cleanup - running cleanup`);
    await runNightlyCleanup();
  } else {
    logger.info(`Last cleanup was ${hoursSinceLastRun.toFixed(1)} hours ago - skipping (min interval: ${config.cleanupMinIntervalHours}h)`);
  }
}
