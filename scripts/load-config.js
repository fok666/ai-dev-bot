#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validate configuration schema
 */
function validateConfig(config) {
  const errors = [];

  // Required top-level sections
  if (!config.bot) errors.push('Missing required section: bot');
  if (!config.documents) errors.push('Missing required section: documents');

  // Bot configuration
  if (config.bot) {
    if (config.bot.mode && !['autonomous', 'supervised'].includes(config.bot.mode)) {
      errors.push(`Invalid bot.mode: ${config.bot.mode}. Must be 'autonomous' or 'supervised'`);
    }
  }

  // Document paths
  if (config.documents) {
    if (!config.documents.sdd) errors.push('Missing required: documents.sdd');
    if (!config.documents.roadmap) errors.push('Missing required: documents.roadmap');
  }

  // Gemini configuration (if present)
  if (config.gemini && config.gemini.costOptimization) {
    const co = config.gemini.costOptimization;
    if (co.dailySpendingLimit && typeof co.dailySpendingLimit !== 'number') {
      errors.push('gemini.costOptimization.dailySpendingLimit must be a number');
    }
    if (co.monthlySpendingLimit && typeof co.monthlySpendingLimit !== 'number') {
      errors.push('gemini.costOptimization.monthlySpendingLimit must be a number');
    }
  }

  // Safety configuration
  if (config.safety) {
    if (config.safety.maxFilesPerPR && typeof config.safety.maxFilesPerPR !== 'number') {
      errors.push('safety.maxFilesPerPR must be a number');
    }
    if (config.safety.maxLinesPerPR && typeof config.safety.maxLinesPerPR !== 'number') {
      errors.push('safety.maxLinesPerPR must be a number');
    }
  }

  // Repositories configuration
  if (config.repositories && Array.isArray(config.repositories)) {
    config.repositories.forEach((repo, idx) => {
      if (!repo.name) {
        errors.push(`Repository at index ${idx} missing 'name' field`);
      } else if (!repo.name.includes('/')) {
        errors.push(`Repository name '${repo.name}' must be in format 'owner/repo'`);
      }
    });
  }

  return errors;
}

/**
 * Load bot configuration from .github/ai-bot-config.yml
 */
function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), '.github', 'ai-bot-config.yml');
    
    if (!fs.existsSync(configPath)) {
      console.error('Configuration file not found:', configPath);
      process.exit(1);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = yaml.load(configContent);

    // Validate configuration schema
    const validationErrors = validateConfig(config);
    if (validationErrors.length > 0) {
      console.error('❌ Configuration validation failed:');
      validationErrors.forEach(err => console.error(`   - ${err}`));
      process.exit(1);
    }

    // Kill switch: Check if bot is enabled
    const botEnabled = process.env.BOT_ENABLED !== 'false' && config.bot.enabled !== false;
    if (!botEnabled) {
      console.log('🛑 Bot is disabled (kill switch activated)');
      console.log('   To re-enable:');
      console.log('   - Set bot.enabled: true in config');
      console.log('   - Or remove BOT_ENABLED=false environment variable');
      process.exit(0);  // Exit gracefully, not an error
    }

    // Write config to temp file for other scripts
    const tempDir = path.join(process.cwd(), '.context-cache');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(tempDir, 'config.json'),
      JSON.stringify(config, null, 2)
    );

    console.log('✅ Configuration loaded successfully');
    console.log(`   Bot enabled: ${botEnabled}`);
    console.log(`   Mode: ${config.bot.mode}`);
    console.log(`   Roadmap: ${config.documents.roadmap}`);
    console.log(`   SDD: ${config.documents.sdd}`);

    return config;
  } catch (error) {
    console.error('Error loading configuration:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  loadConfig();
}

export default loadConfig;
