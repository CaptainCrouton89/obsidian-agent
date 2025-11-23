#!/usr/bin/env node

import cron from 'node-cron';
import { logger } from './logger.js';
import { config } from './config.js';
import { VaultWatcher } from './vault-watcher.js';
import { runNightlyCleanup } from './jobs/nightly-cleanup.js';

class ObsidianAgent {
  private vaultWatcher: VaultWatcher;

  constructor() {
    this.vaultWatcher = new VaultWatcher();
  }

  async start(): Promise<void> {
    logger.info('🚀 Starting Obsidian Agent...');
    logger.info(`Vault: ${config.vaultPath}`);

    // Start vault watcher
    this.vaultWatcher.start();

    // Schedule nightly cleanup job (2:30 AM every day)
    cron.schedule(config.nightlySchedule, () => {
      runNightlyCleanup().catch((error) => {
        logger.error('Nightly cleanup job failed:', error);
      });
    });

    logger.info(`📅 Nightly cleanup scheduled for: ${config.nightlySchedule}`);
    logger.info('✅ Obsidian Agent is running');

    // Handle graceful shutdown
    process.on('SIGTERM', () => this.shutdown());
    process.on('SIGINT', () => this.shutdown());
  }

  private shutdown(): void {
    logger.info('🛑 Shutting down Obsidian Agent...');
    this.vaultWatcher.stop();
    process.exit(0);
  }
}

// Start the agent
const agent = new ObsidianAgent();
agent.start().catch((error) => {
  logger.error('Failed to start Obsidian Agent:', error);
  process.exit(1);
});
