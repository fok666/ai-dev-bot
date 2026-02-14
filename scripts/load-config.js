#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

    // Validate required fields
    if (!config.bot || !config.documents) {
      console.error('Invalid configuration: missing required sections');
      process.exit(1);
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
