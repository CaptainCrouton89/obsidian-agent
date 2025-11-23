import { logger } from '../logger.js';
import { config } from '../config.js';
import { StateManager } from '../state-manager.js';
import { FileScanner } from '../file-scanner.js';

const stateManager = new StateManager(config.vaultPath);
const fileScanner = new FileScanner();

/**
 * Nightly cleanup job that runs at 2:30 AM
 *
 * This is a placeholder - you'll provide the cleanup details later.
 * Common cleanup tasks might include:
 * - Removing duplicate files
 * - Archiving old notes
 * - Organizing files by metadata
 * - Cleaning up empty folders
 * - Processing daily notes
 */
export async function runNightlyCleanup(): Promise<void> {
  logger.info('Starting nightly cleanup job...');
  logger.info(`Vault path: ${config.vaultPath}`);

  // Get files modified since last run
  const lastRun = stateManager.getLastRun();
  const modifiedFiles = fileScanner.findModifiedFiles(config.vaultPath, lastRun);

  if (modifiedFiles.length > 0) {
    logger.info(`Files modified since last run:`);
    modifiedFiles.forEach((file) => {
      logger.info(`  - ${file.relativePath} (${file.modifiedAt.toISOString()})`);
    });
  } else {
    logger.info('No files modified since last run');
  }

  // TODO: Add your cleanup logic here
  // You'll provide the specific cleanup tasks later
  // You can use the modifiedFiles array to process only changed files

  // Update last run timestamp
  stateManager.updateLastRun();

  logger.info('Nightly cleanup completed successfully');
}
