#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { fileURLToPath } from 'url';
import { getGeminiService } from './gemini-service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Bot Orchestrator - Main execution engine
 */
class Orchestrator {
  constructor() {
    const config = this.loadConfig();
    this.gemini = getGeminiService(config.gemini);
    
    this.octokit = new Octokit({
      auth: process.env.GH_API_TOKEN || process.env.GITHUB_TOKEN
    });

    const repoEnv = process.env.GITHUB_REPOSITORY || '';
    const [owner, repo] = repoEnv.split('/');
    this.owner = owner || 'kornfer';
    this.repo = repo || 'ai-dev-bot';
  }

  /**
   * Load configuration
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.context-cache', 'config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Configuration not loaded. Run load-config.js first.');
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  /**
   * Load context from file
   */
  loadContext(contextFile) {
    if (!fs.existsSync(contextFile)) {
      throw new Error(`Context file not found: ${contextFile}`);
    }
    return JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  }

  /**
   * Read SDD file
   */
  readSDD() {
    const config = this.loadConfig();
    const sddPath = path.join(process.cwd(), config.documents.sdd);
    
    if (!fs.existsSync(sddPath)) {
      console.warn('⚠️  SDD not found');
      return '';
    }

    return fs.readFileSync(sddPath, 'utf8');
  }

  /**
   * Execute task using Gemini
   */
  async execute(issueNumber, contextFile) {
    try {
      console.log(`🚀 Executing task for issue #${issueNumber}...`);

      // Load context
      const context = this.loadContext(contextFile);
      const sdd = this.readSDD();

      // Build prompt
      const prompt = this.buildPrompt(context, sdd);

      console.log('\n📝 Prompt constructed, querying Gemini...\n');

      // Query Gemini
      const text = await this.gemini.generate(prompt, { checkTokens: true });

      console.log('\n✅ Received response from Gemini\n');
      console.log('Response preview:');
      console.log(text.substring(0, 500) + '...\n');

      // Parse response
      const plan = this.parseResponse(text);

      // Save plan
      const planFile = path.join(process.cwd(), '.context-cache', `plan-${issueNumber}.json`);
      fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));

      // Create branch
      const branchName = `ai-bot/issue-${issueNumber}`;
      
      console.log(`::set-output name=has_changes::true`);
      console.log(`::set-output name=branch::${branchName}`);
      console.log(`::set-output name=pr_title::${plan.title || context.issue.title}`);
      console.log(`::set-output name=plan_file::${planFile}`);

      // Post execution context to issue
      await this.postExecutionContext(issueNumber, plan, text);

      return plan;
    } catch (error) {
      console.error('Error executing task:', error.message);
      throw error;
    }
  }

  /**
   * Build prompt for Gemini
   */
  buildPrompt(context, sdd) {
    const sddExcerpt = this.gemini.optimizePrompt(sdd, 3000);

    return `You are an expert software engineer working on the AI-Dev-Bot project.

Context:
- Repository: ${this.owner}/${this.repo}
- Current Task: ${context.issue.title}
- Issue: #${context.issue.number}

Task Description:
${context.issue.body}

Previous Attempts: ${context.previousAttempts}
${context.lastAttempt ? `
Last Attempt Summary:
${context.lastAttempt.body.substring(0, 500)}
` : ''}

Requirements from SDD (excerpt):
${sddExcerpt}

Task:
Provide a detailed implementation plan for this task. Focus on:
1. High-level approach
2. Key files to create or modify (list main files only)
3. Main implementation steps
4. Testing approach
5. Any important decisions or considerations

Please provide your response in this format:

TITLE: [Brief title for the PR]

APPROACH:
[Describe the implementation approach]

FILES:
- path/to/file1.js: [what changes]
- path/to/file2.py: [what changes]

STEPS:
1. [First step]
2. [Second step]
3. [Third step]

TESTING:
[How to test this implementation]

DECISIONS:
[Key decisions and rationale]
`;
  }

  /**
   * Parse Gemini response
   */
  parseResponse(text) {
    const plan = {
      title: '',
      approach: '',
      files: [],
      steps: [],
      testing: '',
      decisions: ''
    };

    // Extract title
    const titleMatch = text.match(/TITLE:\s*(.+)/);
    if (titleMatch) {
      plan.title = titleMatch[1].trim();
    }

    // Extract approach
    const approachMatch = text.match(/APPROACH:\s*([\s\S]+?)(?=FILES:|$)/);
    if (approachMatch) {
      plan.approach = approachMatch[1].trim();
    }

    // Extract files
    const filesMatch = text.match(/FILES:\s*([\s\S]+?)(?=STEPS:|$)/);
    if (filesMatch) {
      const fileLines = filesMatch[1].trim().split('\n');
      plan.files = fileLines
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim());
    }

    // Extract steps
    const stepsMatch = text.match(/STEPS:\s*([\s\S]+?)(?=TESTING:|$)/);
    if (stepsMatch) {
      const stepLines = stepsMatch[1].trim().split('\n');
      plan.steps = stepLines
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim());
    }

    // Extract testing
    const testingMatch = text.match(/TESTING:\s*([\s\S]+?)(?=DECISIONS:|$)/);
    if (testingMatch) {
      plan.testing = testingMatch[1].trim();
    }

    // Extract decisions
    const decisionsMatch = text.match(/DECISIONS:\s*([\s\S]+?)$/);
    if (decisionsMatch) {
      plan.decisions = decisionsMatch[1].trim();
    }

    return plan;
  }

  /**
   * Post execution context to issue
   */
  async postExecutionContext(issueNumber, plan, fullResponse) {
    try {
      const timestamp = new Date().toISOString();
      const runId = process.env.GITHUB_RUN_ID || 'local';
      const runUrl = process.env.GITHUB_SERVER_URL 
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${runId}`
        : '';

      const body = `---
### 🤖 Execution Context - Run #${runId}

**Timestamp:** ${timestamp}
**Trigger:** ${process.env.GITHUB_EVENT_NAME || 'manual'}
**Branch:** \`ai-bot/issue-${issueNumber}\`
${runUrl ? `**Workflow:** [View Run](${runUrl})` : ''}

#### Implementation Plan

**Approach:**
${plan.approach}

**Key Files:**
${plan.files.slice(0, 5).map(f => `- ${f}`).join('\n')}

**Steps:**
${plan.steps.slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Testing:**
${plan.testing}

**Key Decisions:**
${plan.decisions}

---
`;

      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });

      console.log('✅ Execution context posted to issue');
    } catch (error) {
      console.error('Error posting execution context:', error.message);
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const orchestrator = new Orchestrator();

  try {
    switch (command) {
      case 'execute':
        const issueArg = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];
        const contextArg = process.argv.find(arg => arg.startsWith('--context='))?.split('=')[1];

        if (!issueArg || !contextArg) {
          console.error('Error: --issue=<number> and --context=<file> required');
          process.exit(1);
        }

        await orchestrator.execute(parseInt(issueArg), contextArg);
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: execute');
        process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default Orchestrator;
