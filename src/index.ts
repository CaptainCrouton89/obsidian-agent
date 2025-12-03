#!/usr/bin/env node

import { logger } from './logger.js';
import { config } from './config.js';
import { VaultWatcher } from './vault-watcher.js';
import { checkAndRunCleanupIfNeeded } from './jobs/startup-cleanup.js';

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

    // Check if cleanup should run (based on time since last run)
    checkAndRunCleanupIfNeeded().catch((error) => {
      logger.error('Startup cleanup check failed:', error);
    });

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
