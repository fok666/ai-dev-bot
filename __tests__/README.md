# Testing Infrastructure

This directory contains comprehensive tests for the AI Dev Bot project, designed to catch integration issues between workflows and scripts early in development.

## Test Structure

```
__tests__/
├── config.test.js              # Configuration file tests
├── context-analyzer.test.js    # CLI and GITHUB_OUTPUT tests
├── gemini-service.test.js      # Gemini API service tests
├── issue-manager.test.js       # CLI argument parsing tests
├── modules.test.js             # Module structure tests
└── workflow-integration.test.js # Workflow-script integration tests
```

## Key Test Categories

### 1. **GITHUB_OUTPUT Validation Tests**
Ensures scripts correctly write to `GITHUB_OUTPUT` file instead of stdout:
- Tests that output is written to file, not stdout
- Validates that workflow cannot grep outputs from stdout
- Confirms proper key=value format

### 2. **CLI Argument Tests**
Validates command-line argument parsing:
- Required argument validation
- Error messages for missing arguments
- Proper argument parsing logic

### 3. **Workflow Integration Tests**
Tests the interaction between workflow steps:
- Step output chaining
- Proper use of `${{ steps.<id>.outputs.<name> }}` syntax
- Anti-pattern detection (grep, cut, etc.)

### 4. **Workflow Validation**
Static analysis of workflow files:
- YAML syntax validation
- Deprecated command detection (`::set-output`)
- Script existence verification
- Required argument checking

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run in watch mode
npm run test:watch

# Validate workflows
npm run validate:workflows

# Check for anti-patterns
npm run validate:patterns
```

## Pre-Commit Hooks

Git hooks are available to run tests automatically:

```bash
# Setup hooks
./scripts/setup-hooks.sh

# Or manually:
chmod +x .githooks/*
cp .githooks/pre-commit .git/hooks/
cp .githooks/pre-push .git/hooks/
```

**Pre-commit hook:**
- Validates workflow files if changed
- Runs unit tests if scripts changed

**Pre-push hook:**
- Runs full test suite
- Validates all workflows

## What These Tests Prevent

1. **Stdout Parsing Issues** (like the one we just fixed)
   - Trying to grep output from script stdout
   - Using pipes (grep, cut) to parse data
   - Missing step output declarations

2. **CLI Argument Issues**
   - Missing required arguments
   - Incorrect argument parsing
   - Poor error messages

3. **Workflow Syntax Issues**
   - Invalid YAML
   - Deprecated GitHub Actions commands
   - Invalid step output references

4. **Integration Issues**
   - Mismatched step outputs
   - Scripts that don't exist
   - Commands without required arguments

## Coverage Goals

The test suite aims for:
- **70%** branch coverage
- **70%** function coverage
- **70%** line coverage
- **70%** statement coverage

Current coverage can be viewed after running:
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

## Continuous Integration

The `.github/workflows/test-validation.yml` workflow runs automatically on:
- Push to main branch
- Pull requests to main
- Changes to scripts/, __tests__/, .github/workflows/, or package.json

It includes:
1. Unit tests
2. Workflow validation
3. Integration tests
4. CLI validation
5. Workflow simulation

## Adding New Tests

When adding new features:

1. **For new CLI commands:**
   - Add argument validation tests to `*-manager.test.js`
   - Test required argument errors
   - Test successful execution paths

2. **For workflow changes:**
   - Update `workflow-integration.test.js`
   - Add step output validation
   - Check for anti-patterns

3. **For GITHUB_OUTPUT usage:**
   - Add tests to verify file writing
   - Ensure stdout doesn't contain outputs
   - Test step output consumption

## Test Patterns to Follow

### ✅ Good: Testing GITHUB_OUTPUT
```javascript
test('should write to GITHUB_OUTPUT file', () => {
  const outputFile = path.join(tempDir, 'output.txt');
  const result = spawnSync('node', [script], {
    env: { ...process.env, GITHUB_OUTPUT: outputFile }
  });
  
  expect(fs.readFileSync(outputFile, 'utf8')).toContain('key=value');
  expect(result.stdout).not.toContain('key=value');
});
```

### ✅ Good: Testing CLI Arguments
```javascript
test('should reject command without required arg', () => {
  const result = spawnSync('node', [script, 'command']);
  
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('--arg=<value> required');
});
```

### ❌ Bad: Not Testing Integration
```javascript
// Don't just test that the function exists
test('has function', () => {
  expect(content).toContain('functionName');
});

// Test that it actually works
test('function produces correct output', () => {
  const result = callFunction();
  expect(result).toMatchExpectedBehavior();
});
```

## Debugging Failed Tests

1. **Check the error message:** Tests are designed to give clear failure messages
2. **Run with verbose output:** Add `--verbose` to npm test
3. **Check temp files:** Tests in `/tmp/.test-temp-*`
4. **Isolate the test:** Use `test.only()` to run a single test
5. **Check workflow simulation:** The integration tests simulate real workflow steps

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [GitHub Actions Output Documentation](https://docs.github.com/en/actions/using-workflows/workflow-commands-for-github-actions#setting-an-output-parameter)
- [YAML Validation](https://yaml.org/spec/)
