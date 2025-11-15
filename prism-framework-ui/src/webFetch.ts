
export interface ApiRequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: any;
    host?: string;
}

export async function webFetch(path: string, options: ApiRequestOptions): Promise<any> {
    const fetchOptions: RequestInit = {
        method: options.method || 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include' as const,
    };

    // Add request body for POST/PUT methods if params are provided
    if (options.params && (options.method === 'POST' || options.method === 'PUT')) {
        fetchOptions.body = JSON.stringify(options.params);
    }

    if (!path.startsWith('/')) { path = `/${path}`; }

    const url = `${options.host || ''}${path}`;
    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
        throw new Error(`Fetch error, status: ${response.status}`);
    }

    return response.json();
}

