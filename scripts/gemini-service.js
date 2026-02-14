#!/usr/bin/env node

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Centralized Gemini AI Service
 * Provides: rate limiting, caching, error handling, token optimization
 */
class GeminiService {
  constructor(config = {}) {
    this.config = {
      model: config.model || 'gemini-3-flash-preview',
      temperature: config.temperature ?? 0.3,
      maxOutputTokens: config.maxOutputTokens || 8096,
      topP: config.topP ?? 0.95,
      topK: config.topK || 40,
      rateLimitPerHour: config.rateLimitPerHour || 100,
      enableCaching: config.enableCaching !== false,
      cacheDir: config.cacheDir || '.context-cache/gemini-responses',
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      timeout: config.timeout || 60000,
      ...config
    };

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: this.config.model,
      generationConfig: {
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });

    this.callHistory = [];
    this.callCount = 0;

    if (this.config.enableCaching) {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
    }
  }

  async generate(prompt, options = {}) {
    await this.checkRateLimit();

    if (this.config.enableCaching && !options.skipCache) {
      const cached = this.getCachedResponse(prompt);
      if (cached) {
        console.log('✅ Using cached Gemini response');
        return cached;
      }
    }

    if (options.checkTokens) {
      const tokenCount = await this.countTokens(prompt);
      console.log(`📊 Prompt tokens: ${tokenCount}`);
      
      if (tokenCount > this.config.maxOutputTokens * 0.8) {
        console.warn('⚠️  Prompt approaching token limit');
      }
    }

    let lastError;
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🤖 Querying Gemini (attempt ${attempt}/${this.config.retryAttempts})...`);
        }
        
        const result = await this.generateWithTimeout(prompt);
        const response = result.response;
        const text = response.text();

        this.recordCall();

        if (this.config.enableCaching && !options.skipCache) {
          this.cacheResponse(prompt, text);
        }

        return text;

      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt < this.config.retryAttempts && this.isRetryableError(error)) {
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          console.log(`⏳ Retrying in ${delay}ms...`);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw new Error(`Gemini API failed after ${this.config.retryAttempts} attempts: ${lastError.message}`);
  }

  async generateWithTimeout(prompt) {
    return Promise.race([
      this.model.generateContent(prompt),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout')), this.config.timeout)
      )
    ]);
  }

  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND',
      '429', '500', '502', '503', '504',
      'timeout', 'network'
    ];

    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toString() || '';
    
    return retryableErrors.some(err => 
      message.includes(err.toLowerCase()) || code.includes(err)
    );
  }

  async checkRateLimit() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.callHistory = this.callHistory.filter(time => time > oneHourAgo);

    if (this.callHistory.length >= this.config.rateLimitPerHour) {
      const oldestCall = Math.min(...this.callHistory);
      const waitTime = (oldestCall + (60 * 60 * 1000)) - Date.now();
      
      if (waitTime > 0) {
        console.warn(`⚠️  Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await this.sleep(waitTime);
      }
    }
  }

  recordCall() {
    this.callHistory.push(Date.now());
    this.callCount++;
  }

  getRateLimitStatus() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const recentCalls = this.callHistory.filter(time => time > oneHourAgo).length;
    
    return {
      callsInLastHour: recentCalls,
      limit: this.config.rateLimitPerHour,
      remaining: this.config.rateLimitPerHour - recentCalls,
      totalCalls: this.callCount
    };
  }

  cacheResponse(prompt, response) {
    try {
      const hash = this.hashPrompt(prompt);
      const cachePath = path.join(this.config.cacheDir, `${hash}.json`);
      
      fs.writeFileSync(cachePath, JSON.stringify({
        prompt: prompt.substring(0, 500),
        response,
        timestamp: Date.now(),
        model: this.config.model
      }, null, 2));
    } catch (error) {
      console.warn('Failed to cache response:', error.message);
    }
  }

  getCachedResponse(prompt) {
    try {
      const hash = this.hashPrompt(prompt);
      const cachePath = path.join(this.config.cacheDir, `${hash}.json`);
      
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        
        const age = Date.now() - cached.timestamp;
        const maxAge = 24 * 60 * 60 * 1000;
        
        if (age < maxAge && cached.model === this.config.model) {
          return cached.response;
        }
      }
    } catch (error) {
      console.warn('Failed to read cache:', error.message);
    }
    
    return null;
  }

  hashPrompt(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex').substring(0, 16);
  }

  async countTokens(prompt) {
    try {
      const { totalTokens } = await this.model.countTokens(prompt);
      return totalTokens;
    } catch (error) {
      console.warn('Token counting failed:', error.message);
      return Math.ceil(prompt.length / 4);
    }
  }

  optimizePrompt(text, maxLength = 3000) {
    if (text.length <= maxLength) {
      return text;
    }

    const truncated = text.substring(0, maxLength);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    
    if (lastParagraph > maxLength * 0.8) {
      return truncated.substring(0, lastParagraph) + '\n\n... (truncated)';
    }

    const lastNewline = truncated.lastIndexOf('\n');
    if (lastNewline > maxLength * 0.8) {
      return truncated.substring(0, lastNewline) + '\n... (truncated)';
    }

    return truncated + '... (truncated)';
  }

  startChat(history = []) {
    return this.model.startChat({
      history,
      generationConfig: {
        temperature: this.config.temperature,
        topP: this.config.topP,
        topK: this.config.topK,
        maxOutputTokens: this.config.maxOutputTokens,
      }
    });
  }

  async generateStream(prompt, onChunk) {
    await this.checkRateLimit();
    this.recordCall();

    const result = await this.model.generateContentStream(prompt);
    let fullText = '';

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      
      if (onChunk) {
        onChunk(chunkText);
      }
    }

    return fullText;
  }

  clearCache() {
    try {
      const files = fs.readdirSync(this.config.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.config.cacheDir, file));
      }
      console.log('✅ Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error.message);
    }
  }

  getCacheStats() {
    try {
      const files = fs.readdirSync(this.config.cacheDir);
      let totalSize = 0;
      
      for (const file of files) {
        const stat = fs.statSync(path.join(this.config.cacheDir, file));
        totalSize += stat.size;
      }

      return {
        entries: files.length,
        sizeBytes: totalSize,
        sizeMB: (totalSize / (1024 * 1024)).toFixed(2)
      };
    } catch (error) {
      return { entries: 0, sizeBytes: 0, sizeMB: '0.00' };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

let instance = null;

export function getGeminiService(config) {
  if (!instance) {
    instance = new GeminiService(config);
  }
  return instance;
}

export default GeminiService;
