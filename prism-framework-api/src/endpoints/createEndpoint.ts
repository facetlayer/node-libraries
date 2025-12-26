import { logWarn } from "../logging";
import { EndpointDefinition } from "../web/ExpressEndpointSetup";
import { validateEndpointForOpenapi, validateServicesForOpenapi } from "../web/openapi/validateServicesForOpenapi";

export function createEndpoint(
    definition: EndpointDefinition
): EndpointDefinition {
    if (definition.path.startsWith('/api')) {
        logWarn(`Misconfigured endpoint ${definition.path}: API endpoints should not start with /api`);

        return {
            ...definition,
            handler: () => {
                throw new Error(`Misconfigured endpoint ${definition.path}: API endpoints should not start with /api`);
            },
        }
    }

    const validationResult = validateEndpointForOpenapi(definition);
    if (validationResult?.error) {
        logWarn(`Misconfigured endpoint ${definition.path}: ${validationResult.error.errorMessage}`);
        // Remove invalid schemas so they don't break OpenAPI generation for the entire service.
        // The endpoint will still work, but won't appear correctly in OpenAPI docs.
        return {
            ...definition,
            requestSchema: undefined,
            responseSchema: undefined,
            handler: () => {
                throw new Error(`Misconfigured endpoint ${definition.path}: ${validationResult.error.errorMessage}`);
            },
        }
    }

    return definition;
}