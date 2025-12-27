import { logWarn } from "../logging/index.ts";
import { EndpointDefinition } from "../web/ExpressEndpointSetup.ts";
import { validateEndpointForOpenapi } from "../web/openapi/validateServicesForOpenapi.ts";
import { isValidOperationId } from "./getEffectiveOperationId.ts";

export { getEffectiveOperationId, isValidOperationId, generateOperationIdFromPath } from "./getEffectiveOperationId.ts";

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

    // Validate operationId if explicitly provided
    if (definition.operationId !== undefined && !isValidOperationId(definition.operationId)) {
        logWarn(`Misconfigured endpoint ${definition.path}: operationId "${definition.operationId}" is not allowed`);

        return {
            ...definition,
            handler: () => {
                throw new Error(`Misconfigured endpoint ${definition.path}: operationId "${definition.operationId}" is not allowed. Use a descriptive unique identifier.`);
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
