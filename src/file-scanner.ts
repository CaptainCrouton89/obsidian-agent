import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { logger } from './logger.js';

export interface ModifiedFile {
  path: string;
  modifiedAt: Date;
  relativePath: string;
}

export class FileScanner {
  // Folders to always skip during scanning
  private readonly SKIP_FOLDERS = new Set([
    '.obsidian',
    '.trash',
    'node_modules',
    '.git'
  ]);

  /**
   * Find all files modified since a given timestamp
   */
  findModifiedFiles(rootPath: string, since: Date | null): ModifiedFile[] {
    const modifiedFiles: ModifiedFile[] = [];
    const sinceTimestamp = since ? since.getTime() : 0;

    logger.info(`Scanning for files modified since: ${since ? since.toISOString() : 'beginning of time'}`);

    this.scanDirectory(rootPath, rootPath, sinceTimestamp, modifiedFiles);

    logger.info(`Found ${modifiedFiles.length} modified files`);
    return modifiedFiles;
  }

  private scanDirectory(
    rootPath: string,
    currentPath: string,
    sinceTimestamp: number,
    results: ModifiedFile[]
  ): void {
    let entries;
    try {
      entries = readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
      logger.warn(`Cannot read directory: ${currentPath}`);
      return;
    }

    for (const entry of entries) {
      // Skip hidden files/folders and special folders
      if (entry.name.startsWith('.') || this.SKIP_FOLDERS.has(entry.name)) {
        continue;
      }

      const fullPath = join(currentPath, entry.name);

      try {
        if (entry.isDirectory()) {
          this.scanDirectory(rootPath, fullPath, sinceTimestamp, results);
        } else if (entry.isFile()) {
          const stats = statSync(fullPath);
          const modifiedTime = stats.mtimeMs;

          if (modifiedTime > sinceTimestamp) {
            const relativePath = fullPath.replace(rootPath, '').replace(/^\//, '');
            results.push({
              path: fullPath,
              modifiedAt: new Date(modifiedTime),
              relativePath,
            });
          }
        }
      } catch (error) {
        logger.warn(`Cannot stat file: ${fullPath}`);
      }
    }
  }
}
