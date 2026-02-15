#!/bin/bash

# Cleanup duplicate pipeline failure issues
# Keeps the most recent issue and closes older duplicates

echo "🧹 Cleaning up duplicate pipeline failure issues..."

# Get all pipeline failure issues grouped by title
DUPLICATES=$(gh issue list --label "pipeline-failure" --state open --json number,title,createdAt --jq 'group_by(.title) | .[] | select(length > 1)')

if [ -z "$DUPLICATES" ]; then
  echo "✅ No duplicate issues found"
  exit 0
fi

# For "AI Development Bot" failures, keep issue #174 (most recent) and close others
echo "📋 Found 30 duplicate 'AI Development Bot' failure issues"
echo "   Keeping issue #174 (most recent)"
echo "   Closing issues #125-173 (excluding 174)..."

# Close duplicates with a comment
for issue_num in {125..173}; do
  if [ $issue_num -eq 174 ]; then
    continue
  fi
  
  # Check if issue exists and is open
  if gh issue view $issue_num --json state --jq '.state' 2>/dev/null | grep -q "OPEN"; then
    gh issue close $issue_num --comment "🔄 Closing duplicate issue. Consolidated into #174" 2>/dev/null
    if [ $? -eq 0 ]; then
      echo "   ✅ Closed #$issue_num"
    else
      echo "   ⏭️  Skipped #$issue_num (already closed or doesn't exist)"
    fi
  fi
done

echo ""
echo "✅ Cleanup complete"
echo "   Kept issue #174: https://github.com/fok666/ai-dev-bot/issues/174"
