
import { getUserdataDatabase, SqliteDatabase } from '@facetlayer/userdata-db'
import { createServer } from 'http'

const MIN_PORT = 4000;
const MAX_PORT = 65535;

/**
 * Database schema for port assignments
 */
const PORT_ASSIGNMENT_SCHEMA = {
  name: 'port-assignments',
  statements: [
    `CREATE TABLE port_assignments (
      port INTEGER PRIMARY KEY,
      assigned_at INTEGER NOT NULL,
      cwd TEXT NOT NULL,
      name TEXT
    )`,
    `CREATE INDEX idx_port_assignments_assigned_at
     ON port_assignments(assigned_at)`,
    `CREATE TABLE next_unused_port (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      port INTEGER NOT NULL
    )`
  ]
}

export interface PortAssignment {
  port: number
  assigned_at: number
  cwd: string
  name?: string
}

export interface AssignPortOptions {
  port: number
  cwd: string
  name?: string
}

export interface ClaimPortOptions {
  cwd?: string
  name?: string
}

let _db: SqliteDatabase | null = null

/**
 * Get or initialize the port assignment database
 */
async function getDatabase(): Promise<SqliteDatabase> {
  if (!_db) {
    _db = getUserdataDatabase({
      appName: 'port-assignment',
      schema: PORT_ASSIGNMENT_SCHEMA,
      migrationBehavior: 'safe-upgrades'
    })
  }
  return _db
}

/**
 * Reset the database connection (for testing purposes)
 * @internal
 */
export function _resetDatabaseForTesting(): void {
  _db = null
}


/**
 * Get the next unused port from the tracking table
 * If no row exists, initialize it with the starting value
 */
async function getAndIncrementNextPort(): Promise<number> {
  const db = await getDatabase()

  // Try to get the current next port
  const row = db.get('SELECT port FROM next_unused_port WHERE id = 1') as { port: number } | undefined

  if (!row) {
    // Initialize with starting value
    db.insert('next_unused_port', { id: 1, port: MIN_PORT })
    return MIN_PORT
  }

  const currentPort = row.port

  // Calculate next port with wraparound
  let nextPort = currentPort + 1
  if (nextPort > MAX_PORT) {
    nextPort = MIN_PORT
  }

  // Update the next port value
  db.run('UPDATE next_unused_port SET port = ? WHERE id = 1', nextPort)

  return currentPort
}

/**
 * Check if a port is actually available by attempting to bind to it
 */
export async function isPortActuallyAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()

    server.listen(port, '127.0.0.1', () => {
      server.close(() => {
        resolve(true)
      })
    })

    server.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Assign a port in the database
 */
export async function assignPort(options: AssignPortOptions): Promise<void> {
  const db = await getDatabase()
  db.insert('port_assignments', {
    port: options.port,
    assigned_at: Date.now(),
    cwd: options.cwd,
    name: options.name || null
  })
}

/**
 * Check if a port is assigned in the database
 */
export async function isPortAssigned(port: number): Promise<boolean> {
  const db = await getDatabase()
  const row = db.get('SELECT port FROM port_assignments WHERE port = ?', port)
  return !!row
}

/**
 * Get all port assignments from the database
 */
export async function getPortAssignments(): Promise<PortAssignment[]> {
  const db = await getDatabase()
  return db.list('SELECT * FROM port_assignments ORDER BY assigned_at DESC')
}

/**
 * Reset all port assignments
 */
export async function resetPortAssignments(): Promise<void> {
  const db = await getDatabase()
  db.run('DELETE FROM port_assignments')
}

/**
 * Release a specific port assignment
 */
export async function releasePort(port: number): Promise<void> {
  const db = await getDatabase()
  db.run('DELETE FROM port_assignments WHERE port = ?', port)
}

/**
 * Claim an unused port - the main function for getting a port
 *
 * This function:
 * 1. Gets the next port from the next_unused_port table (or initializes at 4000)
 * 2. Increments the next_unused_port value (with wraparound at 65535)
 * 3. Verifies the port is actually available on the system
 * 4. If not, keeps trying with incremented values
 * 5. Assigns the port in the database
 * 6. Returns the port number
 *
 * @param options - Configuration options for claiming a port
 * @returns The claimed port number
 */
export async function claimUnusedPort(options: ClaimPortOptions = {}): Promise<number> {
  const { cwd = process.cwd(), name } = options
  const maxAttempts = MAX_PORT - MIN_PORT + 1
  const maxRetries = 10

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Get and increment the next port from our tracking table
    const port = await getAndIncrementNextPort()

    // Check if port is already assigned in database
    const alreadyAssigned = await isPortAssigned(port)
    if (alreadyAssigned) {
      // Port is already assigned, try the next one
      continue
    }

    // Check if port is actually available
    const actuallyAvailable = await isPortActuallyAvailable(port)
    if (actuallyAvailable) {
      // Try to assign the port with retry logic for race conditions
      for (let retry = 0; retry < maxRetries; retry++) {
        try {
          await assignPort({ port, cwd, name })
          return port
        } catch (error: any) {
          // Check if it's a unique constraint error
          if (error?.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
            // Another process/call claimed this port, break and try next port
            break
          }
          // For other errors, rethrow
          throw error
        }
      }
    }

    // Port wasn't available or assignment failed, loop will try the next one
  }

  throw new Error('No available ports found after checking all ports in range')
}

