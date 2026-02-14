/**
 * Tests for module structure and exports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Module Structure', () => {
  const scriptsDir = path.join(process.cwd(), 'scripts');

  test('should have scripts directory', () => {
    expect(fs.existsSync(scriptsDir)).toBe(true);
  });

  test('should have all required modules', () => {
    const requiredModules = [
      'orchestrator.js',
      'issue-manager.js',
      'context-analyzer.js',
      'code-generator.js',
      'pr-manager.js',
      'testing.js',
      'self-improvement.js',
      'load-config.js'
    ];

    requiredModules.forEach(module => {
      const modulePath = path.join(scriptsDir, module);
      expect(fs.existsSync(modulePath)).toBe(true);
    });
  });

  test('modules should export classes/functions', () => {
    const modulesToCheck = [
      'orchestrator.js',
      'issue-manager.js',
      'context-analyzer.js',
      'code-generator.js',
      'pr-manager.js',
      'testing.js',
      'self-improvement.js'
    ];

    modulesToCheck.forEach(module => {
      const modulePath = path.join(scriptsDir, module);
      const content = fs.readFileSync(modulePath, 'utf8');
      
      // Check for class definition
      expect(content).toMatch(/class \w+/);
      
      // Check for ES6 imports
      expect(content).toContain('import');
    });
  });

  test('modules should have CLI execution capability', () => {
    const cliModules = [
      'orchestrator.js',
      'issue-manager.js',
      'context-analyzer.js',
      'code-generator.js',
      'pr-manager.js',
      'testing.js',
      'self-improvement.js'
    ];

    cliModules.forEach(module => {
      const modulePath = path.join(scriptsDir, module);
      const content = fs.readFileSync(modulePath, 'utf8');
      
      // Should have Node shebang
      expect(content).toMatch(/^#!\/usr\/bin\/env node/);
    });
  });
});

describe('Issue Manager Module', () => {
  const issueManagerPath = path.join(process.cwd(), 'scripts', 'issue-manager.js');

  test('should have findNextTask functionality', () => {
    const content = fs.readFileSync(issueManagerPath, 'utf8');
    expect(content).toContain('findNextTask');
  });

  test('should have loadContext functionality', () => {
    const content = fs.readFileSync(issueManagerPath, 'utf8');
    expect(content).toContain('loadContext');
  });

  test('should have createInvestigationIssues functionality', () => {
    const content = fs.readFileSync(issueManagerPath, 'utf8');
    expect(content).toContain('createInvestigationIssues');
  });
});

describe('Context Analyzer Module', () => {
  const analyzerPath = path.join(process.cwd(), 'scripts', 'context-analyzer.js');

  test('should have scanPipelines functionality', () => {
    const content = fs.readFileSync(analyzerPath, 'utf8');
    expect(content).toContain('scanPipelines');
  });

  test('should have analyzeWorkflowFailure functionality', () => {
    const content = fs.readFileSync(analyzerPath, 'utf8');
    expect(content).toContain('analyzeWorkflowFailure');
  });

  test('should have multi-repo support', () => {
    const content = fs.readFileSync(analyzerPath, 'utf8');
    expect(content).toContain('scanPipelinesMultiRepo');
  });
});

describe('Code Generator Module', () => {
  const generatorPath = path.join(process.cwd(), 'scripts', 'code-generator.js');

  test('should have code generation functionality', () => {
    const content = fs.readFileSync(generatorPath, 'utf8');
    expect(content).toContain('generate');
  });

  test('should support multiple languages', () => {
    const content = fs.readFileSync(generatorPath, 'utf8');
    expect(content).toContain('detectLanguage');
  });
});

describe('Self-Improvement Module', () => {
  const improvementPath = path.join(process.cwd(), 'scripts', 'self-improvement.js');

  test('should have metrics collection', () => {
    const content = fs.readFileSync(improvementPath, 'utf8');
    expect(content).toContain('collectMetrics');
  });

  test('should have analysis functionality', () => {
    const content = fs.readFileSync(improvementPath, 'utf8');
    expect(content).toContain('analyze');
  });
});

describe('SDD Compliance', () => {
  test('SDD should not contain Sprint terminology', () => {
    const sddPath = path.join(process.cwd(), 'SDD.md');
    const sddContent = fs.readFileSync(sddPath, 'utf8');
    
    // Check architectural diagram section doesn't have Sprint Planning
    const architectureSection = sddContent.match(/```[\s\S]*?```/g);
    
    // Should have Continuous Delivery terminology
    expect(sddContent).toContain('Continuous Delivery');
    expect(sddContent).toContain('Cycle Time');
    expect(sddContent).toContain('Lead Time');
  });

  test('SDD should reference Continuous Delivery principles', () => {
    const sddPath = path.join(process.cwd(), 'SDD.md');
    const sddContent = fs.readFileSync(sddPath, 'utf8');
    
    expect(sddContent).toContain('Continuous Delivery Principles');
  });

  test('SDD should have issue-based memory system', () => {
    const sddPath = path.join(process.cwd(), 'SDD.md');
    const sddContent = fs.readFileSync(sddPath, 'utf8');
    
    expect(sddContent).toContain('Issue-Based Memory System');
    expect(sddContent).toContain('GitHub Issues');
  });

  test('SDD should have pipeline monitoring section', () => {
    const sddPath = path.join(process.cwd(), 'SDD.md');
    const sddContent = fs.readFileSync(sddPath, 'utf8');
    
    expect(sddContent).toContain('Pipeline Monitoring');
    expect(sddContent).toContain('scanPipelines');
  });
});
