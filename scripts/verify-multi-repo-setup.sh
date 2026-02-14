#!/bin/bash

# Verify Multi-Repository Setup
# Checks that GH_API_TOKEN has access to all configured repositories

set -e

echo "🔍 AI Dev Bot - Multi-Repository Setup Verification"
echo "=================================================="
echo ""

# Check if GH_API_TOKEN is set
if [ -z "$GH_API_TOKEN" ]; then
  echo "❌ ERROR: GH_API_TOKEN environment variable not set"
  echo ""
  echo "Please set your GitHub token:"
  echo "  export GH_API_TOKEN=ghp_your_token_here"
  echo ""
  exit 1
fi

echo "✅ GH_API_TOKEN is set"
echo ""

# Check if configuration file exists
CONFIG_FILE=".github/ai-bot-config.yml"
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ ERROR: Configuration file not found: $CONFIG_FILE"
  exit 1
fi

echo "✅ Configuration file found: $CONFIG_FILE"
echo ""

# Parse repositories from config (basic grep approach)
echo "📋 Configured Repositories:"
echo "----------------------------"

# Extract repository names from YAML config
REPOS=$(grep -A1 "name:" "$CONFIG_FILE" | grep -v "^--$" | grep "name:" | sed 's/.*name: *//g' | sed "s/'//g" | sed 's/"//g')

if [ -z "$REPOS" ]; then
  echo "❌ ERROR: No repositories found in configuration"
  exit 1
fi

TOTAL_REPOS=0
SUCCESS_COUNT=0
FAILED_REPOS=()

# Test access to each repository
while IFS= read -r repo; do
  if [ -z "$repo" ]; then
    continue
  fi
  
  TOTAL_REPOS=$((TOTAL_REPOS + 1))
  
  echo -n "  Testing: $repo ... "
  
  # Test repository access using GitHub API
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: token $GH_API_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/$repo")
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ ACCESS OK"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  elif [ "$HTTP_CODE" = "404" ]; then
    echo "❌ NOT FOUND (404)"
    FAILED_REPOS+=("$repo (404 - Not Found)")
  elif [ "$HTTP_CODE" = "401" ]; then
    echo "❌ UNAUTHORIZED (401)"
    FAILED_REPOS+=("$repo (401 - Unauthorized)")
  elif [ "$HTTP_CODE" = "403" ]; then
    echo "❌ FORBIDDEN (403)"
    FAILED_REPOS+=("$repo (403 - Forbidden)")
  else
    echo "❌ ERROR (HTTP $HTTP_CODE)"
    FAILED_REPOS+=("$repo (HTTP $HTTP_CODE)")
  fi
  
  # Add small delay to avoid rate limiting
  sleep 0.5
  
done <<< "$REPOS"

echo ""
echo "=================================================="
echo "📊 Summary"
echo "=================================================="
echo "Total repositories: $TOTAL_REPOS"
echo "Accessible: $SUCCESS_COUNT"
echo "Failed: $((TOTAL_REPOS - SUCCESS_COUNT))"
echo ""

# Report failed repositories
if [ ${#FAILED_REPOS[@]} -gt 0 ]; then
  echo "❌ Failed Repositories:"
  for failed_repo in "${FAILED_REPOS[@]}"; do
    echo "  - $failed_repo"
  done
  echo ""
  echo "⚠️  Please verify:"
  echo "  1. Repository names are correct (owner/repo)"
  echo "  2. GH_API_TOKEN has 'repo' scope"
  echo "  3. Token has access to all repositories (check org permissions)"
  echo ""
  exit 1
fi

echo "✅ All repositories are accessible!"
echo ""
echo "🎉 Setup verification complete"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/create-labels-all-repos.sh"
echo "  2. Commit and push changes to central bot repository"
echo "  3. Configure secrets in GitHub Actions:"
echo "     - GH_API_TOKEN (with repo access to all repos)"
echo "     - GEMINI_API_KEY (from Google AI Studio)"
echo "  4. Manually trigger: Monitor GitHub Actions Pipelines workflow"
echo ""
