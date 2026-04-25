import { describe, it, expect } from 'vitest';
import { runShellCommand } from '@facetlayer/subprocess';
import * as path from 'path';

const cliPath = path.join(__dirname, 'cli.ts');
const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'cli-claude');

const PROJECT_TOOLS = '-Users-test-project-tools';
const PROJECT_APP = '-Users-test-project-app';
const SESSION_TOOLS = 'b411210c-b69d-4f06-92e9-ec1852327fd4';
const SESSION_APP_TOOLUSE = 'c984ede8-2d7c-443f-b343-918693a8e5cb';
const SESSION_APP_LARGE = '4646244c-c11e-4146-9e56-e7a5b5ae2c4a';

interface CliOutput {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

async function runCli(args: string[], envOverrides: Record<string, string> = {}): Promise<CliOutput> {
  const result = await runShellCommand(cliPath, args, {
    env: {
      ...process.env,
      CC_SESSION_HISTORY_DIR: fixturesDir,
      ...envOverrides,
    },
  });
  return {
    stdout: (result.stdout ?? []).join('\n'),
    stderr: (result.stderr ?? []).join('\n'),
    exitCode: result.exitCode,
  };
}

describe('cli', () => {
  describe('--help', () => {
    it('prints usage and exits 0', async () => {
      const result = await runCli(['--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('list-projects');
      expect(result.stdout).toContain('list-sessions');
      expect(result.stdout).toContain('get-chat');
      expect(result.stdout).toContain('check-schema');
      expect(result.stdout).toContain('search');
    });

    it('exits non-zero when no command is given', async () => {
      const result = await runCli([]);
      expect(result.exitCode).not.toBe(0);
    });
  });

  describe('list-projects', () => {
    it('lists projects from the fixture directory', async () => {
      const result = await runCli(['list-projects']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(PROJECT_TOOLS);
      expect(result.stdout).toContain(PROJECT_APP);
      expect(result.stdout).toContain('Total projects: 2');
    });

    it('reports "No projects found" when claude dir is empty', async () => {
      const emptyDir = path.join(__dirname, '..', 'test', 'fixtures', 'cli-claude-empty-this-does-not-exist');
      const result = await runCli(['list-projects'], { CC_SESSION_HISTORY_DIR: emptyDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No projects found');
    });

    it('reads the directory from --claude-dir, overriding the env var', async () => {
      const result = await runCli(
        ['list-projects', `--claude-dir=${fixturesDir}`],
        { CC_SESSION_HISTORY_DIR: '/nonexistent/path' }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(PROJECT_TOOLS);
    });
  });

  describe('list-sessions', () => {
    it('lists sessions for a single project', async () => {
      const result = await runCli(['list-sessions', `--project=${PROJECT_APP}`]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(SESSION_APP_TOOLUSE);
      expect(result.stdout).toContain(SESSION_APP_LARGE);
      expect(result.stdout).not.toContain(SESSION_TOOLS);
      expect(result.stdout).toContain('Total sessions: 2');
    });

    it('lists sessions across all projects with --all-projects', async () => {
      const result = await runCli(['list-sessions', '--all-projects']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(SESSION_TOOLS);
      expect(result.stdout).toContain(SESSION_APP_TOOLUSE);
      expect(result.stdout).toContain(SESSION_APP_LARGE);
      expect(result.stdout).toContain('Total sessions: 3');
    });

    it('respects --limit', async () => {
      const result = await runCli(['list-sessions', '--all-projects', '--limit=1']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Total sessions: 1');
    });
  });

  describe('get-chat', () => {
    it('prints session info as JSON when --json is given', async () => {
      const result = await runCli(['get-chat', '-s', SESSION_TOOLS, '--json']);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.sessionId).toBe(SESSION_TOOLS);
      expect(parsed.project).toBe(PROJECT_TOOLS);
      expect(parsed.messageCount).toBeGreaterThan(0);
      expect(Array.isArray(parsed.messages)).toBe(true);
    });

    it('prints a human-readable transcript by default', async () => {
      const result = await runCli(['get-chat', '-s', SESSION_APP_TOOLUSE]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Session ID: ${SESSION_APP_TOOLUSE}`);
      expect(result.stdout).toContain(`Project: ${PROJECT_APP}`);
      expect(result.stdout).toContain('USER');
      expect(result.stdout).toContain('ASSISTANT');
      expect(result.stdout).toContain('[TOOL USE: ToolSearch]');
      expect(result.stdout).toContain('[TOOL RESULT:');
    });

    it('exits non-zero with an error message for an unknown session', async () => {
      const result = await runCli(['get-chat', '-s', 'no-such-session']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Session not found');
    });
  });

  describe('check-schema', () => {
    it('reports zero errors against the fixture sessions', async () => {
      const result = await runCli(['check-schema']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Total sessions checked: 3');
      expect(result.stdout).toContain('Total errors found: 0');
      expect(result.stdout).toContain('All messages conform to schema');
    });

    it('can be scoped to a single project with --project', async () => {
      const result = await runCli(['check-schema', `--project=${PROJECT_TOOLS}`]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Total sessions checked: 1');
      expect(result.stdout).toContain('Total errors found: 0');
    });

    it('exits non-zero when given an unknown project', async () => {
      const result = await runCli(['check-schema', '--project=no-such-project']);
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('Project not found');
    });
  });

  describe('search', () => {
    it('finds matches across all projects', async () => {
      const result = await runCli(['search', 'assistant text', '--all-projects']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('match');
      expect(result.stdout).toContain(SESSION_APP_TOOLUSE);
    });

    it('reports no results when query has no matches', async () => {
      const result = await runCli(['search', 'thiswillnevermatchanything-zzzzz', '--all-projects']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No results found');
    });
  });

  describe('list-permission-checks', () => {
    it('runs across all projects without crashing', async () => {
      const result = await runCli(['list-permission-checks', '--all-projects']);
      expect(result.exitCode).toBe(0);
      // Fixtures don't include permission rejections; output should still
      // succeed and finish with a clean summary line.
      expect(result.stdout.length).toBeGreaterThan(0);
    });
  });

  describe('summarize', () => {
    it('summarizes a single session by id', async () => {
      const result = await runCli([
        'summarize',
        '-s', SESSION_APP_TOOLUSE,
        '-p', PROJECT_APP,
      ]);
      expect(result.exitCode).toBe(0);
      // summarize prints a shortened id (first segment) plus the project dir.
      expect(result.stdout).toContain(SESSION_APP_TOOLUSE.split('-')[0]);
      expect(result.stdout).toContain(PROJECT_APP);
    });
  });
});
