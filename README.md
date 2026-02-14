# AI Development Bot

Autonomous GitHub coding assistant powered by Google Gemini AI with multi-repository monitoring and issue-based memory.

## Features

- **Autonomous Development**: Generates code, creates PRs, and tracks tasks automatically
- **Pipeline Monitoring**: Monitors GitHub Actions across multiple repositories, creates investigation issues on failures
- **PR Review**: Automated code review with SDD compliance checking
- **Self-Improvement**: Analyzes performance metrics and proposes optimizations
- **Issue-Based Memory**: Persistent execution history across workflow runs
- **Multi-Language**: Supports JavaScript, Python, Go, Rust, and more

## Quick Start

### Prerequisites

- Node.js 20+
- GitHub repository with Actions enabled
- [Gemini API key](https://aistudio.google.com/app/apikey)
- GitHub Personal Access Token with `repo` and `workflow` scopes

### Installation

```bash
npm install
```

### Configuration

1. Add GitHub secrets:
   - `GEMINI_API_KEY` - Google Gemini API key
   - `GH_API_TOKEN` - GitHub token with repo access

2. Configure repositories in `.github/ai-bot-config.yml`:
   ```yaml
   repositories:
     - name: owner/repo
       priority: high
       enabled: true
   ```

3. Create labels in target repositories:
   ```bash
   ./scripts/create-labels-all-repos.sh
   ```

### Verification

```bash
export GH_API_TOKEN=your_token
./scripts/verify-multi-repo-setup.sh
```

## Usage

### Task-Based Development

Create tasks in `ROADMAP.md`:
```markdown
## Sprint 1
- [ ] Implement user authentication (8 points)
- [ ] Add database migrations (5 points)
```

Generate issues from roadmap:
```bash
gh workflow run generate-tasks.yml
```

Run bot to process tasks:
```bash
gh workflow run ai-dev-bot.yml
```

### Pipeline Monitoring

Automatically runs every 6 hours. Manual trigger:
```bash
gh workflow run monitor-pipelines.yml
```

View investigation issues:
```bash
gh issue list --label pipeline-failure
```

### PR Review

Bot reviews human-created PRs automatically:
```bash
# Triggered on PR open/update
# Or manually:
gh workflow run pr-review.yml -f pr_number=123
```

### Self-Improvement

Analyze bot performance:
```bash
gh workflow run self-improvement.yml
```

## Architecture

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ai-dev-bot.yml` | Schedule, manual | Main task execution |
| `generate-tasks.yml` | ROADMAP.md changes, manual | Create issues from roadmap |
| `monitor-pipelines.yml` | Schedule (6h), workflow failure | Monitor pipeline failures |
| `pr-review.yml` | PR open/update | Automated PR review |
| `auto-merge.yml` | PR labeled auto-merge | Automatic PR merging |
| `self-improvement.yml` | Weekly, manual | Performance analysis |

### Scripts

- `orchestrator.js` - Main execution engine
- `issue-manager.js` - Task tracking and memory
- `context-analyzer.js` - Repository and workflow analysis
- `pr-manager.js` - Pull request operations
- `code-generator.js` - AI-powered code generation
- `testing.js` - Multi-framework test execution
- `self-improvement.js` - Performance metrics

## Labels

The bot uses GitHub labels for task management:

**Priority**: `priority-high`, `priority-medium`, `priority-low`  
**Status**: `status-ready`, `status-in-progress`, `status-review`, `status-done`, `status-blocked`  
**Type**: `type-feature`, `type-bugfix`, `type-refactor`, `type-docs`, `type-investigate`, `type-ci-cd`  
**Special**: `ai-bot-task`, `ai-generated`, `pipeline-failure`, `automated`, `bot-improvement`

## Multi-Repository Setup

The bot supports monitoring multiple repositories from a central location:

1. Configure repositories in `.github/ai-bot-config.yml`
2. Verify access: `./scripts/verify-multi-repo-setup.sh`
3. Create labels: `./scripts/create-labels-all-repos.sh`
4. Issues are created in source repositories where failures occur

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed setup instructions.

## Documentation

- [Software Design Document](SDD.md) - Architecture and design
- [Deployment Guide](DEPLOYMENT.md) - Setup and configuration
- [Project Roadmap](ROADMAP.md) - Planned features

## License

MIT
