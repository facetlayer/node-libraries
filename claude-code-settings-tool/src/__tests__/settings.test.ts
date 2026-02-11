import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { loadSettings, loadSettingsFile, listAllowRules, hasAllowRule, addAllowRule } from '../settings.ts';

const TEST_DIR = join(import.meta.dirname, '../../test/temp');

function setupTestProject(settings?: object, localSettings?: object) {
  const claudeDir = join(TEST_DIR, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  if (settings !== undefined) {
    writeFileSync(join(claudeDir, 'settings.json'), JSON.stringify(settings, null, 2));
  }
  if (localSettings !== undefined) {
    writeFileSync(join(claudeDir, 'settings.local.json'), JSON.stringify(localSettings, null, 2));
  }
}

describe('loadSettingsFile', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns exists: false for missing file', () => {
    const result = loadSettingsFile(TEST_DIR, 'settings.json');
    expect(result.exists).toBe(false);
    expect(result.content).toBeNull();
  });

  it('loads a valid settings file', () => {
    setupTestProject({ permissions: { allow: ['Bash(npm test)'] } });
    const result = loadSettingsFile(TEST_DIR, 'settings.json');
    expect(result.exists).toBe(true);
    expect(result.content).toEqual({ permissions: { allow: ['Bash(npm test)'] } });
  });

  it('handles invalid JSON', () => {
    const claudeDir = join(TEST_DIR, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'settings.json'), 'not json{{{');

    const result = loadSettingsFile(TEST_DIR, 'settings.json');
    expect(result.exists).toBe(true);
    expect(result.content).toBeNull();
    expect(result.parseError).toContain('Invalid JSON');
  });
});

describe('loadSettings', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads both files', () => {
    setupTestProject(
      { permissions: { allow: ['Bash(npm test)'] } },
      { permissions: { allow: ['Bash(npm run build)'] } },
    );

    const result = loadSettings(TEST_DIR);
    expect(result.settingsFile.content?.permissions?.allow).toEqual(['Bash(npm test)']);
    expect(result.localSettingsFile.content?.permissions?.allow).toEqual(['Bash(npm run build)']);
  });
});

describe('listAllowRules', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns empty array when no files exist', () => {
    expect(listAllowRules(TEST_DIR)).toEqual([]);
  });

  it('lists rules from both files with source', () => {
    setupTestProject(
      { permissions: { allow: ['Bash(npm test)', 'Read'] } },
      { permissions: { allow: ['Bash(npm run build)'] } },
    );

    const rules = listAllowRules(TEST_DIR);
    expect(rules).toEqual([
      { rule: 'Bash(npm test)', source: 'settings.json' },
      { rule: 'Read', source: 'settings.json' },
      { rule: 'Bash(npm run build)', source: 'settings.local.json' },
    ]);
  });

  it('handles files with no permissions', () => {
    setupTestProject({}, {});
    expect(listAllowRules(TEST_DIR)).toEqual([]);
  });
});

describe('hasAllowRule', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns false when rule does not exist', () => {
    setupTestProject({ permissions: { allow: ['Bash(npm test)'] } });
    expect(hasAllowRule(TEST_DIR, 'Read')).toBe(false);
  });

  it('returns true when rule exists in settings.json', () => {
    setupTestProject({ permissions: { allow: ['Bash(npm test)'] } });
    expect(hasAllowRule(TEST_DIR, 'Bash(npm test)')).toBe(true);
  });

  it('returns true when rule exists in settings.local.json', () => {
    setupTestProject({}, { permissions: { allow: ['Bash(npm test)'] } });
    expect(hasAllowRule(TEST_DIR, 'Bash(npm test)')).toBe(true);
  });
});

describe('addAllowRule', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('adds a rule to a new settings file', () => {
    const added = addAllowRule(TEST_DIR, 'Bash(npm test)');
    expect(added).toBe(true);

    const settingsPath = join(TEST_DIR, '.claude', 'settings.json');
    expect(existsSync(settingsPath)).toBe(true);

    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.permissions.allow).toEqual(['Bash(npm test)']);
  });

  it('adds a rule to an existing settings file', () => {
    setupTestProject({ permissions: { allow: ['Read'] } });

    const added = addAllowRule(TEST_DIR, 'Bash(npm test)');
    expect(added).toBe(true);

    const settingsPath = join(TEST_DIR, '.claude', 'settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.permissions.allow).toEqual(['Read', 'Bash(npm test)']);
  });

  it('skips adding a duplicate rule', () => {
    setupTestProject({ permissions: { allow: ['Bash(npm test)'] } });

    const added = addAllowRule(TEST_DIR, 'Bash(npm test)');
    expect(added).toBe(false);
  });

  it('skips if rule exists in the other file', () => {
    setupTestProject({}, { permissions: { allow: ['Bash(npm test)'] } });

    const added = addAllowRule(TEST_DIR, 'Bash(npm test)', 'settings.json');
    expect(added).toBe(false);
  });

  it('adds to settings.local.json when specified', () => {
    const added = addAllowRule(TEST_DIR, 'Bash(npm test)', 'settings.local.json');
    expect(added).toBe(true);

    const localPath = join(TEST_DIR, '.claude', 'settings.local.json');
    const content = JSON.parse(readFileSync(localPath, 'utf-8'));
    expect(content.permissions.allow).toEqual(['Bash(npm test)']);
  });

  it('preserves existing non-permission settings', () => {
    setupTestProject({ permissions: { deny: ['rm -rf'] }, });

    addAllowRule(TEST_DIR, 'Bash(npm test)');

    const settingsPath = join(TEST_DIR, '.claude', 'settings.json');
    const content = JSON.parse(readFileSync(settingsPath, 'utf-8'));
    expect(content.permissions.deny).toEqual(['rm -rf']);
    expect(content.permissions.allow).toEqual(['Bash(npm test)']);
  });
});
