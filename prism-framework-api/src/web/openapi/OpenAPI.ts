/*
 * OpenAPI
 *
 * Generates OpenAPI schema from service definitions.
 * This module transforms endpoint definitions into a complete OpenAPI 3.1.0 specification.
 */

import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  RouteConfig,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIObject } from 'openapi3-ts/oas31';
import z from 'zod';
import { ServiceDefinition } from '../../ServiceDefinition.ts';
import { PrismApp } from '../../app/PrismApp.ts';
import express, { Request, Response } from 'express';
import { captureError } from '@facetlayer/Streams'
import { validateServicesForOpenapi } from './validateServicesForOpenapi.ts';
import { getEffectiveOperationId } from '../../endpoints/createEndpoint.ts';

export { validateServicesForOpenapi as validateEndpointForOpenapi } from './validateServicesForOpenapi.ts';

type RequestConfig = RouteConfig['request'];

export interface OpenAPIConfig {
  enable: boolean
  enableSwagger?: boolean
}

export type ParseExpressPathForOpenAPIResult = {
  openApiPath: string;
  pathParams: string[];
};

export interface OpenAPIDocumentInfo {
  version: string;
  title: string;
  description: string;
}

// Globally modify Zod to support the .openapi() helper method.
extendZodWithOpenApi(z);

/**
 * Transforms path parameters in an Express-style URL path (e.g. :pathParameter) into their OpenAPI equivalents (e.g. {pathParameter})
 * Returns the transformed OpenAPI-style URL path along with any path parameters found.
 *
 * @param {string} expressApiPath - An Express-style URL path
 * @returns {ParseExpressPathForOpenAPIResult} - the transformed OpenAPI-style URL path with any path parameters found
 */
export function parseExpressPathForOpenAPI(expressApiPath: string): ParseExpressPathForOpenAPIResult {
  const expressApiPathParts: string[] = expressApiPath.split('/');
  const pathParams: string[] = [];
  const openApiPathParts: string[] = [];

  for (const part of expressApiPathParts) {
    if (part.startsWith(':')) {
      pathParams.push(part.substring(1));
      openApiPathParts.push(`{${part.substring(1)}}`);
    } else {
      openApiPathParts.push(part);
    }
  }

  return {
    openApiPath: openApiPathParts.join('/'),
    pathParams,
  };
}

/**
 * Generates the Open API Schema for all services.
 *
 * @param {ServiceDefinition[]} services - Array of service definitions to generate OpenAPI schema for
 * @param {OpenAPIDocumentInfo} documentInfo - Metadata for the OpenAPI document
 * @returns {OpenAPIObject} - the Open API schema for all service definitions.
 */
export function generateOpenAPISchema(
  services: ServiceDefinition[],
  documentInfo: OpenAPIDocumentInfo
): OpenAPIObject {
  const registry: OpenAPIRegistry = new OpenAPIRegistry();

  // Register all endpoints from all services
  for (const service of services) {
    const endpoints = service.endpoints || [];

    for (const endpoint of endpoints) {
      const { openApiPath, pathParams }: ParseExpressPathForOpenAPIResult =
        parseExpressPathForOpenAPI(endpoint.path);
      const requestConfig: RequestConfig = {};

      // Specify path parameters: Extract path parameters from the route path and create a Zod schema from it.
      if (pathParams.length > 0) {
        // TODO: specify stricter typing for path parameters (e.g. enums/numeric values)
        const pathParamsSchema: Record<string, z.ZodString> = {};
        for (const param of pathParams) {
          pathParamsSchema[param] = z.string();
        }
        requestConfig.params = z.object(pathParamsSchema);
      }

      // Specify body parameters: If the endpoint provides a request schema, use that as the body parameter
      if (endpoint.requestSchema) {
        requestConfig.body = {
          content: {
            'application/json': {
              schema: endpoint.requestSchema,
            },
          },
        };
      }

          registry.registerPath({
            method: endpoint.method.toLowerCase() as any,
            path: openApiPath,
            description: endpoint.description || `${endpoint.method} ${endpoint.path}`,
            operationId: getEffectiveOperationId(endpoint),
            request: requestConfig,
            responses: {
              200: {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: endpoint.responseSchema ?? z.any(),
                  },
                },
              },
              /*
              400: {
                description: 'Bad Request - Schema validation failed',
                content: {
                  'application/json': {
                    schema: z.object({
                      error: z.string(),
                      details: z.array(z.any()),
                    }),
                  },
                },
              },
              401: {
                description: 'Unauthorized',
                content: {
                  'application/json': {
                    schema: z.object({
                      message: z.string(),
                      details: z.any().optional(),
                    }),
                  },
                },
              },
              500: {
                description: 'Internal Server Error',
                content: {
                  'application/json': {
                    schema: z.object({
                      message: z.string(),
                    }),
                  },
                },
              },
              */
            },
          });
    }
  }

  const generator: OpenApiGeneratorV31 = new OpenApiGeneratorV31(
    registry.definitions
    
    /*
    .concat([
      {
        type: 'component',
        componentType: 'securitySchemes',
        name: 'bearer_auth',
        component: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    ])
      */
  );

  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      version: documentInfo.version,
      title: documentInfo.title,
      description: documentInfo.description,
    },
    security: [
      {
        bearer_auth: [],
      },
    ],
  });
}

export function setupSwaggerUI(app: express.Application, openApiJsonPath: string = '/openapi.json'): void {
  // Serve Swagger UI on /swagger
  app.use(
    '/swagger',
    swaggerUi.serve,
    swaggerUi.setup(null, {
      swaggerOptions: {
        url: openApiJsonPath,
      },
    })
  );
}

export function mountOpenAPIEndpoints(config: OpenAPIConfig, expressApp: express.Application, prismApp: PrismApp): void {
  expressApp.get('/openapi.json', (req: Request, res: Response) => {
    const services = prismApp.getAllServices();
    try {
      res.json(generateOpenAPISchema(services, {
        version: '1.0.0',
        title: prismApp.name,
        description: prismApp.description,
      }));
    } catch (error) {

      const validationResult = validateServicesForOpenapi(services);

      console.error("/openapi.json failed to generate schema", {
        cause: captureError(error),
        problemEndpoints: validationResult.problemEndpoints,
      });

      res.status(500).json({ error: "Internal server error" });
    }
  });

  if (config.enableSwagger) {
    setupSwaggerUI(expressApp);
  }
}