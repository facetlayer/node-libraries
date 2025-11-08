# Run Endpoint Tool

The `prism-run-endpoint` CLI tool allows you to execute API endpoints locally without starting an Express.js server. This is useful for:

- **Testing endpoints** during development
- **Debugging** endpoint logic in isolation
- **Running endpoints** as part of scripts or automation
- **Quick verification** of endpoint behavior

## Installation

The tool is part of the `@facetlayer/prism-framework-tools` package:

```bash
pnpm add -D @facetlayer/prism-framework-tools
```

After installation, you can run it using:

```bash
# Using pnpm
pnpm prism-run-endpoint --path /api/users

# Using npx
npx prism-run-endpoint --path /api/users

# Direct node (after building)
node node_modules/@facetlayer/prism-framework-tools/dist/run-endpoint.js
```

## Basic Usage

### Running an Endpoint

```bash
# Run a GET endpoint
prism-run-endpoint --path /api/users --method GET

# Run a POST endpoint with data
prism-run-endpoint \
  --path /api/users \
  --method POST \
  --name "John Doe" \
  --email "john@example.com" \
  --age 30

# Other HTTP methods
prism-run-endpoint --path /api/users/123 --method DELETE --id 123
prism-run-endpoint --path /api/users/123 --method PUT --name "Jane"
prism-run-endpoint --path /api/users/123 --method PATCH --status active
```

### Listing Available Endpoints

```bash
# Show all registered endpoints
prism-run-endpoint --list
```

Output example:
```
Available endpoints:

  GET /health
    Health check endpoint
  GET /api/users
    List all users
  POST /api/users
    Create a new user
  GET /api/users/:id
    Get user by ID
  DELETE /api/users/:id
    Delete a user
```

## Command-Line Options

### Required Options

- `--path <string>` - The endpoint path (e.g., `/api/users`)
  - Required unless using `--list`

### Optional Options

- `--method <string>` - HTTP method (GET, POST, PUT, DELETE, PATCH)
  - Default: `GET`

- `--services <string>` - Path to services file that exports `ALL_SERVICES`
  - Default: `./src/services.ts`
  - Must be relative to current working directory
  - Supports both `.ts` (TypeScript) and `.js` (compiled) files

- `--list` - List all available endpoints and exit

- `--<key> <value>` - Any other option is passed as request data
  - Example: `--name "John"` becomes `{ name: "John" }` in the request body

### Help

```bash
prism-run-endpoint --help
```

## Request Data

Any CLI arguments not recognized as built-in options are passed as request data. This includes:

- **Query parameters** (for GET requests)
- **Request body** (for POST, PUT, PATCH)
- **URL parameters** (like `:id` in paths)

All data is merged into a single object, similar to how Express.js combines `req.body`, `req.params`, and `req.query`.

### Example

```bash
prism-run-endpoint \
  --path /api/users \
  --method POST \
  --name "John Doe" \
  --email "john@example.com" \
  --age 30 \
  --active true
```

This passes the following data to the endpoint handler:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "active": true
}
```

## Schema Validation

The tool respects Zod schemas defined in your endpoints:

- **Request validation** - Input data is validated against `requestSchema`
- **Response validation** - Output is validated against `responseSchema`

### Validation Errors

If validation fails, the tool shows detailed error information:

```bash
Schema validation failed:
[
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["email"],
    "message": "Required"
  }
]
Error: Schema validation failed for POST /api/users
```

## Examples

### GET Request

```bash
# Simple GET
prism-run-endpoint --path /health

# GET with query parameters
prism-run-endpoint \
  --path /api/users \
  --method GET \
  --limit 10 \
  --offset 0
```

### POST Request

```bash
# Create a new resource
prism-run-endpoint \
  --path /api/posts \
  --method POST \
  --title "Hello World" \
  --content "This is my first post" \
  --published true
```

### PUT/PATCH Request

```bash
# Update a resource
prism-run-endpoint \
  --path /api/users/123 \
  --method PUT \
  --id 123 \
  --name "Updated Name"
```

### DELETE Request

```bash
# Delete a resource
prism-run-endpoint \
  --path /api/users/123 \
  --method DELETE \
  --id 123
```

## Custom Services Location

If your services are not in the default location, specify the path:

```bash
# Using a TypeScript file
prism-run-endpoint \
  --path /api/users \
  --services ./src/my-services.ts

# Using a compiled JavaScript file
prism-run-endpoint \
  --path /api/users \
  --services ./dist/services.js
```

The services file must export `ALL_SERVICES`:

```typescript
// services.ts
import { ServiceDefinition } from '@facetlayer/prism-framework-api';

export const ALL_SERVICES: ServiceDefinition[] = [
  userService,
  postService,
  // ... your services
];
```

## How It Works

The tool works similarly to the IPC request handler used in Electron apps:

1. **Dynamically imports** the services file (supports both `.ts` and `.js`)
2. **Imports** `@facetlayer/prism-framework-api` for framework utilities
3. **Builds a map** of "METHOD /path" → endpoint definition
4. **Creates a request context** with unique ID, timestamp, and authorization
5. **Validates input** against request schema (if present)
6. **Executes the handler** within the request context
7. **Validates output** against response schema (if present)
8. **Displays the result** as formatted JSON

All of this happens without starting Express.js or any HTTP server.

## Request Context

The tool creates a full request context, just like Express.js would:

```typescript
{
  requestId: "uuid-v4",       // Unique request ID
  startTime: Date.now(),      // Request start timestamp
  auth: new Authorization()   // Authorization instance
}
```

This means your endpoint handlers can use:

```typescript
import { getCurrentRequestContext } from '@facetlayer/prism-framework-api';

const context = getCurrentRequestContext();
console.log(context.requestId);
```

## Limitations

- **No HTTP layer** - Headers, cookies, and other HTTP features are not available
- **No middleware** - Only the endpoint handler runs (not service middleware)
- **No SSE support** - Server-Sent Events endpoints will throw an error
- **No authentication** - The authorization object is empty by default

## Integration with Scripts

You can use the tool in npm scripts:

```json
{
  "scripts": {
    "test:endpoint": "prism-run-endpoint",
    "health": "prism-run-endpoint --path /health",
    "list-endpoints": "prism-run-endpoint --list"
  }
}
```

Then run:

```bash
pnpm health
pnpm list-endpoints
pnpm test:endpoint -- --path /api/users --method GET
```

## Troubleshooting

### "Could not find ALL_SERVICES export"

Make sure your services module exports `ALL_SERVICES`:

```typescript
export const ALL_SERVICES: ServiceDefinition[] = [
  userService,
  postService,
  // ...
];
```

### "Endpoint not found"

Use `--list` to see all available endpoints and verify the path and method are correct:

```bash
prism-run-endpoint --list
```

### Schema Validation Errors

Check the validation error details and ensure your input data matches the expected schema. You can review the schema in your endpoint definition.

### Module Resolution Errors

If the tool can't find your services module, make sure:
1. You're running from the correct directory
2. The `--services` path is correct and relative to the current working directory
3. The project has been built (`pnpm build`)
