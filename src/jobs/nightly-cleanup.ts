import { query } from '@r-cli/sdk';
import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { config } from '../config.js';
import { FileScanner } from '../file-scanner.js';
import { logger } from '../logger.js';
import {
  buildNightlyCleanupUserPrompt,
  nightlyCleanupSystemPrompt,
  type NightlyCleanupContext
} from '../prompts/nightly-cleanup.js';
import { StateManager } from '../state-manager.js';

const stateManager = new StateManager(config.vaultPath);
const fileScanner = new FileScanner();

// Folders to exclude from processing
const EXCLUDED_FOLDERS = [
  'Templates',
  'Daily Notes',
  'Attachments',
  '.obsidian',
  '.archive',
  '.trash'
];

/**
 * Checks if a file path is in an excluded folder
 */
function isInExcludedFolder(relativePath: string): boolean {
  return EXCLUDED_FOLDERS.some(folder => {
    const pathParts = relativePath.split('/');
    return pathParts.includes(folder);
  });
}

/**
 * Checks if a file is new (created after last run) vs modified existing
 */
function isNewFile(filePath: string, lastRun: Date | null): boolean {
  const stats = statSync(filePath);
  const birthTime = stats.birthtimeMs;

  if (!lastRun) {
    // First run - treat files as new if they need organizing
    const relativePath = filePath.replace(config.vaultPath + '/', '');
    const pathParts = relativePath.split('/');

    // Files in vault root OR in "daily/" folder are "new" (need organizing/synthesizing)
    // Files in organized folders (Work, Personal, Projects, etc.) are "existing" (already organized)
    if (pathParts.length === 1) {
      return true; // Root level files
    }

    // Also treat files in "daily/" folder as new (should be synthesized into topic notes)
    if (pathParts[0] === 'daily') {
      return true;
    }

    return false; // Files in other folders are already organized
  }

  const lastRunTime = lastRun.getTime();

  // File is new if it was created after the last run
  return birthTime > lastRunTime;
}

/**
 * Moves a file to the archive folder
 */
function moveToArchive(filePath: string, relativePath: string, archiveDate: string, vaultPath: string): string {
  const archiveFolder = join(vaultPath, '.archive', archiveDate);
  const archivePath = join(archiveFolder, relativePath);
  const archiveDir = dirname(archivePath);

  // Create archive directory if it doesn't exist
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  // Move file to archive
  renameSync(filePath, archivePath);

  // Return the relative path from vault root
  return `.archive/${archiveDate}/${relativePath}`;
}

/**
 * Updates or adds last_updated field in frontmatter
 */
function updateFrontmatterTimestamp(filePath: string, timestamp: string): void {
  const content = readFileSync(filePath, 'utf-8');

  // Check if file has frontmatter
  if (!content.startsWith('---\n')) {
    // No frontmatter - add it
    const newContent = `---\nlast_updated: ${timestamp}\n---\n\n${content}`;
    writeFileSync(filePath, newContent, 'utf-8');
    return;
  }

  // Parse existing frontmatter
  const endIndex = content.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    // Malformed frontmatter - skip
    return;
  }

  const frontmatter = content.substring(4, endIndex);
  const body = content.substring(endIndex + 5);

  // Update or add last_updated field
  const lines = frontmatter.split('\n');
  let updated = false;

  const updatedLines = lines.map(line => {
    if (line.startsWith('last_updated:')) {
      updated = true;
      return `last_updated: ${timestamp}`;
    }
    return line;
  });

  // If last_updated wasn't found, add it
  if (!updated) {
    updatedLines.push(`last_updated: ${timestamp}`);
  }

  const newContent = `---\n${updatedLines.join('\n')}\n---\n${body}`;
  writeFileSync(filePath, newContent, 'utf-8');
}

/**
 * Commits all changes in the vault to git
 */
function commitChanges(vaultPath: string, archivedCount: number, modifiedCount: number): void {
  try {
    // Check if vault is a git repository
    const isGitRepo = execSync('git rev-parse --is-inside-work-tree', {
      cwd: vaultPath,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim() === 'true';

    if (!isGitRepo) {
      logger.warn('Vault is not a git repository - skipping git commit');
      return;
    }

    // Check if there are any changes to commit
    const status = execSync('git status --porcelain', {
      cwd: vaultPath,
      encoding: 'utf-8'
    }).trim();

    if (!status) {
      logger.info('No git changes to commit');
      return;
    }

    // Add all changes
    execSync('git add -A', { cwd: vaultPath, encoding: 'utf-8' });

    // Create commit message
    const timestamp = new Date().toISOString().split('T')[0];
    const commitMessage = `Nightly cleanup: ${archivedCount} archived, ${modifiedCount} modified - ${timestamp}`;

    // Commit changes
    execSync(`git commit -m "${commitMessage}"`, {
      cwd: vaultPath,
      encoding: 'utf-8'
    });

    logger.info(`Git commit created: ${commitMessage}`);

    // Try to push (optional - won't fail if no remote configured)
    try {
      execSync('git push', {
        cwd: vaultPath,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      logger.info('Changes pushed to remote');
    } catch (error) {
      logger.info('No remote configured or push failed - commit is local only');
    }
  } catch (error) {
    logger.error('Error committing changes to git (non-fatal):', error);
    // Don't throw - git failures shouldn't prevent state updates
  }
}

/**
 * Recursively updates frontmatter timestamps for all markdown files in a directory
 */
function updateAllFrontmatterTimestamps(dirPath: string, timestamp: string, sinceTime: number): number {
  let count = 0;

  const entries = readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden folders and archive
    if (entry.name.startsWith('.') || EXCLUDED_FOLDERS.includes(entry.name)) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);

    if (entry.isDirectory()) {
      count += updateAllFrontmatterTimestamps(fullPath, timestamp, sinceTime);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Only update if file was modified after Claude started
      const stats = statSync(fullPath);
      if (stats.mtimeMs > sinceTime) {
        try {
          updateFrontmatterTimestamp(fullPath, timestamp);
          count++;
        } catch (error) {
          logger.warn(`Failed to update frontmatter for ${fullPath}:`, error);
        }
      }
    }
  }

  return count;
}

/**
 * Nightly cleanup job that runs at 2:30 AM
 *
 * Runs Claude Code with custom prompts to perform vault maintenance tasks.
 */
export async function runNightlyCleanup(): Promise<void> {
  logger.info('Starting nightly cleanup job...');
  logger.info(`Vault path: ${config.vaultPath}`);

  // Get files modified since last run
  const lastRun = await stateManager.getLastRun();
  const allModifiedFiles = fileScanner.findModifiedFiles(config.vaultPath, lastRun);

  // Filter out excluded folders
  const modifiedFiles = allModifiedFiles.filter(file => !isInExcludedFolder(file.relativePath));

  const excludedCount = allModifiedFiles.length - modifiedFiles.length;
  if (excludedCount > 0) {
    logger.info(`Excluded ${excludedCount} files from special folders`);
  }

  if (modifiedFiles.length > 0) {
    logger.info(`Files modified since last run (${modifiedFiles.length}):`);
    modifiedFiles.forEach((file) => {
      logger.info(`  - ${file.relativePath} (${file.modifiedAt.toISOString()})`);
    });
  } else {
    logger.info('No files modified since last run');
  }

  // Separate new files from modified existing files
  const now = new Date();
  const archiveDate = now.toISOString().split('T')[0]; // YYYY-MM-DD

  const newFiles = modifiedFiles.filter(f => isNewFile(f.path, lastRun));
  const existingModifiedFiles = modifiedFiles.filter(f => !isNewFile(f.path, lastRun));

  logger.info(`New files to archive: ${newFiles.length}`);
  logger.info(`Existing files modified: ${existingModifiedFiles.length}`);

  // Move new files to archive
  const archivedFiles: Array<{ archivePath: string }> = [];
  for (const file of newFiles) {
    try {
      const archivePath = moveToArchive(file.path, file.relativePath, archiveDate, config.vaultPath);
      archivedFiles.push({ archivePath });
      logger.info(`Archived: ${file.relativePath} → ${archivePath}`);
    } catch (error) {
      logger.error(`Failed to archive ${file.relativePath}:`, error);
    }
  }

  // Skip Claude processing if there's nothing to do
  if (archivedFiles.length === 0 && existingModifiedFiles.length === 0) {
    logger.info('No files to process - skipping Claude Code agent');
    await stateManager.updateLastRun();
    logger.info('Nightly cleanup completed successfully');
    return;
  }

  // Build context for the cleanup agent
  const context: NightlyCleanupContext = {
    archivedFiles,
    modifiedFiles: existingModifiedFiles.map(f => ({ relativePath: f.relativePath })),
    archiveDate
  };

  const userPrompt = buildNightlyCleanupUserPrompt(context);

  // Run Claude Code with custom prompts
  const claudeStartTime = Date.now();
  try {
    logger.info('Running Claude Code agent...');

    const result = query({
      prompt: userPrompt,
      options: {
        systemPrompt: nightlyCleanupSystemPrompt,
        cwd: config.vaultPath,
        permissionMode: 'bypassPermissions',
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        model: 'haiku',
      }
    });

    // Stream and log messages
    for await (const message of result) {
      if (message.type === 'assistant') {
        logger.info('Claude response:', JSON.stringify(message.message, null, 2));
      } else if (message.type === 'result') {
        logger.info(`Agent finished with status: ${message.subtype}`);
        if (message.subtype === 'success') {
          logger.info(`Result: ${message.result}`);
        } else {
          logger.error(`Agent failed with status: ${message.subtype}, but continuing (no rollback)`);
        }
      }
    }

    logger.info('Claude Code agent completed');
  } catch (error) {
    logger.error('Error running Claude Code agent:', error);
    // Don't throw - continue and update state anyway per requirements
  }

  // Update frontmatter timestamps for all files modified by Claude
  logger.info('Updating frontmatter timestamps...');
  const timestamp = new Date().toISOString();
  const updatedCount = updateAllFrontmatterTimestamps(config.vaultPath, timestamp, claudeStartTime);
  logger.info(`Updated last_updated timestamp in ${updatedCount} files`);

  // Commit all changes to git
  logger.info('Committing changes to git...');
  commitChanges(config.vaultPath, archivedFiles.length, existingModifiedFiles.length);

  // Update last run timestamp
  await stateManager.updateLastRun();

  logger.info('Nightly cleanup completed successfully');
}
