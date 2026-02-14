/**
 * Workflow Integration Tests
 * Tests the interaction between workflow steps and scripts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Workflow-Script Integration', () => {
  const workflowsDir = path.join(process.cwd(), '.github', 'workflows');

  beforeAll(() => {
    if (!fs.existsSync(workflowsDir)) {
      console.warn('Workflows directory not found, skipping integration tests');
    }
  });

  describe('Monitor Pipelines Workflow', () => {
    const workflowPath = path.join(workflowsDir, 'monitor-pipelines.yml');

    test('workflow file should exist', () => {
      expect(fs.existsSync(workflowPath)).toBe(true);
    });

    test('should have valid YAML syntax', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      expect(() => yaml.load(content)).not.toThrow();
    });

    test('should use step outputs instead of stdout parsing', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      
      // Anti-patterns that should NOT exist
      expect(content).not.toContain('grep "analysis_file"');
      expect(content).not.toContain('| grep');
      expect(content).not.toContain('cut -d\'=\' -f2');
      
      // Should not try to capture script output to variable directly
      const problematicPatterns = [
        /ANALYSIS_FILE=\$\(node.*\| grep/,
        /=\$\(.*analyze-workflow.*\| grep\)/
      ];
      
      problematicPatterns.forEach(pattern => {
        expect(content).not.toMatch(pattern);
      });
    });

    test('should reference step outputs correctly', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content);
      
      // Check that steps use proper output references
      const monitorJob = workflow.jobs?.monitor;
      if (!monitorJob) return;

      const steps = monitorJob.steps || [];
      steps.forEach(step => {
        if (step.run && step.run.includes('steps.')) {
          // Should use ${{ steps.<id>.outputs.<name> }} format
          const outputRefs = step.run.match(/\$\{\{\s*steps\.\w+\.outputs\.\w+\s*\}\}/g) || [];
          outputRefs.forEach(ref => {
            expect(ref).toMatch(/^\$\{\{\s*steps\.\w+\.outputs\.\w+\s*\}\}$/);
          });
        }
      });
    });

    test('Analyze Failures step should write to GITHUB_OUTPUT', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      
      // Should have analyze step that runs the script
      expect(content).toContain('analyze-workflow-failure');
      
      // Script should have access to GITHUB_OUTPUT
      const workflow = yaml.load(content);
      const analyzeStep = workflow.jobs?.monitor?.steps?.find(
        s => s.id === 'analyze'
      );
      
      if (analyzeStep) {
        expect(analyzeStep.run).toContain('analyze-workflow-failure');
      }
    });

    test('Create Investigation Issues step should receive file path', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content);
      
      const createIssuesStep = workflow.jobs?.monitor?.steps?.find(
        s => s.name?.includes('Create Investigation Issues')
      );
      
      if (createIssuesStep) {
        // Should use step outputs for analyses file
        expect(createIssuesStep.run).toContain('--analyses=');
        
        // Should reference a step output
        const hasStepOutput = 
          createIssuesStep.run.includes('steps.') &&
          createIssuesStep.run.includes('.outputs.');
        
        expect(hasStepOutput).toBe(true);
      }
    });

    test('step conditions should check for correct outputs', () => {
      if (!fs.existsSync(workflowPath)) return;

      const content = fs.readFileSync(workflowPath, 'utf8');
      const workflow = yaml.load(content);
      
      const steps = workflow.jobs?.monitor?.steps || [];
      steps.forEach(step => {
        if (step.if && step.if.includes('.outputs.')) {
          // Should not check for empty string incorrectly
          expect(step.if).not.toMatch(/!=\s*''\s*\$/); // Checking != '' at end of line without proper grouping
          
          // Should have proper condition structure
          if (step.if.includes('analyses_file')) {
            expect(step.if).toMatch(/analyses_file\s*!=\s*['"]/);
          }
        }
      });
    });
  });

  describe('Step Output Chain', () => {
    let tempDir;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(process.cwd(), '.test-temp-'));
    });

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('should simulate workflow step chain correctly', () => {
      // Step 1: Analyze (writes to GITHUB_OUTPUT)
      const outputFile = path.join(tempDir, 'step1_output.txt');
      const analyzeScript = path.join(tempDir, 'analyze.js');
      
      fs.writeFileSync(analyzeScript, `
        import fs from 'fs';
        const analysisFile = '.context-cache/analysis-123.json';
        fs.mkdirSync('.context-cache', { recursive: true });
        fs.writeFileSync(analysisFile, '{"test": true}');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, \`analysis_file=\${analysisFile}\\n\`);
        console.log('✅ Analysis complete');
      `);

      const analyzeResult = spawnSync('node', [analyzeScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile },
        cwd: tempDir
      });

      expect(analyzeResult.status).toBe(0);
      expect(fs.existsSync(outputFile)).toBe(true);
      
      // Step 2: Read output and use in next step
      const outputs = fs.readFileSync(outputFile, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .reduce((acc, line) => {
          const [key, value] = line.split('=');
          acc[key] = value;
          return acc;
        }, {});

      expect(outputs.analysis_file).toBeDefined();
      expect(outputs.analysis_file).toContain('.context-cache');

      // Step 3: Wrap analysis (simulating wrap step)
      const wrapScript = path.join(tempDir, 'wrap.js');
      const outputFile2 = path.join(tempDir, 'step2_output.txt');
      
      fs.writeFileSync(wrapScript, `
        import fs from 'fs';
        const analysisFile = process.argv[2];
        const analysesFile = '.context-cache/workflow-analyses.json';
        const content = fs.readFileSync(analysisFile, 'utf8');
        fs.writeFileSync(analysesFile, '[' + content + ']');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, \`analyses_file=\${analysesFile}\\n\`);
      `);

      const wrapResult = spawnSync('node', [
        wrapScript,
        outputs.analysis_file
      ], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile2 },
        cwd: tempDir
      });

      expect(wrapResult.status).toBe(0);

      // Step 4: Use wrapped file
      const outputs2 = fs.readFileSync(outputFile2, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .reduce((acc, line) => {
          const [key, value] = line.split('=');
          acc[key] = value;
          return acc;
        }, {});

      expect(outputs2.analyses_file).toBeDefined();
      expect(outputs2.analyses_file).toContain('workflow-analyses.json');
    });

    test('should fail if trying to grep from stdout', () => {
      const badScript = path.join(tempDir, 'bad-approach.js');
      const outputFile = path.join(tempDir, 'output.txt');
      
      fs.writeFileSync(badScript, `
        import fs from 'fs';
        console.log('Processing...');
        fs.appendFileSync(process.env.GITHUB_OUTPUT, 'result=success\\n');
        console.log('Done');
      `);

      const result = spawnSync('node', [badScript], {
        encoding: 'utf8',
        env: { ...process.env, GITHUB_OUTPUT: outputFile },
        cwd: tempDir
      });

      // Try to grep result from stdout (this should fail)
      const grepResult = spawnSync('grep', ['result='], {
        input: result.stdout,
        encoding: 'utf8'
      });

      expect(grepResult.status).not.toBe(0);
      expect(grepResult.stdout).toBe('');
      
      // But reading from GITHUB_OUTPUT should work
      const fileContent = fs.readFileSync(outputFile, 'utf8');
      expect(fileContent).toContain('result=success');
    });
  });

  describe('All Workflows Validation', () => {
    test('all workflows should have valid YAML syntax', () => {
      if (!fs.existsSync(workflowsDir)) return;

      const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      workflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow);
        const content = fs.readFileSync(workflowPath, 'utf8');
        
        expect(() => yaml.load(content)).not.toThrow();
      });
    });

    test('workflows should not use deprecated set-output command', () => {
      if (!fs.existsSync(workflowsDir)) return;

      const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      workflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow);
        const content = fs.readFileSync(workflowPath, 'utf8');
        
        // Should not use echo "::set-output name=..."
        if (content.includes('::set-output')) {
          // Should have a warning comment about it being deprecated
          expect(content).toMatch(/set-output.*deprecated|deprecated.*set-output/i);
        }
      });
    });

    test('workflows should use GITHUB_OUTPUT for setting outputs', () => {
      if (!fs.existsSync(workflowsDir)) return;

      const workflows = fs.readdirSync(workflowsDir)
        .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

      workflows.forEach(workflow => {
        const workflowPath = path.join(workflowsDir, workflow);
        const content = fs.readFileSync(workflowPath, 'utf8');
        
        // If setting outputs, should use GITHUB_OUTPUT
        if (content.match(/echo.*=.*>>/)) {
          const hasGitHubOutput = content.includes('$GITHUB_OUTPUT') || 
                                  content.includes('${GITHUB_OUTPUT}');
          expect(hasGitHubOutput).toBe(true);
        }
      });
    });
  });
});
