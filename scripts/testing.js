#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Testing Module - Run tests for the project
 */
class TestRunner {
  constructor(config = {}) {
    this.projectRoot = process.cwd();
    this.config = config;
    this.testResults = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      errors: []
    };
  }

  /**
   * Detect available test frameworks
   */
  detectTestFrameworks() {
    const frameworks = [];
    const packageJsonPath = path.join(this.projectRoot, 'package.json');

    // Check for Node.js test frameworks
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

      if (deps.jest) frameworks.push('jest');
      if (deps.mocha) frameworks.push('mocha');
      if (deps.vitest) frameworks.push('vitest');
      if (packageJson.scripts?.test) frameworks.push('npm-test');
    }

    // Check for Python test frameworks
    const pythonFiles = ['requirements.txt', 'setup.py', 'pyproject.toml'];
    const hasPython = pythonFiles.some(f => fs.existsSync(path.join(this.projectRoot, f)));
    
    if (hasPython) {
      frameworks.push('pytest');
      frameworks.push('unittest');
    }

    // Check for Go
    if (fs.existsSync(path.join(this.projectRoot, 'go.mod'))) {
      frameworks.push('go-test');
    }

    // Check for Rust
    if (fs.existsSync(path.join(this.projectRoot, 'Cargo.toml'))) {
      frameworks.push('cargo-test');
    }

    return frameworks;
  }

  /**
   * Run Jest tests
   */
  async runJest() {
    console.log('🧪 Running Jest tests...');
    try {
      const { stdout, stderr } = await execAsync('npx jest --json --coverage=false', {
        cwd: this.projectRoot,
        timeout: 300000 // 5 minutes
      });

      const result = JSON.parse(stdout);
      return {
        success: result.success,
        total: result.numTotalTests,
        passed: result.numPassedTests,
        failed: result.numFailedTests,
        skipped: result.numPendingTests,
        duration: result.testResults.reduce((sum, r) => sum + (r.perfStats?.runtime || 0), 0)
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Run Mocha tests
   */
  async runMocha() {
    console.log('🧪 Running Mocha tests...');
    try {
      const { stdout } = await execAsync('npx mocha --reporter json', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      const result = JSON.parse(stdout);
      return {
        success: result.failures === 0,
        total: result.tests.length,
        passed: result.passes.length,
        failed: result.failures.length,
        skipped: result.pending.length,
        duration: result.stats.duration
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Run npm test
   */
  async runNpmTest() {
    console.log('🧪 Running npm test...');
    try {
      const { stdout, stderr } = await execAsync('npm test', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      // Parse output for common test patterns
      const output = stdout + stderr;
      const passMatch = output.match(/(\d+)\s+passing/i);
      const failMatch = output.match(/(\d+)\s+failing/i);

      return {
        success: !failMatch || parseInt(failMatch[1]) === 0,
        total: (passMatch ? parseInt(passMatch[1]) : 0) + (failMatch ? parseInt(failMatch[1]) : 0),
        passed: passMatch ? parseInt(passMatch[1]) : 0,
        failed: failMatch ? parseInt(failMatch[1]) : 0,
        skipped: 0,
        duration: 0
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Run Pytest
   */
  async runPytest() {
    console.log('🧪 Running Pytest...');
    try {
      const { stdout } = await execAsync('pytest --json-report --json-report-file=.pytest-report.json', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      const reportPath = path.join(this.projectRoot, '.pytest-report.json');
      if (fs.existsSync(reportPath)) {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        return {
          success: report.exitcode === 0,
          total: report.summary.total,
          passed: report.summary.passed,
          failed: report.summary.failed,
          skipped: report.summary.skipped,
          duration: report.duration
        };
      }
    } catch (error) {
      // Fallback to parsing standard output
      try {
        const { stdout } = await execAsync('pytest -v', {
          cwd: this.projectRoot,
          timeout: 300000
        });

        const passMatch = stdout.match(/(\d+)\s+passed/);
        const failMatch = stdout.match(/(\d+)\s+failed/);

        return {
          success: !failMatch,
          total: (passMatch ? parseInt(passMatch[1]) : 0) + (failMatch ? parseInt(failMatch[1]) : 0),
          passed: passMatch ? parseInt(passMatch[1]) : 0,
          failed: failMatch ? parseInt(failMatch[1]) : 0,
          skipped: 0,
          duration: 0
        };
      } catch (innerError) {
        return this.parseTestError(innerError);
      }
    }
  }

  /**
   * Run Python unittest
   */
  async runUnittest() {
    console.log('🧪 Running Python unittest...');
    try {
      const { stdout, stderr } = await execAsync('python -m unittest discover -v', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      const output = stdout + stderr;
      const okMatch = output.match(/OK/i);
      const failMatch = output.match(/FAILED.*?(\d+)/);

      return {
        success: !!okMatch,
        total: 0, // unittest doesn't provide easy counts
        passed: okMatch ? 1 : 0,
        failed: failMatch ? parseInt(failMatch[1]) : 0,
        skipped: 0,
        duration: 0
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Run Go tests
   */
  async runGoTest() {
    console.log('🧪 Running Go tests...');
    try {
      const { stdout } = await execAsync('go test -json ./...', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      const lines = stdout.split('\n').filter(l => l.trim());
      let passed = 0, failed = 0;

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.Action === 'pass') passed++;
          if (event.Action === 'fail') failed++;
        } catch (e) {
          // Ignore parse errors
        }
      }

      return {
        success: failed === 0,
        total: passed + failed,
        passed,
        failed,
        skipped: 0,
        duration: 0
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Run Cargo tests (Rust)
   */
  async runCargoTest() {
    console.log('🧪 Running Cargo tests...');
    try {
      const { stdout } = await execAsync('cargo test --message-format=json', {
        cwd: this.projectRoot,
        timeout: 300000
      });

      const lines = stdout.split('\n').filter(l => l.trim());
      let passed = 0, failed = 0;

      for (const line of lines) {
        try {
          const event = JSON.parse(line);
          if (event.type === 'test' && event.event === 'ok') passed++;
          if (event.type === 'test' && event.event === 'failed') failed++;
        } catch (e) {
          // Ignore parse errors
        }
      }

      return {
        success: failed === 0,
        total: passed + failed,
        passed,
        failed,
        skipped: 0,
        duration: 0
      };
    } catch (error) {
      return this.parseTestError(error);
    }
  }

  /**
   * Parse error from failed test run
   */
  parseTestError(error) {
    return {
      success: false,
      total: 0,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: 0,
      error: error.message
    };
  }

  /**
   * Run all detected tests
   */
  async run(options = {}) {
    const startTime = Date.now();
    console.log('🧪 Starting test execution...\n');

    // Detect available test frameworks
    const frameworks = this.detectTestFrameworks();
    
    if (frameworks.length === 0) {
      console.log('⚠️  No test frameworks detected');
      console.log('   Checked for: Jest, Mocha, Vitest, Pytest, unittest, Go, Cargo');
      return { success: true, noTests: true };
    }

    console.log(`📋 Detected frameworks: ${frameworks.join(', ')}\n`);

    // Run tests for each framework
    const results = [];
    for (const framework of frameworks) {
      try {
        let result;
        switch (framework) {
          case 'jest':
            result = await this.runJest();
            break;
          case 'mocha':
            result = await this.runMocha();
            break;
          case 'npm-test':
            result = await this.runNpmTest();
            break;
          case 'pytest':
            result = await this.runPytest();
            break;
          case 'unittest':
            result = await this.runUnittest();
            break;
          case 'go-test':
            result = await this.runGoTest();
            break;
          case 'cargo-test':
            result = await this.runCargoTest();
            break;
          default:
            continue;
        }

        result.framework = framework;
        results.push(result);

        // Display result
        const icon = result.success ? '✅' : '❌';
        console.log(`${icon} ${framework}: ${result.passed}/${result.total} passed`);
        
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      } catch (error) {
        console.error(`Error running ${framework}:`, error.message);
      }
    }

    // Aggregate results
    const aggregated = results.reduce((acc, r) => {
      acc.total += r.total;
      acc.passed += r.passed;
      acc.failed += r.failed;
      acc.skipped += r.skipped;
      return acc;
    }, { total: 0, passed: 0, failed: 0, skipped: 0 });

    aggregated.success = results.every(r => r.success);
    aggregated.duration = Date.now() - startTime;
    aggregated.frameworks = results.map(r => r.framework);

    // Display summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Test Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total: ${aggregated.total}`);
    console.log(`Passed: ${aggregated.passed} ✅`);
    console.log(`Failed: ${aggregated.failed} ❌`);
    console.log(`Skipped: ${aggregated.skipped} ⏭️`);
    console.log(`Duration: ${(aggregated.duration / 1000).toFixed(2)}s`);
    console.log(`Result: ${aggregated.success ? '✅ ALL PASSED' : '❌ FAILURES DETECTED'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Set GitHub Actions output
    console.log(`::set-output name=success::${aggregated.success}`);
    console.log(`::set-output name=total::${aggregated.total}`);
    console.log(`::set-output name=passed::${aggregated.passed}`);
    console.log(`::set-output name=failed::${aggregated.failed}`);

    return aggregated;
  }
}

// CLI interface
async function main() {
  const runner = new TestRunner();
  const result = await runner.run();
  
  if (!result.success && !result.noTests) {
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default TestRunner;
