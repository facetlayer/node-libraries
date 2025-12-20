---
name: usage
description: CLI usage documentation for port-assignment
---

# CLI Usage

The `port-assignment` CLI helps manage unique port assignments for local services. It tracks port allocations in a local database to avoid conflicts between projects.

## Commands

### claim

Claim the next available port.

```bash
port-assignment claim [options]
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--cwd` | string | current directory | Working directory to associate with this port |
| `--name` | string | - | Optional name to associate with this port |

**Examples:**

```bash
# Claim a port for the current directory
port-assignment claim

# Claim a port with a custom name
port-assignment claim --name my-api-server

# Claim a port for a specific directory
port-assignment claim --cwd /path/to/project --name frontend
```

The command outputs just the port number, making it easy to use in scripts:

```bash
PORT=$(port-assignment claim --name my-service)
echo "Starting server on port $PORT"
```

### list

List all port assignments.

```bash
port-assignment list
```

Displays all currently assigned ports with their assignment date, working directory, and optional name.

**Example output:**

```
Port Assignments:
────────────────────────────────────────────────────────────────────────────────
Port: 4001
  Assigned: 12/20/2025, 10:30:45 AM
  CWD: /Users/me/projects/api
  Name: backend-api

Port: 4000
  Assigned: 12/20/2025, 10:25:12 AM
  CWD: /Users/me/projects/frontend
```

### release

Release a specific port assignment.

```bash
port-assignment release <port>
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `port` | number | Port number to release (required) |

**Example:**

```bash
port-assignment release 4001
```

### reset

Clear all port assignments.

```bash
port-assignment reset
```

This removes all port assignments from the database. Use with caution.

### check

Check if a port is assigned or available.

```bash
port-assignment check <port>
```

**Arguments:**

| Argument | Type | Description |
|----------|------|-------------|
| `port` | number | Port number to check (required) |

**Example:**

```bash
port-assignment check 4000
```

**Example output:**

```
Port 4000:
  Assigned in database: Yes
  Available on system: No
```

This shows both whether the port is tracked in the database and whether it's actually available on the system (not in use by any process).

## Global Options

| Option | Description |
|--------|-------------|
| `-h, --help` | Show help |
| `-v, --version` | Show version number |

## Documentation Commands

| Command | Description |
|---------|-------------|
| `list-docs` | List available documentation files |
| `get-doc <name>` | Display contents of a doc file |
