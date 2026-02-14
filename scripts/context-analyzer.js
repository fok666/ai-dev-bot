#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { Octokit } from '@octokit/rest';

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

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: analyze-pr');
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
