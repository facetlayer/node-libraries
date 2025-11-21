# @facetlayer/port-assignment

Helper library to assign and track unique ports for local services with persistent storage. Uses a local database to remember port assignments across restarts, making it ideal for development environments where multiple services need consistent port numbers.

## Install

```
yarn add @facetlayer/port-assignment
# or
npm i @facetlayer/port-assignment
```

## Quick Start

Claim a port (recommended approach):

```ts
import { claimUnusedPort } from '@facetlayer/port-assignment'

// Claim the next available port
const port = await claimUnusedPort()
console.log(`Service assigned to port ${port}`)

// Claim with a specific starting port
const apiPort = await claimUnusedPort({ startPort: 8000 })

// Claim with a service name
const webPort = await claimUnusedPort({
  startPort: 3000,
  serviceName: 'web-server'
})
```

Manage port assignments:

```ts
import {
  claimUnusedPort,
  getPortAssignments,
  releasePort,
  resetPortAssignments
} from '@facetlayer/port-assignment'

// Claim ports for different services
const webPort = await claimUnusedPort({ startPort: 3000, serviceName: 'web' })
const apiPort = await claimUnusedPort({ startPort: 4000, serviceName: 'api' })

// View all assignments
const assignments = await getPortAssignments()
console.log(assignments)
// [{ port: 3001, assigned_at: 1234567890, cwd: '/path/to/project', service_name: 'web' }, ...]

// Release a specific port
await releasePort(3001)

// Clear all assignments
await resetPortAssignments()
```

## How It Works

The library maintains a SQLite database in your home directory (following XDG standards) to track port assignments:

- **Database Location**: `~/.local/state/port-assignment/db.sqlite` (or `$XDG_STATE_HOME/port-assignment/db.sqlite`)
- **Persistent Storage**: Port assignments survive restarts
- **Dual Verification**: Checks both the database AND actual system availability before assigning a port
- **CWD Tracking**: Records which directory claimed each port
- **Service Names**: Optional service name labeling for easier identification

## API

### Main Functions

#### `claimUnusedPort(options?: ClaimPortOptions): Promise<number>`

The primary function for getting a port. Claims the next available port from the database, verifies it's actually available on the system, assigns it, and returns the port number.

```ts
interface ClaimPortOptions {
  startPort?: number      // Port to start searching from (deprecated, not used)
  cwd?: string           // Working directory (default: process.cwd())
  serviceName?: string   // Optional service name for identification
}
```

Examples:
```ts
// Minimal - use all defaults
const port = await claimUnusedPort()

// With service name
const port = await claimUnusedPort({ serviceName: 'api-server' })

// With custom working directory
const port = await claimUnusedPort({ cwd: '/my/project' })

// All options
const port = await claimUnusedPort({
  startPort: 5000,
  cwd: '/my/project',
  serviceName: 'web-app'
})
```

#### `isPortActuallyAvailable(port: number): Promise<boolean>`

Checks if a port is available by attempting to bind to it on the system.

#### `findNextAvailablePort(startPort?: number): Promise<number>`

Finds the next port that's actually available on the system (doesn't check database).

#### `getNextAvailablePort(startPort?: number): Promise<number>`

Gets the next unassigned port from the database (doesn't check system availability).

### Database Functions

#### `assignPort(options: AssignPortOptions): Promise<void>`

Manually assign a port in the database.

```ts
interface AssignPortOptions {
  port: number          // Port number to assign
  cwd: string          // Working directory
  serviceName?: string // Optional service name
}
```

Example:
```ts
await assignPort({
  port: 5000,
  cwd: '/my/project',
  serviceName: 'worker'
})
```

#### `isPortAssigned(port: number): Promise<boolean>`

Check if a port is assigned in the database.

#### `getPortAssignments(): Promise<PortAssignment[]>`

Get all port assignments from the database, ordered by most recent.

```ts
interface PortAssignment {
  port: number
  assigned_at: number     // Unix timestamp
  cwd: string            // Working directory that claimed this port
  service_name?: string  // Optional service name
}
```

#### `releasePort(port: number): Promise<void>`

Release a specific port assignment from the database.

#### `resetPortAssignments(): Promise<void>`

Clear all port assignments from the database.

## Features

- **Persistent Storage**: Port assignments stored in SQLite database via `@facetlayer/userdata-db`
- **XDG Compliant**: Follows XDG Base Directory specification for storing data
- **Dual Verification**: Checks both database and actual port availability
- **System Port Scanning**: Attempts to bind to ports to verify actual availability
- **CWD Tracking**: Associates each port with the directory that claimed it
- **Service Names**: Optional service name labeling for easier management
- **TypeScript Support**: Full type definitions included

## CLI Usage

The library includes a command-line tool for managing port assignments:

```bash
# Claim a port
port-assignment claim

# Claim with a service name
port-assignment claim --service-name "web-api"

# Claim with custom options
port-assignment claim 8000 --cwd /my/project --service-name "auth-service"

# List all assignments
port-assignment list

# Check if a port is assigned
port-assignment check 4000

# Release a port
port-assignment release 4000

# Clear all assignments
port-assignment reset
```

## Example: Development Server

```ts
import { claimUnusedPort, releasePort } from '@facetlayer/port-assignment'

async function startDevServer() {
  const port = await claimUnusedPort({
    startPort: 3000,
    serviceName: 'dev-server'
  })

  console.log(`Starting server on port ${port}`)

  // Start your server...
  const server = createServer(...)
  server.listen(port)

  // On shutdown, optionally release the port
  process.on('SIGINT', async () => {
    await releasePort(port)
    process.exit(0)
  })
}
```

## Development

Scripts:

```
pnpm build   # compile TypeScript to dist/
pnpm test    # run unit tests (vitest)
```

## Related Libraries

- `@facetlayer/userdata-db`: Manages the SQLite database in user's home directory
