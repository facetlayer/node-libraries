import { CookieAuthSource, AuthSource } from './AuthSource.ts';
import { Resource } from './Resource.ts';

// Base permission type - applications can extend this
export type Permission = string;

export interface UserPermissions {
  userId: string;
  permissions: Permission[];
}

/*
 * Authorization
 *
 * Contains all of the authorization data for a single request.
 * Stored on every RequestContext.
 *
 * This includes:
 *  - The verified 'auth sources' which are the original source of all authorization.
 *  - The 'resources' which this request has been granted access to.
 *  - The 'permissions' which are fine-level permissions that the request has been granted.
 */
export class Authorization {
  private resources: Map<Resource['type'], Resource>;
  private authSources: AuthSource[];
  private userPermissions?: UserPermissions;

  constructor(resources: Resource[] = [], authSources: AuthSource[] = []) {
    this.resources = new Map();
    for (const resource of resources) {
      this.resources.set(resource.type, resource);
    }
    this.authSources = [...authSources];
  }

  addResource(resource: Resource): void {
    this.resources.set(resource.type, resource);
  }

  hasResource(type: Resource['type']): boolean {
    return this.resources.has(type);
  }

  getResource(type: Resource['type']): Resource | undefined {
    return this.resources.get(type);
  }

  getAllResources(): Resource[] {
    return Array.from(this.resources.values());
  }

  addAuthSource(authSource: AuthSource): void {
    this.authSources.push(authSource);
  }

  getAuthSources(): AuthSource[] {
    return [...this.authSources];
  }

  getCookieAuthSource(): CookieAuthSource | undefined {
    return this.authSources.find((c): c is CookieAuthSource => c.type === 'cookie');
  }

  setUserPermissions(userPermissions: UserPermissions): void {
    this.userPermissions = userPermissions;
  }

  getUserPermissions(): UserPermissions | undefined {
    return this.userPermissions;
  }

  hasPermission(permission: Permission): boolean {
    if (!this.userPermissions) {
      return false;
    }
    return this.userPermissions.permissions.includes(permission);
  }
}
