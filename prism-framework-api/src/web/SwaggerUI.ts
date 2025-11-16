import express from 'express';
import swaggerUi from 'swagger-ui-express';

/**
 * Sets up Swagger UI to serve interactive API documentation
 *
 * @param app - Express application instance
 * @param openApiJsonPath - Path where the OpenAPI JSON schema is served (default: '/openapi.json')
 */
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
