import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { createInterface } from 'readline';

const PROJECT_ROOT = join(import.meta.dirname, '..', '..');
const REPO_ROOT = join(PROJECT_ROOT, '..');
const TEMP_DIR = join(PROJECT_ROOT, 'test', 'temp');

interface StdinResponse {
  id: string;
  status: number;
  body: any;
}

/**
 * Spawn cc-skills-gui in --stdin mode as a real subprocess,
 * communicating via the JSON-over-stdin/stdout protocol.
 */
function spawnStdinGui(skillsDir: string) {
  // Run from the repo root so module resolution works, but set cwd
  // for the child to skillsDir so project skills are loaded from there.
  const child = spawn(
    'npx',
    ['tsx', join(PROJECT_ROOT, 'src', 'main.ts'), '--stdin'],
    {
      cwd: skillsDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        // Ensure node can resolve workspace deps from repo root
        NODE_PATH: join(REPO_ROOT, 'node_modules'),
      },
    },
  );

  const responses: StdinResponse[] = [];
  const waiters = new Map<string, (resp: StdinResponse) => void>();

  const rl = createInterface({ input: child.stdout!, terminal: false });

  rl.on('line', (line: string) => {
    if (!line.trim()) return;
    try {
      const resp = JSON.parse(line) as StdinResponse;
      responses.push(resp);
      const waiter = waiters.get(resp.id);
      if (waiter) {
        waiters.delete(resp.id);
        waiter(resp);
      }
    } catch {
      // ignore non-JSON lines
    }
  });

  let stderrOutput = '';
  child.stderr?.on('data', (chunk: Buffer) => {
    stderrOutput += chunk.toString();
  });

  function send(msg: any) {
    child.stdin!.write(JSON.stringify(msg) + '\n');
  }

  function waitForResponse(id: string, timeoutMs = 15000): Promise<StdinResponse> {
    const existing = responses.find(r => r.id === id);
    if (existing) return Promise.resolve(existing);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`Timeout waiting for response id="${id}". stderr: ${stderrOutput}`));
      }, timeoutMs);

      waiters.set(id, (resp) => {
        clearTimeout(timer);
        resolve(resp);
      });
    });
  }

  function close() {
    child.stdin!.end();
    child.kill();
  }

  return { child, send, waitForResponse, close, getStderr: () => stderrOutput };
}

describe('cc-skills-gui stdin protocol', { timeout: 20000 }, () => {
  beforeEach(() => {
    rmSync(TEMP_DIR, { recursive: true, force: true });
    mkdirSync(join(TEMP_DIR, '.claude', 'skills', 'test-skill'), { recursive: true });
    writeFileSync(
      join(TEMP_DIR, '.claude', 'skills', 'test-skill', 'SKILL.md'),
      `---\nname: Test Skill\ndescription: A test skill for integration testing\n---\nThis is the test skill content.\n`,
    );
  });

  afterEach(() => {
    rmSync(TEMP_DIR, { recursive: true, force: true });
  });

  it('should start and send ready message', async () => {
    const gui = spawnStdinGui(TEMP_DIR);

    try {
      const ready = await gui.waitForResponse('_ready');
      expect(ready.status).toBe(200);
      expect(ready.body.message).toBe('stdin server ready');
    } finally {
      gui.close();
    }
  });

  it('should list skills via GET /skills', async () => {
    const gui = spawnStdinGui(TEMP_DIR);

    try {
      await gui.waitForResponse('_ready');

      gui.send({ id: 'list-1', method: 'GET', path: '/skills' });
      const resp = await gui.waitForResponse('list-1');

      expect(resp.status).toBe(200);
      expect(resp.body).toBeInstanceOf(Array);

      // Should find our test skill in the project directory
      const testSkill = resp.body.find((s: any) => s.dirName === 'test-skill');
      expect(testSkill).toBeDefined();
      expect(testSkill.name).toBe('Test Skill');
      expect(testSkill.location).toBe('project');
      expect(testSkill.content).toContain('test skill content');
    } finally {
      gui.close();
    }
  });

  it('should save a skill via PUT /skills/:location/:dirName', async () => {
    const gui = spawnStdinGui(TEMP_DIR);

    try {
      await gui.waitForResponse('_ready');

      gui.send({
        id: 'save-1',
        method: 'PUT',
        path: '/skills/project/new-skill',
        body: {
          location: 'project',
          dirName: 'new-skill',
          frontmatter: { name: 'New Skill', description: 'Created via stdin protocol' },
          content: 'Brand new skill content.',
        },
      });
      const saveResp = await gui.waitForResponse('save-1');

      expect(saveResp.status).toBe(200);
      expect(saveResp.body.ok).toBe(true);

      // Verify the file was actually created on disk
      const skillFile = join(TEMP_DIR, '.claude', 'skills', 'new-skill', 'SKILL.md');
      expect(existsSync(skillFile)).toBe(true);

      // Now list skills and confirm the new one appears
      gui.send({ id: 'list-2', method: 'GET', path: '/skills' });
      const listResp = await gui.waitForResponse('list-2');

      expect(listResp.status).toBe(200);
      const newSkill = listResp.body.find((s: any) => s.dirName === 'new-skill');
      expect(newSkill).toBeDefined();
      expect(newSkill.name).toBe('New Skill');
    } finally {
      gui.close();
    }
  });

  it('should return error for non-existent endpoints', async () => {
    const gui = spawnStdinGui(TEMP_DIR);

    try {
      await gui.waitForResponse('_ready');

      gui.send({ id: 'bad-1', method: 'GET', path: '/nonexistent' });
      const resp = await gui.waitForResponse('bad-1');

      expect(resp.status).toBeGreaterThanOrEqual(400);
    } finally {
      gui.close();
    }
  });
});
