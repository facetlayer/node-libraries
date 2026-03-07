import { EndpointDefinition } from "../web/ExpressEndpointSetup.ts";

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
 * Converts a hyphenated string to camelCase.
 * e.g., "undo-redo-state" -> "undoRedoState"
 * Preserves existing casing when there are no hyphens.
 * e.g., "userId" -> "userId"
 */
function toCamelCase(str: string): string {
    if (!str.includes('-')) {
        return str;
    }
    return str
        .split('-')
        .map((part, index) => {
            if (index === 0) {
                return part.toLowerCase();
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join('');
}

/**
 * Generates an operationId from the method and path.
 * e.g., "GET /users/:id" -> "getUsers_id"
 * e.g., "GET /users/:id/undo-redo-state" -> "getUsers_idUndoRedoState"
 */
export function generateOperationIdFromPath(method: string, path: string): string {
    // Convert path to camelCase identifier
    // e.g., "/users/:id/posts" -> "Users_idPosts"
    const pathPart = path
        .split('/')
        .filter(Boolean)
        .map((segment, index) => {
            if (segment.startsWith(':') || segment.startsWith('{')) {
                // Path parameter: :id -> _id, {id} -> _id
                const paramName = segment.replace(/^[:{}]+|[}]+$/g, '');
                return '_' + toCamelCase(paramName);
            }
            // Convert to camelCase and capitalize first letter
            const camelCased = toCamelCase(segment);
            return camelCased.charAt(0).toUpperCase() + camelCased.slice(1);
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
