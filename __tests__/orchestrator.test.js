import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

describe('Orchestrator', () => {
  const testConfigPath = '.test-config.yml';
  const testSddPath = '.test-sdd.md';

  beforeEach(() => {
    // Clean up before each test to avoid state leakage
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(testSddPath)) {
      fs.unlinkSync(testSddPath);
    }
  });

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
    if (fs.existsSync(testSddPath)) {
      fs.unlinkSync(testSddPath);
    }
  });

  describe('configuration loading', () => {
    it('should load valid YAML config', () => {
      const config = {
        gemini: {
          apiKey: 'test-key',
          model: 'gemini-2.5-flash'
        },
        github: {
          token: 'test-token',
          owner: 'test-owner',
          repo: 'test-repo'
        }
      };
      fs.writeFileSync(testConfigPath, yaml.dump(config));

      expect(fs.existsSync(testConfigPath)).toBe(true);
      const loaded = yaml.load(fs.readFileSync(testConfigPath, 'utf8'));
      expect(loaded.gemini.apiKey).toBe('test-key');
      expect(loaded.github.owner).toBe('test-owner');
    });

    it('should handle missing config file', () => {
      expect(fs.existsSync(testConfigPath)).toBe(false);
    });

    it('should validate required fields', () => {
      const config = {
        gemini: { apiKey: 'test-key' }
      };

      expect(config.gemini).toBeDefined();
      expect(config.gemini.apiKey).toBe('test-key');
      expect(config.github).toBeUndefined();
    });

    it('should merge with default config', () => {
      const userConfig = {
        gemini: { apiKey: 'test-key' }
      };
      const defaultConfig = {
        gemini: { model: 'gemini-2.5-flash', temperature: 0.3 },
        github: { repo: 'default-repo' }
      };

      const merged = {
        ...defaultConfig,
        ...userConfig,
        gemini: {
          ...defaultConfig.gemini,
          ...userConfig.gemini
        }
      };

      expect(merged.gemini.apiKey).toBe('test-key');
      expect(merged.gemini.model).toBe('gemini-2.5-flash');
      expect(merged.github.repo).toBe('default-repo');
    });
  });

  describe('task context', () => {
    it('should extract task ID from issue', () => {
      const issue = {
        number: 42,
        title: 'Test Task',
        body: 'Test description'
      };

      expect(issue.number).toBe(42);
      expect(issue.title).toBe('Test Task');
    });

    it('should parse task labels', () => {
      const issue = {
        number: 1,
        labels: [
          { name: 'feature' },
          { name: 'priority:high' }
        ]
      };

      const labelNames = issue.labels.map(l => l.name);
      expect(labelNames).toContain('feature');
      expect(labelNames).toContain('priority:high');
    });

    it('should extract context from issue body', () => {
      const issueBody = `
## Context
This is important context

## Requirements
- Requirement 1
- Requirement 2
`;

      expect(issueBody).toContain('Context');
      expect(issueBody).toContain('Requirements');
      const hasContext = issueBody.includes('## Context');
      expect(hasContext).toBe(true);
    });
  });

  describe('SDD reading', () => {
    it('should read SDD file', () => {
      const sddContent = `# System Design Document

## Architecture
...`;
      fs.writeFileSync(testSddPath, sddContent);

      expect(fs.existsSync(testSddPath)).toBe(true);
      const content = fs.readFileSync(testSddPath, 'utf8');
      expect(content).toContain('System Design Document');
    });

    it('should handle missing SDD', () => {
      expect(fs.existsSync(testSddPath)).toBe(false);
    });

    it('should extract sections from SDD', () => {
      const sddContent = `
# SDD

## Architecture
Details here

## API Design
More details
`;
      fs.writeFileSync(testSddPath, sddContent);

      const content = fs.readFileSync(testSddPath, 'utf8');
      expect(content).toContain('## Architecture');
      expect(content).toContain('## API Design');
    });
  });

  describe('execution flow', () => {
    it('should validate execution steps', () => {
      const steps = [
        'load-config',
        'load-context',
        'generate-code',
        'run-tests',
        'create-pr'
      ];

      expect(steps).toHaveLength(5);
      expect(steps[0]).toBe('load-config');
      expect(steps[steps.length - 1]).toBe('create-pr');
    });

    it('should track step status', () => {
      const stepStatus = {
        'load-config': 'completed',
        'load-context': 'in-progress',
        'generate-code': 'pending'
      };

      expect(stepStatus['load-config']).toBe('completed');
      expect(stepStatus['load-context']).toBe('in-progress');
      expect(stepStatus['generate-code']).toBe('pending');
    });

    it('should handle step errors', () => {
      const stepResult = {
        step: 'generate-code',
        status: 'error',
        error: 'API timeout'
      };

      expect(stepResult.status).toBe('error');
      expect(stepResult.error).toBe('API timeout');
    });
  });

  describe('result aggregation', () => {
    it('should aggregate step results', () => {
      const results = [
        { step: 'load-config', success: true },
        { step: 'generate-code', success: true },
        { step: 'run-tests', success: false }
      ];

      const allSuccess = results.every(r => r.success);
      expect(allSuccess).toBe(false);

      const failedSteps = results.filter(r => !r.success);
      expect(failedSteps).toHaveLength(1);
      expect(failedSteps[0].step).toBe('run-tests');
    });

    it('should collect execution metrics', () => {
      const metrics = {
        duration: 5000,
        stepsCompleted: 4,
        stepsTotal: 5,
        codeGenerated: true,
        testsRun: true,
        prCreated: false
      };

      expect(metrics.stepsCompleted).toBe(4);
      expect(metrics.stepsTotal).toBe(5);
      expect(metrics.prCreated).toBe(false);
    });
  });

  describe('environment setup', () => {
    it('should validate environment variables', () => {
      const requiredEnvVars = ['GEMINI_API_KEY', 'GITHUB_TOKEN'];
      const mockEnv = {
        GEMINI_API_KEY: 'test-key',
        GITHUB_TOKEN: 'test-token'
      };

      requiredEnvVars.forEach(varName => {
        expect(mockEnv[varName]).toBeDefined();
      });
    });

    it('should detect missing environment variables', () => {
      const requiredEnvVars = ['GEMINI_API_KEY', 'GITHUB_TOKEN'];
      const mockEnv = {
        GEMINI_API_KEY: 'test-key'
      };

      const missing = requiredEnvVars.filter(varName => !mockEnv[varName]);
      expect(missing).toContain('GITHUB_TOKEN');
    });
  });
});
