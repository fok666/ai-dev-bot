#!/usr/bin/env node

/**
 * Workflow Validation Script
 * Validates GitHub Actions workflows for common issues
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class WorkflowValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.workflowsDir = path.join(process.cwd(), '.github', 'workflows');
  }

  validate() {
    console.log('🔍 Validating GitHub Actions workflows...\n');

    if (!fs.existsSync(this.workflowsDir)) {
      this.errors.push('Workflows directory not found: .github/workflows');
      return this.report();
    }

    const workflows = fs.readdirSync(this.workflowsDir)
      .filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    if (workflows.length === 0) {
      this.warnings.push('No workflow files found');
      return this.report();
    }

    workflows.forEach(workflow => {
      this.validateWorkflow(workflow);
    });

    return this.report();
  }

  validateWorkflow(filename) {
    const filepath = path.join(this.workflowsDir, filename);
    const content = fs.readFileSync(filepath, 'utf8');

    console.log(`Validating ${filename}...`);

    // 1. Check YAML syntax
    let workflowData;
    try {
      workflowData = yaml.load(content);
    } catch (error) {
      this.errors.push(`${filename}: Invalid YAML syntax - ${error.message}`);
      return;
    }

    // 2. Check for deprecated set-output usage
    if (content.match(/echo\s+["']::set-output/g)) {
      this.errors.push(
        `${filename}: Uses deprecated ::set-output command. Use GITHUB_OUTPUT file instead.`
      );
    }

    // 3. Check for stdout parsing anti-patterns
    const antiPatterns = [
      { 
        pattern: /=\$\(node\s+scripts\/[^)]*\|\s*grep/, 
        message: 'capturing Node script output with grep (should use GITHUB_OUTPUT)' 
      },
      { 
        pattern: /grep\s+["']analysis_file["']\s*\|\s*cut/, 
        message: 'parsing analysis_file with grep+cut (should use step outputs)' 
      }
    ];

    antiPatterns.forEach(({ pattern, message }) => {
      if (content.match(pattern)) {
        this.errors.push(
          `${filename}: Anti-pattern detected - ${message}. Use step outputs instead.`
        );
      }
    });

    // Allow grep usage for general text processing (like PR body parsing)
    // Don't flag: ISSUE_NUM=$(echo "$PR_BODY" | grep ...)
    // Do flag: RESULT=$(node script.js | grep ...)


    // 4. Validate step output references
    const stepOutputRefs = content.match(/\$\{\{\s*steps\.\S+\s*\}\}/g) || [];
    stepOutputRefs.forEach(ref => {
      if (!ref.match(/\$\{\{\s*steps\.\w+\.outputs\.\w+\s*\}\}/)) {
        this.warnings.push(
          `${filename}: Potentially invalid step reference - ${ref}`
        );
      }
    });

    // 5. Check if scripts are called with proper error handling
    // Note: Node.js scripts in scripts/ directory handle GITHUB_OUTPUT internally
    if (workflowData.jobs) {
      Object.entries(workflowData.jobs).forEach(([jobName, job]) => {
        if (job.steps) {
          job.steps.forEach((step, idx) => {
            if (step.run && step.id) {
              // Skip warning for Node.js scripts - they handle GITHUB_OUTPUT internally
              const isNodeScript = step.run.includes('node scripts/');
              
              if (!isNodeScript && !step.run.includes('GITHUB_OUTPUT') && !step.run.includes('>> $GITHUB_OUTPUT')) {
                const nextSteps = job.steps.slice(idx + 1);
                const usesOutput = nextSteps.some(s => 
                  s.if?.includes(`steps.${step.id}.outputs`) ||
                  s.run?.includes(`steps.${step.id}.outputs`)
                );

                if (usesOutput) {
                  this.warnings.push(
                    `${filename}: Step "${step.name || step.id}" may not be writing to GITHUB_OUTPUT but is referenced by other steps`
                  );
                }
              }
            }
          });
        }
      });
    }

    // 6. Check for proper conditional execution
    if (workflowData.jobs) {
      Object.entries(workflowData.jobs).forEach(([jobName, job]) => {
        if (job.steps) {
          job.steps.forEach(step => {
            if (step.if && step.if.includes('.outputs.')) {
              // Check for proper empty string handling
              // Only warn if != '' is used alone (not in compound conditions with &&)
              const hasEmptyCheck = step.if.match(/!= ['"]['"]/ );
              const isCompoundWithAnd = step.if.match(/\w+\.outputs\.\w+\s*(==|!=).*&&.*!= ['"]['"]/ );
              
              if (hasEmptyCheck && !step.if.includes(' || ') && !isCompoundWithAnd) {
                this.warnings.push(
                  `${filename}: Step "${step.name}" uses != '' check. Consider using truthy check: if: steps.foo.outputs.bar`
                );
              }
            }
          });
        }
      });
    }

    // 7. Validate that scripts exist
    const scriptCalls = content.match(/node scripts\/[\w-]+\.js/g) || [];
    const uniqueScripts = [...new Set(scriptCalls)];
    
    uniqueScripts.forEach(call => {
      const scriptName = call.match(/scripts\/([\w-]+\.js)/)[1];
      const scriptPath = path.join(process.cwd(), 'scripts', scriptName);
      
      if (!fs.existsSync(scriptPath)) {
        this.errors.push(
          `${filename}: References non-existent script - ${scriptName}`
        );
      }
    });

    // 8. Check command line argument patterns
    // Skip validation for test/CLI validation workflows
    const isTestWorkflow = filename.includes('test') || filename.includes('validation');
    
    if (!isTestWorkflow) {
      const commandPatterns = [
        { pattern: /analyze-workflow-failure(?!s)/, requiredArgs: ['--run-id='] },
        { pattern: /analyze-workflow-failures/, requiredArgs: ['--failures='] },
        { pattern: /create-investigation-issues/, requiredArgs: ['--analyses='] }
      ];

      commandPatterns.forEach(({ pattern, requiredArgs }) => {
        if (content.match(pattern)) {
          requiredArgs.forEach(arg => {
            if (!content.match(new RegExp(arg))) {
              this.errors.push(
                `${filename}: Command ${pattern.source} used without required argument ${arg}`
              );
            }
          });
        }
      });
    }

    console.log(`  ✓ Validated ${filename}\n`);
  }

  report() {
    console.log('\n' + '='.repeat(60));
    console.log('VALIDATION REPORT');
    console.log('='.repeat(60) + '\n');

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ All workflows are valid!\n');
      return 0;
    }

    if (this.errors.length > 0) {
      console.log('❌ ERRORS:\n');
      this.errors.forEach(error => {
        console.log(`  • ${error}`);
      });
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log('⚠️  WARNINGS:\n');
      this.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
      console.log();
    }

    console.log('Summary:');
    console.log(`  Errors: ${this.errors.length}`);
    console.log(`  Warnings: ${this.warnings.length}`);
    console.log();

    return this.errors.length > 0 ? 1 : 0;
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new WorkflowValidator();
  const exitCode = validator.validate();
  process.exit(exitCode);
}

export default WorkflowValidator;
