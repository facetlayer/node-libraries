
export interface ApiRequestOptions {
    params?: any;
    host?: string;
    headers?: Record<string, string>;
}

export async function webFetch(endpoint: string, options: ApiRequestOptions = {}): Promise<any> {
    // Parse the endpoint string to extract method and path
    const parts = endpoint.trim().split(/\s+/);
    let method: string;
    let path: string;

    if (parts.length === 1) {
        // Only path provided, default to GET
        method = 'get';
        path = parts[0];
    } else {
        // Method and path provided
        method = parts[0].toLowerCase();
        path = parts.slice(1).join(' ');
    }

    // Replace path parameters with values from params object
    const usedParamKeys = new Set<string>();
    const pathSegments = path.split('/');

    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];
        if (segment.startsWith(':')) {
            const paramName = segment.slice(1);
            if (options.params && paramName in options.params) {
                pathSegments[i] = String(options.params[paramName]);
                usedParamKeys.add(paramName);
            }
        }
    }

    const finalPath = pathSegments.join('/');

    // Filter out used path params from remaining params
    const remainingParams = options.params
        ? Object.fromEntries(
            Object.entries(options.params).filter(([key]) => !usedParamKeys.has(key))
        )
        : {};

    const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include' as const,
    };

    let url = `${options.host || ''}${finalPath.startsWith('/') ? finalPath : '/' + finalPath}`;

    // Add request body for POST/PUT/PATCH methods if params are provided
    if (Object.keys(remainingParams).length > 0) {
        if (method === 'post' || method === 'put' || method === 'patch') {
            fetchOptions.body = JSON.stringify(remainingParams);
        } else {
            // For GET/DELETE methods, encode params as query parameters
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(remainingParams)) {
                if (value !== undefined && value !== null) {
                    queryParams.append(key, String(value));
                }
            }
            const queryString = queryParams.toString();
            if (queryString) {
                url += (url.includes('?') ? '&' : '?') + queryString;
            }
        }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        throw new Error(`Fetch error, status: ${response.status}`);
    }

    return response.json();
}

