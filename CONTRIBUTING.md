# Contributing to AI-Dev-Bot

Thank you for your interest in contributing to AI-Dev-Bot! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- Git
- GitHub CLI (`gh`)
- Gemini API key (for testing with AI features)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/fok666/ai-dev-bot.git
   cd ai-dev-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   export GEMINI_API_KEY="your-api-key"
   export GH_API_TOKEN="your-github-token"
   ```

## Project Structure

```
ai-dev-bot/
├── .github/
│   ├── workflows/          # GitHub Actions workflows
│   ├── ISSUE_TEMPLATE/     # Issue templates
│   └── ai-bot-config.yml   # Bot configuration
├── scripts/
│   ├── orchestrator.js     # Main execution engine
│   ├── issue-manager.js    # Issue tracking and memory
│   ├── context-analyzer.js # Repository analysis
│   ├── code-generator.js   # Code generation
│   ├── pr-manager.js       # Pull request management
│   ├── testing.js          # Test execution
│   └── self-improvement.js # Performance optimization
├── SDD.md                  # Software Design Document
├── ROADMAP.md              # Product roadmap
└── README.md               # Project overview
```

## Continuous Delivery Workflow

We follow continuous delivery principles (CICD approach):

- **Small batches**: One feature, one PR
- **Trunk-based development**: Short-lived branches (hours, not days)
- **Fast feedback**: Quick builds, quick reviews
- **Always deployable**: Main branch is always production-ready
- **Low WIP**: Maximum 3 concurrent tasks

## Making Changes

### 1. Create an Issue

Before making changes, create an issue describing:
- What you want to change and why
- Expected outcome
- Any breaking changes

Use labels:
- `type-feature`: New functionality
- `type-bugfix`: Bug fixes
- `type-refactor`: Code improvements
- `type-docs`: Documentation updates
- `priority-high/medium/low`: Priority level
- `complexity-S/M/L`: Estimated time (<2hr, 2-8hr, 8-24hr)

### 2. Create a Branch

Create a short-lived feature branch:

```bash
git checkout -b feature/issue-123-description
```

### 3. Make Changes

- Follow existing code style (Prettier for JS/TS)
- Write clear, self-documenting code
- Add comments for complex logic
- Keep changes focused and small

### 4. Write Tests

Add tests for new functionality:

```bash
npm test
```

### 5. Commit Changes

Use conventional commit messages:

```
feat: add pipeline monitoring feature
fix: resolve issue with context loading
refactor: optimize code generation
docs: update CONTRIBUTING guide
test: add tests for issue manager
```

### 6. Push and Create PR

```bash
git push origin feature/issue-123-description
```

Create a PR that:
- References the issue (`Closes #123`)
- Describes what changed and why
- Lists testing performed
- Mentions any breaking changes

### 7. Code Review

- Address review feedback promptly
- Keep discussions focused and professional
- Be open to suggestions

### 8. Merge

Once approved and all checks pass:
- PR will be merged to main
- Branch will be automatically deleted
- Issue will be closed

## Code Style

### JavaScript/Node.js

- Use ES6+ features
- Use `import`/`export` (ES modules)
- Use `async`/`await` over callbacks
- Prefer `const` over `let`
- Use descriptive variable names
- Format with Prettier

Example:
```javascript
async function loadIssueContext(issueNumber) {
  try {
    const { data: issue } = await octokit.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber
    });
    
    return { issue, comments: await this.loadComments(issueNumber) };
  } catch (error) {
    console.error(`Error loading issue #${issueNumber}:`, error.message);
    throw error;
  }
}
```

### Documentation

- Use JSDoc comments for functions
- Keep documentation up to date
- Include examples where helpful

Example:
```javascript
/**
 * Load context from issue comments including execution history
 * 
 * @param {number} issueNumber - GitHub issue number
 * @returns {Promise<Object>} Issue context with full history
 * @throws {Error} If issue cannot be loaded
 */
async loadContext(issueNumber) {
  // implementation
}
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- scripts/orchestrator.test.js

# Run with coverage
npm test -- --coverage
```

### Writing Tests

Use Jest for testing:

```javascript
describe('IssueManager', () => {
  test('should find next ready task', async () => {
    const manager = new IssueManager();
    const task = await manager.findNextTask();
    
    expect(task).toBeDefined();
    expect(task.labels).toContain('status-ready');
  });
});
```

## Continuous Delivery Practices

### Cycle Time Target

- Issue open → merged: **<8 hours**
- Lead time (commit → deploy): **<30 minutes**

### Deployment Frequency

- Target: **Multiple deployments per day**
- Each merged PR is a deployment

### Change Failure Rate

- Target: **<5%**
- All changes must pass CI before merge

### Quality Gates

All PRs must:
- ✅ Pass all automated tests
- ✅ Have code review approval
- ✅ Pass linting and formatting
- ✅ Have no security vulnerabilities
- ✅ Update relevant documentation

## Bot-Specific Guidelines

### Working with Issues

The bot uses GitHub Issues for memory and state:

- Each task = one GitHub Issue
- Execution history stored in issue comments
- Use consistent comment format for bot context
- Link PRs to issues with `Closes #123`

### Gemini Integration

When working with Gemini API:

- Keep prompts concise and focused
- Cache responses when possible
- Handle rate limits gracefully
- Test with different model versions
- Document prompt engineering changes

### Configuration Changes

Changes to `.github/ai-bot-config.yml`:

- Require manual review
- Document all configuration options
- Test in sandbox repository first
- Update SDD if changing behavior

### Workflow Changes

Changes to GitHub Actions workflows:

- Test locally with `act` when possible
- Start with `workflow_dispatch` for testing
- Add error handling and retry logic
- Update workflow documentation

## Getting Help

- 📖 Read the [SDD](SDD.md) for architecture details
- 🗺️ Check the [ROADMAP](ROADMAP.md) for planned features
- 💬 Ask questions in GitHub Discussions
- 🐛 Report bugs via GitHub Issues
- 📧 Contact maintainers for sensitive topics

## Recognition

Contributors are recognized in:
- Git commit history
- Release notes
- Project README

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to open an issue with the `question` label if you need clarification on anything!

---

**Thank you for contributing to AI-Dev-Bot!** 🤖✨
