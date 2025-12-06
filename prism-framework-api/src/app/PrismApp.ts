import { EndpointDefinition } from '../web/ExpressEndpointSetup.ts';
import { ServiceDefinition } from '../ServiceDefinition.ts';
import { callEndpoint, CallEndpointOptions } from './callEndpoint.ts';

export function endpointKey(method: string, path: string): string {
  return `${method} ${path}`;
}

export class PrismApp {
  endpointMap: Map<string, EndpointDefinition>;
  services: ServiceDefinition[];
  name?: string;
  description?: string;

  constructor(services: ServiceDefinition[]) {
    this.services = services;
    this.endpointMap = new Map();

    // Create a lookup map of all endpoints
    for (const service of services) {
      if (service.endpoints) {
        for (const endpoint of service.endpoints) {
          const key = endpointKey(endpoint.method, endpoint.path);
          this.endpointMap.set(key, endpoint);
        }
      }
    }
  }

  getAllServices(): ServiceDefinition[] {
    return this.services;
  }

  getEndpoint(method: string, path: string): EndpointDefinition | undefined {
    const key = endpointKey(method, path);
    return this.endpointMap.get(key);
  }

  matchEndpoint(method: string, path: string): { endpoint: EndpointDefinition; params: Record<string, string> } | undefined {
    // First try exact match
    const key = endpointKey(method, path);
    const exactMatch = this.endpointMap.get(key);
    if (exactMatch) {
      return { endpoint: exactMatch, params: {} };
    }

    // Try to match path patterns with parameters
    for (const [endpointKey, endpoint] of this.endpointMap.entries()) {
      if (!endpointKey.startsWith(method + ' ')) {
        continue;
      }

      const endpointPath = endpoint.path;
      const match = this.matchPath(endpointPath, path);

      if (match) {
        return { endpoint, params: match };
      }
    }

    return undefined;
  }

  private matchPath(pattern: string, path: string): Record<string, string> | null {
    // Convert Express-style path parameters (:param) to regex with named groups
    const paramNames: string[] = [];
    const regexString = pattern
      .replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexString}$`);
    const match = path.match(regex);

    if (!match) {
      return null;
    }

    // Extract parameter values
    const params: Record<string, string> = {};
    for (let i = 0; i < paramNames.length; i++) {
      params[paramNames[i]] = match[i + 1];
    }

    return params;
  }

  listAllEndpoints(): EndpointDefinition[] {
    return Array.from(this.endpointMap.values());
  }

  callEndpoint(options: CallEndpointOptions): Promise<any> {
    return callEndpoint(this, options);
  }
}
