# Obsidian Agent

Long-running background agent for Obsidian vault maintenance and scheduled jobs.

## Features

- **Nightly Cleanup**: Runs at 2:30 AM every day
- **Vault Watching**: Monitors file changes in your Obsidian vault
- **Background Process**: Runs automatically on system startup via LaunchAgent

## Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build the project:
```bash
pnpm build
```

3. Install as a system service:
```bash
pnpm install-service
```

The agent will now run automatically on startup and stay running in the background.

## Configuration

Edit `src/config.ts` to customize:
- Vault path
- Nightly cleanup schedule (cron format)
- Enable/disable file watching

## Managing the Service

```bash
# View logs
tail -f logs/stdout.log

# View errors
tail -f logs/stderr.log

# Stop service
launchctl unload ~/Library/LaunchAgents/com.obsidian-agent.plist

# Start service
launchctl load ~/Library/LaunchAgents/com.obsidian-agent.plist

# Check status
launchctl list | grep obsidian-agent
```

## Development

```bash
# Build
pnpm build

# Build and run (for testing)
pnpm dev

# Watch mode (auto-rebuild)
pnpm watch
```

## Nightly Cleanup

The nightly cleanup job is currently a placeholder. Add your cleanup logic in `src/jobs/nightly-cleanup.ts`.
