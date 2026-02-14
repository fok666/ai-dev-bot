#!/bin/bash
# Setup Git hooks for testing

set -e

echo "Setting up Git hooks..."

# Create hooks directory if it doesn't exist
mkdir -p .git/hooks

# Copy pre-commit hook
if [ -f .githooks/pre-commit ]; then
  cp .githooks/pre-commit .git/hooks/pre-commit
  chmod +x .git/hooks/pre-commit
  echo "✓ Installed pre-commit hook"
fi

# Copy pre-push hook
if [ -f .githooks/pre-push ]; then
  cp .githooks/pre-push .git/hooks/pre-push
  chmod +x .git/hooks/pre-push
  echo "✓ Installed pre-push hook"
fi

# Make validate-workflows script executable
if [ -f scripts/validate-workflows.js ]; then
  chmod +x scripts/validate-workflows.js
  echo "✓ Made validate-workflows.js executable"
fi

echo ""
echo "✅ Git hooks setup complete!"
echo ""
echo "Hooks installed:"
echo "  - pre-commit: Validates workflows and runs unit tests"
echo "  - pre-push: Runs full test suite"
echo ""
echo "To skip hooks temporarily, use: git commit --no-verify"
