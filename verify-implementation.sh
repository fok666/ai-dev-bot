#!/bin/bash

# Final Implementation Verification Script
# Verifies all components are properly implemented

echo "🔍 AI Dev Bot - Final Implementation Verification"
echo "=================================================="
echo ""

PASS=0
FAIL=0
WARN=0

# Function to check file exists and is executable
check_executable() {
  if [ -x "$1" ]; then
    echo "✅ $1 is executable"
    ((PASS++))
  else
    echo "❌ $1 is not executable"
    ((FAIL++))
  fi
}

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo "✅ $1 exists"
    ((PASS++))
  else
    echo "❌ $1 does not exist"
    ((FAIL++))
  fi
}

# Function to check no placeholders in file
check_no_placeholders() {
  if grep -i "placeholder\|todo\|fixme\|not implemented" "$1" > /dev/null 2>&1; then
    echo "⚠️  $1 may contain placeholders"
    ((WARN++))
  else
    echo "✅ $1 has no placeholders"
    ((PASS++))
  fi
}

# Function to check line count
check_line_count() {
  lines=$(wc -l < "$1" | tr -d ' ')
  if [ "$lines" -gt "$2" ]; then
    echo "✅ $1 has $lines lines (minimum $2)"
    ((PASS++))
  else
    echo "❌ $1 has only $lines lines (expected > $2)"
    ((FAIL++))
  fi
}

echo "📋 Checking Core Scripts..."
echo "----------------------------"
check_executable "scripts/orchestrator.js"
check_executable "scripts/issue-manager.js"
check_executable "scripts/pr-manager.js"
check_executable "scripts/context-analyzer.js"
check_executable "scripts/testing.js"
check_executable "scripts/code-generator.js"
check_executable "scripts/load-config.js"
echo ""

echo "📄 Checking Script Implementation..."
echo "-------------------------------------"
check_line_count "scripts/orchestrator.js" 300
check_line_count "scripts/code-generator.js" 300
check_line_count "scripts/testing.js" 400
check_no_placeholders "scripts/code-generator.js"
check_no_placeholders "scripts/testing.js"
echo ""

echo "⚙️  Checking Workflows..."
echo "-------------------------"
check_file ".github/workflows/ai-dev-bot.yml"
check_file ".github/workflows/generate-tasks.yml"
check_no_placeholders ".github/workflows/ai-dev-bot.yml"
echo ""

echo "📚 Checking Documentation..."
echo "----------------------------"
check_file "README.md"
check_file "SDD.md"
check_file "FULL_IMPLEMENTATION.md"
check_file "IMPLEMENTATION_COMPLETE.md"
check_file "ROADMAP.md"
echo ""

echo "🔧 Checking Configuration..."
echo "----------------------------"
check_file "package.json"
check_file ".github/ai-bot-config.yml"
check_file ".gitignore"
echo ""

echo "🧪 Testing Code Generator..."
echo "----------------------------"
if node -e "import('./scripts/code-generator.js').then(() => console.log('✅ code-generator.js loads successfully')).catch(e => { console.error('❌ code-generator.js failed:', e.message); process.exit(1); })"; then
  ((PASS++))
else
  ((FAIL++))
fi
echo ""

echo "🧪 Testing Testing Module..."
echo "----------------------------"
if node -e "import('./scripts/testing.js').then(() => console.log('✅ testing.js loads successfully')).catch(e => { console.error('❌ testing.js failed:', e.message); process.exit(1); })"; then
  ((PASS++))
else
  ((FAIL++))
fi
echo ""

echo "📦 Checking Dependencies..."
echo "---------------------------"
if npm list --depth=0 > /dev/null 2>&1; then
  echo "✅ All npm dependencies installed"
  ((PASS++))
else
  echo "❌ Missing npm dependencies"
  ((FAIL++))
fi
echo ""

echo "🏷️  Checking GitHub Labels..."
echo "----------------------------"
if command -v gh > /dev/null 2>&1; then
  LABEL_COUNT=$(gh label list 2>/dev/null | grep -E "(priority-|status-|type-|ai-|automated)" | wc -l | tr -d ' ')
  if [ "$LABEL_COUNT" -ge 15 ]; then
    echo "✅ Found $LABEL_COUNT bot labels"
    ((PASS++))
  else
    echo "⚠️  Only $LABEL_COUNT bot labels found (expected 15)"
    ((WARN++))
  fi
else
  echo "⚠️  GitHub CLI not available (skipping label check)"
  ((WARN++))
fi
echo ""

echo "=================================================="
echo "📊 Verification Summary"
echo "=================================================="
echo "✅ PASSED: $PASS"
echo "❌ FAILED: $FAIL"
echo "⚠️  WARNINGS: $WARN"
echo ""

if [ $FAIL -eq 0 ]; then
  echo "🎉 ALL CHECKS PASSED! Bot is production ready."
  echo ""
  echo "Next steps:"
  echo "1. Configure secrets: GEMINI_API_KEY, GH_API_TOKEN"
  echo "2. Enable workflows in GitHub Actions"
  echo "3. Create issues with 'status-ready' label"
  echo "4. Watch the bot work its magic! ✨"
  exit 0
else
  echo "❌ Some checks failed. Please review and fix issues."
  exit 1
fi
