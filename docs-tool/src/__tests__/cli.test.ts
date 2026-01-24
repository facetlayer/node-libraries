import { describe, it, expect } from 'vitest';
import { runShellCommand } from '@facetlayer/subprocess';
import { join } from 'path';

const projectRoot = join(import.meta.dirname, '../..');
const cliPath = join(projectRoot, 'src/cli.ts');
const sampleDir = join(projectRoot, 'sample');

async function runCli(...args: string[]) {
  return runShellCommand('npx', ['tsx', cliPath, ...args], {
    cwd: projectRoot,
  });
}

describe('CLI', () => {
  describe('list command', () => {
    it('should list all doc files in the sample directory', async () => {
      const result = await runCli('list', sampleDir);

      expect(result.exitCode).toBe(0);

      const output = result.stdoutAsString();
      expect(output).toContain('Available doc files:');
      expect(output).toContain('getting-started.md');
      expect(output).toContain('api-reference.md');
      expect(output).toContain('configuration.md');
    });

    it('should show descriptions from frontmatter', async () => {
      const result = await runCli('list', sampleDir);

      expect(result.exitCode).toBe(0);

      const output = result.stdoutAsString();
      expect(output).toContain('Quick start guide for new users');
      expect(output).toContain('Complete API documentation');
      expect(output).toContain('Configuration options and settings');
    });

    it('should fail with non-existent directory', async () => {
      const result = await runCli('list', './nonexistent-dir');

      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('help and version', () => {
    it('should show help with --help flag', async () => {
      const result = await runCli('--help');

      expect(result.exitCode).toBe(0);

      const output = result.stdoutAsString();
      expect(output).toContain('list');
    });

    it('should show version with --version flag', async () => {
      const result = await runCli('--version');

      expect(result.exitCode).toBe(0);

      const output = result.stdoutAsString();
      expect(output).toMatch(/\d+\.\d+\.\d+/);
    });
  });

  describe('error handling', () => {
    it('should require a command', async () => {
      const result = await runCli();

      expect(result.exitCode).not.toBe(0);
    });

    it('should reject unknown commands', async () => {
      const result = await runCli('unknown-command');

      expect(result.exitCode).not.toBe(0);
    });
  });
});
