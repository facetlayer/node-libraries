#!/usr/bin/env node

const EVERY_METHOD = new Set(['GET','POST','PUT','PATCH',"DELETE"]);

export interface CallEndpointLooseOptions {
  baseUrl: string
  positionalArgs: string[]
  namedArgs: Record<string,any>
}

interface CallEndpointOptions {
  baseUrl: string
  method: string
  path: string
  requestBody: null | Record<string, any>
}

function parseOptions(looseOptions: CallEndpointLooseOptions): CallEndpointOptions {
  const result: CallEndpointOptions = {
    baseUrl: looseOptions.baseUrl,
    method: 'GET',
    path: '/',
    requestBody: looseOptions.namedArgs,
  };

  // Look at the positional args and figure out what they mean.
  for (const positional of looseOptions.positionalArgs) {
    if (positional.startsWith('/')) {
      result.path = positional;
      continue;
    }

    if (EVERY_METHOD.has(positional.toUpperCase())) {
      result.method = positional.toUpperCase();
      continue;
    }

    if (positional.startsWith("http:") || positional.startsWith("https:")) {
      result.baseUrl = positional;
      continue;
    }

    throw new Error("unrecognized positional arg:" + positional);
  }

  return result;

}

/**
 * Make an HTTP request to the local Prism API server
 */
export async function callEndpoint(looseOptions: CallEndpointLooseOptions) {
  const options = parseOptions(looseOptions);
  const url = `${options.baseUrl}${options.path}`;

  const requestOptions: RequestInit = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add body for methods that support it
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)
      && options.requestBody
      && Object.keys(options.requestBody).length > 0) {
    requestOptions.body = JSON.stringify(options.requestBody);
  }

  try {
    const response = await fetch(url, requestOptions);

    console.log('Response status: ' + response.status);

    // Get the response text first
    const responseText = await response.text();
    console.log('Response: ', responseText);

    // Try to parse as JSON
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      // If not JSON, return as text
      responseData = responseText;
    }

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status} ${response.statusText}\n` +
        `Response: ${JSON.stringify(responseData, null, 2)}`
      );
    }

    return responseData;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
        throw new Error(
          `Failed to connect to ${url}\n\n` +
          'Make sure your Prism API server is running.\n' +
          `The server should be listening on the port specified in .env (PRISM_API_PORT)`
        );
      }
    }
    throw error;
  }
}
