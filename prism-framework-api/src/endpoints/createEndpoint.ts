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

    return definition;
}