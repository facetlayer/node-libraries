import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { loadSettings, loadSettingsFile } from '../loadSettings.ts';

const TEST_DIR = join(import.meta.dirname, '../../test/temp');

describe('loadSettingsFile', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns exists: false when file does not exist', () => {
    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(false);
    expect(result.content).toBe(null);
    expect(result.parseError).toBeUndefined();
  });

  it('loads valid JSON settings file', () => {
    const settings = {
      permissions: {
        allow: ['Bash(npm run build)'],
        deny: ['Bash(rm -rf)'],
      },
    };
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.json'),
      JSON.stringify(settings)
    );

    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(true);
    expect(result.content).toEqual(settings);
    expect(result.parseError).toBeUndefined();
  });

  it('returns parse error for invalid JSON', () => {
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.json'),
      '{ invalid json }'
    );

    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(true);
    expect(result.content).toBe(null);
    expect(result.parseError).toMatch(/Invalid JSON/);
  });

  it('returns parse error for truncated JSON', () => {
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.json'),
      '{ "permissions": {'
    );

    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(true);
    expect(result.content).toBe(null);
    expect(result.parseError).toMatch(/Invalid JSON/);
  });

  it('handles empty file as invalid JSON', () => {
    writeFileSync(join(TEST_DIR, '.claude', 'settings.json'), '');

    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(true);
    expect(result.content).toBe(null);
    expect(result.parseError).toMatch(/Invalid JSON/);
  });

  it('loads empty object as valid', () => {
    writeFileSync(join(TEST_DIR, '.claude', 'settings.json'), '{}');

    const result = loadSettingsFile(TEST_DIR, 'settings.json');

    expect(result.exists).toBe(true);
    expect(result.content).toEqual({});
    expect(result.parseError).toBeUndefined();
  });
});

describe('loadSettings', () => {
  beforeEach(() => {
    mkdirSync(join(TEST_DIR, '.claude'), { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('loads both settings files when they exist', () => {
    const settings = { permissions: { allow: ['Bash(git status)'] } };
    const localSettings = { permissions: { allow: ['Bash(npm test)'] } };

    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.json'),
      JSON.stringify(settings)
    );
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.local.json'),
      JSON.stringify(localSettings)
    );

    const result = loadSettings(TEST_DIR);

    expect(result.settingsFile.exists).toBe(true);
    expect(result.settingsFile.content).toEqual(settings);
    expect(result.localSettingsFile.exists).toBe(true);
    expect(result.localSettingsFile.content).toEqual(localSettings);
  });

  it('handles when only settings.json exists', () => {
    const settings = { permissions: { allow: ['Bash(git status)'] } };
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.json'),
      JSON.stringify(settings)
    );

    const result = loadSettings(TEST_DIR);

    expect(result.settingsFile.exists).toBe(true);
    expect(result.settingsFile.content).toEqual(settings);
    expect(result.localSettingsFile.exists).toBe(false);
  });

  it('handles when only settings.local.json exists', () => {
    const localSettings = { permissions: { allow: ['Bash(npm test)'] } };
    writeFileSync(
      join(TEST_DIR, '.claude', 'settings.local.json'),
      JSON.stringify(localSettings)
    );

    const result = loadSettings(TEST_DIR);

    expect(result.settingsFile.exists).toBe(false);
    expect(result.localSettingsFile.exists).toBe(true);
    expect(result.localSettingsFile.content).toEqual(localSettings);
  });

  it('handles when neither file exists', () => {
    const result = loadSettings(TEST_DIR);

    expect(result.settingsFile.exists).toBe(false);
    expect(result.localSettingsFile.exists).toBe(false);
  });
});
