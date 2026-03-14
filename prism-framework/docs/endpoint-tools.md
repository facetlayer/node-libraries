---
name: endpoint-tools
description: CLI tools for listing and calling API endpoints on a running Prism server
---

# Endpoint Tools

The `prism` CLI provides commands for interacting with your API endpoints. These tools connect to a running Prism API server.

## Prerequisites

Both commands require:
- A running Prism API server
- A `.env` file with `PRISM_API_PORT` set to your server's port

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
prism call /users

# Explicit method
prism call GET /users

# POST with data
prism call POST /users --name "John Doe" --email "john@example.com"

# Other methods
prism call PUT /users/123 --name "Jane"
prism call PATCH /users/123 --status active
prism call DELETE /users/123
```

### Passing Data

Named arguments become the request body:

```bash
prism call POST /users --name "John" --age 30 --active true
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
prism call POST /config --settings '{"timeout": 30, "retries": 3}'
```

### Output

The command prints the response status and body:

```
Response status: 200
Response: {"id":"123","name":"John","email":"john@example.com"}
```

## Troubleshooting

### "Failed to connect"

1. **Check the server is running** - Start your API server
2. **Verify PRISM_API_PORT** - Ensure `.env` contains `PRISM_API_PORT` matching your server port
3. **Check dotenv is loaded** - Your server must load the `.env` file (see `env-files` doc)

### "Endpoint not found"

Use `prism list-endpoints` to see available endpoints and verify the path.
