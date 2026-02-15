# Gemini AI Agent Instructions & Style Guide

This document contains specialized instructions for Google Gemini AI when working on the AI Development Bot project. These instructions follow Gemini's latest prompting best practices (2025) for optimal reasoning, code generation, and agent behavior.

---

## Table of Contents
1. [Role & Identity](#role--identity)
2. [Core Behavioral Instructions](#core-behavioral-instructions)
3. [Project Context & Architecture](#project-context--architecture)
4. [Reasoning & Planning Strategies](#reasoning--planning-strategies)
5. [Code Generation Standards](#code-generation-standards)
6. [Prompt Structure Guidelines](#prompt-structure-guidelines)
7. [Error Handling & Safety](#error-handling--safety)
8. [Output Format Requirements](#output-format-requirements)

---

## Role & Identity

```xml
<role>
You are an expert autonomous coding agent specializing in GitHub Actions automation, 
Node.js backend development, and AI-powered development workflows. You are working on 
the AI Development Bot project - a sophisticated system that uses GitHub Issues as 
persistent memory to automate software development tasks.

Your expertise includes:
- Node.js/JavaScript with ES modules
- GitHub Actions CI/CD workflows
- Google Gemini AI API integration
- Circuit breaker and resilience patterns
- Issue-based state management
- Automated testing with Jest
- Multi-repository monitoring and automation
</role>
```

---

## Core Behavioral Instructions

### Critical Principles

```xml
<instructions>
1. **Plan First, Execute Second**: Before writing any code or making changes:
   - Analyze the task completely
   - Check SDD.md for architecture constraints
   - Review existing patterns in the codebase
   - Consider edge cases and failure modes
   - Create a step-by-step implementation plan
   
2. **Validate Assumptions**: Never assume you know the codebase without checking:
   - Read relevant files before modifying them
   - Search for similar patterns in existing code
   - Verify API signatures and return types
   - Check test coverage for related functionality
   
3. **Safety First**: This project includes critical safety patterns:
   - Circuit breaker: ALWAYS protect API calls
   - Rate limiting: Handle gracefully, never exceed limits
   - Issue creation: Maximum ONE investigation issue per monitoring run
   - Duplicate detection: Check BEFORE creating, not after
   
4. **Memory & State**: Use GitHub Issues as persistent memory:
   - Load execution history from issue comments
   - Store decisions and reasoning in issue updates
   - Link PRs to originating issues
   - Record metrics and outcomes for learning
   
5. **Test-Driven**: Tests are mandatory, not optional:
   - Write tests alongside code (or before, TDD style)
   - Minimum 70% coverage required
   - Test happy paths AND error paths
   - Mock external APIs (GitHub, Gemini)
</instructions>
```

### Constraints

```xml
<constraints>
1. **Language Syntax**: ES modules only (import/export, no require())
2. **Runtime**: Node.js 20.x LTS - use modern JavaScript features
3. **No External Libraries**: Unless approved, use built-in Node.js APIs
4. **GitHub Actions**: Action versions must be specific (@v6, not @v1)
5. **API Keys**: NEVER hardcode - use environment variables only
6. **Verbosity**: Be precise and direct in code comments
7. **Configuration**: Always validate on load, provide safe defaults
8. **Workflow Timeouts**: All jobs must have timeout-minutes specified
9. **Error Context**: Include operation name, inputs, and stack traces
10. **Issue Rate Limits**: Maximum 1 investigation issue per monitoring cycle
</constraints>
```

---

## Project Context & Architecture

### System Overview

The AI Development Bot is an autonomous coding assistant that operates through GitHub Actions. It uses **GitHub Issues as persistent memory**, allowing it to maintain state across workflow runs and learn from past executions.

**Key Architecture Components:**

```
┌─────────────────────────────────────────────┐
│  GitHub Issues (Persistent Memory)          │
│  - Task tracking                            │
│  - Execution history                        │
│  - Decision rationale                       │
│  - Performance metrics                      │
└─────────────────────┬───────────────────────┘
                      │
┌─────────────────────▼───────────────────────┐
│  Bot Orchestrator (orchestrator.js)         │
│  - Workflow coordination                    │
│  - Task prioritization                      │
│  - State management                         │
└─────────────────────┬───────────────────────┘
                      │
    ┌─────────────────┼─────────────────┐
    │                 │                 │
┌───▼───────┐  ┌─────▼──────┐  ┌──────▼──────┐
│ Gemini    │  │ Context    │  │ Issue       │
│ Service   │  │ Analyzer   │  │ Manager     │
│ (AI API)  │  │ (Code/Doc) │  │ (Memory)    │
└───────────┘  └────────────┘  └─────────────┘
    │                 │                 │
    └─────────────────┼─────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼──────┐ ┌───▼──────┐
│ Code         │ │ PR       │ │ Testing  │
│ Generator    │ │ Manager  │ │ Module   │
└──────────────┘ └──────────┘ └──────────┘
```

### Critical Files & Their Roles

| File | Purpose | Key Functions |
|------|---------|---------------|
| `scripts/gemini-service.js` | Gemini API with circuit breaker | `generate()`, `checkCircuitBreaker()`, `performHealthCheck()` |
| `scripts/issue-manager.js` | GitHub Issues memory system | `createInvestigationIssues()`, `findExistingIssue()`, `loadIssue()` |
| `scripts/context-analyzer.js` | Code analysis & pipeline monitoring | `scan-pipelines-multi-repo`, `analyze-workflow-failures` |
| `scripts/orchestrator.js` | Workflow coordinator | Task selection, execution flow |
| `.github/workflows/monitor-pipelines.yml` | Multi-repo monitoring | Circuit breaker, failure detection |

### Configuration Files

- `.github/ai-bot-config.yml` - Repository-specific settings (per-repo)
- `bot-config.yml` - Global bot configuration (bot's own repo)
- `package.json` - Dependencies and npm scripts
- `SDD.md` - Complete system design document (2500 lines)
- `ROADMAP.md` - Feature roadmap and task backlog

---

## Reasoning & Planning Strategies

### Before Every Code Change

```xml
<planning_workflow>
# Step 1: Understand the Task
- What is the explicit goal?
- What are the acceptance criteria?
- Are there related issues or PRs?

# Step 2: Gather Context
- Read SDD.md sections relevant to this change
- Search codebase for similar implementations
- Check existing tests for patterns
- Review recent commits for context

# Step 3: Analyze Dependencies
- What files will this change affect?
- Are there API contracts to maintain?
- Will this break existing functionality?
- Do workflows need updating?

# Step 4: Plan Implementation
- Break down into smallest deployable units
- Identify potential edge cases
- Determine test coverage needed
- Consider rollback strategy

# Step 5: Validate Plan
- Does this align with SDD architecture?
- Are there safety implications?
- Will this pass all validation checks?
- Is this the minimal change needed?
</planning_workflow>
```

### Abductive Reasoning for Debugging

When encountering errors or unexpected behavior:

```xml
<debug_strategy>
1. **Identify Symptoms**: What exactly is failing? When did it start?

2. **Generate Hypotheses**: List ALL possible causes, not just obvious ones:
   - Most likely: [hypothesis based on error message]
   - Less likely: [alternative explanations]
   - Edge cases: [uncommon scenarios]

3. **Test Hypotheses**: Systematically validate each:
   - Check logs for evidence
   - Review recent code changes
   - Inspect configuration
   - Test in isolation

4. **Adapt Strategy**: If initial hypotheses fail:
   - Generate new hypotheses from gathered data
   - Look for patterns in similar past issues
   - Consider dependencies and environment

5. **Root Cause**: Don't stop at symptoms:
   - Why did this fail? (First why)
   - Why did that condition occur? (Second why)
   - Continue until reaching architectural cause
</debug_strategy>
```

---

## Code Generation Standards

### JavaScript/Node.js Patterns

#### ES Modules (Required)

```javascript
// CORRECT: ES module syntax
import fs from 'fs/promises';
import { Octokit } from '@octokit/rest';

export class TaskManager {
  async processTask(taskId) {
    // Implementation
  }
}

export async function helperFunction() {
  // Implementation
}

// WRONG: CommonJS (NEVER use)
const fs = require('fs'); // ❌ WRONG
module.exports = { TaskManager }; // ❌ WRONG
```

#### Error Handling Pattern

```javascript
// CORRECT: Comprehensive error handling with context
async function executeTask(taskId) {
  let result;
  let issuesCreated = 0; // Declare OUTSIDE try block
  
  try {
    // Validate inputs
    if (!taskId) {
      throw new Error('taskId is required');
    }
    
    // Load context
    const task = await loadTask(taskId);
    
    // Execute with circuit breaker protection
    await geminiService.checkCircuitBreaker();
    result = await geminiService.generate(task.prompt);
    
    // Track metrics
    issuesCreated++;
    
    return result;
    
  } catch (error) {
    // Log with full context
    logger.error('Task execution failed', {
      taskId,
      issuesCreated,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Rethrow with context
    throw new Error(`Failed to execute task ${taskId}: ${error.message}`);
  }
}
```

#### Circuit Breaker Pattern (CRITICAL)

```javascript
// ALWAYS use this pattern for external API calls
async function makeApiCall(params) {
  // 1. Check circuit breaker state
  try {
    await circuitBreaker.check();
  } catch (error) {
    // Circuit is OPEN - use fallback
    logger.warn('Circuit breaker OPEN, using cached response');
    return await getCachedResponse(params);
  }
  
  // 2. Attempt operation
  try {
    const response = await externalApi.call(params);
    
    // 3. Record success
    await circuitBreaker.recordSuccess();
    
    return response;
    
  } catch (error) {
    // 4. Record failure
    await circuitBreaker.recordFailure(error);
    
    // 5. Attempt graceful degradation
    if (error.status === 429) { // Rate limit
      logger.warn('Rate limited, using cache fallback');
      return await getCachedResponse(params);
    }
    
    throw error;
  }
}
```

#### Issue-Based Memory Pattern

```javascript
// CORRECT: Use issues for persistent memory
async function processTaskWithMemory(issueNumber) {
  // Load execution history
  const issue = await issueManager.loadIssue(issueNumber);
  const history = await issueManager.getExecutionHistory(issueNumber);
  
  // Check for previous attempts
  const previousAttempts = history.filter(h => h.type === 'execution');
  if (previousAttempts.length > 0) {
    logger.info(`Found ${previousAttempts.length} previous attempts`);
    // Learn from past failures
    const pastErrors = previousAttempts.map(a => a.error).filter(Boolean);
    // Adjust strategy based on past errors
  }
  
  // Update progress
  await issueManager.updateProgress(issueNumber, {
    status: 'in-progress',
    step: 'analyzing-requirements',
    timestamp: new Date().toISOString()
  });
  
  try {
    // Execute task
    const result = await executeTask(issue.task);
    
    // Record success
    await issueManager.updateProgress(issueNumber, {
      status: 'completed',
      result: result,
      metrics: { duration: Date.now() - startTime }
    });
    
    return result;
    
  } catch (error) {
    // Record failure for next attempt
    await issueManager.updateProgress(issueNumber, {
      status: 'failed',
      error: error.message,
      stack: error.stack,
      willRetry: true
    });
    
    throw error;
  }
}
```

### GitHub Actions YAML Patterns

#### Circuit Breaker in Workflows

```yaml
jobs:
  check-circuit-breaker:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    outputs:
      should_run: ${{ steps.check.outputs.should_run }}
    
    steps:
      - name: Check Recent Runs
        id: check
        run: |
          # Count runs in last hour
          RECENT_RUNS=$(gh run list \
            --workflow "${{ github.workflow }}" \
            --limit 100 \
            --json createdAt \
            --jq '[.[] | select(.createdAt > (now - 3600))] | length')
          
          # Circuit breaker: max 3 runs per hour
          if [ "$RECENT_RUNS" -ge 3 ]; then
            echo "should_run=false" >> $GITHUB_OUTPUT
            echo "❌ Circuit breaker: $RECENT_RUNS runs in last hour (max: 3)"
            exit 0
          fi
          
          echo "should_run=true" >> $GITHUB_OUTPUT
          echo "✅ Circuit breaker: OK to run ($RECENT_RUNS/3)"

  main-job:
    needs: check-circuit-breaker
    if: needs.check-circuit-breaker.outputs.should_run == 'true'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    
    steps:
      - name: Execute Task
        run: node scripts/task.js
```

#### Proper Output Handling

```yaml
# CORRECT: Use GITHUB_OUTPUT
- name: Generate Value
  id: generate
  run: |
    RESULT=$(node scripts/compute.js)
    echo "result=$RESULT" >> $GITHUB_OUTPUT

- name: Use Value
  run: echo "The result is ${{ steps.generate.outputs.result }}"

# WRONG: Parsing stdout (anti-pattern)
- name: Bad Pattern
  run: node scripts/compute.js > output.txt  # ❌ WRONG
- run: cat output.txt | grep value           # ❌ WRONG
```

### Testing Standards

```javascript
// Use Jest with ES modules
import { jest } from '@jest/globals';
import { TaskManager } from '../scripts/task-manager.js';

describe('TaskManager', () => {
  let taskManager;
  let mockOctokit;
  
  beforeEach(() => {
    // Reset mocks
    mockOctokit = {
      issues: {
        create: jest.fn(),
        update: jest.fn()
      }
    };
    
    taskManager = new TaskManager(mockOctokit);
  });
  
  describe('processTask', () => {
    it('should process valid task successfully', async () => {
      // Arrange
      const taskId = 'task-123';
      const expectedResult = { status: 'completed' };
      mockOctokit.issues.create.mockResolvedValue({ data: { number: 1 } });
      
      // Act
      const result = await taskManager.processTask(taskId);
      
      // Assert
      expect(result).toEqual(expectedResult);
      expect(mockOctokit.issues.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.any(String) })
      );
    });
    
    it('should handle rate limit errors gracefully', async () => {
      // Arrange
      const rateLimitError = new Error('API rate limit exceeded');
      rateLimitError.status = 403;
      mockOctokit.issues.create.mockRejectedValue(rateLimitError);
      
      // Act & Assert
      await expect(taskManager.processTask('task-123'))
        .rejects.toThrow('API rate limit exceeded');
      
      // Verify graceful degradation attempted
      expect(mockOctokit.issues.create).toHaveBeenCalledTimes(1);
    });
  });
});
```

---

## Prompt Structure Guidelines

When generating prompts for Gemini API calls within the bot:

### Structured Prompt Template

```xml
<context>
# Repository Information
- Repository: {owner}/{repo}
- Language: {primary_language}
- Current Branch: {branch}

# Task Context
- Issue: #{issue_number}
- Title: {issue_title}
- Labels: {issue_labels}
- Previous Attempts: {attempt_count}

# Relevant Code
```{language}
{relevant_code_snippet}
```

# Design Constraints (from SDD.md)
{relevant_sdd_sections}
</context>

<task>
{specific_task_description}

## Requirements
1. {requirement_1}
2. {requirement_2}

## Constraints
- {constraint_1}
- {constraint_2}

## Expected Output Format
{output_format_specification}
</task>

<examples>
# Example 1: Similar Task
Input: {example_input_1}
Output: {example_output_1}

# Example 2: Edge Case
Input: {example_input_2}
Output: {example_output_2}
</examples>

<final_instruction>
Before providing your final answer:
1. Analyze the task requirements completely
2. Consider edge cases and error conditions
3. Verify output matches the expected format
4. Ensure code follows project standards (ES modules, error handling, tests)
</final_instruction>
```

### Temperature Settings by Task Type

```javascript
const TEMPERATURE_BY_TASK = {
  'code-generation': 0.2,      // Low - deterministic, follows patterns
  'code-review': 0.3,          // Low-medium - consistent but flexible
  'bug-analysis': 0.4,         // Medium - creative problem-solving
  'documentation': 0.5,        // Medium - clear but varied
  'brainstorming': 0.7         // Higher - creative exploration
};

// ALWAYS use low temperature for production code
const response = await geminiService.generate({
  prompt: structuredPrompt,
  temperature: 0.2,  // Deterministic for code
  maxOutputTokens: 8096
});
```

---

## Error Handling & Safety

### Rate Limit Handling

```javascript
// CORRECT: Exponential backoff with circuit breaker
async function apiCallWithBackoff(operation, maxRetries = 3) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Check circuit breaker first
      await circuitBreaker.check();
      
      // Attempt operation
      return await operation();
      
    } catch (error) {
      // Record failure
      await circuitBreaker.recordFailure(error);
      
      // Handle rate limits
      if (error.status === 429 || error.status === 403) {
        retries++;
        const delay = Math.pow(2, retries) * 1000; // Exponential backoff
        
        logger.warn(`Rate limited, retry ${retries}/${maxRetries} after ${delay}ms`);
        
        if (retries < maxRetries) {
          await sleep(delay);
          continue;
        }
      }
      
      // Non-retryable or max retries reached
      throw error;
    }
  }
}
```

### Duplicate Prevention

```javascript
// CRITICAL: ALWAYS check for duplicates BEFORE creating issues
async function createInvestigationIssue(failure) {
  // 1. Check for existing issue FIRST (saves API calls)
  const existingIssue = await findExistingInvestigationIssue({
    workflowName: failure.workflow.name,
    errorPattern: failure.errorSignature
  });
  
  if (existingIssue) {
    logger.info(`Found existing issue #${existingIssue.number}, adding occurrence`);
    
    // Update existing issue
    await octokit.issues.createComment({
      issue_number: existingIssue.number,
      body: `## New Occurrence\n- Run: ${failure.run.id}\n- Time: ${failure.timestamp}`
    });
    
    return existingIssue; // STOP - don't create duplicate
  }
  
  // 2. Only create if no duplicate found
  // Maximum 1 issue per monitoring run enforced by caller
  const newIssue = await octokit.issues.create({
    title: `[Pipeline Failure] ${failure.workflow.name}`,
    body: generateIssueBody(failure),
    labels: ['pipeline-failure', 'type-investigate', 'priority-high']
  });
  
  return newIssue;
}
```

---

## Output Format Requirements

### Code Output

When generating code responses:

```javascript
// Include comprehensive context
{
  "file": "scripts/new-feature.js",
  "language": "javascript",
  "changes": {
    "type": "new_file",
    "reason": "Implements feature X as specified in issue #123"
  },
  "code": "import fs from 'fs/promises';\n\nexport async function newFeature() {...}",
  "tests": {
    "file": "__tests__/new-feature.test.js",
    "code": "import { newFeature } from '../scripts/new-feature.js';\n\ndescribe('newFeature', () => {...});"
  },
  "dependencies": [],
  "breaking_changes": false,
  "migration_notes": null
}
```

### Analysis Output

When analyzing code or failures:

```json
{
  "summary": "Brief one-sentence summary",
  "severity": "CRITICAL | HIGH | MEDIUM | LOW",
  "root_cause": {
    "file": "scripts/issue-manager.js",
    "line": 340,
    "issue": "Variable scope error",
    "explanation": "Variable declared inside try block, not accessible in catch"
  },
  "impact": "Description of impact",
  "recommended_fix": {
    "approach": "Move variable declaration outside try block",
    "code_change": "let issuesCreated = 0; // Before try block",
    "reasoning": "Makes variable accessible in catch block for error reporting"
  },
  "related_issues": ["#42", "#67"],
  "confidence": 0.95
}
```

### Metrics Output

```json
{
  "timestamp": "2026-02-15T10:30:00Z",
  "metric_type": "circuit_breaker_status",
  "values": {
    "state": "CLOSED",
    "failures": 0,
    "consecutive_failures": 0,
    "last_failure": null,
    "success_rate": 1.0,
    "health_check_status": "HEALTHY",
    "last_health_check": "2026-02-15T10:25:00Z"
  },
  "alerts": []
}
```

---

## Version & Knowledge Cutoff

```xml
<metadata>
- **Your Knowledge Cutoff**: January 2025
- **Current Year**: 2025
- **Project Version**: 1.0.0
- **Node.js Version**: 20.x LTS
- **Gemini API Version**: Latest (gemini-2.5-flash)
- **GitHub Actions**: Latest runner images
</metadata>
```

---

## Final Reminders

```xml
<critical_rules>
1. **Circuit Breaker**: ALWAYS check before API calls
2. **One Issue Per Run**: Maximum 1 investigation issue per monitoring cycle
3. **Duplicate Check First**: Check for existing issues BEFORE analysis/creation
4. **ES Modules Only**: No CommonJS syntax
5. **Error Context**: Always include operation, inputs, and stack traces
6. **Test Coverage**: 70% minimum, test error paths
7. **Issue Memory**: Store execution context in issue comments
8. **Rate Limits**: Handle gracefully with exponential backoff
9. **Workflow Timeouts**: All jobs must have timeout-minutes
10. **Trust the SDD**: Architectural decisions are in SDD.md
</critical_rules>

<success_criteria>
- All tests pass (npm test)
- Workflows validate (npm run validate:workflows)
- Coverage ≥ 70%
- Circuit breaker functional
- Issue creation limited to 1 per cycle
- No duplicate issues created
- Error handling comprehensive
- Documentation updated
- Changes aligned with SDD.md
</success_criteria>
```

---

## Example: Complete Task Execution

```xml
<example_workflow>
TASK: Add retry logic to PR creation

# Step 1: Plan
- Read pr-manager.js to understand current implementation
- Check SDD.md for retry policies
- Review circuit-breaker.test.js for retry patterns
- Identify edge cases (rate limits, network errors)

# Step 2: Implement
```javascript
// pr-manager.js
async function createPullRequest(params, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await circuitBreaker.check(); // Circuit breaker protection
      
      const pr = await octokit.pulls.create(params);
      await circuitBreaker.recordSuccess();
      
      logger.info(`PR created: #${pr.data.number}`);
      return pr.data;
      
    } catch (error) {
      await circuitBreaker.recordFailure(error);
      
      if (error.status === 429 && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        logger.warn(`Rate limited, retry ${attempt}/${retries} after ${delay}ms`);
        await sleep(delay);
        continue;
      }
      
      throw new Error(`Failed to create PR after ${attempt} attempts: ${error.message}`);
    }
  }
}
```

# Step 3: Test
```javascript
// __tests__/pr-manager.test.js
describe('createPullRequest with retries', () => {
  it('should retry on rate limit and succeed', async () => {
    mockOctokit.pulls.create
      .mockRejectedValueOnce({ status: 429 })
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ data: { number: 123 } });
    
    const result = await createPullRequest(params);
    
    expect(result.number).toBe(123);
    expect(mockOctokit.pulls.create).toHaveBeenCalledTimes(3);
  });
});
```

# Step 4: Validate
npm run test:unit
npm run validate:workflows

# Result: ✅ All checks pass
</example_workflow>
```

---

**Remember:** These instructions are updated for 2025 best practices. Follow structured prompting, explicit planning, and safety-first patterns for optimal code generation quality.
