import { PrismApp } from './PrismApp.ts';
import { getEffectiveOperationId } from '../endpoints/createEndpoint.ts';

export interface ValidationError {
    message: string;
    endpoints?: string[];
}

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
}

/**
 * Validates a PrismApp configuration, checking for issues like duplicate operationIds.
 * This should be run at server startup to catch configuration errors early.
 */
export function validateApp(app: PrismApp): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for duplicate operationIds
    const duplicateError = checkDuplicateOperationIds(app);
    if (duplicateError) {
        errors.push(duplicateError);
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Checks for duplicate operationIds across all endpoints.
 * Returns an error if duplicates are found, null otherwise.
 */
function checkDuplicateOperationIds(app: PrismApp): ValidationError | null {
    const endpoints = app.listAllEndpoints();
    const operationIdToEndpoints = new Map<string, string[]>();

    for (const endpoint of endpoints) {
        const operationId = getEffectiveOperationId(endpoint);
        const endpointKey = `${endpoint.method} ${endpoint.path}`;

        const existing = operationIdToEndpoints.get(operationId) || [];
        existing.push(endpointKey);
        operationIdToEndpoints.set(operationId, existing);
    }

    // Find duplicates
    const duplicates: string[] = [];
    for (const [operationId, endpointKeys] of operationIdToEndpoints) {
        if (endpointKeys.length > 1) {
            duplicates.push(`operationId "${operationId}" is used by: ${endpointKeys.join(', ')}`);
        }
    }

    if (duplicates.length > 0) {
        return {
            message: `Duplicate operationIds found. Each endpoint must have a unique operationId.\n${duplicates.join('\n')}`,
            endpoints: duplicates,
        };
    }

    return null;
}

/**
 * Validates the app and throws an error if validation fails.
 * Use this at server startup to ensure the app is properly configured.
 */
export function validateAppOrThrow(app: PrismApp): void {
    const result = validateApp(app);
    if (!result.valid) {
        const errorMessages = result.errors.map(e => e.message).join('\n\n');
        throw new Error(`PrismApp validation failed:\n${errorMessages}`);
    }
}
