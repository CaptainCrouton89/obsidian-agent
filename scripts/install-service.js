#!/usr/bin/env node

import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const PLIST_NAME = 'com.obsidian-agent.plist';
const LAUNCH_AGENTS_DIR = join(homedir(), 'Library/LaunchAgents');
const PLIST_SOURCE = join(process.cwd(), PLIST_NAME);
const PLIST_DEST = join(LAUNCH_AGENTS_DIR, PLIST_NAME);

console.log('🔧 Installing Obsidian Agent as a LaunchAgent...\n');

// Ensure LaunchAgents directory exists
if (!existsSync(LAUNCH_AGENTS_DIR)) {
  console.log(`Creating directory: ${LAUNCH_AGENTS_DIR}`);
  mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
}

// Ensure logs directory exists
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  console.log(`Creating logs directory: ${logsDir}`);
  mkdirSync(logsDir, { recursive: true });
}

// Stop and unload existing service if it exists
if (existsSync(PLIST_DEST)) {
  console.log('⏹️  Stopping existing service...');
  try {
    execSync(`launchctl unload ${PLIST_DEST}`, { stdio: 'inherit' });
  } catch (error) {
    console.log('  (Service was not running)');
  }
}

// Copy plist file
console.log(`\n📋 Copying ${PLIST_NAME} to ${LAUNCH_AGENTS_DIR}`);
copyFileSync(PLIST_SOURCE, PLIST_DEST);

// Load the service
console.log('\n▶️  Loading service...');
execSync(`launchctl load ${PLIST_DEST}`, { stdio: 'inherit' });

console.log('\n✅ Obsidian Agent installed successfully!\n');
console.log('Commands:');
console.log(`  View logs:      tail -f ${logsDir}/stdout.log`);
console.log(`  View errors:    tail -f ${logsDir}/stderr.log`);
console.log(`  Stop service:   launchctl unload ${PLIST_DEST}`);
console.log(`  Start service:  launchctl load ${PLIST_DEST}`);
console.log(`  Check status:   launchctl list | grep obsidian-agent`);
