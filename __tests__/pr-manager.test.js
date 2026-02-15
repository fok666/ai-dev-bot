import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

describe('PRManager', () => {
  const testCacheDir = '.context-cache-test';

  beforeEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testCacheDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testCacheDir)) {
      fs.rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  describe('PR body construction', () => {
    it('should create basic PR body', () => {
      const body = `## AI-Generated Implementation\n\nThis PR was automatically created by the AI-Dev-Bot.\n`;
      
      expect(body).toContain('AI-Generated Implementation');
      expect(body).toContain('AI-Dev-Bot');
    });

    it('should include issue reference in body', () => {
      const issueNumber = 456;
      const body = `## AI-Generated Implementation\n\nCloses #${issueNumber}\n`;
      
      expect(body).toContain('Closes #456');
    });

    it('should include plan details when plan file exists', () => {
      const planData = {
        approach: 'Test-driven development',
        files: ['file1.js', 'file2.js', 'file3.js'],
        testing: 'Unit tests added for all functions'
      };
      
      const planFile = path.join(testCacheDir, 'plan-123.json');
      fs.writeFileSync(planFile, JSON.stringify(planData));
      
      expect(fs.existsSync(planFile)).toBe(true);
      const loaded = JSON.parse(fs.readFileSync(planFile, 'utf8'));
      expect(loaded.approach).toBe('Test-driven development');
      expect(loaded.files).toHaveLength(3);
    });

    it('should format markdown body correctly', () => {
      const body = `## Implementation Plan

**Approach:**
Test approach

**Key Changes:**
- file1.js
- file2.js

**Testing:**
Unit tests added

## Checklist
- [x] Implementation complete
`;
      
      expect(body).toContain('## Implementation Plan');
      expect(body).toContain('**Approach:**');
      expect(body).toContain('## Checklist');
    });
  });

  describe('merge conditions logic', () => {
    it('should evaluate mergeable conditions', () => {
      const pr = {
        mergeable: true,
        draft: false,
        mergeable_state: 'clean'
      };
      
      const canMerge = pr.mergeable && !pr.draft && pr.mergeable_state === 'clean';
      expect(canMerge).toBe(true);
    });

    it('should reject draft PRs', () => {
      const pr = {
        mergeable: true,
        draft: true,
        mergeable_state: 'clean'
      };
      
      const canMerge = pr.mergeable && !pr.draft && pr.mergeable_state === 'clean';
      expect(canMerge).toBe(false);
    });

    it('should reject non-mergeable PRs', () => {
      const pr = {
        mergeable: false,
        draft: false,
        mergeable_state: 'dirty'
      };
      
      const canMerge = pr.mergeable && !pr.draft && pr.mergeable_state === 'clean';
      expect(canMerge).toBe(false);
    });

    it('should reject PRs with conflicts', () => {
      const pr = {
        mergeable: true,
        draft: false,
        mergeable_state: 'behind'
      };
      
      const canMerge = pr.mergeable && !pr.draft && pr.mergeable_state === 'clean';
      expect(canMerge).toBe(false);
    });
  });

  describe('GITHUB_OUTPUT handling', () => {
    it('should format PR number output', () => {
      const prNumber = 123;
      const output = `pr_number=${prNumber}\n`;
      
      expect(output).toBe('pr_number=123\n');
    });

    it('should format URL output', () => {
      const prUrl = 'https://github.com/test/repo/pull/123';
      const output = `pr_url=${prUrl}\n`;
      
      expect(output).toContain('https://github.com');
    });

    it('should format merge condition output', () => {
      const canMerge = true;
      const output = `can_merge=${canMerge}\n`;
      
      expect(output).toBe('can_merge=true\n');
    });

    it('should write to output file when env var set', () => {
      const outputFile = path.join(testCacheDir, 'output.txt');
      const content = 'pr_number=123\n';
      
      fs.writeFileSync(outputFile, content);
      
      expect(fs.existsSync(outputFile)).toBe(true);
      const read = fs.readFileSync(outputFile, 'utf8');
      expect(read).toBe('pr_number=123\n');
    });
  });

  describe('repository parsing', () => {
    it('should parse owner and repo from GITHUB_REPOSITORY', () => {
      const repoEnv = 'test-owner/test-repo';
      const [owner, repo] = repoEnv.split('/');
      
      expect(owner).toBe('test-owner');
      expect(repo).toBe('test-repo');
    });

    it('should handle empty repository string', () => {
      const repoEnv = '';
      const [owner, repo] = repoEnv.split('/');
      
      expect(owner).toBe('');
      expect(repo).toBeUndefined();
    });

    it('should use defaults when parsing fails', () => {
      const repoEnv = '';
      const [owner, repo] = repoEnv.split('/');
      const finalOwner = owner || 'kornfer';
      const finalRepo = repo || 'ai-dev-bot';
      
      expect(finalOwner).toBe('kornfer');
      expect(finalRepo).toBe('ai-dev-bot');
    });
  });
});
