#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Code Generator - Generates actual code from implementation plans
 */
class CodeGenerator {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  }

  /**
   * Load plan from file
   */
  loadPlan(planFile) {
    if (!fs.existsSync(planFile)) {
      throw new Error(`Plan file not found: ${planFile}`);
    }
    return JSON.parse(fs.readFileSync(planFile, 'utf8'));
  }

  /**
   * Load context from file
   */
  loadContext(contextFile) {
    if (!fs.existsSync(contextFile)) {
      throw new Error(`Context file not found: ${contextFile}`);
    }
    return JSON.parse(fs.readFileSync(contextFile, 'utf8'));
  }

  /**
   * Read existing file content
   */
  readFileIfExists(filepath) {
    try {
      if (fs.existsSync(filepath)) {
        return fs.readFileSync(filepath, 'utf8');
      }
    } catch (error) {
      console.warn(`Could not read ${filepath}:`, error.message);
    }
    return null;
  }

  /**
   * Generate code for a specific file
   */
  async generateFileCode(fileInfo, plan, context, existingCode) {
    try {
      // Parse file path and description
      const parts = fileInfo.split(':');
      const filepath = parts[0].trim();
      const description = parts.slice(1).join(':').trim();

      console.log(`\n📝 Generating code for: ${filepath}`);
      console.log(`   Description: ${description}`);

      // Determine file extension and language
      const ext = path.extname(filepath);
      const language = this.detectLanguage(ext);

      // Build prompt for code generation
      const prompt = this.buildCodePrompt(filepath, description, language, plan, context, existingCode);

      // Query Gemini for code
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const generatedCode = this.extractCode(response.text());

      return {
        filepath,
        code: generatedCode,
        language
      };
    } catch (error) {
      console.error(`Error generating code for ${fileInfo}:`, error.message);
      return null;
    }
  }

  /**
   * Detect programming language from file extension
   */
  detectLanguage(ext) {
    const langMap = {
      '.js': 'javascript',
      '.mjs': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.go': 'go',
      '.java': 'java',
      '.rb': 'ruby',
      '.php': 'php',
      '.rs': 'rust',
      '.c': 'c',
      '.cpp': 'cpp',
      '.cs': 'csharp',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.html': 'html',
      '.css': 'css',
      '.sh': 'bash'
    };
    return langMap[ext] || 'plaintext';
  }

  /**
   * Build prompt for code generation
   */
  buildCodePrompt(filepath, description, language, plan, context, existingCode) {
    const existingCodeSection = existingCode
      ? `\n### Existing Code:\n\`\`\`${language}\n${existingCode.substring(0, 2000)}\n\`\`\`\n${existingCode.length > 2000 ? '... (truncated)' : ''}\n`
      : '\n### This is a new file.\n';

    return `You are an expert ${language} programmer. Generate production-ready code for the following task.

## Task Context
**Issue:** ${context.issue.title}
**File:** ${filepath}
**Action:** ${description}

## Implementation Plan
${plan.approach}

## Steps
${plan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

## Key Decisions
${plan.decisions}

${existingCodeSection}

## Instructions
Generate complete, production-ready ${language} code for ${filepath} that:
1. Implements the specified changes: ${description}
2. Follows best practices for ${language}
3. Includes necessary imports/dependencies
4. Has proper error handling
5. Includes inline comments for complex logic
6. Is well-structured and maintainable

${existingCode ? 'IMPORTANT: If modifying existing code, maintain compatibility and preserve important functionality.' : ''}

Provide ONLY the code without explanations. Format as:

\`\`\`${language}
// Your code here
\`\`\`
`;
  }

  /**
   * Extract code from Gemini response
   */
  extractCode(text) {
    // Try to extract code from markdown code blocks
    const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);
    
    if (match) {
      return match[1].trim();
    }

    // If no code block found, return the text as-is
    return text.trim();
  }

  /**
   * Generate all code files from plan
   */
  async generateCode(planFile, contextFile, issueNumber) {
    try {
      console.log('🚀 Starting code generation...\n');

      const plan = this.loadPlan(planFile);
      const context = this.loadContext(contextFile);

      if (!plan.files || plan.files.length === 0) {
        console.log('⚠️  No files specified in plan');
        return [];
      }

      const generatedFiles = [];

      // Generate code for each file
      for (const fileInfo of plan.files.slice(0, 10)) { // Limit to 10 files max
        const parts = fileInfo.split(':');
        const filepath = parts[0].trim();

        // Read existing file if it exists
        const existingCode = this.readFileIfExists(filepath);

        // Generate code
        const result = await this.generateFileCode(fileInfo, plan, context, existingCode);
        
        if (result) {
          generatedFiles.push(result);
          console.log(`✅ Generated code for ${result.filepath} (${result.code.length} chars)`);
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Save generated files
      const outputDir = path.join(process.cwd(), '.context-cache', `generated-${issueNumber}`);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      for (const file of generatedFiles) {
        const outputPath = path.join(outputDir, path.basename(file.filepath));
        fs.writeFileSync(outputPath, file.code);
        console.log(`💾 Saved to cache: ${outputPath}`);
      }

      // Save manifest
      const manifest = {
        issueNumber,
        timestamp: new Date().toISOString(),
        files: generatedFiles.map(f => ({
          filepath: f.filepath,
          language: f.language,
          size: f.code.length
        }))
      };

      const manifestPath = path.join(outputDir, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

      console.log(`\n✅ Code generation complete: ${generatedFiles.length} files`);
      console.log(`::set-output name=generated_count::${generatedFiles.length}`);
      console.log(`::set-output name=output_dir::${outputDir}`);

      return generatedFiles;
    } catch (error) {
      console.error('Error during code generation:', error.message);
      throw error;
    }
  }

  /**
   * Apply generated files to repository
   */
  async applyGeneratedFiles(issueNumber) {
    try {
      console.log('📂 Applying generated files to repository...\n');

      const outputDir = path.join(process.cwd(), '.context-cache', `generated-${issueNumber}`);
      const manifestPath = path.join(outputDir, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        throw new Error('No generated files found');
      }

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      for (const fileInfo of manifest.files) {
        const cachePath = path.join(outputDir, path.basename(fileInfo.filepath));
        const targetPath = path.join(process.cwd(), fileInfo.filepath);

        if (!fs.existsSync(cachePath)) {
          console.warn(`⚠️  Cached file not found: ${cachePath}`);
          continue;
        }

        // Create directory if it doesn't exist
        const targetDir = path.dirname(targetPath);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Copy file from cache to target location
        const code = fs.readFileSync(cachePath, 'utf8');
        fs.writeFileSync(targetPath, code);

        console.log(`✅ Applied: ${fileInfo.filepath}`);
      }

      console.log(`\n✅ Applied ${manifest.files.length} files to repository`);
      console.log(`::set-output name=applied_count::${manifest.files.length}`);

      return manifest.files.length;
    } catch (error) {
      console.error('Error applying generated files:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const generator = new CodeGenerator();

  try {
    switch (command) {
      case 'generate':
        const planFile = process.argv.find(arg => arg.startsWith('--plan='))?.split('=')[1];
        const contextFile = process.argv.find(arg => arg.startsWith('--context='))?.split('=')[1];
        const issueNumber = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];

        if (!planFile || !contextFile || !issueNumber) {
          console.error('Error: --plan=<file>, --context=<file>, and --issue=<number> required');
          process.exit(1);
        }

        await generator.generateCode(planFile, contextFile, parseInt(issueNumber));
        break;

      case 'apply':
        const applyIssue = process.argv.find(arg => arg.startsWith('--issue='))?.split('=')[1];

        if (!applyIssue) {
          console.error('Error: --issue=<number> required');
          process.exit(1);
        }

        await generator.applyGeneratedFiles(parseInt(applyIssue));
        break;

      default:
        console.error('Unknown command:', command);
        console.error('Available commands: generate, apply');
        process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CodeGenerator;
