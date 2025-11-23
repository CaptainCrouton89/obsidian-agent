import { homedir } from 'os';
import { join } from 'path';

export const config = {
  // Obsidian vault path
  vaultPath: join(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/Silas Rhyneer'),

  // Nightly cleanup schedule (4:30 AM every day)
  nightlySchedule: '30 4 * * *',
  
  enableWatching: true,

  logLevel: 'info' as const,

  // Organizational guidelines for nightly cleanup
  folderStructureGuidelines: `- **Domain-based organization**: Top-level folders by subject domain (Work, Personal, Learning, Projects, etc.)
- **Graph-based hierarchy**: Subfolders reflect conceptual relationships (broader topics → specific topics)
- **Max ~5 files per folder**: Unless the folder contains a list-like collection (e.g., daily journals, person entries, project logs)
- **Dynamic creation**: Create new folders as topics emerge from content analysis
- **Infer intelligently**: Use semantic understanding to determine best folder placement`,

  noteFormattingGuidelines: `- **Free-form structure**: No rigid templates - structure each note appropriately for its content
- **Maintain conciseness**: DO NOT augment or add obvious/redundant/inferrable information
- **Keep original voice**: Organize and clarify, but preserve the original note-taking style
- **Link to archives**: Add archive links in frontmatter; occasionally link in content when original has highly specific details
- **CRITICAL - Single topic per note**: Each master note should contain ONLY ONE focused topic/concept/idea
  - **NO random unrelated content**: Notes should NOT be a dumping ground for miscellaneous thoughts
  - If a note contains multiple unrelated ideas, IMMEDIATELY split into separate notes
  - If multiple topics emerge during synthesis, create separate subnotes and link them
  - Link related notes together using Obsidian wiki-links with absolute paths
  - Example: A note about "Python" shouldn't also contain thoughts about databases, meetings, and random todos - each belongs in its own focused note
- **One archived note may create multiple master notes**: A single archived file can (and should) become multiple master notes if it contains distinct topics`,

  frontmatterGuidelines: `\`\`\`yaml
---
archive_links: [.archive/2025-01-22/original-note.md, .archive/2025-01-23/another.md]
tags: [topic, domain, concept]
---
\`\`\`
Note: The \`last_updated\` field is added automatically by the system after you make changes.`,
} as const;
