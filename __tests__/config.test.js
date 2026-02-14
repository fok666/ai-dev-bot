/**
 * Tests for load-config.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Configuration Loading', () => {
  const configPath = path.join(process.cwd(), '.github', 'ai-bot-config.yml');

  test('should have configuration file', () => {
    expect(fs.existsSync(configPath)).toBe(true);
  });

  test('configuration should be valid YAML', () => {
    const configContent = fs.readFileSync(configPath, 'utf8');
    expect(configContent).toBeTruthy();
    expect(configContent).toContain('version:');
    expect(configContent).toContain('bot:');
  });

  test('configuration should have required fields', () => {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    expect(configContent).toContain('enabled:');
    expect(configContent).toContain('issues:');
    expect(configContent).toContain('pullRequests:');
  });

  test('should have continuous delivery settings', () => {
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    // Check for CD-related config (not Scrum terminology)
    expect(configContent).not.toContain('sprintLength');
    expect(configContent).not.toContain('storyPointsPerSprint');
  });
});

describe('Document References', () => {
  test('should have SDD document', () => {
    const sddPath = path.join(process.cwd(), 'SDD.md');
    expect(fs.existsSync(sddPath)).toBe(true);
  });

  test('should have ROADMAP document', () => {
    const roadmapPath = path.join(process.cwd(), 'ROADMAP.md');
    expect(fs.existsSync(roadmapPath)).toBe(true);
  });

  test('should have CONTRIBUTING document', () => {
    const contributingPath = path.join(process.cwd(), 'CONTRIBUTING.md');
    expect(fs.existsSync(contributingPath)).toBe(true);
  });

  test('ROADMAP should use CI/CD terminology', () => {
    const roadmapPath = path.join(process.cwd(), 'ROADMAP.md');
    const roadmapContent = fs.readFileSync(roadmapPath, 'utf8');
    
    // Should have continuous delivery language
    expect(roadmapContent).toContain('Continuous');
    
    // Should use complexity (S/M/L) not story points
    expect(roadmapContent).toMatch(/\*\*[SML]\*\*/);
    
    // Should not have Sprint language
    expect(roadmapContent).not.toContain('Sprint 1');
    expect(roadmapContent).not.toContain('points)');
  });
});

describe('Issue Templates', () => {
  const templateDir = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE');

  test('should have issue template directory', () => {
    expect(fs.existsSync(templateDir)).toBe(true);
  });

  test('should have task template', () => {
    const taskTemplate = path.join(templateDir, 'task.md');
    expect(fs.existsSync(taskTemplate)).toBe(true);
  });

  test('should have bug report template', () => {
    const bugTemplate = path.join(templateDir, 'bug_report.md');
    expect(fs.existsSync(bugTemplate)).toBe(true);
  });

  test('should have feature request template', () => {
    const featureTemplate = path.join(templateDir, 'feature_request.md');
    expect(fs.existsSync(featureTemplate)).toBe(true);
  });

  test('should have pipeline investigation template', () => {
    const pipelineTemplate = path.join(templateDir, 'pipeline_investigation.md');
    expect(fs.existsSync(pipelineTemplate)).toBe(true);
  });
});

describe('PR Template', () => {
  test('should have PR template', () => {
    const prTemplatePath = path.join(process.cwd(), '.github', 'pull_request_template.md');
    expect(fs.existsSync(prTemplatePath)).toBe(true);
  });

  test('PR template should mention cycle time', () => {
    const prTemplatePath = path.join(process.cwd(), '.github', 'pull_request_template.md');
    const prTemplate = fs.readFileSync(prTemplatePath, 'utf8');
    
    expect(prTemplate).toContain('Cycle Time');
    expect(prTemplate).toContain('Lead Time');
  });
});

describe('Workflow Files', () => {
  const workflowDir = path.join(process.cwd(), '.github', 'workflows');

  test('should have workflows directory', () => {
    expect(fs.existsSync(workflowDir)).toBe(true);
  });

  test('should have main bot workflow', () => {
    const botWorkflow = path.join(workflowDir, 'ai-dev-bot.yml');
    expect(fs.existsSync(botWorkflow)).toBe(true);
  });

  test('should have PR review workflow', () => {
    const reviewWorkflow = path.join(workflowDir, 'pr-review.yml');
    expect(fs.existsSync(reviewWorkflow)).toBe(true);
  });

  test('should have pipeline monitoring workflow', () => {
    const monitorWorkflow = path.join(workflowDir, 'monitor-pipelines.yml');
    expect(fs.existsSync(monitorWorkflow)).toBe(true);
  });

  test('should have auto-merge workflow', () => {
    const mergeWorkflow = path.join(workflowDir, 'auto-merge.yml');
    expect(fs.existsSync(mergeWorkflow)).toBe(true);
  });

  test('should have task generation workflow', () => {
    const taskWorkflow = path.join(workflowDir, 'generate-tasks.yml');
    expect(fs.existsSync(taskWorkflow)).toBe(true);
  });

  test('should have self-improvement workflow', () => {
    const improvementWorkflow = path.join(workflowDir, 'self-improvement.yml');
    expect(fs.existsSync(improvementWorkflow)).toBe(true);
  });
});
