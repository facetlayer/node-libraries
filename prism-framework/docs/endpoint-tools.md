---
name: endpoint-tools
description: CLI tools for listing and calling API endpoints on a running Prism server
---

# Endpoint Tools

The `prism` CLI provides commands for interacting with your API endpoints. These tools connect to a running Prism API server.

## Prerequisites

Both commands require:
- A running Prism API server
- The CLI resolves the API port for the current project via `@facetlayer/port-assignment` (a per-project `.env` file is no longer required for this)

## Path prefix

The framework mounts every endpoint under `/api/`. When you write `createEndpoint({ path: '/users' })`, the live HTTP path is `/api/users`, so `prism call` must be given the full HTTP path including `/api/`.

`prism list-endpoints` prints the endpoint path exactly as declared in `createEndpoint` (without the `/api/` prefix), so remember to prepend `/api/` when you copy one of those paths into `prism call`.

## prism list-endpoints

Lists all available endpoints from a running server.

```bash
prism list-endpoints
```

Output:
```
Using API server at: http://localhost:4003

Available endpoints:

  GET /users
    List all users
  POST /users
    Create a new user
  GET /users/:id
    Get user by ID
  DELETE /users/:id
    Delete a user
```

## prism call

Calls an endpoint on a running server.

### Basic Usage

```bash
# GET request
prism call /api/users

# Explicit method
prism call GET /api/users

# POST with data
prism call POST /api/users --name "John Doe" --email "john@example.com"

# Other methods
prism call PUT /api/users/123 --name "Jane"
prism call PATCH /api/users/123 --status active
prism call DELETE /api/users/123
```

### Passing Data

Named arguments become the request body:

```bash
prism call POST /api/users --name "John" --age 30 --active true
```

Sends:
```json
{
  "name": "John",
  "age": 30,
  "active": true
}
```

### JSON Objects

Arguments that look like JSON are parsed automatically:

```bash
prism call POST /api/config --settings '{"timeout": 30, "retries": 3}'
```

### Output

The command prints the response status and body:

```
Response status: 200
Response: {"id":"123","name":"John","email":"john@example.com"}
```

## Troubleshooting

### "Failed to connect"

1. **Check the server is running** - Start your API server.
2. **Check the port assignment** - The CLI connects to the port claimed for this project directory via `@facetlayer/port-assignment`. Run `port-assignment list` to see the resolved port, or run your server with `PRISM_API_PORT=<port>` to force a specific port.

### "Endpoint not found"

Use `prism list-endpoints` to see available endpoints and verify the path. Remember to prepend `/api/` to the path when calling it.
