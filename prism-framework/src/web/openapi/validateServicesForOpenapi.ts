import { ServiceDefinition } from "../../ServiceDefinition.ts";
import { EndpointDefinition } from "../ExpressEndpointSetup.ts";
import { generateOpenAPISchema } from "./OpenAPI.ts";
import { captureError, ErrorDetails } from "@facetlayer/Streams";

export interface EndpointValidationResult {
    error: ErrorDetails
}

export interface FailedEndpoint {
    serviceName: string;
    path: string;
    method: string;
    error: ErrorDetails;
}

export interface ServicesValidationResult {
    problemEndpoints: FailedEndpoint[];
}


/**
 * Validates a single endpoint for OpenAPI schema generation compatibility.
 *
 * @param serviceName - Name of the service containing the endpoint
 * @param endpoint - The endpoint definition to validate
 * @returns ProblematicEndpoint if validation fails, null if endpoint is valid
 */
export function validateEndpointForOpenapi(
  endpoint: EndpointDefinition
): EndpointValidationResult {
  const testService: ServiceDefinition = {
    name: 'test',
    endpoints: [endpoint],
  };

  try {
    generateOpenAPISchema([testService], {
      version: '1.0.0',
      title: 'Test',
      description: 'Test',
    });
    return null;
  } catch (error) {
    return { error: captureError(error) };
  }
}

/**
 * Finds endpoints that will fail OpenAPI schema generation.
 * Tests each endpoint individually to identify which ones have unsupported Zod types.
 *
 * @param services - Array of service definitions to check
 * @returns ValidationResult containing any problematic endpoints
 */
export function validateServicesForOpenapi(services: ServiceDefinition[]): ServicesValidationResult {
    const problemEndpoints: FailedEndpoint[] = [];

    for (const service of services) {
      const endpoints = service.endpoints || [];

      for (const endpoint of endpoints) {
        const endpointResult = validateEndpointForOpenapi(endpoint);
        if (endpointResult?.error) {
          problemEndpoints.push({
            serviceName: service.name,
            path: endpoint.path,
            method: endpoint.method,
            error: endpointResult.error,
          });
        }
      }
    }

    return { problemEndpoints };
  }