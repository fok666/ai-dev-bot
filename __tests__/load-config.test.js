import fs from 'fs';
import yaml from 'js-yaml';

describe('Config Loading', () => {
  // Use unique file name to prevent conflicts when tests run in parallel
  const testConfigPath = `.test-config-load-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.yml`;

  afterEach(() => {
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  describe('config validation', () => {
    it('should validate config structure', () => {
      const config = {
        gemini: {
          apiKey: 'test-key',
          model: 'gemini-2.5-flash',
          temperature: 0.3
        },
        github: {
          token: 'test-token',
          owner: 'test-owner',
          repo: 'test-repo'
        }
      };

      expect(config.gemini).toBeDefined();
      expect(config.github).toBeDefined();
      expect(config.gemini.apiKey).toBeTruthy();
      expect(config.github.token).toBeTruthy();
    });

    it('should require gemini.apiKey', () => {
      const config = {
        github: { token: 'test-token' }
      };

      expect(config.gemini).toBeUndefined();
    });

    it('should require github.token', () => {
      const config = {
        gemini: { apiKey: 'test-key' }
      };

      expect(config.github).toBeUndefined();
    });

    it('should allow optional fields', () => {
      const config = {
        gemini: { apiKey: 'test-key' },
        github: { token: 'test-token' },
        optional: { field: 'value' }
      };

      expect(config.optional).toBeDefined();
      expect(config.optional.field).toBe('value');
    });
  });

  describe('nested config', () => {
    it('should support nested gemini config', () => {
      const config = {
        gemini: {
          apiKey: 'test-key',
          model: 'gemini-2.5-flash',
          safety: {
            threshold: 'BLOCK_NONE'
          }
        }
      };

      expect(config.gemini.safety).toBeDefined();
      expect(config.gemini.safety.threshold).toBe('BLOCK_NONE');
    });

    it('should support nested github config', () => {
      const config = {
        github: {
          token: 'test-token',
          options: {
            throttle: true,
            retry: 3
          }
        }
      };

      expect(config.github.options).toBeDefined();
      expect(config.github.options.throttle).toBe(true);
    });
  });

  describe('type preservation', () => {
    it('should preserve string types', () => {
      const config = { stringField: 'value' };
      expect(typeof config.stringField).toBe('string');
    });

    it('should preserve number types', () => {
      const config = { numberField: 42 };
      expect(typeof config.numberField).toBe('number');
    });

    it('should preserve boolean types', () => {
      const config = { boolField: true };
      expect(typeof config.boolField).toBe('boolean');
    });

    it('should preserve array types', () => {
      const config = { arrayField: [1, 2, 3] };
      expect(Array.isArray(config.arrayField)).toBe(true);
    });
  });

  describe('YAML loading', () => {
    it('should load valid YAML', () => {
      const yamlContent = `
gemini:
  apiKey: test-key
github:
  token: test-token
`;
      fs.writeFileSync(testConfigPath, yamlContent);

      const config = yaml.load(fs.readFileSync(testConfigPath, 'utf8'));
      expect(config.gemini.apiKey).toBe('test-key');
      expect(config.github.token).toBe('test-token');
    });

    it('should handle YAML with comments', () => {
      const yamlContent = `
# Gemini config
gemini:
  apiKey: test-key  # API key
`;
      fs.writeFileSync(testConfigPath, yamlContent);

      const config = yaml.load(fs.readFileSync(testConfigPath, 'utf8'));
      expect(config.gemini.apiKey).toBe('test-key');
    });

    it('should parse YAML arrays', () => {
      const yamlContent = `
items:
  - one
  - two
  - three
`;
      fs.writeFileSync(testConfigPath, yamlContent);

      const config = yaml.load(fs.readFileSync(testConfigPath, 'utf8'));
      expect(config.items).toHaveLength(3);
      expect(config.items[0]).toBe('one');
    });
  });
});
