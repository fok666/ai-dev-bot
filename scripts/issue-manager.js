#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Issue Manager - Handles GitHub Issues for task tracking and memory
 */
class IssueManager {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GH_API_TOKEN || process.env.GITHUB_TOKEN
    });

    // Parse repository from GITHUB_REPOSITORY env var or git config
    const repoEnv = process.env.GITHUB_REPOSITORY || '';
    const [owner, repo] = repoEnv.split('/');
    
    this.owner = owner || 'kornfer';
    this.repo = repo || 'ai-dev-bot';
  }

  /**
   * Find the next ready task to work on
   */
  async findNextTask() {
    try {
      console.log('🔍 Finding next task...');

      const { data: issues } = await this.octokit.issues.listForRepo({
        owner: this.owner,
        repo: this.repo,
        state: 'open',
        labels: 'status-ready,ai-bot-task',
        sort: 'created',
        direction: 'asc',
        per_page: 10
      });

      if (issues.length === 0) {
        console.log('ℹ️  No ready tasks found');
        return null;
      }

      // Find highest priority task
      const priorityOrder = ['priority-high', 'priority-medium', 'priority-low'];
      let selectedIssue = null;

      for (const priority of priorityOrder) {
        selectedIssue = issues.find(issue => 
          issue.labels.some(label => label.name === priority)
        );
        if (selectedIssue) break;
      }

      // If no priority label, take first issue
      if (!selectedIssue) {
        selectedIssue = issues[0];
      }

      console.log(`✅ Found task: #${selectedIssue.number} - ${selectedIssue.title}`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `issue_number=${selectedIssue.number}\n`);
      } else {
        console.log(`::set-output name=issue_number::${selectedIssue.number}`);
      }
      
      return selectedIssue;
    } catch (error) {
      console.error('Error finding next task:', error.message);
      throw error;
    }
  }

  /**
   * Load context from issue comments
   */
  async loadContext(issueNumber) {
    try {
      console.log(`📖 Loading context for issue #${issueNumber}...`);

      // Get issue details
      const { data: issue } = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      // Get all comments
      const { data: comments } = await this.octokit.issues.listComments({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      // Parse execution history from comments
      const executionHistory = comments
        .filter(c => c.body.includes('🤖 Execution Context'))
        .map(c => ({
          timestamp: c.created_at,
          body: c.body
        }));

      const context = {
        issue: {
          number: issue.number,
          title: issue.title,
          body: issue.body,
          labels: issue.labels.map(l => l.name)
        },
        executionHistory,
        previousAttempts: executionHistory.length,
        lastAttempt: executionHistory.length > 0 ? executionHistory[executionHistory.length - 1] : null
      };

      // Save context to file
      const tempDir = path.join(process.cwd(), '.context-cache');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const contextFile = path.join(tempDir, `context-${issueNumber}.json`);
      fs.writeFileSync(contextFile, JSON.stringify(context, null, 2));

      console.log(`✅ Context loaded: ${executionHistory.length} previous attempts`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `context_file=${contextFile}\n`);
      } else {
        console.log(`::set-output name=context_file::${contextFile}`);
      }

      return context;
    } catch (error) {
      console.error('Error loading context:', error.message);
      throw error;
    }
  }

  /**
   * Update issue status
   */
  async updateStatus(issueNumber, newStatus) {
    try {
      console.log(`🏷️  Updating issue #${issueNumber} to ${newStatus}...`);

      const statusLabels = ['status-ready', 'status-in-progress', 'status-blocked', 'status-review', 'status-done'];
      
      // Get current labels
      const { data: issue } = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber
      });

      // Remove old status labels
      const currentLabels = issue.labels
        .map(l => typeof l === 'string' ? l : l.name)
        .filter(l => !statusLabels.includes(l));

      // Add new status label
      await this.octokit.issues.update({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        labels: [...currentLabels, newStatus]
      });

      console.log('✅ Status updated');
    } catch (error) {
      console.error('Error updating status:', error.message);
      throw error;
    }
  }

  /**
   * Add comment to issue
   */
  async addComment(issueNumber, body) {
    try {
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });

      console.log('✅ Comment added to issue');
    } catch (error) {
      console.error('Error adding comment:', error.message);
      throw error;
    }
  }

  /**
   * Log execution metrics
   */
  async logExecution(issueNumber, executionId, status) {
    try {
      const timestamp = new Date().toISOString();
      const runUrl = process.env.GITHUB_SERVER_URL 
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${executionId}`
        : `Run #${executionId}`;

      const body = `---
### 🤖 Execution Context - Run #${executionId}

**Timestamp:** ${timestamp}
**Status:** ${status}
**Workflow:** [View Run](${runUrl})

${status === 'success' ? '✅ Execution completed successfully' : '❌ Execution failed'}

---`;

      await this.addComment(issueNumber, body);
    } catch (error) {
      console.error('Error logging execution:', error.message);
    }
  }

  /**
   * Parse roadmap and create issues
   */
  async parseRoadmap(roadmapPath = 'ROADMAP.md') {
    try {
      console.log('📋 Parsing roadmap...');

      const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
      const tasks = [];

      // Simple regex-based parsing
      const taskRegex = /^- \[([ x])\] (.+?) \((\d+) points?\)/gm;
      let match;

      while ((match = taskRegex.exec(roadmapContent)) !== null) {
        const [, checked, title, points] = match;
        if (checked === ' ') {  // Only uncompleted tasks
          tasks.push({
            title: title.trim(),
            points: parseInt(points),
            completed: false
          });
        }
      }

      console.log(`✅ Found ${tasks.length} tasks in roadmap`);

      // Save to temp file
      const tempDir = path.join(process.cwd(), '.context-cache');
      if (!fs.existsSync(tempDir)) {
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `tasks_file=${tasksFile}\n`);
      } else {
        console.log(`::set-output name=tasks_file::${tasksFile}`);
      }
      }

      const tasksFile = path.join(tempDir, 'roadmap-tasks.json');
      fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
      console.log(`::set-output name=tasks_file::${tasksFile}`);

      return tasks;
    } catch (error) {
      console.error('Error parsing roadmap:', error.message);
      throw error;
    }
  }

  /**
   * Create issues from tasks
   */
  async createTasks(tasksFile) {
    try {
      console.log('📝 Creating issues from tasks...');

      const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf8'));

      for (const task of tasks) {
        // Check if issue already exists
        const { data: existingIssues } = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          labels: 'ai-bot-task'
        });

        const exists = existingIssues.some(issue => issue.title === task.title);
        if (exists) {
          console.log(`⏭️  Skipping existing task: ${task.title}`);
          continue;
        }

        // Create issue
        const body = `## Task: ${task.title}

**Story Points:** ${task.points}
**Priority:** Medium
**Type:** Feature

### Description
Auto-generated task from ROADMAP.md

### Acceptance Criteria
- [ ] Implementation complete
- [ ] Tests passing
- [ ] Documentation updated

---
🤖 This issue was auto-generated by AI-Dev-Bot from ROADMAP.md`;

        const { data: issue } = await this.octokit.issues.create({
          owner: this.owner,
          repo: this.repo,
          title: task.title,
          body,
          labels: ['ai-bot-task', 'status-ready', 'priority-medium', 'type-feature']
        });

        console.log(`✅ Created issue #${issue.number}: ${task.title}`);
      }

      console.log('✅ All tasks created');
    } catch (error) {
      console.error('Error creating tasks:', error.message);
      throw error;
    }
  }

  /**
   * Create investigation issues from workflow failure analyses
   */
  async createInvestigationIssues(analysesFile) {
    try {
      console.log('📝 Creating investigation issues from analyses...');

      const analyses = JSON.parse(fs.readFileSync(analysesFile, 'utf8'));
      let issuesCreated = 0;

      for (const analysis of analyses) {
        // Extract repository info from analysis
        const targetOwner = analysis.run._repo_owner || this.owner;
        const targetRepo = analysis.run._repo_name || this.repo;
        
        console.log(`\n🔍 Processing failure in ${targetOwner}/${targetRepo}...`);
        
        // Check if investigation issue already exists for this workflow/error
        const existingIssue = await this.findExistingInvestigationIssue(
          analysis.run.name,
          analysis.errors[0] || 'unknown',
          targetOwner,
          targetRepo
        );

        if (existingIssue) {
          console.log(`   ℹ️  Investigation already exists: ${targetOwner}/${targetRepo}#${existingIssue.number}`);
          
          // Add comment with new occurrence
          await this.octokit.issues.createComment({
            owner: targetOwner,
            repo: targetRepo,
            issue_number: existingIssue.number,
            body: `🔄 **Failure occurred again**

**Run:** [#${analysis.run.id}](${analysis.run.html_url})
**Time:** ${analysis.run.created_at}
**Branch:** ${analysis.run.head_branch}
**SHA:** ${analysis.run.head_sha}`
          });
          continue;
        }

        // Create new investigation issue in target repository
        const title = `🔥 Pipeline Failure: ${analysis.run.name}`;
        const body = this.formatInvestigationIssue(analysis);
        
        const priority = this.determinePriority(analysis);
        const labels = [
          'type-investigate',
          'type-ci-cd',
          'ai-bot-task',
          'pipeline-failure',
          'status-ready',
          `priority-${priority}`
        ];

        const { data: issue } = await this.octokit.issues.create({
          owner: targetOwner,
          repo: targetRepo,
          title,
          body,
          labels
        });

        console.log(`   ✅ Created investigation issue: ${targetOwner}/${targetRepo}#${issue.number}`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `issues_created=${issuesCreated}\n`);
      } else {
        console.log(`::set-output name=issues_created::${issuesCreated}`);
      }
        issuesCreated++;
      }

      console.log(`\n✅ Created ${issuesCreated} investigation issue(s)`);
      console.log(`::set-output name=issues_created::${issuesCreated}`);

      return issuesCreated;
    } catch (error) {
      console.error('Error creating investigation issues:', error.message);
      throw error;
    }
  }

  /**
   * Find existing investigation issue for the same failure
   */
  async findExistingInvestigationIssue(workflowName, errorSignature, targetOwner, targetRepo) {
    try {
      const { data: issues } = await this.octokit.issues.listForRepo({
        owner: targetOwner,
        repo: targetRepo,
        state: 'open',
        labels: 'pipeline-failure',
        per_page: 50
      });

      // Find issue with matching workflow name and similar error
      const matchingIssue = issues.find(issue => 
        issue.title.includes(workflowName) &&
        issue.body.includes(errorSignature.substring(0, 50))
      );

      return matchingIssue || null;
    } catch (error) {
      console.warn('Could not check for existing investigation issue:', error.message);
      return null;
    }
  }

  /**
   * Format investigation issue body
   */
  formatInvestigationIssue(analysis) {
    const geminiAnalysis = analysis.analysis || {};
    
    return `## 🔥 Pipeline Failure Investigation

**Workflow:** ${analysis.run.name}
**Run:** [#${analysis.run.id}](${analysis.run.html_url})
**Branch:** ${analysis.run.head_branch}
**Failed At:** ${analysis.run.created_at}

### Failure Summary

**Status:** ${analysis.run.conclusion}
**Failed Jobs:** ${analysis.failedJobs.length}

${analysis.failedJobs.map(job => `- **${job.name}** (${job.started_at} - ${job.completed_at})`).join('\n')}

### ${geminiAnalysis.rootCause ? 'Root Cause Analysis' : 'Error Messages'}

${geminiAnalysis.rootCause || analysis.errors.map((e, i) => `${i + 1}. ${e}`).join('\n') || 'No specific errors captured'}

${geminiAnalysis.rootCause ? `
**Confidence:** ${geminiAnalysis.confidence || 'unknown'}
**Likely Culprit:** ${geminiAnalysis.culprit || 'unknown'}
` : ''}

### Recent Changes

${analysis.recentCommits.map(c => `- \`${c.sha}\` ${c.message} (${c.author})`).join('\n')}

### ${geminiAnalysis.suggestedFix ? 'Suggested Fix' : 'Investigation Needed'}

${geminiAnalysis.suggestedFix || 'Manual investigation required to determine root cause and appropriate fix.'}

### Next Steps

- [ ] Review workflow logs: [Run #${analysis.run.id}](${analysis.run.html_url})
- [ ] Analyze recent code changes
- [ ] Reproduce failure locally if possible
- [ ] Implement fix
- [ ] Verify fix resolves the issue

---
🤖 This investigation issue was auto-generated by AI-Dev-Bot from pipeline monitoring`;
  }

  /**
   * Determine priority based on analysis
   */
  determinePriority(analysis) {
    const geminiPriority = analysis.analysis?.priority;
    
    if (geminiPriority === 'critical') return 'high';
    if (geminiPriority === 'high') return 'high';
    if (geminiPriority === 'low') return 'low';
    
    // Default to high for pipeline failures
    return 'high';
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const manager = new IssueManager();

  try {
    switch (command) {
      case 'find-next-task':
        await manager.findNextTask();
        break;

      case 'load-context':
        const issueNumber = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];
        if (!issueNumber) {
          console.error('Error: --issue=<number> required');
          process.exit(1);
        }
        await manager.loadContext(parseInt(issueNumber));
        break;

      case 'log-execution':
        const logIssue = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];
        const executionId = process.argv.find(arg => arg.startsWith('--execution-id='))?.split('=')[1];
        const status = process.argv.find(arg => arg.startsWith('--status='))?.split('=')[1];
        await manager.logExecution(parseInt(logIssue), executionId, status);
        break;

      case 'parse-roadmap':
        const roadmapFile = process.argv.find(arg => arg.startsWith('--file='))?.split('=')[1] || 'ROADMAP.md';
        await manager.parseRoadmap(roadmapFile);
        break;

      case 'create-tasks':
        const tasksFile = process.argv.find(arg => arg.startsWith('--tasks='))?.split('=')[1];
        if (!tasksFile) {
          console.error('Error: --tasks=<file> required');
          process.exit(1);
        }
        await manager.createTasks(tasksFile);
        break;

      case 'create-investigation-issues':
        const analysesFile = process.argv.find(arg => arg.startsWith('--analyses='))?.split('=')[1];
        if (!analysesFile) {
          console.error('Error: --analyses=<file> required');
          process.exit(1);
        }
        await manager.createInvestigationIssues(analysesFile);
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: find-next-task, load-context, log-execution, parse-roadmap, create-tasks, create-investigation-issues');
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

export default IssueManager;
