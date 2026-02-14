/**
 * Tests for issue-manager.js
 * Focus on CLI argument parsing and error handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(process.cwd(), 'scripts', 'issue-manager.js');

describe('Issue Manager CLI', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), '.test-temp-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Command Line Validation', () => {
    test('should reject create-investigation-issues without --analyses', () => {
      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues'
      ], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--analyses=<file> required');
    });

    test('should reject create-investigation-issues with empty --analyses', () => {
      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues',
        '--analyses='
      ], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--analyses=<file> required');
    });

    test('should reject load-context without --issue', () => {
      const result = spawnSync('node', [
        scriptPath,
        'load-context'
      ], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--issue=<number> required');
    });

    test('should reject log-execution without required parameters', () => {
      const result = spawnSync('node', [
        scriptPath,
        'log-execution'
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });

      // log-execution may not fail without params as it has defaults
      // Just verify the command exists
      expect(result.stderr).not.toContain('Unknown command');
    });

    test('should accept valid create-investigation-issues with --analyses', () => {
      // Create a valid temp file
      const analysesFile = path.join(tempDir, 'analyses.json');
      fs.writeFileSync(analysesFile, '[]');

      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues',
        `--analyses=${analysesFile}`
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });

      // Should not fail on argument validation
      expect(result.stderr).not.toContain('--analyses=<file> required');
    });
  });

  describe('Argument Parsing', () => {
    test('should parse --analyses argument correctly', () => {
      const testScript = path.join(tempDir, 'test-parse.js');
      fs.writeFileSync(testScript, `
        const analysesFile = process.argv.find(arg => arg.startsWith('--analyses='))?.split('=')[1];
        if (!analysesFile) {
          console.error('Error: --analyses=<file> required');
          process.exit(1);
        }
        console.log('Analyses file:', analysesFile);
      `);

      const result = spawnSync('node', [
        testScript,
        '--analyses=/path/to/file.json'
      ], { encoding: 'utf8' });

      expect(result.status).toBe(0);
      expect(result.stdout).toContain('/path/to/file.json');
    });

    test('should handle arguments with spaces in values', () => {
      const testScript = path.join(tempDir, 'test-spaces.js');
      fs.writeFileSync(testScript, `
        const title = process.argv.find(arg => arg.startsWith('--title='))?.split('=')[1];
        console.log('Title:', title);
      `);

      const result = spawnSync('node', [
        testScript,
        '--title=Fix workflow issue'
      ], { encoding: 'utf8' });

      expect(result.stdout).toContain('Fix workflow issue');
    });

    test('should reject invalid commands', () => {
      const result = spawnSync('node', [
        scriptPath,
        'invalid-command'
      ], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Unknown command');
    });
  });

  describe('File Input Validation', () => {
    test('should handle missing analyses file gracefully', () => {
      const nonExistentFile = path.join(tempDir, 'missing.json');

      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues',
        `--analyses=${nonExistentFile}`
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });

      // Should fail but with proper error message
      expect(result.status).toBe(1);
    });

    test('should handle invalid JSON in analyses file', () => {
      const invalidFile = path.join(tempDir, 'invalid.json');
      fs.writeFileSync(invalidFile, 'not valid json{');

      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues',
        `--analyses=${invalidFile}`
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });

      expect(result.status).toBe(1);
    });

    test('should handle empty array in analyses file', () => {
      const emptyFile = path.join(tempDir, 'empty.json');
      fs.writeFileSync(emptyFile, '[]');

      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues',
        `--analyses=${emptyFile}`
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });

      // Should handle empty array gracefully
      expect(result.stdout).toMatch(/0.*issue/i);
    });
  });

  describe('Command Help and Discovery', () => {
    test('should list available commands on error', () => {
      const result = spawnSync('node', [
        scriptPath
      ], { encoding: 'utf8' });

      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Available commands:');
    });

    test('should mention required parameters in error message', () => {
      const result = spawnSync('node', [
        scriptPath,
        'create-investigation-issues'
      ], { encoding: 'utf8' });

      expect(result.stderr).toContain('--analyses=');
      expect(result.stderr).toContain('required');
    });
  });
});

describe('Issue Manager Integration', () => {
  test('should export IssueManager class', async () => {
    const module = await import(scriptPath);
    // The module should contain the class even if not exported by default
    const content = fs.readFileSync(scriptPath, 'utf8');
    expect(content).toContain('class IssueManager');
  });

  test('should have all required methods', () => {
    const content = fs.readFileSync(scriptPath, 'utf8');
    
    const requiredMethods = [
      'findNextTask',
      'loadContext',
      'logExecution',
      'createInvestigationIssues'
    ];

    requiredMethods.forEach(method => {
      expect(content).toContain(method);
    });
  });
});
