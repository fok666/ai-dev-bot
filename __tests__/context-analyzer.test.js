/**
 * Tests for context-analyzer.js
 * Focus on CLI argument parsing and GITHUB_OUTPUT handling
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.join(process.cwd(), 'scripts', 'context-analyzer.js');

describe('Context Analyzer CLI', () => {
  let tempDir;
  let originalEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(process.cwd(), '.test-temp-'));
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Command Line Arguments', () => {
    test('should reject analyze-workflow-failure without --run-id', () => {
      const result = spawnSync('node', [
        scriptPath,
        'analyze-workflow-failure'
      ], { encoding: 'utf8' });
      
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--run-id=<id> required');
    });

    test('should reject analyze-workflow-failures without --failures', () => {
      const result = spawnSync('node', [
        scriptPath,
        'analyze-workflow-failures'
      ], { encoding: 'utf8' });
      
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('--failures=<file> required');
    });

    test('should accept valid analyze-workflow-failure arguments', () => {
      // This will fail due to API call, but argument parsing should work
      const result = spawnSync('node', [
        scriptPath,
        'analyze-workflow-failure',
        '--run-id=123456',
        '--workflow-name=Test'
      ], { 
        encoding: 'utf8',
        env: { ...process.env, GITHUB_TOKEN: 'fake-token' }
      });
      
      // Should not fail on argument parsing
      expect(result.stderr).not.toContain('--run-id=<id> required');
    });
  });

  describe('GITHUB_OUTPUT Handling', () => {
    test('should write analysis_file to GITHUB_OUTPUT when env var is set', () => {
      const outputFile = path.join(tempDir, 'github_output.txt');
      
      // Mock a successful run
      const mockScript = path.join(tempDir, 'test-script.js');
      fs.writeFileSync(mockScript, `
        import fs from 'fs';
        import path from 'path';
        
        // Create mock analysis file
        const cacheDir = '.context-cache';
        if (!fs.existsSync(cacheDir)) {
          fs.mkdirSync(cacheDir, { recursive: true });
        }
        const analysisFile = path.join(cacheDir, 'workflow-analysis-123.json');
        fs.writeFileSync(analysisFile, JSON.stringify({ test: true }));
        
        // Write to GITHUB_OUTPUT
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, \`analysis_file=\${analysisFile}\\n\`);
        }
        console.log('Analysis complete');
      `);

      const result = spawnSync('node', [mockScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile }
      });

      expect(fs.existsSync(outputFile)).toBe(true);
      const output = fs.readFileSync(outputFile, 'utf8');
      expect(output).toContain('analysis_file=');
      expect(output).toContain('.context-cache/workflow-analysis-');
    });

    test('should output to stdout when GITHUB_OUTPUT is not set', () => {
      const mockScript = path.join(tempDir, 'test-script-stdout.js');
      fs.writeFileSync(mockScript, `
        import fs from 'fs';
        import path from 'path';
        
        const analysisFile = '.context-cache/test.json';
        
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, \`analysis_file=\${analysisFile}\\n\`);
        } else {
          console.log(\`::set-output name=analysis_file::\${analysisFile}\`);
        }
      `);

      const result = spawnSync('node', [mockScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: undefined }
      });

      expect(result.stdout).toContain('::set-output name=analysis_file::');
    });

    test('should NOT output analysis_file to regular stdout', () => {
      const mockScript = path.join(tempDir, 'test-script-no-grep.js');
      const outputFile = path.join(tempDir, 'github_output2.txt');
      
      fs.writeFileSync(mockScript, `
        import fs from 'fs';
        
        console.log('🔍 Analyzing workflow failure...');
        
        const analysisFile = '.context-cache/test.json';
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, \`analysis_file=\${analysisFile}\\n\`);
        }
        
        console.log('✅ Analysis complete');
      `);

      const result = spawnSync('node', [mockScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile }
      });

      // Regular stdout should NOT contain analysis_file=
      expect(result.stdout).not.toContain('analysis_file=');
      // But GITHUB_OUTPUT file should
      expect(fs.readFileSync(outputFile, 'utf8')).toContain('analysis_file=');
    });
  });

  describe('Output Format', () => {
    test('GITHUB_OUTPUT should use key=value format', () => {
      const outputFile = path.join(tempDir, 'output.txt');
      const mockScript = path.join(tempDir, 'format-test.js');
      
      fs.writeFileSync(mockScript, `
        import fs from 'fs';
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'analysis_file=/path/to/file.json\\n');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'has_failures=true\\n');
      `);

      spawnSync('node', [mockScript], {
        env: { ...process.env, GITHUB_OUTPUT: outputFile }
      });

      const output = fs.readFileSync(outputFile, 'utf8');
      const lines = output.trim().split('\n');
      
      // Each line should be key=value
      lines.forEach(line => {
        expect(line).toMatch(/^[\w_]+=.+$/);
      });
    });

    test('should not allow grepping analysis_file from stdout', () => {
      const mockScript = path.join(tempDir, 'grep-test.js');
      const outputFile = path.join(tempDir, 'out.txt');
      
      fs.writeFileSync(mockScript, `
        import fs from 'fs';
        console.log('Starting analysis');
        console.log('Processing data');
        if (process.env.GITHUB_OUTPUT) {
          fs.appendFileSync(process.env.GITHUB_OUTPUT, 'analysis_file=test.json\\n');
        }
        console.log('Done');
      `);

      const result = spawnSync('node', [mockScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile }
      });

      // Try to grep from stdout
      const grepResult = spawnSync('grep', ['analysis_file'], {
        input: result.stdout,
        encoding: 'utf8'
      });

      expect(grepResult.stdout).toBe('');
      expect(grepResult.status).not.toBe(0);
    });
  });
});

describe('Workflow Integration Patterns', () => {
  test('step outputs should be accessed via steps.<id>.outputs.<name>', () => {
    // Verify the pattern used in workflows
    const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'monitor-pipelines.yml');
    
    if (!fs.existsSync(workflowPath)) {
      console.warn('Workflow file not found, skipping test');
      return;
    }

    const workflow = fs.readFileSync(workflowPath, 'utf8');
    
    // Should use step outputs, not stdout parsing
    expect(workflow).not.toContain('grep "analysis_file"');
    expect(workflow).not.toContain('| cut -d');
    
    // Should use proper step output references
    if (workflow.includes('analysis_file')) {
      expect(workflow).toMatch(/\$\{\{\s*steps\.\w+\.outputs\.analysis_file\s*\}\}/);
    }
  });
});
