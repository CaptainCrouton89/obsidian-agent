import chokidar, { FSWatcher } from 'chokidar';
import { logger } from './logger.js';
import { config } from './config.js';

export class VaultWatcher {
  private watcher: FSWatcher | null = null;

  start(): void {
    if (!config.enableWatching) {
      logger.info('Vault watching is disabled');
      return;
    }

    logger.info(`Starting vault watcher for: ${config.vaultPath}`);

    this.watcher = chokidar.watch(config.vaultPath, {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (path) => this.onFileAdded(path))
      .on('change', (path) => this.onFileChanged(path))
      .on('unlink', (path) => this.onFileDeleted(path))
      .on('error', (error) => {
        if (error instanceof Error) {
          this.onError(error);
        } else {
          this.onError(new Error(String(error)));
        }
      });

    logger.info('Vault watcher started successfully');
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      logger.info('Vault watcher stopped');
    }
  }

  private onFileAdded(path: string): void {
    logger.info(`File added: ${path}`);
    // TODO: Add custom logic for file additions
  }

  private onFileChanged(path: string): void {
    logger.info(`File changed: ${path}`);
    // TODO: Add custom logic for file changes
  }

  private onFileDeleted(path: string): void {
    logger.info(`File deleted: ${path}`);
    // TODO: Add custom logic for file deletions
  }

  private onError(error: Error): void {
    logger.error('Vault watcher error:', error);
  }
}
