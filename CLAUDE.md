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

The nightly cleanup job runs at 2:30 AM daily to maintain a clean, well-organized Obsidian vault through intelligent content synthesis and organization.

### How It Works

**Three-Phase Process:**

1. **Pre-Processing** (Script handles automatically)
   - Scans vault for new and modified files since last run
   - Moves NEW files to `/.archive/YYYY-MM-DD/`
   - Filters out special folders (Templates, Daily Notes, Attachments, etc.)

2. **Claude Processing** (AI-powered organization)
   - Reads archived files and semantically analyzes content
   - Creates/updates master notes with synthesized content
   - Organizes files into clean folder hierarchy
   - Applies light formatting cleanup to modified existing files

3. **Post-Processing** (Script handles automatically)
   - Updates `last_updated` frontmatter in all modified master notes
   - Updates state for next run

### Organizational Principles

**Folder Structure:**
- **Domain-based top level**: Work, Personal, Learning, Projects, etc.
- **Graph-based hierarchy**: Conceptual relationships (broad → specific)
- **Max ~5 files per folder**: Unless it's a list-like collection (journals, people, etc.)
- **Dynamic creation**: New folders created as topics emerge

**Master Notes:**
- Free-form structure (no rigid templates)
- Maintain original voice and conciseness
- Include archive links in frontmatter
- Split when notes grow large or subtopics emerge
- Automatic `last_updated` timestamps

**Content Synthesis:**
- Context-dependent integration (append, rewrite, or summarize)
- Semantic topic detection and grouping
- Note type inference (journals, meetings, concepts, projects)
- Deduplication and consolidation

### Archive Structure

```
/.archive/
  2025-01-22/
    original-note-1.md
    fleeting-thought.md
  2025-01-23/
    meeting-notes.md
```

Original files are preserved in dated archive folders. Master notes link back to archives in frontmatter.

### Excluded Folders

These folders are never processed:
- `Templates`
- `Daily Notes`
- `Attachments`
- `.obsidian`
- `.archive`
- `.trash`

### Customization

**Modify organizational rules:**
Edit `src/prompts/nightly-cleanup.ts` to adjust:
- System prompt (organizational principles, rules)
- User prompt builder (context passed to Claude)

**Change excluded folders:**
Edit `EXCLUDED_FOLDERS` array in `src/jobs/nightly-cleanup.ts`

**Adjust schedule:**
Edit `nightlySchedule` in `src/config.ts` (uses cron format)

### Master Note Frontmatter

```yaml
---
archive_links: [.archive/2025-01-22/original.md, .archive/2025-01-23/another.md]
tags: [topic, domain, concept]
last_updated: 2025-01-22T02:30:00Z
---
```

- `archive_links`: Source notes that contributed to this master note
- `tags`: Semantic tags for categorization
- `last_updated`: Automatically set by script after Claude modifies the file
