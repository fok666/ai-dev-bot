#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Octokit } from '@octokit/rest';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Self-Improvement Module - Enables continuous bot enhancement
 * Tracks performance, learns from patterns, and proposes optimizations
 */
class SelfImprovement {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
    
    this.octokit = new Octokit({
      auth: process.env.GH_API_TOKEN || process.env.GITHUB_TOKEN
    });

    const repoEnv = process.env.GITHUB_REPOSITORY || '';
    const [owner, repo] = repoEnv.split('/');
    this.owner = owner || 'unknown';
    this.repo = repo || 'ai-dev-bot';
    
    this.metricsDir = path.join(process.cwd(), '.metrics');
    this.ensureMetricsDir();
  }

  /**
   * Ensure metrics directory exists
   */
  ensureMetricsDir() {
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
  }

  /**
   * Collect performance metrics from issues and PRs
   */
  async collectMetrics(sprintNumber = null) {
    console.log('📊 Collecting performance metrics...');

    try {
      // Get closed issues from recent sprint
      const issuesQuery = {
        owner: this.owner,
        repo: this.repo,
        state: 'closed',
        labels: 'ai-bot-task',
        per_page: 100
      };

      if (sprintNumber) {
        issuesQuery.milestone = sprintNumber;
      }

      const { data: issues } = await this.octokit.issues.listForRepo(issuesQuery);

      // Get merged PRs
      const { data: prs } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'closed',
        per_page: 100
      });

      const mergedPRs = prs.filter(pr => pr.merged_at);

      const metrics = {
        timestamp: new Date().toISOString(),
        sprint: sprintNumber,
        issues: {
          total: issues.length,
          completed: issues.filter(i => i.state === 'closed').length,
          avgTimeToClose: this.calculateAvgTime(issues, 'created_at', 'closed_at'),
          byType: this.groupByLabel(issues, 'type-'),
          byPriority: this.groupByLabel(issues, 'priority-')
        },
        pullRequests: {
          total: mergedPRs.length,
          merged: mergedPRs.length,
          mergeRate: mergedPRs.length / prs.length,
          avgTimeToMerge: this.calculateAvgTime(mergedPRs, 'created_at', 'merged_at'),
          avgReviewComments: await this.calculateAvgReviewComments(mergedPRs),
          avgChangedLines: this.calculateAvgChangedLines(mergedPRs)
        },
        quality: {
          ciFailureRate: await this.calculateCIFailureRate(mergedPRs),
          reviewIterations: await this.calculateReviewIterations(mergedPRs)
        }
      };

      // Save metrics
      const metricsFile = path.join(this.metricsDir, `metrics-${Date.now()}.json`);
      fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));

      console.log('✅ Metrics collected and saved');
      console.log(`📁 File: ${metricsFile}`);
      
      return metrics;
    } catch (error) {
      console.error('Error collecting metrics:', error.message);
      throw error;
    }
  }

  /**
   * Calculate average time between two dates
   */
  calculateAvgTime(items, startField, endField) {
    const times = items
      .filter(item => item[startField] && item[endField])
      .map(item => {
        const start = new Date(item[startField]);
        const end = new Date(item[endField]);
        return (end - start) / (1000 * 60 * 60); // hours
      });

    if (times.length === 0) return 0;
    return times.reduce((a, b) => a + b, 0) / times.length;
  }

  /**
   * Group items by label prefix
   */
  groupByLabel(items, prefix) {
    const groups = {};
    items.forEach(item => {
      const labels = item.labels.filter(l => l.name.startsWith(prefix));
      labels.forEach(label => {
        const key = label.name;
        groups[key] = (groups[key] || 0) + 1;
      });
    });
    return groups;
  }

  /**
   * Calculate average review comments per PR
   */
  async calculateAvgReviewComments(prs) {
    let totalComments = 0;
    
    for (const pr of prs.slice(0, 20)) { // Sample recent 20 PRs
      try {
        const { data: reviews } = await this.octokit.pulls.listReviews({
          owner: this.owner,
          repo: this.repo,
          pull_number: pr.number
        });
        totalComments += reviews.length;
      } catch (error) {
        console.warn(`Could not fetch reviews for PR #${pr.number}`);
      }
    }

    return totalComments / Math.min(prs.length, 20);
  }

  /**
   * Calculate average changed lines
   */
  calculateAvgChangedLines(prs) {
    const totals = prs.map(pr => (pr.additions || 0) + (pr.deletions || 0));
    if (totals.length === 0) return 0;
    return totals.reduce((a, b) => a + b, 0) / totals.length;
  }

  /**
   * Calculate CI failure rate
   */
  async calculateCIFailureRate(prs) {
    // This would require checking workflow runs
    // For now, return estimated based on PR review requests
    return 0.1; // placeholder
  }

  /**
   * Calculate review iterations
   */
  async calculateReviewIterations(prs) {
    // Count commits after initial PR creation
    let totalIterations = 0;
    
    for (const pr of prs.slice(0, 10)) {
      try {
        const { data: commits } = await this.octokit.pulls.listCommits({
          owner: this.owner,
          repo: this.repo,
          pull_number: pr.number
        });
        totalIterations += commits.length;
      } catch (error) {
        console.warn(`Could not fetch commits for PR #${pr.number}`);
      }
    }

    return totalIterations / Math.min(prs.length, 10);
  }

  /**
   * Analyze patterns and suggest improvements
   */
  async analyzeAndSuggest() {
    console.log('🧠 Analyzing patterns for improvements...');

    try {
      // Load recent metrics
      const metricsFiles = fs.readdirSync(this.metricsDir)
        .filter(f => f.startsWith('metrics-'))
        .sort()
        .slice(-5); // Last 5 metrics

      if (metricsFiles.length === 0) {
        console.log('⚠️  No metrics available. Collect metrics first.');
        return null;
      }

      const metricsHistory = metricsFiles.map(f =>
        JSON.parse(fs.readFileSync(path.join(this.metricsDir, f), 'utf8'))
      );

      // Fetch recent PR review comments for feedback
      const { data: prs } = await this.octokit.pulls.list({
        owner: this.owner,
        repo: this.repo,
        state: 'closed',
        per_page: 20
      });

      const reviewFeedback = await this.collectReviewFeedback(prs.slice(0, 10));

      // Build analysis prompt
      const prompt = this.buildAnalysisPrompt(metricsHistory, reviewFeedback);

      // Query Gemini for insights
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      const suggestions = this.parseSuggestions(response);

      // Save suggestions
      const suggestionsFile = path.join(this.metricsDir, `suggestions-${Date.now()}.json`);
      fs.writeFileSync(suggestionsFile, JSON.stringify(suggestions, null, 2));

      console.log('✅ Analysis complete. Suggestions saved.');
      console.log(`📁 File: ${suggestionsFile}`);

      return suggestions;
    } catch (error) {
      console.error('Error analyzing patterns:', error.message);
      throw error;
    }
  }

  /**
   * Collect review feedback from PRs
   */
  async collectReviewFeedback(prs) {
    const feedback = [];

    for (const pr of prs) {
      try {
        const { data: reviews } = await this.octokit.pulls.listReviews({
          owner: this.owner,
          repo: this.repo,
          pull_number: pr.number
        });

        feedback.push(...reviews.map(r => ({
          pr: pr.number,
          state: r.state,
          body: r.body
        })));
      } catch (error) {
        console.warn(`Could not fetch reviews for PR #${pr.number}`);
      }
    }

    return feedback;
  }

  /**
   * Build analysis prompt for Gemini
   */
  buildAnalysisPrompt(metricsHistory, reviewFeedback) {
    return `You are analyzing performance metrics for an AI development bot to suggest improvements.

Performance Metrics (Last ${metricsHistory.length} measurements):
${JSON.stringify(metricsHistory, null, 2)}

Recent Human Review Feedback:
${JSON.stringify(reviewFeedback.slice(0, 10), null, 2)}

Analyze the data and provide recommendations in these areas:

1. **Configuration Changes**: Settings that should be adjusted
2. **Prompt Improvements**: Ways to improve AI prompts for better code quality
3. **Process Optimizations**: Workflow or process improvements
4. **Priority Adjustments**: Changes to task prioritization strategy

For each suggestion, provide:
- Category (config|prompt|process|priority)
- Description
- Rationale based on data
- Expected impact (high|medium|low)
- Implementation approach

Format your response as:

SUGGESTION: [Category] - [Brief title]
RATIONALE: [Why this change would help based on metrics]
IMPACT: [high|medium|low]
IMPLEMENTATION:
[Specific steps or changes needed]

---

Provide 3-5 concrete, actionable suggestions.`;
  }

  /**
   * Parse suggestions from Gemini response
   */
  parseSuggestions(responseText) {
    const suggestions = [];
    const sections = responseText.split('---').filter(s => s.trim());

    sections.forEach(section => {
      const titleMatch = section.match(/SUGGESTION:\s*\[(\w+)\]\s*-\s*(.+)/);
      const rationaleMatch = section.match(/RATIONALE:\s*([\s\S]+?)(?=IMPACT:|$)/);
      const impactMatch = section.match(/IMPACT:\s*(\w+)/);
      const implMatch = section.match(/IMPLEMENTATION:\s*([\s\S]+?)$/);

      if (titleMatch) {
        suggestions.push({
          category: titleMatch[1].toLowerCase(),
          title: titleMatch[2].trim(),
          rationale: rationaleMatch ? rationaleMatch[1].trim() : '',
          impact: impactMatch ? impactMatch[1].toLowerCase() : 'medium',
          implementation: implMatch ? implMatch[1].trim() : ''
        });
      }
    });

    return {
      timestamp: new Date().toISOString(),
      suggestions
    };
  }

  /**
   * Create improvement proposal issue
   */
  async createImprovementIssue(suggestions) {
    console.log('📝 Creating improvement proposal issue...');

    try {
      const body = this.formatImprovementIssue(suggestions);

      const { data: issue } = await this.octokit.issues.create({
        owner: this.owner,
        repo: this.repo,
        title: `🤖 Bot Self-Improvement Proposal - ${new Date().toISOString().split('T')[0]}`,
        body,
        labels: ['bot-improvement', 'ai-generated', 'needs-review']
      });

      console.log(`✅ Created improvement issue #${issue.number}`);
      console.log(`🔗 ${issue.html_url}`);

      return issue;
    } catch (error) {
      console.error('Error creating improvement issue:', error.message);
      throw error;
    }
  }

  /**
   * Format improvement issue body
   */
  formatImprovementIssue(suggestions) {
    let body = `## 🤖 Bot Self-Improvement Proposal

**Generated:** ${suggestions.timestamp}
**Analysis Period:** Last ${suggestions.suggestions.length} metrics collections

### Overview

Based on recent performance analysis, the bot has identified opportunities for improvement.

### Suggestions

`;

    suggestions.suggestions.forEach((s, i) => {
      body += `
#### ${i + 1}. ${s.title}

**Category:** ${s.category}  
**Impact:** ${s.impact}

**Rationale:**
${s.rationale}

**Implementation:**
${s.implementation}

---

`;
    });

    body += `
### Next Steps

1. Review suggestions above
2. Approve changes that align with project goals
3. Bot will create PR with approved changes (or manual implementation)
4. Test changes in development environment
5. Monitor impact after deployment

---
🤖 This improvement proposal was auto-generated by the AI-Dev-Bot self-improvement module.
`;

    return body;
  }
}

// CLI interface
const command = process.argv[2];
const selfImprovement = new SelfImprovement();

if (command === 'collect-metrics') {
  const sprint = process.argv.find(arg => arg.startsWith('--sprint='))?.split('=')[1];
  selfImprovement.collectMetrics(sprint)
    .then(metrics => {
      console.log('\n📊 Metrics Summary:');
      console.log(JSON.stringify(metrics, null, 2));
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}
else if (command === 'analyze') {
  selfImprovement.analyzeAndSuggest()
    .then(suggestions => {
      if (suggestions) {
        console.log('\n💡 Suggestions:');
        console.log(JSON.stringify(suggestions, null, 2));
      }
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}
else if (command === 'propose') {
  selfImprovement.analyzeAndSuggest()
    .then(suggestions => {
      if (suggestions && suggestions.suggestions.length > 0) {
        return selfImprovement.createImprovementIssue(suggestions);
      }
    })
    .catch(error => {
      console.error('❌ Failed:', error.message);
      process.exit(1);
    });
}
else {
  console.log(`
AI-Dev-Bot Self-Improvement Module

Usage:
  node self-improvement.js collect-metrics [--sprint=N]
    Collect performance metrics from issues and PRs

  node self-improvement.js analyze
    Analyze patterns and suggest improvements

  node self-improvement.js propose
    Analyze and create improvement proposal issue

Examples:
  node self-improvement.js collect-metrics --sprint=1
  node self-improvement.js analyze
  node self-improvement.js propose
`);
}

export default SelfImprovement;
