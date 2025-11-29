import { createEndpoint, EndpointDefinition } from './ExpressEndpointSetup';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Response } from 'express';

export function createListingEndpoints(endpoints: EndpointDefinition[]) {
  return [
    createEndpoint({
      method: 'GET',
      path: '/endpoints',
      description: 'Lists all available endpoints in the system',
      handler: () => {
        const htmlContent = generateEndpointsHTML(endpoints);

        return {
          sendHttpResponse: (res: Response) => {
            res.setHeader('Content-Type', 'text/html');
            res.send(htmlContent);
          },
        };
      },
    }),

    createEndpoint({
      method: 'GET',
      path: '/endpoints.json',
      description: 'Lists all available endpoints in the system (JSON format)',
      handler: () => {
        const endpointsData = endpoints.map(endpoint => ({
          method: endpoint.method,
          path: endpoint.path,
          description: endpoint.description || 'No description',
        }));

        return {
          endpoints: endpointsData,
        };
      },
    }),

    createEndpoint({
      method: 'GET',
      path: '/changelog',
      description: 'Serves the CHANGELOG.md file',
      handler: () => {
        const changelogPath = join(process.cwd(), 'CHANGELOG.md');
        const changelogContent = readFileSync(changelogPath, 'utf8');

          return {
            sendHttpResponse: (res: Response) => {
              res.setHeader('Content-Type', 'text/plain');
              res.send(changelogContent);
            },
          };
      },
    }),

    createEndpoint({
      method: 'GET',
      path: '/server-info',
      description: 'Returns server information including name',
      handler: () => {
        return {
          name: 'prism-framework-api',
        };
      },
    }),
  ];
}

function generateEndpointsHTML(endpoints: EndpointDefinition[]): string {
  const endpointRows = endpoints
    .map(
      endpoint => `
    <tr>
      <td><code>${endpoint.method}</code></td>
      <td><code>${endpoint.path}</code></td>
      <td>${endpoint.description || 'No description'}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Endpoints</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            border-bottom: 3px solid #007acc;
            padding-bottom: 10px;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        tr:hover {
            background-color: #f8f9fa;
        }
        code {
            background-color: #e9ecef;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        .method-get { color: #28a745; }
        .method-post { color: #007bff; }
        .method-put { color: #ffc107; }
        .method-delete { color: #dc3545; }
        .method-patch { color: #6f42c1; }
        .count {
            color: #6c757d;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>API Endpoints</h1>
        <p class="count">Total endpoints: <strong>${endpoints.length}</strong></p>

        <table>
            <thead>
                <tr>
                    <th>Method</th>
                    <th>Path</th>
                    <th>Description</th>
                </tr>
            </thead>
            <tbody>
                ${endpointRows}
            </tbody>
        </table>
    </div>
</body>
</html>
  `.trim();
}
