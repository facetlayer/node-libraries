import { describe, it, expect } from 'vitest';
import { runShellCommand } from '@facetlayer/subprocess';
import * as path from 'path';

const cliPath = path.join(__dirname, 'cli.ts');
const fixturesDir = path.join(__dirname, '..', 'test', 'fixtures', 'cli-claude');

const PROJECT_TOOLS = '-Users-test-project-tools';
const PROJECT_APP = '-Users-test-project-app';
const PROJECT_MONITOR = '-Users-test-project-monitor';
const SESSION_TOOLS = 'b411210c-b69d-4f06-92e9-ec1852327fd4';
const SESSION_APP_TOOLUSE = 'c984ede8-2d7c-443f-b343-918693a8e5cb';
const SESSION_APP_LARGE = '4646244c-c11e-4146-9e56-e7a5b5ae2c4a';
const SESSION_ROUTINE_1 = 'aaaaaaa1-1111-1111-1111-111111111111';
const SESSION_ROUTINE_2 = 'aaaaaaa2-2222-2222-2222-222222222222';
const SESSION_SKILL_USE = 'bbbbbbb1-1111-1111-1111-111111111111';

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
      expect(result.stdout).toContain('Total projects: 3');
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
      expect(result.stdout).toContain('Total sessions: 6');
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
      expect(result.stdout).toContain('Total sessions checked: 6');
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

  describe('list-sessions filter flags', () => {
    it('--routine returns only scheduled-task sessions', async () => {
      const result = await runCli(['list-sessions', '--all-projects', '--routine', '--json']);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      const ids = parsed.sessions.map((s: any) => s.sessionId).sort();
      expect(ids).toEqual([SESSION_ROUTINE_1, SESSION_ROUTINE_2].sort());
      expect(parsed.total).toBe(2);
    });

    it('--routine-name filters by scheduled-task name', async () => {
      const result = await runCli([
        'list-sessions', '--all-projects',
        '--routine-name=test-daily-monitor',
        '--count'
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('2');
    });

    it('--skill matches both slash command and Skill tool sources', async () => {
      // SESSION_SKILL_USE invokes both /vibe-cleanup-typescript (slash) and load-testing (Skill tool).
      const result = await runCli([
        'list-sessions', '--all-projects',
        '--skill=load-testing',
        '--json',
      ]);
      const parsed = JSON.parse(result.stdout);
      const ids = parsed.sessions.map((s: any) => s.sessionId);
      expect(ids).toEqual([SESSION_SKILL_USE]);
    });

    it('--entrypoint filters by entrypoint', async () => {
      const result = await runCli([
        'list-sessions', '--all-projects',
        '--entrypoint=claude-desktop',
        '--count',
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('2');
    });

    it('--json emits a structured payload with metadata fields', async () => {
      const result = await runCli([
        'list-sessions', '--all-projects',
        '--routine',
        '--json',
      ]);
      const parsed = JSON.parse(result.stdout);
      const first = parsed.sessions[0];
      expect(first).toHaveProperty('scheduledTask');
      expect(first.scheduledTask.name).toBe('test-daily-monitor');
      expect(first).toHaveProperty('entrypoint', 'claude-desktop');
      expect(first.skillsUsed).toContain('test-daily-monitor');
    });
  });

  describe('list-skills', () => {
    it('lists skills detected across all projects', async () => {
      const result = await runCli(['list-skills', '--all-projects', '--json']);
      expect(result.exitCode).toBe(0);
      const rows = JSON.parse(result.stdout);
      const names = rows.map((r: any) => r.name).sort();
      expect(names).toContain('test-daily-monitor');
      expect(names).toContain('vibe-cleanup-typescript');
      expect(names).toContain('load-testing');
    });

    it('reports invocation counts that include both runs of a routine', async () => {
      const result = await runCli(['list-skills', '--all-projects', '--json']);
      const rows = JSON.parse(result.stdout);
      const monitor = rows.find((r: any) => r.name === 'test-daily-monitor');
      expect(monitor.invocationCount).toBe(2);
      expect(monitor.sessionCount).toBe(2);
      expect(monitor.sources).toContain('scheduled-task');
    });

    it('--count prints a single number', async () => {
      const result = await runCli(['list-skills', '--all-projects', '--count']);
      expect(result.exitCode).toBe(0);
      expect(/^\d+$/.test(result.stdout.trim())).toBe(true);
    });
  });

  describe('list-routines', () => {
    it('lists scheduled-task routines with run counts', async () => {
      const result = await runCli(['list-routines', '--all-projects', '--json']);
      expect(result.exitCode).toBe(0);
      const rows = JSON.parse(result.stdout);
      expect(rows.length).toBe(1);
      expect(rows[0]).toMatchObject({
        routineName: 'test-daily-monitor',
        skillName: 'test-daily-monitor',
        runCount: 2,
      });
      expect(rows[0].projects).toEqual([PROJECT_MONITOR]);
    });
  });

  describe('get-skill-runs', () => {
    it('lists each invocation of a given skill', async () => {
      const result = await runCli([
        'get-skill-runs', 'test-daily-monitor',
        '--all-projects', '--json'
      ]);
      expect(result.exitCode).toBe(0);
      const rows = JSON.parse(result.stdout);
      expect(rows.length).toBe(2);
      expect(rows.every((r: any) => r.source === 'scheduled-task')).toBe(true);
      expect(rows.map((r: any) => r.sessionId).sort()).toEqual(
        [SESSION_ROUTINE_1, SESSION_ROUTINE_2].sort()
      );
    });

    it('--count returns just the number of runs', async () => {
      const result = await runCli([
        'get-skill-runs', 'test-daily-monitor',
        '--all-projects', '--count'
      ]);
      expect(result.stdout.trim()).toBe('2');
    });

    it('--limit/--offset paginates', async () => {
      const result = await runCli([
        'get-skill-runs', 'test-daily-monitor',
        '--all-projects', '--limit=1', '--json'
      ]);
      const rows = JSON.parse(result.stdout);
      expect(rows.length).toBe(1);
    });

    it('reports zero runs for an unknown skill', async () => {
      const result = await runCli([
        'get-skill-runs', 'no-such-skill',
        '--all-projects'
      ]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No runs found');
    });
  });

  describe('list-permission-checks --json', () => {
    it('emits JSON output without crashing', async () => {
      const result = await runCli([
        'list-permission-checks', '--all-projects', '--json',
      ]);
      expect(result.exitCode).toBe(0);
      // No rejections in fixtures — output should be a valid JSON array.
      const parsed = JSON.parse(result.stdout);
      expect(Array.isArray(parsed)).toBe(true);
    });
  });
});
