
export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'get' | 'post' | 'put' | 'patch' | 'delete';
    params?: any;
    host?: string;
    headers?: Record<string, string>;
}

export async function webFetch(path: string, options: ApiRequestOptions): Promise<any> {
    const method = (options.method || 'GET').toUpperCase();

    const fetchOptions: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include' as const,
    };

    if (!path.startsWith('/')) { path = `/${path}`; }

    let url = `${options.host || ''}${path}`;

    // Add request body for POST/PUT/PATCH methods if params are provided
    if (options.params) {
        if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
            fetchOptions.body = JSON.stringify(options.params);
        } else {
            // For GET/DELETE methods, encode params as query parameters
            const queryParams = new URLSearchParams();
            for (const [key, value] of Object.entries(options.params)) {
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

