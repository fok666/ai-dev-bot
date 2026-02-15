# GitHub Copilot Instructions for AI Development Bot

## Project Overview

This is an autonomous AI development assistant powered by Google Gemini AI that operates within GitHub repositories through CI/CD pipelines. The bot automates development tasks following agile methodologies, including code generation, testing, pull request management, pipeline monitoring, and continuous self-improvement.

**Key Innovation:** The bot uses GitHub Issues as its primary task management and memory system, providing persistent state across workflow runs with full transparency and auditability.

## High-Level Repository Information

- **Type:** Node.js automation project (GitHub Actions-based)
- **Primary Language:** JavaScript (ES modules)
- **Runtime:** Node.js 20.x LTS
- **Size:** Medium (~15 core scripts, 7 workflows, comprehensive test suite)
- **Architecture:** Modular event-driven system with issue-based memory
- **Frameworks:** Jest for testing, Google Generative AI SDK, Octokit for GitHub API
- **Target Platform:** GitHub Actions runners (Ubuntu latest)

## Project Structure

### Core Directories

```
scripts/               # Main bot logic
  ├── orchestrator.js      # Central workflow coordinator
  ├── gemini-service.js    # AI service with circuit breaker
  ├── context-analyzer.js  # Code/doc analysis & pipeline monitoring
  ├── issue-manager.js     # Task tracking & memory via GitHub Issues
  ├── pr-manager.js        # Pull request lifecycle management
  ├── code-generator.js    # Code creation with templates
  ├── testing.js           # Test execution and validation
  ├── self-improvement.js  # Performance tracking & learning
  └── load-config.js       # Configuration management

.github/workflows/     # GitHub Actions automation
  ├── ai-dev-bot.yml          # Main task execution workflow
  ├── monitor-pipelines.yml   # Multi-repo pipeline monitoring
  ├── generate-tasks.yml      # Roadmap to issues conversion
  ├── pr-review.yml           # Automated code review
  ├── self-improvement.yml    # Bot optimization workflow
  ├── test-validation.yml     # CI test execution
  └── auto-merge.yml          # PR auto-merge logic

__tests__/             # Jest test suite with 122 tests
  ├── circuit-breaker.test.js  # Circuit breaker pattern tests
  ├── gemini-service.test.js   # AI service unit tests
  ├── issue-manager.test.js    # Issue management tests
  └── ...

Documentation:
  ├── SDD.md               # Complete system design (2500 lines)
  ├── ROADMAP.md           # Feature roadmap and tasks
  ├── CONTRIBUTING.md      # Development guidelines
  ├── DEPLOYMENT.md        # Deployment procedures
  └── README.md            # Setup and usage guide
```

## Build & Validation Commands

### Installation & Setup
```bash
# Install dependencies (ALWAYS run after pulling changes)
npm install

# Verify multi-repo setup (requires GH_API_TOKEN)
export GH_API_TOKEN=your_token
./scripts/verify-multi-repo-setup.sh
```

### Testing (Critical - Run Before Commits)
```bash
# Run all tests (120 tests, ~2s)
npm test

# Run unit tests only (faster validation)
npm run test:unit

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Integration tests only
npm run test:integration
```

### Validation & Linting
```bash
# Validate GitHub Actions workflows
npm run validate:workflows

# Check for anti-patterns
npm run validate:patterns

# Pre-commit validation (workflows + unit tests)
npm run precommit

# Pre-push validation (all tests + workflows)
npm run prepush
```

### Expected Test Execution Time
- Unit tests: ~1.5 seconds
- Full test suite: ~2 seconds
- All tests currently passing except 2 skipped tests in circuit-breaker.test.js

### Git Hooks
Pre-commit and pre-push hooks are configured in `scripts/setup-hooks.sh`:
- Pre-commit: Validates workflows + runs unit tests
- Pre-push: Runs full test suite + validates workflows

## Architecture & Key Patterns

### Issue-Based Memory System
**CRITICAL:** The bot uses GitHub Issues for persistent memory and state management:

```javascript
// CORRECT: Load context from issue comments
const issue = await issueManager.loadIssue(issueNumber);
const executionHistory = await issueManager.getExecutionHistory(issueNumber);

// During execution: Update issue with progress
await issueManager.updateProgress(issueNumber, {
  status: 'in-progress',
  currentStep: 'generating-code',
  decisions: ['Using pattern X because Y']
});

// On completion: Store final state
await issueManager.completeTask(issueNumber, {
  outcome: 'success',
  prNumber: 123,
  metrics: { linesChanged: 50, testsAdded: 5 }
});
```

### Circuit Breaker Pattern (NEW - February 2026)
**CRITICAL SAFETY FEATURE:** gemini-service.js implements circuit breaker with three states:

```javascript
// Circuit breaker states: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing recovery)
// ALWAYS check circuit before API calls
await geminiService.checkCircuitBreaker(); // Throws if circuit OPEN

// Automatic state transitions on success/failure
// Health checks run every 5 minutes with caching
// Graceful degradation uses cache when circuit OPEN
```

**Key Thresholds:**
- Opens after 3 consecutive failures OR 5 total failures in 60 seconds
- Recovery timeout: 60 seconds
- Health check cache: 5 minutes

### Pipeline Monitoring Safety
**CRITICAL:** Issue Manager processes ONE failure at a time:

```javascript
// CORRECT: Check for duplicates BEFORE analysis
const existingIssue = await issueManager.findExistingInvestigationIssue(failure);
if (existingIssue) {
  await issueManager.addOccurrence(existingIssue, failure);
  return; // STOP - don't create duplicate
}

// Only create ONE issue per monitoring run
await issueManager.createInvestigationIssue(failure);
// STOP HERE - remaining failures processed next cycle
```

### Error Handling Standards
```javascript
// CORRECT: Variable scope for error handling
let result;
let issuesCreated = 0; // Declare OUTSIDE try block

try {
  result = await operation();
  issuesCreated++;
} catch (error) {
  // Can access issuesCreated here
  logger.error(`Created ${issuesCreated} issues before error`);
  throw error;
}
```

### Gemini API Integration
```javascript
// Use GeminiService class - NEVER call API directly
const geminiService = new GeminiService({
  apiKey: process.env.GEMINI_API_KEY,
  model: 'gemini-2.5-flash', // Auto-selected based on task
  enableCaching: true,
  enableCircuitBreaker: true // NEW: Circuit breaker protection
});

// ALWAYS provide structured context
const response = await geminiService.generate({
  systemInstruction: 'You are a code reviewer...',
  prompt: `<context>${fileContent}</context>\n<task>Review this code</task>`,
  temperature: 0.3, // Low for deterministic code generation
  maxOutputTokens: 8096
});
```

### Testing Requirements
- Minimum 70% code coverage (enforced)
- Use Jest with ES modules: `node --experimental-vm-modules`
- Mock external APIs (GitHub, Gemini) in tests
- Test both success and error paths
- Use `test.skip()` for flaky tests (document why)

## Coding Standards & Style

### JavaScript/Node.js Standards
```javascript
// ES modules REQUIRED (not CommonJS)
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises'; // Use promise-based APIs

// Async/await preferred over promises
async function processTask(taskId) {
  const task = await loadTask(taskId);
  return await executeTask(task);
}

// Error handling with context
try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', {
    operation: 'riskyOperation',
    error: error.message,
    stack: error.stack,
    context: { taskId, userId }
  });
  throw new Error(`Failed to execute: ${error.message}`);
}

// Named exports (not default exports)
export class TaskManager { }
export async function processTask() { }
```

### Workflow YAML Standards
```yaml
# Use specific action versions (NOT @v1, use @v6)
- uses: actions/checkout@v6

# ALWAYS set timeout to prevent runaway workflows
jobs:
  build:
    timeout-minutes: 30

# Use continue-on-error for non-critical steps
- name: Optional Step
  continue-on-error: true

# Output to GITHUB_OUTPUT (NOT set-output)
- name: Set Output
  run: echo "result=value" >> $GITHUB_OUTPUT

# Self-exclusion in monitoring workflows
if: github.event.workflow_run.name != 'Monitor GitHub Actions Pipelines'
```

### Configuration Validation
```javascript
// ALWAYS validate configuration on load
function loadConfig(path) {
  const config = yaml.load(fs.readFileSync(path, 'utf8'));
  
  // Validate required fields
  if (!config.gemini?.apiKey) {
    throw new Error('Missing required config: gemini.apiKey');
  }
  
  // Set safe defaults
  return {
    ...DEFAULT_CONFIG,
    ...config,
    safety: { maxIssuesPerRun: 1, ...config.safety }
  };
}
```

## Common Pitfalls & Workarounds

### GitHub Actions Issues

**Problem:** Workflow output parsing anti-pattern
```yaml
# WRONG: Parsing stdout directly
- run: node script.js > output.txt
- run: cat output.txt | grep "value"

# CORRECT: Use GITHUB_OUTPUT
- run: |
    RESULT=$(node script.js)
    echo "result=$RESULT" >> $GITHUB_OUTPUT
```

**Problem:** Rate limit cascades
```yaml
# CORRECT: Circuit breaker pattern in workflows
- name: Check Circuit Breaker
  run: |
    RECENT_RUNS=$(gh run list --limit 100 --json createdAt | \
      jq '[.[] | select(.createdAt > (now - 3600))] | length')
    if [ "$RECENT_RUNS" -ge 3 ]; then
      echo "Circuit breaker: too many runs"
      exit 0
    fi
```

### API Rate Limiting

**Problem:** Hitting GitHub API limits
```javascript
// CORRECT: Always handle rate limits gracefully
try {
  await octokit.issues.create(params);
} catch (error) {
  if (error.status === 403 && error.message.includes('rate limit')) {
    logger.warn('Rate limit hit, using exponential backoff');
    await sleep(60000); // Wait 1 minute
    return await octokit.issues.create(params); // Retry once
  }
  throw error;
}
```

### Test Flakiness

**Current Known Issues:**
- 2 tests in circuit-breaker.test.js are skipped (`.skip()`) due to timing issues
- These tests need fixing but are non-blocking for deployment

**Debugging Flaky Tests:**
```bash
# Run specific test multiple times
npm test -- --testNamePattern="circuit breaker" --runInBand

# Enable verbose logging
npm test -- --verbose

# Check for race conditions with delays
```

## Context for AI Assistants

### When Making Changes

1. **Always check SDD.md first** - Contains complete architecture and design decisions
2. **Read existing code patterns** - Follow established patterns in similar modules
3. **Update tests alongside code** - Maintain 70%+ coverage
4. **Validate workflows** - Run `npm run validate:workflows` after YAML changes
5. **Check for duplicates** - Search codebase before adding new utilities
6. **Document decisions** - Add comments explaining non-obvious choices

### Critical Safety Rules

**NEVER:**
- Create multiple issues per monitoring run (max 1)
- Skip duplicate checks before creating investigation issues
- Call Gemini API directly (use GeminiService class)
- Use CommonJS syntax (`require()`) - ES modules only
- Hardcode API keys or tokens - use environment variables
- Merge without running full test suite
- Disable circuit breaker in production
- Parse YAML with unsafe loaders

**ALWAYS:**
- Check circuit breaker state before API calls
- Handle rate limits with graceful degradation
- Store execution context in issue comments
- Link PRs to originating issues
- Use structured logging with context
- Validate configuration on startup
- Test error paths, not just happy paths
- Update documentation when changing behavior

### Performance Considerations

- **Caching:** GeminiService caches responses for 5 minutes
- **Batch Operations:** Process issues in small batches (max 3 WIP)
- **API Efficiency:** Minimize GitHub API calls, use GraphQL for complex queries
- **Parallel Execution:** Run independent tasks concurrently when possible
- **Circuit Breaker:** Prevents cascading failures and API exhaustion

## Additional Resources

- **Full System Design:** See [SDD.md](../SDD.md) (2500 lines, comprehensive)
- **Contributing Guide:** [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Deployment:** [DEPLOYMENT.md](../DEPLOYMENT.md)
- **Gemini AI Docs:** https://ai.google.dev/gemini-api/docs
- **GitHub Actions:** https://docs.github.com/en/actions

## Trust These Instructions

These instructions are validated and tested. Follow them precisely to maintain system reliability and avoid common pitfalls. Only search for additional information if something in these instructions is unclear or found to be incorrect.
