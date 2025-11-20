import { describe, it, expect, beforeEach } from 'vitest';
import { EnvFileRewrite } from '../src/index';
import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const TEST_DIR = join(__dirname, 'temp');

describe('EnvFileRewrite', () => {
  describe('get()', () => {
    it('should read existing environment variables', () => {
      const envFile = new EnvFileRewrite(join(TEST_DIR, '.env.sample1'));

      expect(envFile.get('API_BASE_URL')).toBe('http://localhost:3000');
      expect(envFile.get('WEB_BASE_URL')).toBe('http://localhost:8080');
      expect(envFile.get('API_KEY')).toBe('abc123');
    });

    it('should return undefined for non-existent variables', () => {
      const envFile = new EnvFileRewrite(join(TEST_DIR, '.env.sample1'));

      expect(envFile.get('NON_EXISTENT')).toBeUndefined();
    });

    it('should return modified value after set()', () => {
      const envFile = new EnvFileRewrite(join(TEST_DIR, '.env.sample1'));

      envFile.set('API_BASE_URL', 'http://localhost:5000');

      expect(envFile.get('API_BASE_URL')).toBe('http://localhost:5000');
    });
  });

  describe('set()', () => {
    it('should store modifications without affecting original file', () => {
      const testFile = join(TEST_DIR, '.env.sample1');
      const originalContent = readFileSync(testFile, 'utf8');

      const envFile = new EnvFileRewrite(testFile);
      envFile.set('API_BASE_URL', 'http://localhost:9999');

      const currentContent = readFileSync(testFile, 'utf8');
      expect(currentContent).toBe(originalContent);
    });

    it('should allow setting multiple variables', () => {
      const envFile = new EnvFileRewrite(join(TEST_DIR, '.env.sample1'));

      envFile.set('API_BASE_URL', 'http://localhost:5000');
      envFile.set('WEB_BASE_URL', 'http://localhost:6000');
      envFile.set('NEW_VAR', 'new_value');

      expect(envFile.get('API_BASE_URL')).toBe('http://localhost:5000');
      expect(envFile.get('WEB_BASE_URL')).toBe('http://localhost:6000');
      expect(envFile.get('NEW_VAR')).toBe('new_value');
    });
  });

  describe('save()', () => {
    let testFile: string;

    beforeEach(() => {
      testFile = join(TEST_DIR, '.env.test-temp');
      copyFileSync(join(TEST_DIR, '.env.sample1'), testFile);
    });

    it('should replace existing variable values', () => {
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('API_BASE_URL', 'http://localhost:9000');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      expect(content).toContain('API_BASE_URL=http://localhost:9000');
      expect(content).not.toContain('API_BASE_URL=http://localhost:3000');

      unlinkSync(testFile);
    });

    it('should append new variables if they do not exist', () => {
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('NEW_VARIABLE', 'new_value');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      expect(content).toContain('NEW_VARIABLE=new_value');

      unlinkSync(testFile);
    });

    it('should preserve comments and formatting', () => {
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('API_KEY', 'new_key_789');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      expect(content).toContain('# Sample environment file');
      expect(content).toContain('# API Keys');
      expect(content).toContain('API_KEY=new_key_789');

      unlinkSync(testFile);
    });

    it('should handle multiple modifications', () => {
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('API_BASE_URL', 'http://localhost:5000');
      envFile.set('WEB_BASE_URL', 'http://localhost:6000');
      envFile.set('NEW_VAR', 'new_value');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      expect(content).toContain('API_BASE_URL=http://localhost:5000');
      expect(content).toContain('WEB_BASE_URL=http://localhost:6000');
      expect(content).toContain('NEW_VAR=new_value');

      unlinkSync(testFile);
    });

    it('should save to a different file when filename is provided', () => {
      const newFile = join(TEST_DIR, '.env.new-output');
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('API_BASE_URL', 'http://localhost:7000');
      envFile.save(newFile);

      const originalContent = readFileSync(testFile, 'utf8');
      expect(originalContent).toContain('API_BASE_URL=http://localhost:3000');

      const newContent = readFileSync(newFile, 'utf8');
      expect(newContent).toContain('API_BASE_URL=http://localhost:7000');

      unlinkSync(testFile);
      unlinkSync(newFile);
    });

    it('should handle URL updates similar to helper code example', () => {
      const testFile3 = join(TEST_DIR, '.env.test-temp3');
      copyFileSync(join(TEST_DIR, '.env.sample3'), testFile3);

      const envFile = new EnvFileRewrite(testFile3);

      const apiPort = 4500;
      const webPort = 4501;

      envFile.set('API_BASE_URL', `http://localhost:${apiPort}`);
      envFile.set('WEB_BASE_URL', `http://localhost:${webPort}`);
      envFile.set('NEXT_PUBLIC_API_URL', `http://localhost:${apiPort}`);
      envFile.set('MCP_EVAL_API_URL', `http://localhost:${apiPort}`);
      envFile.save();

      const content = readFileSync(testFile3, 'utf8');
      expect(content).toContain(`API_BASE_URL=http://localhost:${apiPort}`);
      expect(content).toContain(`WEB_BASE_URL=http://localhost:${webPort}`);
      expect(content).toContain(`NEXT_PUBLIC_API_URL=http://localhost:${apiPort}`);
      expect(content).toContain(`MCP_EVAL_API_URL=http://localhost:${apiPort}`);

      unlinkSync(testFile3);
    });
  });

  describe('edge cases', () => {
    let testFile: string;

    beforeEach(() => {
      testFile = join(TEST_DIR, '.env.test-edge');
      copyFileSync(join(TEST_DIR, '.env.sample2'), testFile);
    });

    it('should handle variables with special characters in names', () => {
      const envFile = new EnvFileRewrite(testFile);

      envFile.set('VAR_WITH_UNDERSCORE', 'value1');
      envFile.set('VAR.WITH.DOTS', 'value2');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      expect(content).toContain('VAR_WITH_UNDERSCORE=value1');
      expect(content).toContain('VAR.WITH.DOTS=value2');

      unlinkSync(testFile);
    });

    it('should add newline if file does not end with one', () => {
      writeFileSync(testFile, 'EXISTING_VAR=value', 'utf8');

      const envFile = new EnvFileRewrite(testFile);
      envFile.set('NEW_VAR', 'new_value');
      envFile.save();

      const content = readFileSync(testFile, 'utf8');
      const lines = content.split('\n');
      expect(lines).toContain('NEW_VAR=new_value');

      unlinkSync(testFile);
    });
  });
});
