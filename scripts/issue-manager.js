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
   * Load configuration
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.context-cache', 'config.json');
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    // Fallback to default configuration
    return {
      repositories: [{ name: `${this.owner}/${this.repo}`, priority: 'high', enabled: true }]
    };
  }

  /**
   * Find the next ready task to work on across ALL configured repositories
   */
  async findNextTask() {
    try {
      console.log('🔍 Finding next task across all configured repositories...');

      const config = this.loadConfig();
      const repositories = (config.repositories && config.repositories.length > 0) ? config.repositories : [{ name: `${this.owner}/${this.repo}`, priority: 'high', enabled: true }];
      
      console.log(`   Checking ${repositories.filter(r => r.enabled).length} enabled repositories...`);

      // Collect all ready tasks from all repositories
      const allTasks = [];

      for (const repoConfig of repositories) {
        if (!repoConfig.enabled) {
          console.log(`   ⊗ Skipping ${repoConfig.name} (disabled)`);
          continue;
        }

        const [repoOwner, repoName] = repoConfig.name.split('/');
        if (!repoOwner || !repoName) {
          console.warn(`   ⚠️  Invalid repository format: ${repoConfig.name}`);
          continue;
        }

        try {
          console.log(`   📦 Checking ${repoConfig.name}...`);
          
          const { data: issues } = await this.octokit.issues.listForRepo({
            owner: repoOwner,
            repo: repoName,
            state: 'open',
            labels: 'status-ready,ai-bot-task',
            sort: 'created',
            direction: 'asc',
            per_page: 10
          });

          console.log(`      Found ${issues.length} ready tasks in ${repoConfig.name}`);

          // Add repository context to each issue
          for (const issue of issues) {
            allTasks.push({
              issue,
              owner: repoOwner,
              repo: repoName,
              repoPriority: repoConfig.priority || 'medium'
            });
          }
        } catch (error) {
          console.error(`   ✗ Error checking ${repoConfig.name}:`, error.message);
          // Continue to next repository on error
        }
      }

      if (allTasks.length === 0) {
        console.log('ℹ️  No ready tasks found in any repository');
        return null;
      }

      console.log(`\n📊 Total ready tasks found: ${allTasks.length}`);

      // Prioritize tasks by:
      // 1. Issue priority (priority-high > priority-medium > priority-low)
      // 2. Repository priority (from config)
      // 3. Creation date (older first)
      const priorityOrder = ['priority-high', 'priority-medium', 'priority-low'];
      const repoPriorityOrder = ['high', 'medium', 'low'];

      allTasks.sort((a, b) => {
        // Compare issue priority
        const aPriority = priorityOrder.findIndex(p => 
          a.issue.labels.some(label => label.name === p)
        );
        const bPriority = priorityOrder.findIndex(p => 
          b.issue.labels.some(label => label.name === p)
        );

        const aIssuePriority = aPriority === -1 ? 999 : aPriority;
        const bIssuePriority = bPriority === -1 ? 999 : bPriority;

        if (aIssuePriority !== bIssuePriority) {
          return aIssuePriority - bIssuePriority;
        }

        // Compare repo priority
        const aRepoPriority = repoPriorityOrder.indexOf(a.repoPriority);
        const bRepoPriority = repoPriorityOrder.indexOf(b.repoPriority);

        if (aRepoPriority !== bRepoPriority) {
          return aRepoPriority - bRepoPriority;
        }

        // Compare creation date (older first)
        return new Date(a.issue.created_at) - new Date(b.issue.created_at);
      });

      const selectedTask = allTasks[0];
      const { issue, owner, repo } = selectedTask;

      console.log(`\n✅ Selected task: ${owner}/${repo}#${issue.number} - ${issue.title}`);
      console.log(`   Priority: ${issue.labels.find(l => l.name.startsWith('priority-'))?.name || 'none'}`);
      console.log(`   Repository Priority: ${selectedTask.repoPriority}`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `issue_number=${issue.number}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `target_owner=${owner}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `target_repo=${repo}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `target_repo_full=${owner}/${repo}\n`);
      } else {
        console.log(`::set-output name=issue_number::${issue.number}`);
        console.log(`::set-output name=target_owner::${owner}`);
        console.log(`::set-output name=target_repo::${repo}`);
        console.log(`::set-output name=target_repo_full::${owner}/${repo}`);
      }
      
      return selectedTask;
    } catch (error) {
      console.error('Error finding next task:', error.message);
      throw error;
    }
  }

  /**
   * Load context from issue comments (supports cross-repo)
   */
  async loadContext(issueNumber, targetOwner = null, targetRepo = null) {
    try {
      const owner = targetOwner || this.owner;
      const repo = targetRepo || this.repo;
      
      console.log(`📖 Loading context for ${owner}/${repo}#${issueNumber}...`);

      // Get issue details
      const { data: issue } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });

      // Get all comments
      const { data: comments } = await this.octokit.issues.listComments({
        owner,
        repo,
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
        repository: {
          owner,
          repo,
          full_name: `${owner}/${repo}`
        },
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

      // Sanitize owner and repo to prevent path traversal
      const safeOwner = path.basename(owner).replace(/[^a-zA-Z0-9_-]/g, '');
      const safeRepo = path.basename(repo).replace(/[^a-zA-Z0-9_-]/g, '');
      const contextFile = path.join(tempDir, `context-${safeOwner}-${safeRepo}-${issueNumber}.json`);
      fs.writeFileSync(contextFile, JSON.stringify(context, null, 2));

      console.log(`✅ Context loaded: ${executionHistory.length} previous attempts`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `context_file=${contextFile}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `target_owner=${owner}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `target_repo=${repo}\n`);
      } else {
        console.log(`::set-output name=context_file::${contextFile}`);
        console.log(`::set-output name=target_owner::${owner}`);
        console.log(`::set-output name=target_repo::${repo}`);
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
   * Post analysis and proposed correction to investigation issue
   * This provides transparency before the bot attempts to fix the issue
   */
  async postProposedCorrection(issueNumber, analysis) {
    try {
      console.log(`🔍 Posting proposed correction to issue #${issueNumber}...`);
      
      const body = `## 🧠 AI Analysis & Proposed Correction

### Root Cause Analysis

${analysis.rootCause || 'Analyzing...'}

### Proposed Solution

${analysis.proposedFix || 'Generating solution...'}

**Confidence Level:** ${analysis.confidence || 'Medium'}
**Estimated Complexity:** ${analysis.complexity || 'Unknown'}
**Risk Assessment:** ${analysis.risk || 'Low'}

### Implementation Plan

${analysis.implementationSteps ? analysis.implementationSteps.map((step, i) => `${i + 1}. ${step}`).join('\n') : '1. Analyzing codebase\n2. Generating fix\n3. Creating tests\n4. Submitting PR'}

### Files to be Modified

${analysis.filesToModify ? analysis.filesToModify.map(f => `- \`${f}\``).join('\n') : '_Files will be determined during implementation_'}

---

🤖 **Next Steps:**
- The bot will attempt to implement this fix automatically
- A PR will be created for review
- Tests will be run to validate the fix
- Human review is recommended before merging

> ℹ️ If this analysis seems incorrect, please comment with guidance and the bot will adjust its approach.`;
      
      await this.octokit.issues.createComment({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
        body
      });
      
      console.log('✅ Posted proposed correction');
      return true;
    } catch (error) {
      console.error('Error posting proposed correction:', error.message);
      // Non-fatal - continue with execution
      return false;
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
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tasksFile = path.join(tempDir, 'roadmap-tasks.json');
      fs.writeFileSync(tasksFile, JSON.stringify(tasks, null, 2));
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `tasks_file=${tasksFile}\n`);
      } else {
        console.log(`::set-output name=tasks_file::${tasksFile}`);
      }

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
   * SAFETY: Process ONE failure at a time to prevent cascading issues
   */
  async createInvestigationIssues(analysesFile) {
    let issuesCreated = 0; // Declare outside try block so it's accessible in catch
    
    try {
      console.log('📝 Creating investigation issues from analyses...');

      const analyses = JSON.parse(fs.readFileSync(analysesFile, 'utf8'));
      const MAX_ISSUES_PER_RUN = 1; // CRITICAL: Only one issue per run to prevent rate limiting

      // Sort by priority to handle most important first
      const sortedAnalyses = analyses.sort((a, b) => {
        const priorityA = this.determinePriority(a);
        const priorityB = this.determinePriority(b);
        const order = { high: 0, medium: 1, low: 2 };
        return order[priorityA] - order[priorityB];
      });

      console.log(`📊 Found ${sortedAnalyses.length} failure(s). Processing maximum ${MAX_ISSUES_PER_RUN} per run.`);

      for (const analysis of sortedAnalyses) {
        // Extract repository info from analysis
        const targetOwner = analysis.run._repo_owner || this.owner;
        const targetRepo = analysis.run._repo_name || this.repo;
        
        console.log(`\n🔍 Checking failure in ${targetOwner}/${targetRepo}: ${analysis.run.name}`);
        
        // FIRST: Check if investigation issue already exists BEFORE analyzing
        // This prevents wasted API calls and ensures we don't create duplicates
        const existingIssue = await this.findExistingInvestigationIssue(
          analysis.run.name,
          analysis.errors[0] || 'unknown',
          targetOwner,
          targetRepo
        );

        if (existingIssue) {
          console.log(`   ✅ Duplicate found: ${targetOwner}/${targetRepo}#${existingIssue.number}`);
          console.log(`   📝 Updating occurrence tracker instead of creating new comment`);
          
          // Update or create a single tracking comment instead of spamming
          await this.updateOccurrenceTracker({
            owner: targetOwner,
            repo: targetRepo,
            issue_number: existingIssue.number,
            run: analysis.run
          });
          
          console.log(`   ✅ Updated occurrence tracker (no spam comments)`);
          continue; // Skip to next failure
        }

        // Stop if we've already created our one allowed issue
        if (issuesCreated >= MAX_ISSUES_PER_RUN) {
          console.log(`\n⚠️  Already created ${MAX_ISSUES_PER_RUN} issue(s) this run.`);
          console.log(`   ⏭️  Skipping remaining ${sortedAnalyses.length - sortedAnalyses.indexOf(analysis)} failure(s).`);
          console.log(`   ⏰ They will be processed in the next scheduled run.`);
          break;
        }

        // No duplicate found - safe to create new investigation issue
        console.log(`   ✅ No duplicate found. Creating new investigation issue...`);
        
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
        console.log(`   🔗 ${issue.html_url}`);
        issuesCreated++;
        
        // SAFETY: Stop after creating ONE issue to prevent rate limiting
        console.log(`\n🛑 Created ${issuesCreated} issue. Stopping to prevent rate limiting.`);
        break;
      }

      console.log(`\n✅ Processing complete:`);
      console.log(`   📊 Issues created: ${issuesCreated}`);
      console.log(`   💬 Existing issues updated: ${sortedAnalyses.filter((a, i) => i < sortedAnalyses.indexOf(sortedAnalyses.find(x => x === sortedAnalyses[issuesCreated]))).length}`);
      console.log(`   ⏰ Next run will process any remaining failures`);
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `issues_created=${issuesCreated}\n`);
      } else {
        console.log(`::set-output name=issues_created::${issuesCreated}`);
      }

      return issuesCreated;
    } catch (error) {
      // Check for rate limiting errors
      if (error.status === 403 && error.message.includes('rate limit')) {
        console.error('⚠️  GitHub rate limit exceeded. Stopping issue creation.');
        console.error('   Issues created before limit:', issuesCreated || 0);
        return issuesCreated || 0;
      }
      if (error.status === 403 && error.message.includes('secondary rate limit')) {
        console.error('⚠️  GitHub secondary rate limit exceeded. Stopping issue creation.');
        console.error('   Issues created before limit:', issuesCreated || 0);
        return issuesCreated || 0;
      }
      console.error('❌ Error creating investigation issues:', error.message);
      console.error('   This is likely due to API errors or network issues.');
      throw error;
    }
  }

  /**
   * Update occurrence tracker comment for repeated failures
   * Uses a single comment that gets updated instead of creating spam
   */
  async updateOccurrenceTracker(params) {
    const { owner, repo, issue_number, run } = params;
    
    try {
      // Find existing tracker comment
      const { data: comments } = await this.octokit.issues.listComments({
        owner,
        repo,
        issue_number
      });
      
      const trackerComment = comments.find(c => 
        c.body.includes('## 📊 Occurrence Tracker')
      );
      
      const occurrence = {
        run_id: run.id,
        run_url: run.html_url,
        time: run.created_at,
        branch: run.head_branch,
        sha: run.head_sha.substring(0, 7)
      };
      
      if (trackerComment) {
        // Parse existing occurrences from comment
        const occurrenceMatch = trackerComment.body.match(/Total Occurrences: (\d+)/);
        const currentCount = occurrenceMatch ? parseInt(occurrenceMatch[1]) : 1;
        const newCount = currentCount + 1;
        
        // Extract existing occurrences list
        const listMatch = trackerComment.body.match(/### Recent Occurrences([\s\S]*?)(?=###|$)/);
        const existingList = listMatch ? listMatch[1].trim().split('\n').filter(l => l.startsWith('-')) : [];
        
        // Keep only last 5 occurrences
        const recentOccurrences = [
          `- **Run [#${occurrence.run_id}](${occurrence.run_url})** at ${occurrence.time} (${occurrence.branch}@${occurrence.sha})`,
          ...existingList.slice(0, 4)
        ];
        
        // Build updated comment
        const updatedBody = `## 📊 Occurrence Tracker

**Total Occurrences:** ${newCount}
**Last Updated:** ${new Date().toISOString()}
**Status:** ${newCount >= 10 ? '🔴 Critical - High frequency' : newCount >= 5 ? '🟡 Warning - Repeated failures' : '🟢 Monitoring'}

### Recent Occurrences

${recentOccurrences.join('\n')}

${newCount > 5 ? `\n---\n> ⚠️ **Note:** Showing last 5 of ${newCount} total occurrences to reduce noise.` : ''}

---
*This tracker is automatically updated. No new comments will be created for duplicate failures.*`;
        
        // Update existing comment
        await this.octokit.issues.updateComment({
          owner,
          repo,
          comment_id: trackerComment.id,
          body: updatedBody
        });
        
        console.log(`   ✅ Updated tracker: ${newCount} total occurrences`);
      } else {
        // Create initial tracker comment
        const initialBody = `## 📊 Occurrence Tracker

**Total Occurrences:** 2 (including initial failure)
**Last Updated:** ${new Date().toISOString()}
**Status:** 🟢 Monitoring

### Recent Occurrences

- **Run [#${occurrence.run_id}](${occurrence.run_url})** at ${occurrence.time} (${occurrence.branch}@${occurrence.sha})

---
*This tracker is automatically updated. No new comments will be created for duplicate failures.*`;
        
        await this.octokit.issues.createComment({
          owner,
          repo,
          issue_number,
          body: initialBody
        });
        
        console.log(`   ✅ Created occurrence tracker`);
      }
      
    } catch (error) {
      console.error('   ⚠️  Failed to update occurrence tracker:', error.message);
      // Don't throw - this is non-critical
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
        per_page: 100
      });

      // Find issue with matching workflow name (exact title match preferred)
      const exactMatch = issues.find(issue => 
        issue.title === `🔥 Pipeline Failure: ${workflowName}`
      );
      
      if (exactMatch) {
        return exactMatch;
      }

      // Fallback: Find issue with matching workflow name and similar error
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
        const targetOwner = process.argv.find(arg => arg.startsWith('--target-owner='))?.split('=')[1];
        const targetRepo = process.argv.find(arg => arg.startsWith('--target-repo='))?.split('=')[1];
        if (!issueNumber) {
          console.error('Error: --issue=<number> required');
          process.exit(1);
        }
        await manager.loadContext(parseInt(issueNumber), targetOwner, targetRepo);
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

      case 'post-proposed-fix':
        const fixIssue = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];
        const analysisFile = process.argv.find(arg => arg.startsWith('--analysis='))?.split('=')[1];
        
        if (!fixIssue || !analysisFile) {
          console.error('Error: --issue=<number> and --analysis=<file> required');
          process.exit(1);
        }
        
        const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
        await manager.postProposedCorrection(parseInt(fixIssue), analysisData);
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: find-next-task, load-context, log-execution, parse-roadmap, create-tasks, create-investigation-issues, post-proposed-fix');
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
