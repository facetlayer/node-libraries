import { logWarn } from "../logging/index.ts";
import { EndpointDefinition } from "../web/ExpressEndpointSetup.ts";
import { validateEndpointForOpenapi } from "../web/openapi/validateServicesForOpenapi.ts";

/**
 * Known bad values for operationId that indicate the user didn't set it properly.
 * These are typically default function names that don't provide meaningful identification.
 */
const INVALID_OPERATION_IDS = new Set([
    'handler',
    'anonymous',
    '',
]);

/**
 * Validates that an operationId is not a known bad value.
 */
export function isValidOperationId(operationId: string | undefined): boolean {
    if (operationId === undefined) {
        return true; // undefined is fine, we'll auto-generate
    }
    return !INVALID_OPERATION_IDS.has(operationId);
}

/**
 * Generates an operationId from the method and path.
 * e.g., "GET /users/:id" -> "getUsers_id"
 */
export function generateOperationIdFromPath(method: string, path: string): string {
    // Convert path to camelCase identifier
    // e.g., "/users/:id/posts" -> "Users_idPosts"
    const pathPart = path
        .split('/')
        .filter(Boolean)
        .map((segment, index) => {
            if (segment.startsWith(':')) {
                // Path parameter: :id -> _id
                return '_' + segment.slice(1);
            }
            // Capitalize first letter of each segment
            return segment.charAt(0).toUpperCase() + segment.slice(1);
        })
        .join('');

    return method.toLowerCase() + pathPart;
}

/**
 * Gets the effective operationId for an endpoint using the priority:
 * 1. Explicit operationId if defined
 * 2. Handler function name if not a known bad value
 * 3. Auto-generated from method + path
 */
export function getEffectiveOperationId(definition: EndpointDefinition): string {
    // Priority 1: Explicit operationId
    if (definition.operationId && isValidOperationId(definition.operationId)) {
        return definition.operationId;
    }

    // Priority 2: Handler function name (if valid)
    const handlerName = definition.handler.name;
    if (handlerName && isValidOperationId(handlerName)) {
        return handlerName;
    }

    // Priority 3: Auto-generate from path
    return generateOperationIdFromPath(definition.method, definition.path);
}

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
