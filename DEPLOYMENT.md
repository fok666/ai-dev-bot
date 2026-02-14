# Deployment Guide

## Prerequisites

### Requirements
- GitHub account with admin access to target repositories
- [Gemini API key](https://aistudio.google.com/app/apikey)
- Node.js 20+
- GitHub CLI (`gh`) installed

### Secrets

**GEMINI_API_KEY**
- Get from: https://aistudio.google.com/app/apikey
- Free tier: 60 requests/minute

**GH_API_TOKEN**  
- Create at: https://github.com/settings/tokens/new
- Required scopes: `repo`, `workflow`
- For multi-repo: grant access to all monitored repositories

### Labels

Create required labels in target repositories:

```bash
./scripts/create-labels-all-repos.sh
```

Or manually:
```bash
gh label create priority-high --color d73a4a
gh label create status-ready --color 0e8a16
gh label create ai-bot-task --color 7057ff
gh label create pipeline-failure --color d73a4a
# ... (see script for complete list)
```

---

---

## Central Repository Deployment (Recommended)

Single bot repository monitors multiple projects. Issues are created in source repositories where failures occur.

### Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure repositories**  
   Edit `.github/ai-bot-config.yml`:
   ```yaml
   repositories:
     - name: owner/repo
       priority: high
       enabled: true
   ```

3. **Set secrets**
   ```bash
   gh secret set GEMINI_API_KEY
   gh secret set GH_API_TOKEN
   ```

4. **Verify access**
   ```bash
   export GH_API_TOKEN=your_token
   ./scripts/verify-multi-repo-setup.sh
   ```

5. **Create labels in all repos**
   ```bash
   ./scripts/create-labels-all-repos.sh
   ```

6. **Enable workflows**
   ```bash
   gh workflow enable monitor-pipelines.yml
   gh workflow enable ai-dev-bot.yml
   gh workflow enable pr-review.yml
   gh workflow enable auto-merge.yml
   gh workflow enable self-improvement.yml
   gh workflow enable generate-tasks.yml
   ```

7. **Test**
   ```bash
   gh workflow run monitor-pipelines.yml
   ```

### Token Requirements

**Fine-grained token:** Must grant repository access to all monitored repositories  
**Classic token:** Automatically has access to all accessible repositories

**Permissions:** Read/Write access to issues, PRs, contents, workflows

---

## Individual Repository Deployment

Bot files deployed directly to each repository. Each bot instance monitors only its own repository.

### Setup

1. **Copy files to target repository**
   ```bash
   cp -r .github/workflows <target-repo>/.github/
   cp -r scripts <target-repo>/
   cp package.json <target-repo>/
   ```

2. **Configure**  
   Edit `.github/ai-bot-config.yml` to remove multi-repo settings

3. **Set secrets in each repository**
   ```bash
   gh secret set GEMINI_API_KEY --repo owner/repo
   gh secret set GH_API_TOKEN --repo owner/repo
   ```

4. **Create labels**
   ```bash
   # In each repository
   gh label create ai-bot-task --color 7057ff --description "Bot task"
   # ... (all other labels)
   ```

5. **Enable workflows**
   ```bash
   gh workflow enable monitor-pipelines.yml --repo owner/repo
   ```

---

## Approach Comparison

| Feature | Central | Individual |
|---------|---------|------------|
| Setup | One-time | Per repository |
| Maintenance | Single location | Update each repo |
| Token Management | 1 PAT | 1 or N tokens |
| Multi-repo Monitoring | ✅ | ❌ |
| Scalability | Excellent | Poor |
| Isolation | Low | High |
| **Best for** | Teams, orgs | Single projects |

---

## Configuration

### Bot Behavior

`.github/ai-bot-config.yml`:
```yaml
bot:
  enabled: true
  mode: 'autonomous'

issues:
  complexity:
    low: 1-5
    medium: 6-13
    high: 14+

monitoring:
  pipelines:
    enabled: true
    lookback_hours: 24

pullRequests:
  autoMerge: false
  autoMergeConditions:
    checksPass: true
    maxLinesChanged: 500
```

### Roadmap Integration

Create `ROADMAP.md`:
```markdown
## Sprint 1
- [ ] Task description (story points)
```

Generate issues:
```bash
gh workflow run generate-tasks.yml
```

---

## Troubleshooting

**Bot not finding tasks**  
- Verify labels exist: `gh label list --search status-ready`
- Check issue has `ai-bot-task` and `status-ready` labels

**Token permission errors**  
- Verify `repo` and `workflow` scopes: `gh auth status`
- For fine-grained tokens, check repository access
- Regenerate if expired

**Gemini API failures**  
- Verify secret: `gh secret list | grep GEMINI`
- Check quota at https://aistudio.google.com
- Validate API key permissions

**Workflows not triggering**  
- Enable workflows: `gh workflow enable <name>`
- Check repository activity (GitHub disables inactive workflows)

**Multi-repo access failing**  
- Test access: `gh repo view owner/repo`
- For fine-grained tokens, add repositories to access list
- Verify organization permissions

**Investigation issues not created**  
- Check workflow age (must be within lookback window)
- Verify labels exist in targetrepository
- Review logs: `gh run view --log`

**Rate limit exceeded**  
- Increase monitoring interval in config
- Reduce number of monitored workflows
- Consider GitHub Enterprise for higher limits

---

## License

MIT
