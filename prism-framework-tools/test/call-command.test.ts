import { describe, it, expect } from 'vitest';
import { parseNamedArgs } from '../src/call-command';

describe('parseNamedArgs', () => {
  describe('basic values', () => {
    it('should pass through simple string values', () => {
      const result = parseNamedArgs({ name: 'John', email: 'john@example.com' });
      expect(result).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should pass through non-string values', () => {
      const result = parseNamedArgs({ count: 42, active: true });
      expect(result).toEqual({ count: 42, active: true });
    });
  });

  describe('JSON parsing', () => {
    it('should parse JSON object strings', () => {
      const result = parseNamedArgs({ config: '{"timeout": 30}' });
      expect(result).toEqual({ config: { timeout: 30 } });
    });

    it('should parse JSON array strings', () => {
      const result = parseNamedArgs({ items: '["a", "b", "c"]' });
      expect(result).toEqual({ items: ['a', 'b', 'c'] });
    });

    it('should handle whitespace around JSON', () => {
      const result = parseNamedArgs({ data: '  {"key": "value"}  ' });
      expect(result).toEqual({ data: { key: 'value' } });
    });

    it('should keep invalid JSON as string', () => {
      const result = parseNamedArgs({ bad: '{not valid json}' });
      expect(result).toEqual({ bad: '{not valid json}' });
    });

    it('should not parse strings that only start with { or [', () => {
      const result = parseNamedArgs({ text: '{hello world' });
      expect(result).toEqual({ text: '{hello world' });
    });
  });

  describe('nested objects from yargs', () => {
    it('should parse JSON strings inside nested objects', () => {
      // Yargs creates nested objects from dot notation before we see them
      const result = parseNamedArgs({
        schema: {
          name: 'test-schema',
          statements: '["CREATE TABLE test (id INT)"]'
        }
      });
      expect(result).toEqual({
        schema: {
          name: 'test-schema',
          statements: ['CREATE TABLE test (id INT)']
        }
      });
    });

    it('should handle deeply nested objects with JSON strings', () => {
      const result = parseNamedArgs({
        config: {
          database: {
            options: '{"timeout": 30, "retries": 3}'
          }
        }
      });
      expect(result).toEqual({
        config: {
          database: {
            options: { timeout: 30, retries: 3 }
          }
        }
      });
    });
  });

  describe('real-world example from test.sh', () => {
    it('should handle the migration command args', () => {
      // Yargs parses --schema.name and --schema.statements into nested object
      const result = parseNamedArgs({
        schema: {
          name: 'test-schema-v2',
          statements: '["CREATE TABLE test_products (id INTEGER PRIMARY KEY, name TEXT, price REAL)"]'
        }
      });
      expect(result).toEqual({
        schema: {
          name: 'test-schema-v2',
          statements: ['CREATE TABLE test_products (id INTEGER PRIMARY KEY, name TEXT, price REAL)']
        }
      });
    });
  });
});
