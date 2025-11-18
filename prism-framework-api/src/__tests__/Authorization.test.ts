import { Authorization } from '../authorization/Authorization';
import { Resource } from '../authorization/Resource';
import { AuthSource, CookieAuthSource } from '../authorization/AuthSource';
import { describe, expect, it } from 'vitest';

describe('Authorization', () => {
  describe('constructor', () => {
    it('should create an empty Authorization instance', () => {
      const auth = new Authorization();
      expect(auth.getAllResources()).toEqual([]);
      expect(auth.getAuthSources()).toEqual([]);
    });

    it('should initialize with provided resources', () => {
      const initialResources: Resource[] = [
        { type: 'user', id: 'user123' },
        { type: 'project', id: 'project456' },
      ];
      const auth = new Authorization(initialResources);
      expect(auth.getAllResources()).toHaveLength(2);
    });

    it('should initialize with provided auth sources', () => {
      const authSources: AuthSource[] = [
        { type: 'cookie', sessionId: 'session123' } as CookieAuthSource,
      ];
      const auth = new Authorization([], authSources);
      expect(auth.getAuthSources()).toHaveLength(1);
    });

    it('should initialize with both resources and auth sources', () => {
      const resources: Resource[] = [{ type: 'user', id: 'user123' }];
      const authSources: AuthSource[] = [
        { type: 'cookie', sessionId: 'session123' } as CookieAuthSource,
      ];
      const auth = new Authorization(resources, authSources);
      expect(auth.getAllResources()).toHaveLength(1);
      expect(auth.getAuthSources()).toHaveLength(1);
    });
  });

  describe('addResource', () => {
    it('should add a user resource', () => {
      const auth = new Authorization();
      const resource: Resource = { type: 'user', id: 'user123' };
      auth.addResource(resource);

      expect(auth.hasResource('user')).toBe(true);
      expect(auth.getResource('user')).toEqual(resource);
    });

    it('should add a project resource', () => {
      const auth = new Authorization();
      const resource: Resource = { type: 'project', id: 'project456' };
      auth.addResource(resource);

      expect(auth.hasResource('project')).toBe(true);
      expect(auth.getResource('project')).toEqual(resource);
    });

    it('should add a session resource', () => {
      const auth = new Authorization();
      const resource: Resource = { type: 'session', id: 'session789' };
      auth.addResource(resource);

      expect(auth.hasResource('session')).toBe(true);
      expect(auth.getResource('session')).toEqual(resource);
    });

    it('should replace existing resource of the same type', () => {
      const auth = new Authorization();
      const resource1: Resource = { type: 'user', id: 'user123' };
      const resource2: Resource = { type: 'user', id: 'user456' };

      auth.addResource(resource1);
      auth.addResource(resource2);

      expect(auth.getResource('user')).toEqual(resource2);
      expect(auth.getAllResources()).toHaveLength(1);
    });

    it('should allow multiple resources of different types', () => {
      const auth = new Authorization();
      const userResource: Resource = { type: 'user', id: 'user123' };
      const projectResource: Resource = { type: 'project', id: 'project456' };

      auth.addResource(userResource);
      auth.addResource(projectResource);

      expect(auth.getAllResources()).toHaveLength(2);
      expect(auth.hasResource('user')).toBe(true);
      expect(auth.hasResource('project')).toBe(true);
    });
  });

  describe('hasResource', () => {
    it('should return true when resource type exists', () => {
      const auth = new Authorization();
      auth.addResource({ type: 'user', id: 'user123' });

      expect(auth.hasResource('user')).toBe(true);
    });

    it('should return false when resource type does not exist', () => {
      const auth = new Authorization();
      auth.addResource({ type: 'user', id: 'user123' });

      expect(auth.hasResource('project')).toBe(false);
    });

    it('should return false for empty authorization', () => {
      const auth = new Authorization();
      expect(auth.hasResource('user')).toBe(false);
      expect(auth.hasResource('project')).toBe(false);
    });
  });

  describe('getResource', () => {
    it('should return resource when it exists', () => {
      const auth = new Authorization();
      const resource: Resource = { type: 'user', id: 'user123' };
      auth.addResource(resource);

      expect(auth.getResource('user')).toEqual(resource);
    });

    it('should return undefined when resource does not exist', () => {
      const auth = new Authorization();
      auth.addResource({ type: 'user', id: 'user123' });

      expect(auth.getResource('project')).toBeUndefined();
    });

    it('should return undefined for empty authorization', () => {
      const auth = new Authorization();
      expect(auth.getResource('user')).toBeUndefined();
    });
  });

  describe('getAllResources', () => {
    it('should return all resources', () => {
      const auth = new Authorization();
      const userResource: Resource = { type: 'user', id: 'user123' };
      const projectResource: Resource = { type: 'project', id: 'project456' };

      auth.addResource(userResource);
      auth.addResource(projectResource);

      const allResources = auth.getAllResources();
      expect(allResources).toHaveLength(2);
      expect(allResources).toContainEqual(userResource);
      expect(allResources).toContainEqual(projectResource);
    });

    it('should return empty array when no resources', () => {
      const auth = new Authorization();
      expect(auth.getAllResources()).toEqual([]);
    });
  });

  describe('addAuthSource', () => {
    it('should add a cookie auth source', () => {
      const auth = new Authorization();
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      auth.addAuthSource(cookieAuth);

      const sources = auth.getAuthSources();
      expect(sources).toHaveLength(1);
      expect(sources[0]).toEqual(cookieAuth);
    });

    it('should add multiple auth sources', () => {
      const auth = new Authorization();
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      const customAuth: AuthSource = { type: 'api-key' };

      auth.addAuthSource(cookieAuth);
      auth.addAuthSource(customAuth);

      expect(auth.getAuthSources()).toHaveLength(2);
    });
  });

  describe('getAuthSources', () => {
    it('should return all auth sources', () => {
      const auth = new Authorization();
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      auth.addAuthSource(cookieAuth);

      const sources = auth.getAuthSources();
      expect(sources).toHaveLength(1);
      expect(sources[0]).toEqual(cookieAuth);
    });

    it('should return a copy of auth sources array', () => {
      const auth = new Authorization();
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      auth.addAuthSource(cookieAuth);

      const sources1 = auth.getAuthSources();
      const sources2 = auth.getAuthSources();

      expect(sources1).not.toBe(sources2);
      expect(sources1).toEqual(sources2);
    });

    it('should return empty array when no auth sources', () => {
      const auth = new Authorization();
      expect(auth.getAuthSources()).toEqual([]);
    });
  });

  describe('getCookieAuthSource', () => {
    it('should return cookie auth source when it exists', () => {
      const auth = new Authorization();
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      auth.addAuthSource(cookieAuth);

      const result = auth.getCookieAuthSource();
      expect(result).toEqual(cookieAuth);
    });

    it('should return undefined when no cookie auth source exists', () => {
      const auth = new Authorization();
      const customAuth: AuthSource = { type: 'api-key' };
      auth.addAuthSource(customAuth);

      expect(auth.getCookieAuthSource()).toBeUndefined();
    });

    it('should return first cookie auth source when multiple exist', () => {
      const auth = new Authorization();
      const cookieAuth1: CookieAuthSource = { type: 'cookie', sessionId: 'session123' };
      const cookieAuth2: CookieAuthSource = { type: 'cookie', sessionId: 'session456' };
      auth.addAuthSource(cookieAuth1);
      auth.addAuthSource(cookieAuth2);

      const result = auth.getCookieAuthSource();
      expect(result).toEqual(cookieAuth1);
    });

    it('should return undefined for empty auth sources', () => {
      const auth = new Authorization();
      expect(auth.getCookieAuthSource()).toBeUndefined();
    });
  });

  describe('setUserPermissions', () => {
    it('should set user permissions', () => {
      const auth = new Authorization();
      const permissions = { userId: 'user123', permissions: ['read', 'write'] };
      auth.setUserPermissions(permissions);

      expect(auth.getUserPermissions()).toEqual(permissions);
    });

    it('should replace existing user permissions', () => {
      const auth = new Authorization();
      const permissions1 = { userId: 'user123', permissions: ['read'] };
      const permissions2 = { userId: 'user123', permissions: ['read', 'write', 'delete'] };

      auth.setUserPermissions(permissions1);
      auth.setUserPermissions(permissions2);

      expect(auth.getUserPermissions()).toEqual(permissions2);
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions when set', () => {
      const auth = new Authorization();
      const permissions = { userId: 'user123', permissions: ['read', 'write'] };
      auth.setUserPermissions(permissions);

      expect(auth.getUserPermissions()).toEqual(permissions);
    });

    it('should return undefined when not set', () => {
      const auth = new Authorization();
      expect(auth.getUserPermissions()).toBeUndefined();
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      const auth = new Authorization();
      auth.setUserPermissions({ userId: 'user123', permissions: ['read', 'write'] });

      expect(auth.hasPermission('read')).toBe(true);
      expect(auth.hasPermission('write')).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      const auth = new Authorization();
      auth.setUserPermissions({ userId: 'user123', permissions: ['read'] });

      expect(auth.hasPermission('write')).toBe(false);
      expect(auth.hasPermission('delete')).toBe(false);
    });

    it('should return false when no user permissions are set', () => {
      const auth = new Authorization();
      expect(auth.hasPermission('read')).toBe(false);
    });

    it('should return false for empty permissions array', () => {
      const auth = new Authorization();
      auth.setUserPermissions({ userId: 'user123', permissions: [] });

      expect(auth.hasPermission('read')).toBe(false);
    });

    it('should handle permission checks case-sensitively', () => {
      const auth = new Authorization();
      auth.setUserPermissions({ userId: 'user123', permissions: ['Read'] });

      expect(auth.hasPermission('Read')).toBe(true);
      expect(auth.hasPermission('read')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle complex authorization scenarios', () => {
      const auth = new Authorization();

      // Add resources
      auth.addResource({ type: 'user', id: 'user123' });
      auth.addResource({ type: 'project', id: 'project456' });

      // Add auth sources
      const cookieAuth: CookieAuthSource = { type: 'cookie', sessionId: 'session789' };
      auth.addAuthSource(cookieAuth);

      // Set permissions
      auth.setUserPermissions({
        userId: 'user123',
        permissions: ['read', 'write', 'admin'],
      });

      // Verify everything
      expect(auth.hasResource('user')).toBe(true);
      expect(auth.hasResource('project')).toBe(true);
      expect(auth.getCookieAuthSource()).toEqual(cookieAuth);
      expect(auth.hasPermission('read')).toBe(true);
      expect(auth.hasPermission('write')).toBe(true);
      expect(auth.hasPermission('admin')).toBe(true);
      expect(auth.hasPermission('delete')).toBe(false);
    });
  });
});
