# AI Development Bot

A Gemini-CLI based GitHub AI coding bot with issue-based memory and autonomous development capabilities.

## Overview

The AI Development Bot is an autonomous coding assistant that:
- Automatically tracks tasks via GitHub Issues
- Generates implementation plans using Gemini AI
- Creates pull requests with detailed context
- Maintains execution history in issue comments
- Follows agile best practices and roadmaps

## Features

- 🤖 **Autonomous Operation**: Scheduled and event-driven execution
- 📝 **Issue-Based Memory**: Persistent state across workflow runs
- 🔄 **Full PR Lifecycle**: From creation to merge
- 📊 **Progress Tracking**: Sprint management via GitHub Issues
- 🧠 **Context-Aware**: Learns from previous attempts
- 🔒 **Safe & Auditable**: All decisions visible in issue comments

## Setup

### Prerequisites

- Node.js 20+
-GitHub repository with Actions enabled
- Gemini API key
- GitHub Personal Access Token

### Configuration

1. **Add Secrets** to your GitHub repository:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `GH_API_TOKEN`: GitHub Personal Access Token with `repo` and `workflow` scopes

2. **Configure Bot** in `.github/ai-bot-config.yml`:
   ```yaml
   bot:
     enabled: true
     mode: 'autonomous'
   ```

3. **Create ROADMAP.md** with your project tasks:
   ```markdown
   ## Sprint 1
   - [ ] Task name (5 points)
   - [ ] Another task (8 points)
   ```

### Installation

```bash
npm install
```

## Usage

### Generate Tasks from Roadmap

Manually trigger the task generation workflow:
```bash
gh workflow run generate-tasks.yml
```

Or push changes to `ROADMAP.md` to trigger automatically.

### Run the Bot

The bot runs automatically:
- **Scheduled**: Daily at 2 AM (configurable in workflow)
- **On Issue Events**: When issues are labeled with `ai-bot-task`
- **Manual**: Via workflow dispatch

Manual execution:
```bash
gh workflow run ai-dev-bot.yml
```

### Monitor Progress

- Check GitHub Issues for task status
- Review issue comments for execution history
- Track PRs created by the bot

## Architecture

### Core Components

- **Orchestrator**: Main execution engine
- **Issue Manager**: Task tracking and memory
- **Context Analyzer**: Repository analysis
- **PR Manager**: Pull request operations
- **Gemini Integration**: AI-powered code generation

### Workflows

- `ai-dev-bot.yml`: Main bot execution
- `generate-tasks.yml`: Task generation from roadmap

## Issue Labels

The bot uses these labels for task management:

**Priority:**
- `priority-high`, `priority-medium`, `priority-low`

**Status:**
- `status-ready`: Ready for bot to pick up
- `status-in-progress`: Currently being worked on
- `status-review`: PR created, awaiting review
- `status-done`: Completed and merged
- `status-blocked`: Blocked by external factor

**Type:**
- `type-feature`, `type-bugfix`, `type-refactor`, `type-docs`

**Special:**
- `ai-bot-task`: Marks issues for bot processing
- `ai-generated`: Created by the bot

## How It Works

1. **Task Creation**: Bot parses `ROADMAP.md` and creates GitHub Issues
2. **Task Selection**: Selects highest priority `status-ready` task
3. **Context Loading**: Loads issue description and execution history
4. **Plan Generation**: Uses Gemini to create implementation plan
5. **Execution Record**: Posts plan to issue comments
6. **Code Generation**: Generates actual working code using Gemini AI
7. **Branch & Commit**: Creates branch with generated code changes
8. **Testing**: Auto-detects and runs tests (Jest, Pytest, Go, Rust, etc.)
9. **PR Creation**: Opens pull request with working code linked to issue
10. **Status Update**: Updates issue labels and links PR

## Development

### Project Structure

```
ai-dev-bot/
├── .github/
│   ├── workflows/
│   │   ├── ai-dev-bot.yml
│   │   └── generate-tasks.yml
│   └── ai-bot-config.yml
├── scripts/
│   ├── load-config.js
│   ├── orchestrator.js
│   ├── issue-manager.js
│   ├── context-analyzer.js
│   ├── pr-manager.js
│   └── testing.js
├── ROADMAP.md
├── SDD.md
└── package.json
```

### Running Locally

```bash
# Load configuration
node scripts/load-config.js

# Find next task
export GH_API_TOKEN=your_token
node scripts/issue-manager.js find-next-task

# Parse roadmap
node scripts/issue-manager.js parse-roadmap --file=ROADMAP.md
```

## Implementation Status

Current implementation includes:
- ✅ Issue-based task tracking with memory
- ✅ Gemini AI integration for planning
- ✅ Actual code generation (multi-language support)
- ✅ Multi-framework testing module (Jest, Pytest, Go, Rust, etc.)
- ✅ Automated PR creation and management
- ✅ Execution history stored in issues
- ✅ Comprehensive error handling
- ⚠️ Manual PR review recommended (no auto-merge)
- ⚠️ Limited to 10 files per code generation

## Security

- Secrets stored in GitHub Secrets
- Limited API scopes
- All operations auditable via issue comments
- Protected paths prevent workflow modification

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and enhancements.

## Documentation

- [Software Design Document (SDD)](SDD.md): Complete architecture and design
- [Configuration Reference](.github/ai-bot-config.yml): Bot configuration options

## Contributing

This is an AI-assisted project. The bot can propose improvements to itself via PRs.

## License

MIT

---

🤖 **Status**: POC Implementation
📅 **Last Updated**: February 14, 2026
