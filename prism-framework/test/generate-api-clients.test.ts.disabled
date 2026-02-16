import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateApiClients } from '../src/generate-api-clients';
import fs from 'fs';
import path from 'path';

describe('generateApiClients', () => {
  const testOutputDir = path.join(__dirname, 'temp');
  const testOutputPath = path.join(testOutputDir, 'src/api/api-client-types.ts');

  beforeAll(() => {
    // Ensure test directory exists
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });

  it('should generate API client types from OpenAPI schema', async () => {
    // This test requires a running Prism server
    // Read the base URL from environment or use default
    const baseUrl = process.env.PRISM_API_URL || 'http://localhost:3000';

    // Change working directory to test output directory
    const originalCwd = process.cwd();
    process.chdir(testOutputDir);

    try {
      await generateApiClients(baseUrl);

      // Check that the file was created
      expect(fs.existsSync(testOutputPath)).toBe(true);

      // Read the generated file
      const content = fs.readFileSync(testOutputPath, 'utf-8');

      // Verify header comment
      expect(content).toContain('// Generated API client types');
      expect(content).toContain('// Auto-generated from OpenAPI schema - do not edit manually');

      // Verify it contains endpoint types
      expect(content).toContain('// Endpoint Types');

      // Verify it contains generic RequestType
      expect(content).toContain('export type RequestType<T extends string>');

      // Verify it contains generic ResponseType
      expect(content).toContain('export type ResponseType<T extends string>');

      console.log('\n📄 Generated file content preview:');
      console.log(content.slice(0, 500) + '...\n');
    } finally {
      // Restore original working directory
      process.chdir(originalCwd);
    }
  });

  it('should handle fetch errors gracefully', async () => {
    const invalidUrl = 'http://localhost:99999';

    const originalCwd = process.cwd();
    process.chdir(testOutputDir);

    try {
      await expect(generateApiClients(invalidUrl)).rejects.toThrow();
    } finally {
      process.chdir(originalCwd);
    }
  });
});
