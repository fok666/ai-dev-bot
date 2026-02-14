#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';
import { getGeminiService } from './gemini-service.js';

/**
 * Context Analyzer - Analyzes repository context and PR changes
 */
class ContextAnalyzer {
  constructor() {
    this.octokit = new Octokit({
      auth: process.env.GH_API_TOKEN || process.env.GITHUB_TOKEN
    });

    const repoEnv = process.env.GITHUB_REPOSITORY || '';
    const [owner, repo] = repoEnv.split('/');
    this.owner = owner ||'kornfer';
    this.repo = repo || 'ai-dev-bot';
    
    // Initialize Gemini for failure analysis
    if (process.env.GEMINI_API_KEY) {
      this.gemini = getGeminiService();
    }
  }

  /**
   * Load bot configuration
   */
  loadConfig() {
    const configPath = path.join(process.cwd(), '.github', 'ai-bot-config.yml');
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    try {
      const configContent = fs.readFileSync(configPath, 'utf8');
      return yaml.load(configContent);
    } catch (error) {
      console.warn('Could not load config:', error.message);
      return null;
    }
  }

  /**
   * Get list of repositories to monitor
   */
  getConfiguredRepos() {
    const config = this.loadConfig();
    
    if (!config || !config.repositories || config.repositories.length === 0) {
      // Default to current repository
      return [{ owner: this.owner, repo: this.repo, priority: 'high', enabled: true }];
    }
    
    return config.repositories
      .filter(r => r.enabled !== false)
      .map(r => {
        const [owner, repo] = r.name.split('/');
        return { 
          owner, 
          repo, 
          priority: r.priority || 'medium',
          enabled: r.enabled !== false
        };
      });
  }

  /**
   * Analyze PR changes
   */
  async analyzePR(prNumber) {
    try {
      console.log(`🔍 Analyzing PR #${prNumber}...`);

      // Get PR details
      const { data: pr } = await this.octokit.pulls.get({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      // Get PR files
      const { data: files } = await this.octokit.pulls.listFiles({
        owner: this.owner,
        repo: this.repo,
        pull_number: prNumber
      });

      const analysis = {
        pr: {
          number: pr.number,
          title: pr.title,
          body: pr.body,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files
        },
        files: files.map(f => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
          changes: f.changes
        }))
      };

      console.log(`✅ Analyzed: ${files.length} files, +${pr.additions}/-${pr.deletions} lines`);

      // Save analysis
      const tempDir = path.join(process.cwd(), '.context-cache');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const analysisFile = path.join(tempDir, `pr-analysis-${prNumber}.json`);
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

      return analysis;
    } catch (error) {
      console.error('Error analyzing PR:', error.message);
      throw error;
    }
  }

  /**
   * Scan for failed workflow runs
   */
  async scanPipelines(lookbackHours = 24) {
    try {
      console.log(`🔍 Scanning for failed workflows in last ${lookbackHours} hours...`);

      const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();

      // Get workflow runs
      const { data: workflowRuns } = await this.octokit.actions.listWorkflowRunsForRepo({
        owner: this.owner,
        repo: this.repo,
        status: 'failure',
        per_page: 100
      });

      // Filter by date
      const recentFailures = workflowRuns.workflow_runs.filter(run =>
        new Date(run.created_at) > new Date(sinceDate)
      );

      console.log(`✅ Found ${recentFailures.length} failed workflows`);

      if (recentFailures.length > 0) {
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_failures=true\n');
        } else {
          console.log('::set-output name=has_failures::true');
        }
        
        const failuresFile = path.join(process.cwd(), '.context-cache', 'failures.json');
        const tempDir = path.dirname(failuresFile);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(failuresFile, JSON.stringify(recentFailures, null, 2));
        
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, `failures_file=${failuresFile}\n`);
        } else {
          console.log(`::set-output name=failures_file::${failuresFile}`);
        }
      } else {
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_failures=false\n');
        } else {
          console.log('::set-output name=has_failures::false');
        }
      }

      return recentFailures;
    } catch (error) {
      console.error('Error scanning pipelines:', error.message);
      throw error;
    }
  }

  /**
   * Scan pipelines across all configured repositories
   */
  async scanPipelinesMultiRepo(lookbackHours = 24) {
    try {
      console.log(`🔍 Scanning pipelines across all configured repositories...`);
      console.log(`   Lookback: ${lookbackHours} hours`);
      
      const repos = this.getConfiguredRepos();
      console.log(`   Repositories to check: ${repos.length}`);
      console.log('');
      
      const allFailures = [];
      const sinceDate = new Date(Date.now() - lookbackHours * 60 * 60 * 1000).toISOString();
      
      for (const repoConfig of repos) {
        console.log(`📦 Checking ${repoConfig.owner}/${repoConfig.repo} (priority: ${repoConfig.priority})...`);
        
        try {
          const { data: workflowRuns } = await this.octokit.actions.listWorkflowRunsForRepo({
            owner: repoConfig.owner,
            repo: repoConfig.repo,
            status: 'failure',
            per_page: 50
          });
          
          const recentFailures = workflowRuns.workflow_runs
            .filter(run => new Date(run.created_at) > new Date(sinceDate))
            .map(run => ({
              ...run,
              _repo_owner: repoConfig.owner,
              _repo_name: repoConfig.repo,
              _repo_priority: repoConfig.priority
            }));
          
          console.log(`   Found ${recentFailures.length} recent failure(s)`);
          allFailures.push(...recentFailures);
          
        } catch (error) {
          console.error(`   ✗ Error scanning ${repoConfig.owner}/${repoConfig.repo}:`, error.message);
        }
      }
      
      console.log('');
      console.log(`✅ Total failures found across all repositories: ${allFailures.length}`);
      
      if (allFailures.length > 0) {
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_failures=true\n');
        } else {
          console.log('::set-output name=has_failures::true');
        }
        
        const failuresFile = path.join(process.cwd(), '.context-cache', 'failures-multi-repo.json');
        const tempDir = path.dirname(failuresFile);
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        
        fs.writeFileSync(failuresFile, JSON.stringify(allFailures, null, 2));
        
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, `failures_file=${failuresFile}\n`);
        } else {
          console.log(`::set-output name=failures_file::${failuresFile}`);
        }
        
        // Output summary
        console.log('');
        console.log('📊 Failure breakdown by repository:');
        const byRepo = {};
        allFailures.forEach(f => {
          const key = `${f._repo_owner}/${f._repo_name}`;
          byRepo[key] = (byRepo[key] || 0) + 1;
        });
        Object.entries(byRepo).forEach(([repo, count]) => {
          console.log(`   ${repo}: ${count} failure(s)`);
        });
      } else {
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_failures=false\n');
        } else {
          console.log('::set-output name=has_failures::false');
        }
      }
      
      return allFailures;
    } catch (error) {
      console.error('Error scanning multi-repo pipelines:', error.message);
      throw error;
    }
  }

  /**
   * Analyze a specific workflow failure
   */
  async analyzeWorkflowFailure(runId, workflowName, targetOwner = null, targetRepo = null) {
    try {
      const owner = targetOwner || this.owner;
      const repo = targetRepo || this.repo;
      
      console.log(`🔍 Analyzing workflow failure: ${workflowName} (Run #${runId}) in ${owner}/${repo}...`);

      // Get workflow run details
      const { data: run } = await this.octokit.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId
      });

      // Get jobs for this run
      const { data: jobs } = await this.octokit.actions.listJobsForWorkflowRun({
        owner,
        repo,
        run_id: runId
      });

      const failedJobs = jobs.jobs.filter(job => job.conclusion === 'failure');

      // Get logs for failed jobs
      const logs = await this.getWorkflowLogs(runId, owner, repo);

      // Extract error messages
      const errors = this.extractErrorMessages(logs);

      // Get recent commits
      const { data: commits } = await this.octokit.repos.listCommits({
        owner,
        repo,
        sha: run.head_sha,
        per_page: 5
      });

      const context = {
        run: {
          id: run.id,
          name: run.name,
          status: run.status,
          conclusion: run.conclusion,
          html_url: run.html_url,
          created_at: run.created_at,
          head_branch: run.head_branch,
          head_sha: run.head_sha,
          // Preserve repository metadata
          _repo_owner: owner,
          _repo_name: repo
        },
        failedJobs: failedJobs.map(job => ({
          name: job.name,
          conclusion: job.conclusion,
          started_at: job.started_at,
          completed_at: job.completed_at
        })),
        errors,
        recentCommits: commits.slice(0, 3).map(c => ({
          sha: c.sha.substring(0, 7),
          message: c.commit.message.split('\n')[0],
          author: c.commit.author.name
        }))
      };

      // Analyze with Gemini if available
      let analysis = null;
      if (this.model) {
      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `analysis_file=${analysisFile}\n`);
      } else {
        console.log(`::set-output name=analysis_file::${analysisFile}`);
      }
      }

      const result = {
        ...context,
        analysis
      };

      // Save analysis
      const analysisFile = path.join(process.cwd(), '.context-cache', `workflow-analysis-${runId}.json`);
      fs.writeFileSync(analysisFile, JSON.stringify(result, null, 2));

      console.log(`✅ Analysis complete`);
      console.log(`::set-output name=analysis_file::${analysisFile}`);

      return result;
    } catch (error) {
      console.error('Error analyzing workflow failure:', error.message);
      throw error;
    }
  }

  /**
   * Get workflow logs
   */
  async getWorkflowLogs(runId, owner = null, repo = null) {
    try {
      const response = await this.octokit.actions.downloadWorkflowRunLogs({
        owner: owner || this.owner,
        repo: repo || this.repo,
        run_id: runId
      });

      // Response is a redirect URL or buffer
      // For simplicity, return placeholder
      return 'Logs would be downloaded and parsed here';
    } catch (error) {
      console.warn('Could not fetch workflow logs:', error.message);
      return '';
    }
  }

  /**
   * Extract error messages from logs
   */
  extractErrorMessages(logs) {
    const errorPatterns = [
      /Error:\s*(.+)/gi,
      /FAILED\s*(.+)/gi,
      /Exception:\s*(.+)/gi,
      /npm ERR!\s*(.+)/gi
    ];

    const errors = [];
    errorPatterns.forEach(pattern => {
      const matches = logs.matchAll(pattern);
      for (const match of matches) {
        errors.push(match[1].trim());
      }
    });

    return errors.slice(0, 10); // Limit to first 10 errors
  }

  /**
   * Analyze failure with Gemini
   */
  async analyzeWithGemini(context) {
    try {
      const prompt = `Analyze this GitHub Actions workflow failure:

Workflow: ${context.run.name}
Status: ${context.run.conclusion}
Branch: ${context.run.head_branch}

Failed Jobs:
${context.failedJobs.map(j => `- ${j.name}`).join('\n')}

Error Messages:
${context.errors.map(e => `- ${e}`).join('\n')}

Recent Commits:
${context.recentCommits.map(c => `- ${c.sha}: ${c.message} (${c.author})`).join('\n')}

Provide:
1. Root cause analysis (1-2 sentences)
2. Likely culprit (code|dependency|infrastructure|config)
3. Confidence level (high|medium|low)
4. Suggested fix (brief description)
5. Priority (critical|high|medium|low)

Format as:
ROOT_CAUSE: [analysis]
CULPRIT: [type]
CONFIDENCE: [level]
SUGGESTED_FIX: [description]
PRIORITY: [level]`;

      const response = await this.gemini.generate(prompt);

      return this.parseGeminiAnalysis(response);
    } catch (error) {
      console.warn('Gemini analysis failed:', error.message);
      return null;
    }
  }

  /**
   * Parse Gemini analysis response
   */
  parseGeminiAnalysis(text) {
    const rootCauseMatch = text.match(/ROOT_CAUSE:\s*(.+)/i);
    const culpritMatch = text.match(/CULPRIT:\s*(\w+)/i);
    const confidenceMatch = text.match(/CONFIDENCE:\s*(\w+)/i);
    const fixMatch = text.match(/SUGGESTED_FIX:\s*(.+)/i);
    const priorityMatch = text.match(/PRIORITY:\s*(\w+)/i);

    return {
      rootCause: rootCauseMatch ? rootCauseMatch[1].trim() : 'Unknown',
      culprit: culpritMatch ? culpritMatch[1].toLowerCase() : 'unknown',
      confidence: confidenceMatch ? confidenceMatch[1].toLowerCase() : 'low',
      suggestedFix: fixMatch ? fixMatch[1].trim() : 'Manual investigation required',
      priority: priorityMatch ? priorityMatch[1].toLowerCase() : 'medium'
    };
  }

  /**
   * Analyze multiple workflow failures
   */
  async analyzeWorkflowFailures(failuresFile) {
    try {
      console.log('🔍 Analyzing multiple workflow failures...');

      const failures = JSON.parse(fs.readFileSync(failuresFile, 'utf8'));
      const analyses = [];

      for (const failure of failures.slice(0, 5)) { // Limit to 5 most recent
        try {
          // Extract repository info from failure object (set by scanPipelinesMultiRepo)
          const targetOwner = failure._repo_owner || this.owner;
          const targetRepo = failure._repo_name || this.repo;
          
          const analysis = await this.analyzeWorkflowFailure(
            failure.id, 
            failure.name, 
            targetOwner, 
            targetRepo
          );
          analyses.push(analysis);
        } catch (error) {
          console.warn(`Failed to analyze workflow ${failure.id}:`, error.message);
        }
      }

      
      if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `analyses_file=${analysesFile}\n`);
      } else {
        console.log(`::set-output name=analyses_file::${analysesFile}`);
      }
      const analysesFile = path.join(process.cwd(), '.context-cache', 'workflow-analyses.json');
      fs.writeFileSync(analysesFile, JSON.stringify(analyses, null, 2));

      console.log(`✅ Analyzed ${analyses.length} failures`);
      console.log(`::set-output name=analyses_file::${analysesFile}`);

      return analyses;
    } catch (error) {
      console.error('Error analyzing workflow failures:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const analyzer = new ContextAnalyzer();

  try {
    switch (command) {
      case 'analyze-pr':
        const prNumber = process.argv.find(arg => arg.startsWith('--pr-number='))?.split('=')[1];
        if (!prNumber) {
          console.error('Error: --pr-number=<number> required');
          process.exit(1);
        }
        await analyzer.analyzePR(parseInt(prNumber));
        break;

      case 'scan-pipelines':
        const lookbackHours = process.argv.find(arg => arg.startsWith('--lookback-hours='))?.split('=')[1] || 24;
        await analyzer.scanPipelines(parseInt(lookbackHours));
        break;

      case 'scan-pipelines-multi-repo':
        const lookbackMulti = process.argv.find(arg => arg.startsWith('--lookback-hours='))?.split('=')[1] || 24;
        await analyzer.scanPipelinesMultiRepo(parseInt(lookbackMulti));
        break;

      case 'analyze-workflow-failure':
        const runId = process.argv.find(arg => arg.startsWith('--run-id='))?.split('=')[1];
        const workflowName = process.argv.find(arg => arg.startsWith('--workflow-name='))?.split('=')[1];
        if (!runId) {
          console.error('Error: --run-id=<id> required');
          process.exit(1);
        }
        await analyzer.analyzeWorkflowFailure(parseInt(runId), workflowName || 'Unknown');
        break;

      case 'analyze-workflow-failures':
        const failuresFile = process.argv.find(arg => arg.startsWith('--failures='))?.split('=')[1];
        if (!failuresFile) {
          console.error('Error: --failures=<file> required');
          process.exit(1);
        }
        await analyzer.analyzeWorkflowFailures(failuresFile);
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: analyze-pr, scan-pipelines, scan-pipelines-multi-repo, analyze-workflow-failure, analyze-workflow-failures');
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

export default ContextAnalyzer;
