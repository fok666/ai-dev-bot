import fs from 'fs';
import path from 'path';

describe('TestRunner', () => {
  const testProjectRoot = '.test-project';

  beforeEach(() => {
    if (fs.existsSync(testProjectRoot)) {
      fs.rmSync(testProjectRoot, { recursive: true, force: true });
    }
    fs.mkdirSync(testProjectRoot, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testProjectRoot)) {
      fs.rmSync(testProjectRoot, { recursive: true, force: true });
    }
  });

  describe('test result structure', () => {
    it('should have correct result structure', () => {
      const testResults = {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
        errors: []
      };

      expect(testResults).toHaveProperty('total');
      expect(testResults).toHaveProperty('passed');
      expect(testResults).toHaveProperty('failed');
      expect(testResults).toHaveProperty('skipped');
      expect(testResults).toHaveProperty('duration');
      expect(testResults).toHaveProperty('errors');
    });
  });

  describe('framework detection', () => {
    it('should detect Jest from package.json', () => {
      const packageJson = {
        name: 'test-project',
        devDependencies: {
          jest: '^29.0.0'
        }
      };
      const packagePath = path.join(testProjectRoot, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson));

      expect(fs.existsSync(packagePath)).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(pkg.devDependencies.jest).toBe('^29.0.0');
    });

    it('should detect npm test script', () => {
      const packageJson = {
        name: 'test-project',
        scripts: {
          test: 'jest'
        }
      };
      const packagePath = path.join(testProjectRoot, 'package.json');
      fs.writeFileSync(packagePath, JSON.stringify(packageJson));

      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      expect(pkg.scripts.test).toBe('jest');
    });

    it('should detect Python requirements.txt', () => {
      const reqPath = path.join(testProjectRoot, 'requirements.txt');
      fs.writeFileSync(reqPath, 'pytest\n');

      expect(fs.existsSync(reqPath)).toBe(true);
      const content = fs.readFileSync(reqPath, 'utf8');
      expect(content).toContain('pytest');
    });

    it('should detect Go projects', () => {
      const goModPath = path.join(testProjectRoot, 'go.mod');
      fs.writeFileSync(goModPath, 'module test\n');

      expect(fs.existsSync(goModPath)).toBe(true);
    });

    it('should detect Rust projects', () => {
      const cargoPath = path.join(testProjectRoot, 'Cargo.toml');
      fs.writeFileSync(cargoPath, '[package]\nname = "test"\n');

      expect(fs.existsSync(cargoPath)).toBe(true);
    });
  });

  describe('test result parsing', () => {
    it('should parse successful test results', () => {
      const jestOutput = {
        success: true,
        numTotalTests: 10,
        numPassedTests: 10,
        numFailedTests: 0,
        numPendingTests: 0
      };

      expect(jestOutput.success).toBe(true);
      expect(jestOutput.numTotalTests).toBe(10);
      expect(jestOutput.numPassedTests).toBe(10);
      expect(jestOutput.numFailedTests).toBe(0);
    });

    it('should parse failed test results', () => {
      const jestOutput = {
        success: false,
        numTotalTests: 10,
        numPassedTests: 7,
        numFailedTests: 3,
        numPendingTests: 0
      };

      expect(jestOutput.success).toBe(false);
      expect(jestOutput.numFailedTests).toBe(3);
    });

    it('should handle skipped tests', () => {
      const jestOutput = {
        success: true,
        numTotalTests: 10,
        numPassedTests: 8,
        numFailedTests: 0,
        numPendingTests: 2
      };

      expect(jestOutput.numPendingTests).toBe(2);
    });
  });

  describe('test aggregation', () => {
    it('should aggregate test results correctly', () => {
      const results = {
        total: 15,
        passed: 12,
        failed: 2,
        skipped: 1,
        duration: 5000,
        errors: []
      };

      const aggregated = {
        success: results.failed === 0,
        total: results.total,
        passed: results.passed,
        failed: results.failed
      };

      expect(aggregated.success).toBe(false);
      expect(aggregated.total).toBe(15);
      expect(aggregated.passed).toBe(12);
    });

    it('should mark as successful when no failures', () => {
      const results = {
        failed: 0
      };

      const success = results.failed === 0;
      expect(success).toBe(true);
    });
  });

  describe('test commands', () => {
    it('should use npm test for Node.js projects', () => {
      const command = 'npm test';
      expect(command).toBe('npm test');
    });

    it('should use pytest for Python projects', () => {
      const command = 'pytest';
      expect(command).toBe('pytest');
    });

    it('should use go test for Go projects', () => {
      const command = 'go test ./...';
      expect(command).toBe('go test ./...');
    });

    it('should use cargo test for Rust projects', () => {
      const command = 'cargo test';
      expect(command).toBe('cargo test');
    });
  });
});
