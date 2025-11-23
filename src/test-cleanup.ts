#!/usr/bin/env node
import { runNightlyCleanup } from './jobs/nightly-cleanup.js';

console.log('Manually triggering nightly cleanup...\n');

runNightlyCleanup()
  .then(() => {
    console.log('\n✓ Cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Cleanup failed:', error);
    process.exit(1);
  });
