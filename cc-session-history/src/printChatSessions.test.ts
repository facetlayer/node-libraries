import { describe, it, expect } from 'vitest';
import { pathToProjectDir } from './printChatSessions.ts';

describe('pathToProjectDir', () => {
  it('should replace forward slashes with dashes', () => {
    expect(pathToProjectDir('/Users/andy/candle')).toBe('-Users-andy-candle');
  });

  it('should replace periods with dashes', () => {
    expect(pathToProjectDir('/Users/andy.fischer/foo')).toBe('-Users-andy-fischer-foo');
  });

  it('should handle paths with multiple periods', () => {
    expect(pathToProjectDir('/Users/john.doe.jr/projects')).toBe('-Users-john-doe-jr-projects');
  });

  it('should handle paths with both slashes and periods', () => {
    expect(pathToProjectDir('/Users/andy.fischer/Development/ecom-platform-services'))
      .toBe('-Users-andy-fischer-Development-ecom-platform-services');
  });

  it('should handle paths with consecutive periods', () => {
    expect(pathToProjectDir('/Users/test..user/dir')).toBe('-Users-test--user-dir');
  });

  it('should handle empty string', () => {
    expect(pathToProjectDir('')).toBe('');
  });

  it('should handle path with only slashes', () => {
    expect(pathToProjectDir('///')).toBe('---');
  });

  it('should handle path with trailing slash', () => {
    expect(pathToProjectDir('/Users/andy/')).toBe('-Users-andy-');
  });

  it('should handle relative paths without leading slash', () => {
    expect(pathToProjectDir('Users/andy/project')).toBe('Users-andy-project');
  });

  it('should preserve existing dashes', () => {
    expect(pathToProjectDir('/Users/andy/my-project')).toBe('-Users-andy-my-project');
  });

  it('should handle complex real-world paths', () => {
    expect(pathToProjectDir('/Users/jane.smith/Development/my-app.v2/src'))
      .toBe('-Users-jane-smith-Development-my-app-v2-src');
  });

  it('should handle home directory paths', () => {
    expect(pathToProjectDir('/home/user.name/workspace')).toBe('-home-user-name-workspace');
  });

  it('should handle Windows-style paths with periods in username', () => {
    // Note: This function handles forward slashes; backslashes would need separate handling
    expect(pathToProjectDir('/c/Users/john.doe/Documents')).toBe('-c-Users-john-doe-Documents');
  });
});
