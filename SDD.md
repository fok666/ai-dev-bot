# Software Design Document (SDD)
## AI Development Bot - Gemini-CLI Based GitHub Automation

**Version:** 1.0  
**Date:** February 14, 2026  
**Status:** Initial Draft

---

## 1. Executive Summary

The AI Development Bot is an autonomous coding assistant powered by Gemini AI that operates within GitHub repositories through CI/CD pipelines. The bot automates development tasks following agile methodologies, including code generation, testing, pull request management, and continuous self-improvement.

### 1.1 Purpose
To create a fully autonomous AI-powered development assistant that can:
- Generate and modify code across multiple repositories
- Follow Software Design Documents (SDD) and roadmaps
- Implement agile development practices
- Manage the complete lifecycle of code changes from creation to merge
- Continuously improve its own capabilities

### 1.2 Scope
This system will operate as a GitHub Actions-based automation that interfaces with Gemini AI through CLI, managing code changes across any configured repository with full PR management capabilities.

### 1.3 Key Innovation: Issue-Based Memory
The bot uses GitHub Issues as its primary task management and memory system. Each task is tracked as an issue, with execution history, decisions, and context stored in issue comments. This provides:
- **Persistent Memory:** State survives across workflow runs
- **Transparency:** All decisions are visible and auditable
- **Collaboration:** Humans can view and interact with bot reasoning
- **Recovery:** Failed tasks resume with full context
- **Learning:** Rich historical data enables self-improvement

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Platform                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐        ┌──────────────┐            │
│  │  Repository  │◄───────┤   Webhooks   │            │
│  │  (Any Repo)  │        │   Triggers   │            │
│  └──────┬───────┘        └──────────────┘            │
│         │                                              │
│         │  ┌────────────────────────────┐            │
│         │  │    GitHub Issues           │            │
│         │  │  - Task Tracking           │            │
│         │  │  - Memory/State Storage    │            │
│         │  │  - Sprint Planning         │            │
│         │  │  - Progress Tracking       │            │
│         │  └──────────┬─────────────────┘            │
│         │             │                                │
│         ▼             ▼                                │
│  ┌─────────────────────────────────────────┐         │
│  │      GitHub Actions Workflows            │         │
│  │  ┌───────────────────────────────────┐  │         │
│  │  │   AI-Dev-Bot Pipeline Runner      │  │         │
│  │  │  - Scheduled Triggers (cron)      │  │         │
│  │  │  - Event Triggers (push, PR)      │  │         │
│  │  │  - Issue Triggers (new/updated)   │  │         │
│  │  │  - Manual Dispatches              │  │         │
│  │  └───────────────┬───────────────────┘  │         │
│  └──────────────────┼──────────────────────┘         │
│                     │                                  │
└─────────────────────┼──────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              AI Development Bot Core                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────────────────────────────────────────┐ │
│  │          Bot Orchestrator Module                 │ │
│  │  - Workflow Management                           │ │
│  │  - Task Prioritization                           │ │
│  │  - State Management                              │ │
│  └──────────────────┬───────────────────────────────┘ │
│                     │                                  │
│  ┌──────────────────┼───────────────────────────────┐ │
│  │                  ▼                                │ │
│  │        ┌─────────────────────┐                   │ │
│  │        │  Gemini-CLI Module  │                   │ │
│  │        │  - API Integration  │                   │ │
│  │        │  - Prompt Engine    │                   │ │
│  │        │  - Response Parser  │                   │ │
│  │        └──────────┬──────────┘                   │ │
│  │                   │                               │ │
│  ├───────────────────┼───────────────────────────────┤ │
│  │                   │                               │ │
│  │  ┌────────────────┼──────────────────────┐       │ │
│  │  │                ▼                      │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  Context Analyzer    │          │       │ │
│  │  │    │  - SDD Parser        │          │       │ │
│  │  │    │  - Roadmap Reader    │          │       │ │
│  │  │    │  - Code Analyzer     │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  Code Generator      │          │       │ │
│  │  │    │  - Template Engine   │          │       │ │
│  │  │    │  - Syntax Validator  │          │       │ │
│  │  │    │  - Style Enforcer    │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  PR Manager          │          │       │ │
│  │  │    │  - Creation          │          │       │ │
│  │  │    │  - Review            │          │       │ │
│  │  │    │  - Discussion        │          │       │ │
│  │  │    │  - Merge             │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  Testing Module      │          │       │ │
│  │  │    │  - Unit Tests        │          │       │ │
│  │  │    │  - Integration Tests │          │       │ │
│  │  │    │  - Quality Checks    │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  Self-Improvement    │          │       │ │
│  │  │    │  - Performance Track │          │       │ │
│  │  │    │  - Learning Module   │          │       │ │
│  │  │    │  - Config Optimizer  │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  │    ┌──────────────────────┐          │       │ │
│  │  │    │  Issue Manager       │          │       │ │
│  │  │    │  - Task Generation   │          │       │ │
│  │  │    │  - State Tracking    │          │       │ │
│  │  │    │  - Memory Storage    │          │       │ │
│  │  │    │  - Sprint Mgmt       │          │       │ │
│  │  │    └──────────────────────┘          │       │ │
│  │  │                                       │       │ │
│  │  └───────────────────────────────────────┘       │ │
│  │                                                   │ │
│  └───────────────────────────────────────────────────┘ │
│                                                         │
└─────────────────────────────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   GitHub Issues        │
         │  - Task Memory         │
         │  - Execution History   │
         │  - State Persistence   │
         │  - Progress Tracking   │
         │  - Context Storage     │
         └────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Bot Orchestrator Module
**Responsibility:** Central coordinator managing workflow execution and state

**Key Functions:**
- Parse incoming triggers (schedule, webhook, manual)
- Determine task priority based on roadmap and SDD
- Manage execution state across workflow runs
- Coordinate between different bot modules
- Handle error recovery and retries

**Technologies:**
- Node.js/Python runtime
- State management via GitHub Actions cache/artifacts
- JSON-based configuration

#### 2.2.2 Gemini-CLI Module
**Responsibility:** Interface with Gemini AI for code generation and analysis

**Key Functions:**
- Construct context-aware prompts from repository state
- Send requests to Gemini API via CLI
- Parse and validate AI responses
- Handle rate limiting and API errors
- Optimize token usage

**Technologies:**
- Gemini CLI (official command-line interface)
- API key management via GitHub Secrets
- Response caching for efficiency
- Circuit breaker pattern for resilience
- Cost optimization engine

**Advanced Features:**

##### Circuit Breaker Pattern (Critical Safety Feature)
Implements three-state circuit breaker to prevent cascading failures:

**States:**
- **CLOSED (Normal):** Requests flow through normally
- **OPEN (Failing):** Blocks requests, uses cached responses
- **HALF_OPEN (Testing):** Limited requests to test recovery

**Thresholds:**
- Opens after 3 consecutive failures OR 5 total failures in 60 seconds
- Recovery timeout: 60 seconds
- Health check cache: 5 minutes
- Requires 2 successes in HALF_OPEN to close circuit

**Behavior:**
```javascript
// ALWAYS check circuit before API calls
await geminiService.checkCircuitBreaker(); // Throws if OPEN

// Automatic state transitions
// Graceful degradation uses cache when circuit OPEN
if (circuitBreakerOpen && cachedResponse) {
  return cachedResponse; // Fallback to cache
}
```

**Benefits:**
- Prevents API exhaustion during outages
- Automatic recovery testing
- Graceful degradation with cached responses
- Reduces wasted API calls and costs
- Fast fail prevents long timeouts

##### Cost Optimization Strategies
Comprehensive cost management system achieving 70%+ cost reduction:

**1. Intelligent Model Selection**
- **Simple tasks:** gemini-2.5-flash (cheapest)
- **Complex analysis:** gemini-2.5-pro (when needed)
- **Automatic selection** based on prompt complexity
- **Savings:** 70% cost reduction vs always using pro model

**2. Context Caching**
- Cache responses for identical prompts
- 5-minute cache TTL for frequently repeated queries
- Cache directory: `.context-cache/gemini-responses`
- **Savings:** 75% reduction on repeated context

**3. Batch Processing**
- Group similar requests where possible
- Batch discount: 50% savings
- Reduces API call overhead

**4. Token Budget Management**
- Rate limiting: 100 calls per hour (configurable)
- Token usage tracking and reporting
- Spending alerts and limits
- Monthly budget enforcement

**5. Response Caching Strategy**
```javascript
// Cache hits avoid API calls entirely
const cacheKey = generateCacheKey(prompt, model);
const cached = loadFromCache(cacheKey);
if (cached && !options.skipCache) {
  return cached; // Zero cost!
}
```

**Cost Metrics:**
- Average cost per generation tracked
- Monthly spending dashboard
- Cost per repository
- ROI calculations (dev time saved vs API cost)

#### 2.2.3 Context Analyzer
**Responsibility:** Understand repository context and requirements

**Key Functions:**
- Parse SDD documents to understand design constraints
- Read and interpret roadmap files
- Analyze existing codebase structure
- Identify dependencies and relationships
- Extract coding standards and patterns
- Scan GitHub Actions pipeline for failures
- Analyze workflow run logs and errors
- Detect patterns in CI/CD failures

**Technologies:**
- Markdown parsers (for SDD/Roadmap)
- AST parsers (for code analysis)
- Pattern matching engines
- GitHub Actions API for workflow monitoring
- Log analysis and error detection

#### 2.2.4 Code Generator
**Responsibility:** Create and modify code following best practices

**Key Functions:**
- Generate code based on AI suggestions
- Apply language-specific templates
- Validate syntax and semantics
- Enforce coding style and standards
- Ensure compatibility with existing code

**Technologies:**
- Language-specific formatters (prettier, black, gofmt, etc.)
- Linters (eslint, pylint, golangci-lint, etc.)
- Template engines

#### 2.2.5 PR Manager
**Responsibility:** Handle complete pull request lifecycle

**Key Functions:**
- Create descriptive PRs with proper context
- Monitor PR status and CI checks
- Review other PRs (when configured)
- Respond to review comments
- Auto-approve and merge when criteria met
- Handle merge conflicts

**Technologies:**
- GitHub REST/GraphQL API
- gh CLI tool
- Git operations

#### 2.2.6 Testing Module
**Responsibility:** Ensure code quality through automated testing

**Key Functions:**
- Run existing test suites
- Generate new test cases for new code
- Execute integration tests
- Perform code quality checks
- Validate against acceptance criteria

**Technologies:**
- Language-specific test frameworks
- Code coverage tools
- Security scanners (e.g., Snyk, CodeQL)

#### 2.2.7 Self-Improvement Module
**Responsibility:** Enable continuous bot enhancement

**Key Functions:**
- Track performance metrics (merge rate, code quality, time to merge)
- Learn from successful/failed PRs
- Adjust configuration based on outcomes
- Update prompt templates
- Optimize workflow efficiency

**Technologies:**
- Metrics storage (GitHub Issues, GitHub Artifacts)
- Machine learning feedback loops
- A/B testing framework

#### 2.2.8 Issue Manager Module
**Responsibility:** Task generation, tracking, and memory management via GitHub Issues

**Key Functions:**
- Generate tasks from roadmap and create issues
- Track task execution state in issue comments
- Store execution context and decisions
- Maintain bot memory across runs
- Link PRs to issues for full lifecycle tracking
- Query issue history for context
- Update issue status based on PR outcomes
- Generate throughput metrics from issue data
- Create investigation issues for pipeline failures
- **Check for duplicate issues BEFORE creating new ones**
- **Process ONE failure at a time to prevent cascades**
- Track recurring CI/CD problems
- Link pipeline failures to related code changes

**Technologies:**
- GitHub Issues API
- Issue labels for categorization (status, priority, type)
- Issue comments for state persistence
- Milestones for time-based batching
- Project boards for visualization
- GitHub Actions API for workflow status

**Safety Features:**
- Maximum 1 investigation issue per monitoring run
- Duplicate detection before analysis to save API calls
- Rate limit error handling with graceful degradation
- Self-exclusion (monitor doesn't monitor itself)

---

## 3. Data Flow

### 3.1 Scheduled Execution Flow

```
1. Cron Trigger (e.g., daily at 2 AM)
   ↓
2. Context Analyzer scans GitHub Actions for failures
   ↓
3. If failures found → Create investigation issues
   ↓
4. Issue Manager queries open issues by priority
   ↓
5. Select highest priority "ready" task
   ↓
6. Load task context from issue history
   ↓
7. Context Analyzer gathers code/docs + issue comments
   ↓
8. Gemini-CLI generates implementation plan
   ↓
9. Update issue with execution status
   ↓
10. Code Generator creates changes
   ↓
11. Testing Module runs validations
   ↓
12. PR Manager creates PR linked to issue
   ↓
13. Update issue with PR link and progress
   ↓
14. Self-Improvement logs metrics to issue comment
```

### 3.1.5 Issue-Based Task Generation Flow

```
1. Roadmap Update or Continuous Sync
   ↓
2. Issue Manager reads ROADMAP.md
   ↓
3. Parse ready tasks (small batches)
   ↓
4. For each task: Create GitHub Issue
   ↓
5. Set labels: priority-high/medium/low, status-ready, complexity-S/M/L
   ↓
6. Add to time-based milestone (if used)
   ↓
7. Store task breakdown in issue description
   ↓
8. Link related issues (dependencies)
   ↓
9. Assign to ai-dev-bot
```

### 3.2 PR Review Flow

```
1. PR Created (by bot or human)
   ↓
2. Webhook triggers workflow
   ↓
3. Context Analyzer reviews PR changes
   ↓
4. Gemini-CLI analyzes code quality & design
   ↓
5. PR Manager posts review comments
   ↓
6. If changes requested → notify author
   ↓
7. If approved → wait for required checks
   ↓
8. Testing Module validates CI passes
   ↓
9. PR Manager auto-merges if criteria met
```

### 3.2.5 Self-Healing PR Review Flow

```
1. Bot's PR receives review comments
   ↓
2. Webhook triggers self-healing workflow
   ↓
3. Load issue context + PR context
   ↓
4. Parse review comments for requested changes
   ↓
5. Gemini analyzes: "How to address these comments?"
   ↓
6. Generate code fixes
   ↓
7. Validate fixes locally (tests, linting)
   ↓
8. Push updates to same PR branch
   ↓
9. Add comment: "✅ Fixed: [summary of changes]"
   ↓
10. Update linked issue with resolution notes
   ↓
11. Request re-review from reviewers
   ↓
12. If approved → proceed to merge
```

### 3.3 Self-Configuration Flow

```
1. Performance metrics fall below threshold
   ↓
2. Self-Improvement Module analyzes patterns
   ↓
3. Gemini-CLI suggests configuration changes
   ↓
4. Create issue documenting proposed changes
   ↓
5. Generate PR updating bot configuration
   ↓
6. Link PR to improvement issue
   ↓
7. Manual review required for bot config changes
   ↓
8. Upon merge, close issue and update config
```

### 3.4 Issue Memory and Context Flow

```
1. Bot starts task execution
   ↓
2. Issue Manager loads issue by ID
   ↓
3. Parse issue description for task details
   ↓
4. Load all comments for execution history
   ↓
5. Extract previous attempts, errors, decisions
   ↓
6. Build context for Gemini prompt
   ↓
7. During execution: Post updates as comments
   ↓
8. Store decisions, rationale, errors
   ↓
9. On completion: Update issue with final status
   ↓
10. Next run: Full history available in same issue
```

### 3.5 Pipeline Monitoring and Issue Creation Flow

```
1. Scheduled trigger or workflow failure webhook
   ↓
2. Context Analyzer queries GitHub Actions API
   ↓
3. Get failed workflow runs in last 24 hours
   ↓
4. Sort failures by priority (high/medium/low)
   ↓
5. For HIGHEST priority failure only:
   ↓
6. FIRST: Check if investigation issue already exists
   ↓
7. If duplicate found:
   ↓
8. Add comment to existing issue with new occurrence
   ↓
9. Skip to exit (no new issue created)
   ↓
10. If NO duplicate:
   ↓
11. Download workflow logs
   ↓
12. Gemini-CLI analyzes failure patterns
   ↓
13. Extract error messages and stack traces
   ↓
14. Identify likely root cause
   ↓
15. Issue Manager creates ONE investigation issue
   ↓
16. Add labels: type-investigate, priority-high, status-ready
   ↓
17. Link to failed workflow run
   ↓
18. Include analysis and suggested fixes
   ↓
19. Assign to ai-dev-bot or relevant team
   ↓
20. STOP - remaining failures processed in next cycle
   ↓
21. Bot can work on fix in subsequent runs
```

**Key Safety Features:**
- **One at a Time:** Maximum 1 issue created per monitoring run
- **Duplicate Check First:** Checks for existing issues BEFORE analysis
- **Prevents Cascades:** Stops after creating one issue
- **Self-Exclusion:** Monitor workflow doesn't monitor itself
- **Graceful Degradation:** Handles rate limits without crashing

---

## 4. Technical Stack

### 4.1 Core Technologies

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| AI Engine | Gemini API | Latest | Code generation & analysis |
| CLI Interface | Gemini-CLI | Latest | API interaction |
| CI/CD Platform | GitHub Actions | - | Workflow execution |
| Version Control | Git / GitHub | - | Code management |
| Runtime | Node.js | 20.x LTS | Primary bot runtime |
| Alternative Runtime | Python | 3.11+ | Script execution |
| Package Manager | npm / pip | Latest | Dependency management |
| Git Interface | gh CLI | Latest | GitHub API operations |

### 4.2 Supporting Tools

- **Code Quality:** ESLint, Prettier, Black, EditorConfig
- **Testing:** Jest, Pytest, Testing Library
- **Security:** Snyk, CodeQL, Dependabot
- **Documentation:** Markdown, JSDoc, Sphinx
- **Monitoring:** GitHub Insights, Custom metrics

---

## 5. Configuration System

### 5.1 Repository Configuration

Each repository will contain `.github/ai-bot-config.yml`:

```yaml
version: '1.0'

# Bot behavior settings
bot:
  enabled: true
  mode: 'autonomous'  # autonomous | supervised
  schedule: '0 2 * * *'  # Cron schedule
  
# Document locations
documents:
  sdd: 'SDD.md'
  roadmap: 'ROADMAP.md'
  contributing: 'CONTRIBUTING.md'
  
# Code generation settings
codeGen:
  languages:
    - typescript
    - python
    - go
  style:
    typescript: 'prettier'
    python: 'black'
  testCoverage:
    minimum: 80
    
# Issue management
issues:
  enableTaskGeneration: true
  enableMemory: true
  enablePipelineMonitoring: true  # Monitor GitHub Actions for failures
  pipelineMonitoring:
    checkInterval: '0 */6 * * *'  # Every 6 hours
    lookbackHours: 24
    maxIssuesPerRun: 1              # CRITICAL: Only create 1 issue per run
    duplicateCheckFirst: true       # Check for duplicates BEFORE analysis
    excludeWorkflows:
      - 'dependabot'
      - 'codeql'
      - 'Monitor GitHub Actions Pipelines'  # Don't monitor self
    autoCreateIssues: true
    issuePriority: 'high'
  labelPrefix: 'ai-bot'
  labels:
    priority:
      - 'priority-high'
      - 'priority-medium'
      - 'priority-low'
    status:
      - 'status-ready'
      - 'status-in-progress'
      - 'status-blocked'
      - 'status-review'
      - 'status-done'
    type:
      - 'type-feature'
      - 'type-bugfix'
      - 'type-refactor'
      - 'type-docs'
      - 'type-investigate'  # For pipeline failures
  autoClose: true
  closeOnMerge: true
  retentionDays: 90  # Close stale issues
  
# PR management
pullRequests:
  autoCreate: true
  autoMerge: false  # Requires review by default
  linkToIssue: true  # Always link PR to originating issue
  autoMergeConditions:
    - allChecksPassed: true
    - minApprovals: 1
    - noRequestedChanges: true
    - maxLinesChanged: 500
  branchPrefix: 'ai-bot/'
  reviewers:
    - 'team/developers'
  labels:
    - 'ai-generated'
    - 'automated'
    
# Testing requirements
testing:
  runTests: true
  frameworks:
    javascript: 'jest'
    python: 'pytest'
  requiredChecks:
    - 'build'
    - 'test'
    - 'lint'
    
# Self-improvement
selfImprovement:
  enabled: true
  metricsTracking: true
  configOptimization: 'manual-approval'  # manual-approval | automatic
  
# CI/CD practices
agile:
  continuousDelivery: true
  smallBatchSize: true  # Small, frequent changes
  trunkBasedDevelopment: true
  maxWIP: 3  # Work in progress limit
  taskPrioritization: 'roadmap-driven'
  
# Safety & constraints
safety:
  maxFilesPerPR: 15
  maxLinesPerPR: 1000
  requireHumanReview:
    - 'critical-security'
    - 'database-migrations'
    - 'config-changes'
  protectedPaths:
    - '.github/workflows/'
    - 'secrets.yml'
```

### 5.2 Global Bot Configuration

Stored in the bot's own repository:

```yaml
# bot-config.yml
gemini:
  model: 'gemini-2.5-flash'  # Default cheapest model
  modelSelection: 'automatic'  # automatic | fixed
  temperature: 0.3
  maxTokens: 8096
  
  # Cost Optimization
  costOptimization:
    enabled: true
    intelligentModelSelection: true  # Auto-switch based on complexity
    contextCaching: true
    cacheDir: '.context-cache/gemini-responses'
    cacheTTL: 300  # 5 minutes
    batchProcessing: true
    
  # Budget Management
  budget:
    monthlyLimit: 100  # USD
    alertThreshold: 0.8  # Alert at 80%
    hardStop: true  # Stop when limit reached
    trackingEnabled: true
    
  # Circuit Breaker Configuration
  circuitBreaker:
    enabled: true
    failureThreshold: 5  # Total failures before opening
    consecutiveFailureThreshold: 3  # Consecutive failures
    recoveryTimeout: 60000  # 1 minute in ms
    halfOpenSuccessThreshold: 2  # Successes to close
    healthCheckInterval: 300000  # 5 minutes
    
  # Rate Limiting & Retry
  rateLimitPerHour: 100
  retryAttempts: 3
  retryDelay: 1000  # Base delay in ms
  exponentialBackoff: true
  
  # Graceful Degradation
  gracefulDegradation:
    enabled: true
    useCacheOnFailure: true
    useCacheOnRateLimit: true
    
repositories:
  - name: 'user/repo1'
    priority: 'high'
  - name: 'user/repo2'
    priority: 'medium'
    
schedules:
  development: '0 2 * * 1-5'  # Weekdays at 2 AM
  maintenance: '0 3 * * 0'    # Sundays at 3 AM
  
rateLimits:
  geminiApiCallsPerHour: 100
  githubApiCallsPerHour: 5000
  
performance:
  maxConcurrentRepos: 3
  taskTimeout: 3600  # seconds
  
# Self-Healing Configuration
selfHealing:
  enabled: true
  autoRecovery: true
  prReviewResponseEnabled: true
  pipelineFailureFixEnabled: true
  staleIssueRecovery: true
  staleThresholdHours: 24
  escalateAfterRetries: 3
  
# Duplicate Prevention
duplication:
  checkBeforeCreate: true  # CRITICAL: Check first
  deduplicationWindow: 7  # Days
  errorSignatureMatching: true
  maxIssuesPerRun: 1  # Pipeline monitoring
  maxWIP: 3  # Work in progress limit
  
learning:
  feedbackLoop: true
  metricRetention: 90  # days
```

---

## 6. Continuous Delivery Workflow

### 6.1 Continuous Integration & Deployment

The bot follows continuous delivery practices:

**Principles:**
- Small batch sizes (single task, single PR)
- Trunk-based development (short-lived branches)
- Continuous integration (always deployable main)
- Fast feedback loops (quick builds, quick reviews)
- Low work-in-progress (max 3 concurrent tasks)

**Continuous Flow:**

1. **Task Selection (Continuous)**
   - Read ROADMAP.md for prioritized backlog
   - Query issues: `is:open label:status-ready assignee:ai-dev-bot`
   - Select highest priority task (respect WIP limit)
   - Estimate complexity: S/M/L (not story points)
   - Link dependent issues

2. **Implementation (Small Batches)**
   - Update issue label to `status-in-progress`
   - Comment: "🤖 Starting work on this task"
   - Load previous context from issue comments
   - Create short-lived feature branch (hours, not days)
   - Implement minimal viable change
   - Write tests first or alongside (TDD when possible)
   - Keep changes small and focused
   - Comment progress updates to issue
   - Create PR linked to issue (`Closes #123`)
   - Update issue label to `status-review`

3. **Integration (Continuous)**
   - Fast CI pipeline (<10 min)
   - Automated testing (unit, integration, e2e)
   - Quick PR review cycle
   - Merge to main frequently (multiple times per day)
   - Close completed issues immediately
   - Deploy continuously (if auto-merge enabled)

### 6.2 Task Breakdown

For each task in the roadmap:

```
Feature → Small Batches → Deployable Increments
  ↓
Gemini analyzes complexity
  ↓
Break into smallest deployable units
  ↓
Size: S (<2hr), M (<4hr), L (<8hr)
  ↓
Queue by priority
  ↓
Deploy continuously
```

**Continuous Delivery Principles Applied:**
- Every change must be independently deployable
- No task should take more than a day
- Always work on trunk (main branch)
- Fast, reliable automated tests
- Continuous peer review through automation

### 6.3 Code Review Process

**Bot as Author:**
1. Create descriptive PR with:
   - Reference to roadmap/SDD section
   - Implementation approach
   - Test coverage report
   - Breaking changes (if any)
2. Wait for CI checks
3. Address review comments using Gemini
4. Request re-review
5. Auto-merge when approved

**Bot as Reviewer:**
1. Analyze PR against SDD guidelines
2. Check code quality and patterns
3. Verify test coverage
4. Provide constructive feedback
5. Approve or request changes
6. Track resolution of comments

---

## 7. Self-Improvement Mechanisms

### 7.1 Performance Metrics

Track and optimize (Continuous Delivery metrics):

- **Code Quality**
  - Merge rate (target: >80%)
  - Review comment count (target: <5 per PR)
  - CI failure rate (target: <5%)
  - Code coverage (target: >80%)
  - Build reliability (target: >95%)

- **Flow Efficiency (Continuous Delivery metrics)**
  - Cycle time: Issue open → merged (target: <8 hours)
  - Lead time: Commit → production (target: <30 min)
  - Deployment frequency (target: multiple per day)
  - Change failure rate (target: <5%)
  - Mean time to recovery (target: <1 hour)
  - Batch size: Files changed per PR (target: <10)

- **Collaboration**
  - Human review feedback sentiment
  - Acceptance rate of suggestions
  - Merge conflict frequency

### 7.2 Learning Loops

1. **Feedback Collection**
   - Parse human review comments from PRs
   - Analyze rejected PRs and reasons
   - Track successful patterns in closed issues
   - Monitor CI failures in issue comments
   - Extract lessons from issue execution history

2. **Pattern Recognition**
   - Identify common review feedback across issues
   - Extract coding preferences from successful PRs
   - Recognize successful approaches by issue type
   - Detect antipatterns causing issue failures
   - Analyze cycle time by task category
   - Track deployment success patterns

3. **Configuration Updates**
   - Adjust Gemini prompts based on issue outcomes
   - Update style preferences from review patterns
   - Refine task prioritization based on velocity
   - Optimize testing strategies per issue type
   - Tune issue label heuristics

4. **Self-Modification**
   - Create issue documenting improvement proposal
   - Generate PRs to update bot configuration
   - Propose workflow improvements in issues
   - Suggest new capabilities with justification
   - Requires human approval for bot changes
   - Store improvement rationale in dedicated issues

### 7.3 Continuous Optimization

```python
# Pseudo-code for self-optimization
def optimize_performance():
    metrics = collect_continuous_metrics()
    
    if metrics.cycle_time > target_cycle_time:
        analyze_bottlenecks()
        reduce_batch_size()
        
    if metrics.change_failure_rate > 0.05:
        improve_test_coverage()
        enhance_pre_commit_validation()
        
    if metrics.deployment_frequency < daily_target:
        identify_merge_blockers()
        streamline_review_process()
        
    if metrics.lead_time > 30_minutes:
        optimize_ci_pipeline()
        parallelize_tests()
        
    generate_optimization_pr()
```

### 7.4 Self-Healing Capabilities

The bot automatically detects and recovers from various failure scenarios:

#### 7.4.1 Circuit Breaker Recovery

**Automatic Recovery Flow:**
```
API Failures Detected (3 consecutive)
  ↓
Circuit Opens (blocks requests)
  ↓
Wait Recovery Timeout (60 seconds)
  ↓
Transition to HALF_OPEN (test recovery)
  ↓
Attempt Health Check
  ↓
Success → Close Circuit (resume normal)
Failure → Reopen Circuit (wait again)
```

**Graceful Degradation:**
- Uses cached responses when circuit is OPEN
- Continues operations with reduced functionality
- Automatic health checks every 5 minutes
- Self-recovery without human intervention

#### 7.4.2 Rate Limit Self-Healing

**Detection:**
- Monitors API calls per hour
- Detects 429 (Too Many Requests) responses
- Tracks rate limit headers

**Recovery:**
```javascript
if (rateLimitHit) {
  // Option 1: Graceful degradation
  if (cachedResponseAvailable) {
    return cachedResponse;
  }
  
  // Option 2: Exponential backoff
  const waitTime = calculateBackoff(attempt);
  await sleep(waitTime);
  
  // Option 3: Circuit breaker protection
  if (consecutiveRateLimits >= 3) {
    openCircuitBreaker();
  }
}
```

#### 7.4.3 PR Review Self-Healing

**Automated Response to Review Comments:**
1. Bot detects review comments on its PRs
2. Analyzes requested changes
3. Generates fixes automatically
4. Pushes updates to same PR
5. Requests re-review
6. Tracks resolution in issue comments

**Example Flow:**
```
Human Review: "Missing null check on line 45"
  ↓
Bot analyzes context
  ↓
Generates fix with null check
  ↓
Runs tests locally
  ↓
Pushes update to PR
  ↓
Comments: "✅ Fixed: Added null check as requested"
  ↓
Requests re-review
```

#### 7.4.4 Pipeline Failure Self-Healing

**Automatic Investigation and Fix:**
1. Monitor workflow detects failure
2. Creates investigation issue automatically
3. Bot analyzes failure in next cycle
4. Generates fix if pattern recognized
5. Creates PR with fix
6. Links to investigation issue
7. Tests fix before merge

**Common Auto-Fixable Issues:**
- Linting errors
- Formatting issues
- Simple test failures
- Dependency conflicts (minor versions)
- Flaky test detection and quarantine

**Safety Features:**
- Maximum 1 investigation issue per run
- Duplicate detection prevents issue spam
- Human approval required for complex fixes
- Rollback capability for failed fixes

#### 7.4.5 Issue State Recovery

**Stale Issue Detection:**
- Detects issues stuck in "in-progress" > 24 hours
- Analyzes execution history from comments
- Determines if recoverable or needs human help

**Recovery Actions:**
```javascript
if (issueStuckInProgress) {
  const history = loadExecutionHistory(issueNumber);
  
  if (recoverableError(history.lastError)) {
    // Reset to ready and retry
    updateIssueStatus(issueNumber, 'status-ready');
    addComment('🔄 Automatic recovery attempted');
  } else {
    // Escalate to human
    updateIssueStatus(issueNumber, 'status-blocked');
    addComment('⚠️ Human assistance required');
    notifyTeam(issueNumber);
  }
}
```

**Self-Healing Metrics:**
- Auto-recovery success rate
- Time to recovery (TTR)
- Circuit breaker activation frequency
- Cache hit rate during degradation
- Issues resolved without human intervention

---

## 8. Issue-Based Memory System

### 8.1 Overview

GitHub Issues serve as the bot's persistent memory and task management system. Each issue represents a task and stores the complete execution history, decisions, and context across multiple workflow runs. This approach provides:

- **Transparency:** All bot decisions are visible and auditable
- **Persistence:** Memory survives across workflow runs
- **Collaboration:** Humans can view and interact with bot's reasoning
- **Recovery:** Failed tasks can resume with full context
- **Learning:** Historical data available for self-improvement

### 8.2 Issue Structure

**Issue Title:** Clear, actionable task name
```
feat: Implement user authentication endpoint
fix: Resolve memory leak in data processor
refactor: Optimize database query performance
```

**Issue Description:** Task details and acceptance criteria
- Task description from roadmap
- Acceptance criteria (checkboxes)
- Technical requirements from SDD
- Dependencies and blockers
- Complexity estimate (S/M/L)

**Issue Labels:** Categorical classification
- Priority: `priority-high`, `priority-medium`, `priority-low`
- Status: `status-ready`, `status-in-progress`, `status-review`, `status-done`
- Type: `type-feature`, `type-bugfix`, `type-refactor`
- Complexity: `complexity-S`, `complexity-M`, `complexity-L`
- Special: `ai-bot-task`, `ai-generated`

**Issue Comments:** Execution history and memory
- Each workflow run adds a comment
- Includes: timestamp, analysis, decisions, approach, challenges
- Gemini context and rationale
- Links to PRs and commits
- Error messages and retry information
- Performance metrics

**Issue Milestones:** Time-based batching
- Groups issues by release/milestone
- Tracks throughput over time
- Enables cycle time analysis

### 8.3 Memory Storage Pattern

**Initial Task Creation:**
```markdown
## Task: Implement user authentication

**Priority:** High
**Complexity:** M (4-8 hours)
**Target Cycle Time:** <8 hours

### Description
Implement JWT-based authentication for the API endpoints.

### Acceptance Criteria
- [ ] Users can register with email/password
- [ ] Users can login and receive JWT token
- [ ] Protected endpoints validate JWT
- [ ] Tests cover authentication flow

### SDD Reference
Section 4.3: Authentication & Authorization
```

**Execution Context Comment:**
```markdown
---
### 🤖 Execution Context - Run #12345

**Timestamp:** 2026-02-14T10:30:00Z
**Trigger:** Scheduled
**Branch:** `ai-bot/issue-42-user-auth`

#### Analysis
Analyzed existing codebase. Found Express.js setup with no authentication.
Identified need for:
- JWT library (jsonwebtoken)
- Password hashing (bcrypt)
- Database user model extension
- Middleware for protected routes

#### Decisions Made
1. Use jsonwebtoken library - widely adopted, good security
2. Store JWT secret in environment variable
3. 24-hour token expiration - balances security and UX
4. bcrypt rounds: 10 - standard recommendation

#### Implementation Approach
1. Install dependencies: jsonwebtoken, bcrypt
2. Extend User model with password hash field
3. Create /auth/register endpoint
4. Create /auth/login endpoint
5. Create authMiddleware for route protection
6. Add tests for each endpoint

#### Files to Modify
- `package.json` - add dependencies
- `models/User.js` - add password field
- `routes/auth.js` - new file for auth routes
- `middleware/auth.js` - new JWT validation middleware
- `tests/auth.test.js` - comprehensive tests

#### Next Steps
Proceeding with implementation. Will create PR when complete.

---
```

**Progress Update Comment:**
```markdown
📝 **Update:** PR #123 created: [Implement JWT authentication](link)

- ✅ All acceptance criteria met
- ✅ Tests passing (95% coverage)
- ⏳ Awaiting review
```

**Failure/Retry Comment:**
```markdown
❌ **Execution failed**

**Error:** Linting failed - missing semicolons

**Root Cause:** Generated code didn't follow project style guide

**Lesson Learned:** Must run prettier before committing

**Next Attempt:** Will include formatting step in code generation

See [workflow run](link) for details.
```

### 8.4 Context Loading

When the bot starts working on an issue:

1. **Load Issue Data**
   ```javascript
   const issue = await octokit.issues.get({ issue_number });
   const title = issue.title;
   const description = issue.body;
   const labels = issue.labels;
   ```

2. **Load All Comments**
   ```javascript
   const comments = await octokit.issues.listComments({ issue_number });
   ```

3. **Parse Execution History**
   ```javascript
   const executionRecords = comments
     .filter(c => c.body.includes('🤖 Execution Context'))
     .map(parseExecutionRecord);
   ```

4. **Extract Key Information**
   - Previous approaches tried
   - Decisions made and rationale
   - Errors encountered
   - What worked and what didn't
   - Performance metrics

5. **Build Gemini Context**
   ```javascript
   const context = {
     task: issue.title,
     description: issue.body,
     previousAttempts: executionRecords,
     decisions: extractDecisions(comments),
     failures: extractFailures(comments),
     linkedPRs: extractPRLinks(comments)
   };
   ```

6. **Include in Prompt**
   - Full context provided to Gemini
   - Learns from past attempts
   - Avoids repeating mistakes
   - Builds on previous decisions

### 8.5 State Transitions

Issue lifecycle with status labels:

```
[created] 
    ↓
[status-ready] ← Task ready for bot
    ↓ (bot picks up)
[status-in-progress] ← Bot actively working
    ↓ (PR created)
[status-review] ← Awaiting human review
    ↓ (approved)
[status-done] ← Merged
    ↓
[closed] ← Issue closed
```

Blocked state:
```
[status-in-progress]
    ↓ (error/dependency missing)
[status-blocked] ← Bot can't proceed
    ↓ (issue resolved)
[status-ready] ← Return to queue
```

### 8.6 Benefits of Issue-Based Memory

**For the Bot:**
- No external database needed
- Survives workflow restarts
- Full context always available
- Natural retry mechanism
- Learning from history

**For Developers:**
- Complete transparency
- Audit trail of all decisions
- Can provide feedback via comments
- Easy to debug bot behavior
- Integration with existing workflow

**For Self-Improvement:**
- Rich dataset for analysis
- Pattern recognition across issues
- Success/failure tracking
- Time-series performance data
- A/B testing capability

### 8.6.5 Duplicate Work Prevention

Comprehensive duplicate detection across all bot operations:

#### Issue Creation Duplicates

**Pipeline Investigation Issues:**
```javascript
// CRITICAL: Check BEFORE creating issue
const existing = await findExistingInvestigationIssue({
  workflowName: failure.workflow,
  errorSignature: extractErrorSignature(failure.logs),
  repo: failure.repo
});

if (existing) {
  // Add occurrence to existing issue
  await addOccurrence(existing, failure);
  logger.info(`Duplicate found: #${existing.number}`);
  return; // STOP - don't create duplicate
}

// Only create if no duplicate found
await createInvestigationIssue(failure);
```

**Error Signature Matching:**
- Extract stack trace fingerprint
- Normalize error messages
- Match workflow name + error pattern
- Check within last 7 days
- Account for flaky vs persistent failures

**Roadmap Task Issues:**
```javascript
// Check if task already has issue
const existingIssues = await octokit.issues.listForRepo({
  state: 'open',
  labels: 'ai-bot-task'
});

const duplicate = existingIssues.find(issue => 
  issue.title.includes(taskTitle) ||
  issue.body.includes(taskId)
);

if (duplicate) {
  logger.info(`Task already tracked in #${duplicate.number}`);
  return duplicate;
}
```

#### Work In Progress Duplicates

**WIP Limit Enforcement:**
```javascript
// Before starting new task
const inProgressIssues = await octokit.issues.listForRepo({
  state: 'open',
  labels: 'status-in-progress',
  assignee: 'ai-dev-bot'
});

if (inProgressIssues.length >= MAX_WIP) {
  logger.warn(`WIP limit reached (${MAX_WIP}). Finish current tasks first.`);
  return null; // Don't start new work
}
```

**Configuration:**
```yaml
safety:
  maxWIP: 3  # Maximum concurrent tasks
  maxIssuesPerRun: 1  # Pipeline monitoring limit
  duplicateCheckFirst: true  # Check before analysis
  deduplicationWindow: 7  # Days to check for duplicates
```

#### PR Duplicates

**Branch Name Checking:**
```javascript
// Before creating PR
const existingPRs = await octokit.pulls.list({
  state: 'open',
  head: branchName
});

if (existingPRs.length > 0) {
  logger.info(`PR already exists for ${branchName}: #${existingPRs[0].number}`);
  return existingPRs[0]; // Update existing instead
}
```

**Issue-PR Linking:**
```javascript
// Check if issue already has linked PR
const linkedPRs = await findLinkedPRs(issueNumber);
if (linkedPRs.length > 0 && linkedPRs[0].state === 'open') {
  logger.info(`Issue #${issueNumber} already has PR #${linkedPRs[0].number}`);
  return linkedPRs[0]; // Use existing PR
}
```

#### Safety Mechanisms

**Rate Limit Protection:**
- Check before expensive operations
- Cache duplicate check results
- Batch API calls for efficiency

**Cascade Prevention:**
```javascript
// CRITICAL: Only create ONE issue per monitoring run
if (issuesCreated >= MAX_ISSUES_PER_RUN) {
  logger.warn('Issue creation limit reached');
  return; // STOP creating issues
}
```

**Self-Exclusion:**
```yaml
# Don't monitor the monitoring workflow
pipelineMonitoring:
  excludeWorkflows:
    - 'Monitor GitHub Actions Pipelines'
    - 'dependabot'
```

**Deduplication Metrics:**
- Duplicate detection rate
- Prevented duplicate issues
- Cache hit rate for checks
- False positive rate
- Time saved by deduplication

### 8.7 Issue Query Strategies

**Find Next Task:**
```bash
# Highest priority ready task
gh issue list \
  --label "status-ready" \
  --label "ai-bot-task" \
  --assignee "ai-dev-bot" \
  --sort "priority" \
  --limit 1
```

**Milestone Status:**
```bash
# All issues in current milestone
gh issue list \
  --milestone "v1.2.0" \
  --state all
```

**Throughput Analysis:**
```bash
# Completed issues with cycle time metrics
gh issue list \
  --label "status-done" \
  --label "ai-generated" \
  --state closed \
  --limit 100
```

### 8.8 Scalability Considerations

**Issue Volume:**
- One issue per task (not per execution)
- Comments for execution history
- Close stale issues after 90 days
- Archive to external storage if needed

**API Rate Limits:**
- GitHub API: 5000 requests/hour
- Cache issue data within workflow
- Batch operations where possible
- Use GraphQL for efficient queries

**Search Performance:**
- Use labels for filtering (indexed)
- Milestones for sprint grouping
- Link related issues explicitly
- Project boards for visualization

---

## 9. Security & Safety

### 8.1 Access Control

- **GitHub Personal Access Token (PAT)**
  - Stored as GitHub Secret
  - Scope: `repo`, `workflow`, `write:packages`
  - Rotated every 90 days
  
- **Gemini API Key**
  - Stored as GitHub Secret
  - Environment-specific keys (dev/prod)
  - Rate limiting enforced

### 8.2 Code Safety

- **Pre-Merge Validations**
  - Syntax checking
  - Security vulnerability scanning
  - Dependency audit
  - No hardcoded secrets

- **Protected Operations**
  - Cannot modify workflow files without review
  - Cannot change security configs
  - Cannot update dependencies without testing
  - Cannot merge to production branches without approval

### 8.3 Review Requirements

Mandatory human review for:
- Security-related changes
- Database schema modifications
- API contract changes
- Bot configuration updates
- Dependency major version updates

### 8.4 Rollback Mechanisms

- All changes are atomic (one PR = one logical change)
- Maintain comprehensive git history
- Tag releases for easy rollback
- Store previous configurations

---

## 9. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Goal:** Basic bot infrastructure

- [ ] Set up GitHub Actions workflow
- [ ] Integrate Gemini-CLI
- [ ] Implement basic configuration parser
- [ ] Create Issue Manager module
- [ ] Implement issue creation from roadmap
- [ ] Set up issue labels and templates
- [ ] Basic PR creation
- [ ] Link PRs to issues

**Deliverables:**
- Working GitHub Action
- Successful API integration
- Issue-based task tracking
- First automated PR linked to issue

### Phase 2: Core Features (Weeks 3-5)
**Goal:** Essential automation capabilities

- [ ] SDD and Roadmap parsing
- [ ] Issue context loading and storage
- [ ] Context-aware code generation with issue memory
- [ ] Testing module integration
- [ ] PR review capabilities
- [ ] Automatic issue status updates
- [ ] Issue comment-based memory system
- [ ] Pipeline monitoring and failure detection
- [ ] Automatic investigation issue creation
- [ ] Basic self-configuration

**Deliverables:**
- Roadmap-driven issue generation
- Automated testing
- PR review automation
- Persistent bot memory via issues
- Proactive pipeline failure tracking

### Phase 3: Advanced Features (Weeks 6-8)
**Goal:** Autonomous operations

- [ ] Multi-repository support
- [ ] Advanced PR management (merge automation)
- [ ] Issue-based sprint tracking
- [ ] Comprehensive testing suite
- [ ] Agile workflow integration with issues
- [ ] Performance metrics via issue data
- [ ] Cross-issue dependency tracking
- [ ] Milestone and sprint management

**Deliverables:**
- Full PR lifecycle automation
- Multi-repo orchestration
- Issue-driven sprint management
- Complete execution history in issues

### Phase 4: Self-Improvement (Weeks 9-10)
**Goal:** Learning and optimization

- [ ] Metrics collection from issue history
- [ ] Feedback analysis from issues and PRs
- [ ] Configuration optimization
- [ ] Self-modification via improvement issues
- [ ] Performance dashboards from issue data
- [ ] Issue pattern recognition
- [ ] Automatic retry logic based on issue history

**Deliverables:**
- Self-improving bot
- Comprehensive metrics from issues
- Optimization framework
- Learning from issue execution history

### Phase 5: Refinement (Weeks 11-12)
**Goal:** Production readiness

- [ ] Security hardening
- [ ] Documentation completion
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] User feedback integration

**Deliverables:**
- Production-ready system
- Complete documentation
- Deployment guides

---

## 10. Workflow Definitions

### 10.1 Main Bot Workflow

File: `.github/workflows/ai-dev-bot.yml`

```yaml
name: AI Development Bot

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:
    inputs:
      issue_number:
        description: 'Specific issue number to work on'
        required: false
      repository:
        description: 'Target repository'
        required: false
  pull_request:
    types: [opened, synchronize, reopened]
  issues:
    types: [opened, labeled, edited, assigned]

permissions:
  contents: write
  pull-requests: write
  issues: write
  checks: read

jobs:
  orchestrate:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup Gemini CLI
        run: |
          npm install -g @google/generative-ai
          
      - name: Authenticate GitHub CLI
        env:
          GITHUB_TOKEN: ${{ secrets.BOT_GITHUB_TOKEN }}
        run: |
          echo "$GITHUB_TOKEN" | gh auth login --with-token
          
      - name: Load Configuration
        id: config
        run: |
          node scripts/load-config.js
          
      - name: Find Next Issue
        id: issue
        run: |
          if [ -n "${{ github.event.inputs.issue_number }}" ]; then
            echo "issue_number=${{ github.event.inputs.issue_number }}" >> $GITHUB_OUTPUT
          else
            node scripts/issue-manager.js find-next-task
          fi
          
      - name: Load Issue Context
        id: context
        run: |
          node scripts/issue-manager.js load-context \
            --issue "${{ steps.issue.outputs.issue_number }}"
          
      - name: Update Issue Status
        run: |
          gh issue comment "${{ steps.issue.outputs.issue_number }}" \
            --body "🤖 **Started execution** at $(date)"
          gh issue edit "${{ steps.issue.outputs.issue_number }}" \
            --add-label "status-in-progress" \
            --remove-label "status-ready"
          
      - name: Execute Task
        id: execute
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          node scripts/orchestrator.js execute \
            --issue "${{ steps.issue.outputs.issue_number }}" \
            --context "${{ steps.context.outputs.context_file }}"
            
      - name: Create/Update PR
        if: steps.execute.outputs.has_changes == 'true'
        id: pr
        run: |
          node scripts/pr-manager.js create \
            --branch "${{ steps.execute.outputs.branch }}" \
            --title "${{ steps.execute.outputs.pr_title }}" \
            --issue "${{ steps.issue.outputs.issue_number }}"
            
      - name: Link PR to Issue
        if: steps.execute.outputs.has_changes == 'true'
        run: |
          gh issue comment "${{ steps.issue.outputs.issue_number }}" \
            --body "📝 Created PR #${{ steps.pr.outputs.pr_number }}: ${{ steps.pr.outputs.pr_url }}"
          gh issue edit "${{ steps.issue.outputs.issue_number }}" \
            --add-label "status-review" \
            --remove-label "status-in-progress"
            
      - name: Run Tests
        run: |
          node scripts/testing.js run-all
          
      - name: Log Metrics to Issue
        if: always()
        run: |
          node scripts/issue-manager.js log-execution \
            --issue "${{ steps.issue.outputs.issue_number }}" \
            --execution-id "${{ github.run_id }}" \
            --status "${{ job.status }}"
          
      - name: Handle Failure
        if: failure()
        run: |
          gh issue comment "${{ steps.issue.outputs.issue_number }}" \
            --body "❌ **Execution failed**. See [workflow run](${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }})"
          gh issue edit "${{ steps.issue.outputs.issue_number }}" \
            --add-label "status-blocked" \
            --remove-label "status-in-progress"
```

### 10.2 PR Review Workflow

File: `.github/workflows/pr-review.yml`

```yaml
name: AI PR Reviewer

on:
  pull_request:
    types: [opened, synchronize, ready_for_review]
  pull_request_review:
    types: [submitted]

jobs:
  review:
    runs-on: ubuntu-latest
    if: github.actor != 'ai-dev-bot'
    
    steps:
      - name: Checkout PR
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.head.sha }}
          
      - name: Analyze Changes
        id: analyze
        run: |
          node scripts/context-analyzer.js analyze-pr \
            --pr-number "${{ github.event.pull_request.number }}"
            
      - name: Review with Gemini
        id: review
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
        run: |
          node scripts/pr-manager.js review \
            --pr-number "${{ github.event.pull_request.number }}" \
            --sdd-path "SDD.md"
            
      - name: Post Review
        run: |
          gh pr review "${{ github.event.pull_request.number }}" \
            --comment-body "${{ steps.review.outputs.review_body }}" \
            ${{ steps.review.outputs.review_action }}
```

### 10.3 Auto-Merge Workflow

File: `.github/workflows/auto-merge.yml`

```yaml
name: AI Auto Merge

on:
  pull_request:
    types: [opened, synchronize]
  check_suite:
    types: [completed]
  pull_request_review:
    types: [submitted]

jobs:
  auto-merge:
    runs-on: ubuntu-latest
    if: |
      github.event.pull_request.user.login == 'ai-dev-bot' ||
      contains(github.event.pull_request.labels.*.name, 'auto-merge')
    
    steps:
      - name: Extract Issue Number
        id: extract
        run: |
          ISSUE_NUM=$(gh pr view "${{ github.event.pull_request.number }}" --json body -q '.body' | grep -oP 'Closes #\K\d+')
          echo "issue_number=$ISSUE_NUM" >> $GITHUB_OUTPUT
          
      - name: Check Merge Conditions
        id: check
        run: |
          node scripts/pr-manager.js check-merge-conditions \
            --pr-number "${{ github.event.pull_request.number }}"
            
      - name: Merge PR
        if: steps.check.outputs.can_merge == 'true'
        run: |
          gh pr merge "${{ github.event.pull_request.number }}" \
            --auto --squash \
            --delete-branch
            
      - name: Close Linked Issue
        if: steps.check.outputs.can_merge == 'true' && steps.extract.outputs.issue_number != ''
        run: |
          gh issue comment "${{ steps.extract.outputs.issue_number }}" \
            --body "✅ **Completed and merged** in PR #${{ github.event.pull_request.number }}"
          gh issue close "${{ steps.extract.outputs.issue_number }}" \
            --reason completed
```

### 10.4 Issue-Based Task Generation Workflow

File: `.github/workflows/generate-tasks.yml`

```yaml
name: Generate Tasks from Roadmap

on:
  workflow_dispatch:
  push:
    paths:
      - 'ROADMAP.md'
  schedule:
    - cron: '0 0 * * 1'  # Weekly on Monday

jobs:
  generate-tasks:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Parse Roadmap
        id: parse
        run: |
          node scripts/issue-manager.js parse-roadmap \
            --file ROADMAP.md
            
      - name: Create Issues for Tasks
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.BOT_GITHUB_TOKEN }}
        run: |
          node scripts/issue-manager.js create-tasks \
            --tasks "${{ steps.parse.outputs.tasks_file }}"
            
      - name: Update Sprint Milestone
        run: |
          node scripts/issue-manager.js update-milestone
```

### 10.5 Pipeline Monitoring Workflow

File: `.github/workflows/monitor-pipelines.yml`

```yaml
name: Monitor GitHub Actions Pipelines

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:
  workflow_run:
    workflows: ['*']
    types: [completed]

jobs:
  monitor:
    runs-on: ubuntu-latest
    if: github.event.workflow_run.conclusion == 'failure' || github.event_name != 'workflow_run'
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v6
        
      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: '20'
          
      - name: Scan for Failed Workflows
        id: scan
        env:
          GITHUB_TOKEN: ${{ secrets.GH_API_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          if [ "${{ github.event_name }}" == "workflow_run" ]; then
            # Specific workflow failure
            echo "workflow_run_id=${{ github.event.workflow_run.id }}" >> $GITHUB_OUTPUT
            echo "has_failures=true" >> $GITHUB_OUTPUT
          else
            # Scheduled scan
            node scripts/context-analyzer.js scan-pipelines \
              --lookback-hours 24
          fi
          
      - name: Analyze Failures
        if: steps.scan.outputs.has_failures == 'true'
        id: analyze
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          GITHUB_TOKEN: ${{ secrets.GH_API_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          if [ -n "${{ steps.scan.outputs.workflow_run_id }}" ]; then
            # Analyze specific failure
            node scripts/context-analyzer.js analyze-workflow-failure \
              --run-id "${{ steps.scan.outputs.workflow_run_id }}"
          else
            # Analyze discovered failures
            node scripts/context-analyzer.js analyze-workflow-failures \
              --failures "${{ steps.scan.outputs.failures_file }}"
          fi
          
      - name: Create Investigation Issues
        if: steps.scan.outputs.has_failures == 'true'
        env:
          GITHUB_TOKEN: ${{ secrets.GH_API_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          node scripts/issue-manager.js create-investigation-issues \
            --analysis "${{ steps.analyze.outputs.analysis_file }}" \
            --auto-assign ai-dev-bot
            
      - name: Link to Failed Workflow
        if: github.event_name == 'workflow_run'
        env:
          GITHUB_TOKEN: ${{ secrets.GH_API_TOKEN || secrets.GITHUB_TOKEN }}
        run: |
          if [ -n "${{ steps.create.outputs.issue_number }}" ]; then
            gh issue comment "${{ steps.create.outputs.issue_number }}" \
              --body "🔗 Failed workflow run: ${{ github.event.workflow_run.html_url }}"
          fi
```

---

## 11. Prompt Engineering

### 11.1 Code Generation Prompt Template

```
You are an expert software engineer working on {PROJECT_NAME}.

Context:
- Repository: {REPO_NAME}
- Current Task: {TASK_DESCRIPTION}
- Issue: #{ISSUE_NUMBER}
- Related Files: {FILE_LIST}
- Coding Standards: {STANDARDS_FROM_SDD}

Requirements from SDD:
{RELEVANT_SDD_SECTIONS}

Roadmap Context:
{ROADMAP_POSITION}

Issue History:
{ISSUE_COMMENTS_SUMMARY}

Previous Attempts (if any):
{PREVIOUS_EXECUTION_RECORDS}

Lessons Learned:
{DECISIONS_FROM_PAST_RUNS}

Task:
{SPECIFIC_TASK}

Please provide:
1. Implementation approach
2. Code changes (with file paths)
3. Test cases
4. Documentation updates
5. Memory: Key decisions to store in issue comment

Follow these principles:
- Follow agile best practices
- Write clean, maintainable code
- Include comprehensive tests
- Follow existing patterns in the codebase
- Consider edge cases and error handling
- Learn from previous attempts in issue history

Output format: JSON
{
  "approach": "...",
  "files": [
    {
      "path": "...",
      "action": "create|modify",
      "content": "..."
    }
  ],
  "tests": [...],
  "documentation": [...],
  "memoryNotes": "Key decisions and rationale to store in issue"
}
```

### 11.2 PR Review Prompt Template

```
You are a senior code reviewer for {PROJECT_NAME}.

PR Context:
- Title: {PR_TITLE}
- Author: {PR_AUTHOR}
- Files Changed: {FILES_CHANGED}
- Lines Changed: +{ADDITIONS} -{DELETIONS}

Changes:
{PR_DIFF}

SDD Guidelines:
{RELEVANT_SDD_SECTIONS}

Review Criteria:
1. Code quality and readability
2. Adherence to SDD and conventions
3. Test coverage
4. Security concerns
5. Performance implications
6. Documentation completeness

Provide:
1. Overall assessment (APPROVE | REQUEST_CHANGES | COMMENT)
2. Specific line comments (if any)
3. General feedback
4. Suggestions for improvement

Output format: JSON
{
  "decision": "APPROVE|REQUEST_CHANGES|COMMENT",
  "summary": "...",
  "comments": [
    {
      "file": "...",
      "line": 123,
      "comment": "..."
    }
  ],
  "overallFeedback": "..."
}
```

### 11.3 Pipeline Failure Analysis Prompt Template

```
You are an expert DevOps engineer analyzing CI/CD pipeline failures.

Workflow Context:
- Repository: {REPO_NAME}
- Workflow: {WORKFLOW_NAME}
- Run ID: {RUN_ID}
- Branch: {BRANCH}
- Commit: {COMMIT_SHA}
- Author: {COMMIT_AUTHOR}
- Timestamp: {FAILURE_TIME}

Workflow Logs:
{WORKFLOW_LOGS}

Error Messages:
{ERROR_MESSAGES}

Recent Changes:
{RECENT_COMMITS}

Previous Successful Run:
{LAST_SUCCESS_INFO}

Task:
Analyze the workflow failure and provide:
1. Root cause analysis
2. Likely culprit (code change, dependency, infrastructure)
3. Suggested fix
4. Steps to reproduce
5. Prevention strategies

Consider:
- Is this a new failure or recurring issue?
- Is it related to recent code changes?
- Is it an environmental/infrastructure issue?
- Are dependencies up to date?
- Are there test failures or build errors?

Output format: JSON
{
  "rootCause": "...",
  "failureType": "test|build|deploy|infrastructure",
  "likelyCulprit": "...",
  "confidence": "high|medium|low",
  "suggestedFix": {
    "description": "...",
    "files": [...],
    "approach": "..."
  },
  "stepsToReproduce": [...],
  "preventionStrategy": "...",
  "priority": "critical|high|medium|low",
  "estimatedEffort": "S|M|L"
}
```

### 11.4 Self-Improvement Prompt Template

```
You are analyzing the performance of an AI development bot.

Performance Metrics (Last Sprint):
{METRICS_JSON}

Recent Issues:
{ISSUE_SUMMARY_WITH_OUTCOMES}

Recent PRs:
{PR_SUMMARY}

Human Feedback:
{REVIEW_COMMENTS_SUMMARY}

Issue Patterns:
- Average time per issue: {AVG_TIME}
- Success rate by type: {TYPE_SUCCESS_RATES}
- Common failure reasons: {FAILURE_ANALYSIS}
- Retry patterns: {RETRY_STATS}

Task:
Analyze the performance and suggest configuration improvements.

Consider:
1. What patterns led to successful issue completion?
2. What caused issue failures or blocks?
3. Are there recurring review comments?
4. Is task prioritization optimal?
5. Can prompt templates be improved?
6. Is issue context being used effectively?
7. Should we adjust issue label automation?

Provide:
1. Analysis of strengths and weaknesses
2. Specific configuration changes
3. Prompt template improvements
4. Priority adjustments
5. Issue management optimizations

Output format: JSON
{
  "analysis": "...",
  "configChanges": {
    "path": "...",
    "changes": [...]
  },
  "promptImprovements": [...],
  "issueManagementChanges": [...],
  "reasoning": "..."
}
```

---

## 12. Testing Strategy

### 12.1 Bot Testing Levels

**Unit Tests:**
- Individual module testing
- Mock Gemini API responses
- GitHub API mocking
- Configuration parsing

**Integration Tests:**
- End-to-end workflow simulation
- Real API calls in test environment
- Multi-module interaction
- State management validation

**System Tests:**
- Full bot execution in sandbox repo
- Real PR creation and review
- Merge automation validation
- Self-improvement cycle

### 12.2 Test Repository

Create a dedicated test repository:
- Contains sample SDD and Roadmap
- Has sample code in multiple languages
- Includes intentional issues to fix
- Used for bot validation before production

### 12.3 Quality Gates

All bot changes must pass:
- [ ] 90%+ code coverage
- [ ] Zero security vulnerabilities
- [ ] All integration tests pass
- [ ] Successful test repo execution
- [ ] Performance benchmarks met
- [ ] Manual review by maintainer

---

## 13. Monitoring & Observability

### 13.1 Key Metrics

**Operational:**
- Workflow execution success rate
- Average execution time
- API call counts and latency
- Error rates by type

**Development:**
- PRs created per day/week
- PR merge rate
- Average time to merge
- Code quality scores
- Test coverage trends
- Issues created/closed per sprint
- Issue completion rate
- Average time per issue
- Issue failure/retry count

**Cost:**
- Gemini API token usage
- GitHub Actions minutes
- Storage for artifacts/metrics

### 13.2 Alerting

Triggers:
- Workflow failure rate >10%
- API rate limit approaching
- Merge rate <60% for 3 days
- Critical security vulnerability detected
- Manual review backlog >10 PRs

Notification channels:
- GitHub Issues (auto-created)
- Email alerts
- Slack/Discord webhooks (optional)

### 13.3 Dashboards

Create GitHub Pages dashboard showing:
- Current sprint progress
- Recent PR activity
- Performance trends
- Quality metrics
- System health status

---

## 14. Deployment Strategy

### 14.1 Initial Deployment

1. **Phase Alpha:** Single test repository
   - Limited functionality
   - Manual trigger only
   - Extensive logging
   - Daily review

2. **Phase Beta:** 2-3 selected repositories
   - Core features enabled
   - Scheduled + manual triggers
   - Supervised mode (human approval required)
   - Weekly performance review

3. **Phase Production:** All repositories
   - Full autonomous mode (where configured)
   - All features enabled
   - Standard monitoring
   - Monthly optimization cycles

### 14.2 Rollout Checklist

- [ ] Bot configuration committed
- [ ] Secrets configured (API keys, tokens)
- [ ] Test repository validation passed
- [ ] Documentation complete
- [ ] Team training completed
- [ ] Monitoring dashboards active
- [ ] Rollback plan documented
- [ ] Stakeholder approval obtained

### 14.3 Maintenance

**Weekly:**
- Review bot-created PRs
- Check performance metrics
- Address any alerts
- Update roadmap if needed

**Monthly:**
- Analyze self-improvement data
- Review and merge bot optimization PRs
- Update documentation
- Rotate API keys

**Quarterly:**
- Comprehensive performance review
- Stakeholder feedback session
- Major configuration updates
- Capability enhancements

---

## 15. Risk Management

### 15.1 Identified Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Bot generates buggy code | High | Medium | Comprehensive testing, human review gates |
| API rate limits exceeded | Medium | Low | Rate limiting, caching, fallback strategies |
| Security vulnerability introduced | Critical | Low | Security scanning, mandatory review for sensitive changes |
| Bot becomes too aggressive | Medium | Medium | Configurable limits, kill switch |
| Costs spiral out of control | Medium | Low | Token budget limits, monitoring alerts |
| Bot conflicts with human developers | Low | Medium | Clear communication, supervised mode option |
| Configuration drift across repos | Low | Medium | Centralized config management, validation |

### 15.2 Contingency Plans

**Kill Switch:**
- Disable all bot workflows via GitHub Action disable
- Environment variable to halt execution
- Protection against runaway automation

**Emergency Rollback:**
- Revert to last known good configuration
- Disable auto-merge across all repos
- Manual review mode until issue resolved

**Support Escalation:**
- Critical issues: Immediate notification to owner
- High priority: Alert within 1 hour
- Medium priority: Daily summary
- Low priority: Weekly report

---

## 16. Success Criteria

### 16.1 MVP Success Metrics

After Phase 3 (week 8):
- [ ] Bot successfully creates PRs in 3+ repositories
- [ ] 70%+ PR merge rate
- [ ] <8 hour average cycle time
- [ ] Zero security incidents
- [ ] <5 average review comments per PR
- [ ] 80%+ code coverage on generated code
- [ ] Follows roadmap priorities correctly
- [ ] Multiple daily deployments

### 16.2 Production Success Metrics

After Phase 5 (week 12):
- [ ] 85%+ PR merge rate
- [ ] <8 hour average cycle time (issue → merge)
- [ ] <30 min lead time (commit → deploy)
- [ ] 90%+ test coverage
- [ ] Positive team feedback
- [ ] 5+ deployments per day
- [ ] <5% change failure rate
- [ ] Active self-improvement cycles

### 16.3 Long-term Goals

Within 6 months:
- Bot handles 40%+ of routine development tasks
- Human developers focus on complex features
- Consistent code quality across all repos
- Continuous delivery of value (multiple deploys/day)
- Mean cycle time <4 hours
- Change failure rate <3%
- Team throughput increase of 25%+

---

## 17. Documentation Requirements

### 17.1 Required Documentation

**For Users:**
- Quick start guide
- Configuration reference
- Troubleshooting guide
- FAQ

**For Developers:**
- Architecture overview (this document)
- API documentation
- Module interfaces
- Contributing guidelines

**For Operations:**
- Deployment guide
- Monitoring guide
- Runbook for common issues
- Security procedures

### 17.2 SDD Maintenance

This SDD is a living document:
- Updated quarterly or when major changes occur
- Version controlled in the bot repository
- Changes require review and approval
- Bot itself can propose updates

---

## 18. Future Enhancements

### 18.1 Planned Features (Post-MVP)

- **Multi-Repo Coordination:** Coordinated changes across dependent repos
- **Advanced Learning:** More sophisticated ML-based improvement
- **Natural Language Issues:** Convert issue descriptions directly to code
- **Deployment Automation:** Deploy changes to staging/production
- **Documentation Generation:** Auto-generate API docs and guides
- **Dependency Management:** Proactive security updates and upgrades
- **Code Refactoring:** Identify and refactor technical debt
- **Performance Optimization:** Analyze and optimize application performance

### 18.2 Research Areas

- Integration with other AI models (Claude, GPT-4)
- Visual regression testing for frontend changes
- AI-powered code review training for human developers
- Predictive roadmap planning based on velocity
- Cross-organization learning (privacy-preserving)

---

## 19. Compliance & Ethics

### 19.1 Code Ownership

- All bot-generated code is owned by the repository owner
- Bot commits are attributed to a dedicated GitHub account
- License compliance checked before using external code
- Attribution maintained for AI-assisted code

### 19.2 Data Privacy

- No sensitive data sent to Gemini API
- PII automatically redacted from context
- Secrets detected and excluded
- Compliance with GDPR/CCPA as applicable

### 19.3 Responsible AI Use

- Bot actions are transparent and auditable
- Human oversight maintained for critical decisions
- Opt-out capability for any repository
- Clear indication of AI-generated content
- Bias monitoring and mitigation

---

## 20. Glossary

- **AI-Dev-Bot:** The autonomous AI development bot system
- **Gemini-CLI:** Command-line interface for Google's Gemini AI
- **SDD:** Software Design Document (this document)
- **Roadmap:** Project roadmap defining features and priorities
- **PR:** Pull Request in GitHub
- **CI/CD:** Continuous Integration/Continuous Deployment
- **Cycle Time:** Time from task start to deployment (key metric)
- **Lead Time:** Time from commit to production (key metric)
- **Batch Size:** Size of change (small is better for CD)
- **WIP:** Work In Progress (limit for flow efficiency)
- **Orchestrator:** Central coordination module of the bot
- **Context Analyzer:** Module that understands repository state
- **Self-Improvement:** Bot's capability to optimize itself
- **Self-Healing:** Bot's ability to automatically recover from failures
- **Circuit Breaker:** Safety pattern that blocks requests during outages
- **Graceful Degradation:** Continuing with reduced functionality during failures
- **Rate Limiting:** Controlling API call frequency to stay within limits
- **Cost Optimization:** Strategies to minimize API usage and costs
- **Duplicate Prevention:** Systems to avoid creating duplicate issues or work
- **Issue Manager:** Module managing GitHub Issues for task tracking and memory
- **Bot Memory:** Persistent state stored in GitHub Issue comments
- **Task Issue:** GitHub Issue representing a single development task
- **Issue Context:** Historical information and decisions stored in issue comments
- **Investigation Issue:** Auto-created issue for pipeline failure analysis
- **Error Signature:** Fingerprint of error for duplicate detection
- **Milestone:** GitHub Milestone for time-based grouping (optional)
- **CLOSED State:** Circuit breaker normal operation state
- **OPEN State:** Circuit breaker failure state (blocks requests)
- **HALF_OPEN State:** Circuit breaker testing recovery state
- **TTR:** Time To Recovery (self-healing metric)
- **Cache Hit Rate:** Percentage of requests served from cache

---

## 21. Appendices

### Appendix A: Sample Roadmap Format

```markdown
# Project Roadmap

## High Priority (Deploy Continuously)
- [ ] User Authentication (M) - @ai-dev-bot
- [ ] Database Schema (M) - @developer
- [ ] API Foundation (M) - @ai-dev-bot

## Medium Priority (Next in Queue)
- [ ] User Profile Management (M)
- [ ] Password Reset Flow (S)
- [ ] Email Integration (S)

# Complexity: S (<2hr), M (2-8hr), L (8-24hr, consider splitting)
```

### Appendix B: Sample Issue Templates

#### Task Issue Template

```markdown
## Task: {TASK_NAME}

**From Roadmap:** Continuous delivery backlog
**Priority:** High/Medium/Low
**Complexity:** S/M/L
**Type:** Feature/Bugfix/Refactor/Docs

### Description
{DETAILED_TASK_DESCRIPTION_FROM_ROADMAP}

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests pass with >80% coverage
- [ ] Documentation updated

### Technical Notes
{TECHNICAL_DETAILS_FROM_SDD}

### Dependencies
- Depends on: #{ISSUE_NUMBER}
- Blocks: #{ISSUE_NUMBER}

### SDD Reference
Section {X.Y}: {SECTION_NAME}

---
🤖 This issue was auto-generated by AI-Dev-Bot from ROADMAP.md
```

#### Pipeline Investigation Issue Template

```markdown
## 🔥 Pipeline Failure Investigation

**Workflow:** {WORKFLOW_NAME}
**Run:** [#{RUN_ID}]({RUN_URL})
**Branch:** {BRANCH}
**Failed At:** {TIMESTAMP}
**Duration:** {DURATION}

### Failure Summary
{GEMINI_ANALYSIS_SUMMARY}

### Root Cause Analysis
{ROOT_CAUSE}

**Confidence:** {CONFIDENCE}
**Failure Type:** {TYPE}
**Priority:** {PRIORITY}
**Target Cycle Time:** <2 hours (fast feedback!)

### Error Messages
```
{ERROR_MESSAGES}
```

### Recent Changes
- Commit: {COMMIT_SHA} by {AUTHOR}
- Message: {COMMIT_MESSAGE}
- Files changed: {FILE_COUNT}

### Suggested Fix
{SUGGESTED_FIX_DESCRIPTION}

**Estimated Effort:** {EFFORT} (S/M/L)

### Steps to Reproduce
1. {STEP_1}
2. {STEP_2}
3. ...

### Prevention Strategy
{PREVENTION_STRATEGY}

### Related Workflows
- Last successful run: [#{LAST_SUCCESS_ID}]({LAST_SUCCESS_URL})
- Previous failures: {COUNT} in last 7 days

---
🤖 This investigation issue was auto-generated by AI-Dev-Bot from pipeline monitoring
```

#### Bot Memory Comment Template

```markdown
---
### 💾 Execution Context - Run #{RUN_ID}

**Timestamp:** {ISO_DATETIME}
**Trigger:** Scheduled/Manual/Issue Update
**Branch:** `{BRANCH_NAME}`

#### Analysis
{GEMINI_ANALYSIS_SUMMARY}

#### Decisions Made
1. {DECISION_1} - Rationale: {WHY}
2. {DECISION_2} - Rationale: {WHY}

#### Implementation Approach
{APPROACH_DESCRIPTION}

#### Files Modified
- `{FILE_PATH}` - {CHANGE_DESCRIPTION}
- `{FILE_PATH}` - {CHANGE_DESCRIPTION}

#### Challenges/Blockers
{ISSUES_ENCOUNTERED}

#### Next Steps
{WHAT_REMAINS}

---
```

### Appendix C: Sample PR Template

```markdown
## Description
[AI-Generated] Implementation of {FEATURE} as specified in roadmap.

Closes #{ISSUE_NUMBER}

## Related Items
- Roadmap: Task: {TASK_NAME}
- SDD Reference: Section {X.Y}
- Issue: #{ISSUE_NUMBER}
- Cycle Time: {TIME} (target: <8hr)

## Changes
- {SUMMARY_OF_CHANGES}

## Implementation Details
{KEY_DECISIONS_FROM_ISSUE_CONTEXT}

## Testing
- [x] Unit tests added/updated
- [x] Integration tests passed
- [x] Test coverage: {PERCENTAGE}%
- [ ] Manual testing required

## Checklist
- [x] Code follows style guidelines
- [x] Documentation updated
- [x] No breaking changes
- [x] Dependencies updated
- [x] Issue context reviewed

## AI Generation Notes
- Model: gemini-3-flash-preview
- Issue: #{ISSUE_NUMBER}
- Context: {SUMMARY_OF_LOADED_CONTEXT}
- Confidence: High

## Bot Execution History
See full context in issue #{ISSUE_NUMBER}
```

### Appendix D: Configuration Schema

See Section 5 for full configuration examples.

### Appendix E: Issue Label Taxonomy

**Priority Labels:**
- `priority-critical` - Blocking issue, highest priority
- `priority-high` - Important, work on soon
- `priority-medium` - Normal priority
- `priority-low` - Nice to have

**Status Labels:**
- `status-ready` - Ready for bot to pick up
- `status-in-progress` - Currently being worked on
- `status-blocked` - Blocked by external factor
- `status-review` - PR created, awaiting review
- `status-done` - Completed and merged

**Type Labels:**
- `type-feature` - New feature implementation
- `type-bugfix` - Bug fix
- `type-refactor` - Code refactoring
- `type-docs` - Documentation update
- `type-test` - Test improvements
- `type-config` - Configuration change
- `type-investigate` - Pipeline failure investigation
- `type-ci-cd` - CI/CD pipeline related

**Complexity Labels:**
- `complexity-S`, `complexity-M`, `complexity-L` - Task size (time estimate)

**Bot Labels:**
- `ai-generated` - Created by AI-Dev-Bot
- `ai-bot-task` - Task for the bot
- `bot-memory` - Issue used for memory storage
- `pipeline-failure` - Auto-created from workflow failure
- `automated-investigation` - Automated issue creation

### Appendix F: API Reference

Bot modules expose the following interfaces:

```typescript
// Orchestrator
interface Orchestrator {
  determineTask(): Task;
  executeTask(task: Task): ExecutionResult;
  handleEvent(event: GitHubEvent): void;
}

// Context Analyzer
interface ContextAnalyzer {
  parseSDD(path: string): SDDDocument;
  parseRoadmap(path: string): Roadmap;
  analyzeCodebase(): CodebaseContext;
  loadIssueContext(issueNumber: number): IssueContext;
}

// Code Generator
interface CodeGenerator {
  generate(task: Task, context: Context): CodeChanges;
  validate(changes: CodeChanges): ValidationResult;
}

// PR Manager
interface PRManager {
  create(changes: CodeChanges, issueNumber?: number): PullRequest;
  review(pr: PullRequest): ReviewResult;
  merge(pr: PullRequest): MergeResult;
  linkToIssue(prNumber: number, issueNumber: number): void;
}

// Issue Manager
interface IssueManager {
  createTask(task: RoadmapTask): Issue;
  findNextTask(filters: TaskFilters): Issue;
  loadContext(issueNumber: number): IssueContext;
  updateStatus(issueNumber: number, status: string): void;
  addComment(issueNumber: number, comment: string): void;
  closeIssue(issueNumber: number, reason: string): void;
  parseRoadmap(roadmapPath: string): RoadmapTask[];
  linkPR(issueNumber: number, prNumber: number): void;
  getExecutionHistory(issueNumber: number): ExecutionRecord[];
  getCycleTime(issueNumber: number): number;  // Time from open to closed
  getThroughput(timeWindow: string): number;  // Issues completed per period
  
  // Pipeline monitoring with safety controls
  createInvestigationIssues(analysesFile: string): Promise<number>;  // Returns count created (max 1)
  findExistingInvestigationIssue(workflowName: string, errorSignature: string, owner: string, repo: string): Promise<Issue | null>;
  checkDuplicateInvestigation(workflowName: string, errorSignature: string): Issue | null;
}

// Context Analyzer (Extended)
interface ContextAnalyzer {
  // ... existing methods ...
  scanPipelines(lookbackHours: number): WorkflowFailure[];
  analyzeWorkflowFailure(runId: string): FailureAnalysis;
  getWorkflowLogs(runId: string): string;
  extractErrorMessages(logs: string): string[];
}

interface IssueContext {
  issue: Issue;
  description: string;
  comments: Comment[];
  executionHistory: ExecutionRecord[];
  linkedPRs: PullRequest[];
  dependencies: Issue[];
}
```

---

## Document Control

**Version History:**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-14 | Initial | Initial SDD creation |

**Approval:**

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | TBD | | |
| Tech Lead | TBD | | |
| Security Review | TBD | | |

**Next Review Date:** 2026-05-14

---

*This Software Design Document is maintained in version control and follows the same review process as code changes. The AI-Dev-Bot itself may propose updates to this document as it learns and evolves.*
