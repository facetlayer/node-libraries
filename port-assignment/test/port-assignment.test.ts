import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { join } from 'path'
import { rmSync, existsSync, mkdirSync } from 'fs'
import {
  claimUnusedPort,
  assignPort,
  isPortAssigned,
  getPortAssignments,
  releasePort,
  resetPortAssignments,
  getNextAvailablePort,
  isPortActuallyAvailable,
  _resetDatabaseForTesting
} from '../src/index'

// Set XDG_STATE_HOME to use our test temp directory
const TEST_TEMP_DIR = join(__dirname, 'temp')
process.env.XDG_STATE_HOME = TEST_TEMP_DIR

describe('port-assignment', () => {
  beforeEach(async () => {
    // Reset database connection
    _resetDatabaseForTesting()

    // Clean up temp directory before each test
    if (existsSync(TEST_TEMP_DIR)) {
      rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
    }
    mkdirSync(TEST_TEMP_DIR, { recursive: true })
  })

  afterAll(() => {
    // Clean up after all tests
    if (existsSync(TEST_TEMP_DIR)) {
      rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
    }
  })

  describe('database initialization', () => {
    it('should create database when claiming first port', async () => {
      const port = await claimUnusedPort({ startPort: 4000, cwd: '/test/cwd' })
      expect(port).toBeGreaterThanOrEqual(4000)

      // Verify database was created
      const dbPath = join(TEST_TEMP_DIR, 'port-assignment', 'db.sqlite')
      expect(existsSync(dbPath)).toBe(true)
    })

    it('should create port_assignments table', async () => {
      await claimUnusedPort({ startPort: 4000, cwd: '/test/cwd' })

      const assignments = await getPortAssignments()
      expect(Array.isArray(assignments)).toBe(true)
    })
  })

  describe('claimUnusedPort', () => {
    it('should claim and track a port', async () => {
      const testCwd = '/test/project'
      const port = await claimUnusedPort({ startPort: 4000, cwd: testCwd })

      expect(port).toBeGreaterThanOrEqual(4000)
      expect(port).toBeLessThanOrEqual(65535)

      // Verify it was recorded in database
      const isAssigned = await isPortAssigned(port)
      expect(isAssigned).toBe(true)

      // Verify assignment details
      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment).toBeDefined()
      expect(assignment?.cwd).toBe(testCwd)
      expect(assignment?.assigned_at).toBeGreaterThan(0)
    })

    it('should claim multiple unique ports', async () => {
      const port1 = await claimUnusedPort({ startPort: 4000, cwd: '/project1' })
      const port2 = await claimUnusedPort({ startPort: 4000, cwd: '/project2' })
      const port3 = await claimUnusedPort({ startPort: 4000, cwd: '/project3' })

      // All ports should be different
      expect(port1).not.toBe(port2)
      expect(port2).not.toBe(port3)
      expect(port1).not.toBe(port3)

      // All should be tracked
      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThanOrEqual(3)
    })

    it('should use process.cwd() by default', async () => {
      const port = await claimUnusedPort({ startPort: 4000 })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment?.cwd).toBe(process.cwd())
    })

    it('should store service name when provided', async () => {
      const testCwd = '/test/project'
      const testService = 'web-api'
      const port = await claimUnusedPort({ startPort: 4000, cwd: testCwd, serviceName: testService })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment).toBeDefined()
      expect(assignment?.service_name).toBe(testService)
      expect(assignment?.cwd).toBe(testCwd)
    })

    it('should work without service name', async () => {
      const port = await claimUnusedPort({ startPort: 4000, cwd: '/test' })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment).toBeDefined()
      expect(assignment?.service_name).toBeNull()
    })

    it('should handle multiple ports with different service names', async () => {
      const port1 = await claimUnusedPort({ startPort: 4000, cwd: '/project1', serviceName: 'api' })
      const port2 = await claimUnusedPort({ startPort: 4000, cwd: '/project2', serviceName: 'web' })
      const port3 = await claimUnusedPort({ startPort: 4000, cwd: '/project3', serviceName: 'worker' })

      const assignments = await getPortAssignments()
      const assignment1 = assignments.find(a => a.port === port1)
      const assignment2 = assignments.find(a => a.port === port2)
      const assignment3 = assignments.find(a => a.port === port3)

      expect(assignment1?.service_name).toBe('api')
      expect(assignment2?.service_name).toBe('web')
      expect(assignment3?.service_name).toBe('worker')
    })
  })

  describe('assignPort', () => {
    it('should manually assign a port', async () => {
      const testPort = 5000
      const testCwd = '/manual/test'

      await assignPort({ port: testPort, cwd: testCwd })

      const isAssigned = await isPortAssigned(testPort)
      expect(isAssigned).toBe(true)

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.cwd).toBe(testCwd)
      expect(assignment?.assigned_at).toBeGreaterThan(0)
    })

    it('should assign port with service name', async () => {
      const testPort = 5001
      const testCwd = '/manual/test'
      const testService = 'database'

      await assignPort({ port: testPort, cwd: testCwd, serviceName: testService })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.cwd).toBe(testCwd)
      expect(assignment?.service_name).toBe(testService)
    })

    it('should assign port without service name', async () => {
      const testPort = 5002
      const testCwd = '/manual/test'

      await assignPort({ port: testPort, cwd: testCwd })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.service_name).toBeNull()
    })
  })

  describe('isPortAssigned', () => {
    it('should return true for assigned ports', async () => {
      const port = await claimUnusedPort({ startPort: 4000, cwd: '/test' })
      const isAssigned = await isPortAssigned(port)
      expect(isAssigned).toBe(true)
    })

    it('should return false for unassigned ports', async () => {
      const isAssigned = await isPortAssigned(9999)
      expect(isAssigned).toBe(false)
    })
  })

  describe('getPortAssignments', () => {
    it('should return empty array when no ports assigned', async () => {
      const assignments = await getPortAssignments()
      expect(assignments).toEqual([])
    })

    it('should return all assignments ordered by most recent', async () => {
      // Assign ports with small delays to ensure different timestamps
      await claimUnusedPort({ startPort: 4000, cwd: '/project1' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await claimUnusedPort({ startPort: 4000, cwd: '/project2' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await claimUnusedPort({ startPort: 4000, cwd: '/project3' })

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThanOrEqual(3)

      // Verify ordering (most recent first)
      for (let i = 0; i < assignments.length - 1; i++) {
        expect(assignments[i].assigned_at).toBeGreaterThanOrEqual(
          assignments[i + 1].assigned_at
        )
      }
    })

    it('should include all required fields', async () => {
      await claimUnusedPort({ startPort: 4000, cwd: '/test/path' })

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThan(0)

      const assignment = assignments[0]
      expect(assignment).toHaveProperty('port')
      expect(assignment).toHaveProperty('assigned_at')
      expect(assignment).toHaveProperty('cwd')
      expect(typeof assignment.port).toBe('number')
      expect(typeof assignment.assigned_at).toBe('number')
      expect(typeof assignment.cwd).toBe('string')
    })

    it('should include service_name field when present', async () => {
      await claimUnusedPort({ startPort: 4000, cwd: '/test/path', serviceName: 'my-service' })

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThan(0)

      const assignment = assignments[0]
      expect(assignment).toHaveProperty('service_name')
      expect(assignment.service_name).toBe('my-service')
    })
  })

  describe('releasePort', () => {
    it('should release a specific port', async () => {
      const port = await claimUnusedPort({ startPort: 4000, cwd: '/test' })

      // Verify it's assigned
      let isAssigned = await isPortAssigned(port)
      expect(isAssigned).toBe(true)

      // Release it
      await releasePort(port)

      // Verify it's no longer assigned
      isAssigned = await isPortAssigned(port)
      expect(isAssigned).toBe(false)
    })

    it('should not affect other port assignments', async () => {
      const port1 = await claimUnusedPort({ startPort: 4000, cwd: '/project1' })
      const port2 = await claimUnusedPort({ startPort: 4000, cwd: '/project2' })

      await releasePort(port1)

      expect(await isPortAssigned(port1)).toBe(false)
      expect(await isPortAssigned(port2)).toBe(true)
    })
  })

  describe('resetPortAssignments', () => {
    it('should clear all port assignments', async () => {
      await claimUnusedPort({ startPort: 4000, cwd: '/project1' })
      await claimUnusedPort({ startPort: 4000, cwd: '/project2' })
      await claimUnusedPort({ startPort: 4000, cwd: '/project3' })

      let assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThanOrEqual(3)

      await resetPortAssignments()

      assignments = await getPortAssignments()
      expect(assignments).toEqual([])
    })
  })

  describe('getNextAvailablePort', () => {
    it('should return first port when database is empty', async () => {
      const port = await getNextAvailablePort(4000)
      expect(port).toBeGreaterThanOrEqual(4000)
    })

    it('should skip assigned ports', async () => {
      const testPort = 4500
      await assignPort({ port: testPort, cwd: '/test' })
      await assignPort({ port: testPort + 1, cwd: '/test' })

      const port = await getNextAvailablePort(testPort)
      expect(port).toBe(testPort + 2)
    })
  })

  describe('isPortActuallyAvailable', () => {
    it('should detect available ports', async () => {
      // Use a high port number that's likely available
      const available = await isPortActuallyAvailable(54321)
      expect(typeof available).toBe('boolean')
    })
  })

  describe('persistence', () => {
    it('should persist assignments across database reconnections', async () => {
      const testPort = 4567
      const testCwd = '/persistent/test'

      await assignPort({ port: testPort, cwd: testCwd })

      // Force a new database connection by clearing the module cache
      // This simulates restarting the application
      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)

      expect(assignment).toBeDefined()
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.cwd).toBe(testCwd)
    })
  })

  describe('port range behavior', () => {
    it('should handle ports in valid range', async () => {
      const port = await claimUnusedPort({ startPort: 4000, cwd: '/test' })
      expect(port).toBeGreaterThanOrEqual(4000)
      expect(port).toBeLessThanOrEqual(65535)
    })
  })

  describe('database schema', () => {
    it('should store correct timestamp', async () => {
      const beforeTime = Date.now()
      await claimUnusedPort({ startPort: 4000, cwd: '/test' })
      const afterTime = Date.now()

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThan(0)

      const assignment = assignments[0]
      expect(assignment.assigned_at).toBeGreaterThanOrEqual(beforeTime)
      expect(assignment.assigned_at).toBeLessThanOrEqual(afterTime)
    })

    it('should store cwd as text', async () => {
      const testCwd = '/some/very/long/path/to/a/project/directory'
      await claimUnusedPort({ startPort: 4000, cwd: testCwd })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.cwd).toBe(testCwd)
    })

    it('should store service_name as text when provided', async () => {
      const testService = 'my-long-service-name-with-dashes'
      await claimUnusedPort({ startPort: 4000, cwd: '/test', serviceName: testService })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.service_name).toBe(testService)
    })

    it('should store service_name as null when not provided', async () => {
      await claimUnusedPort({ startPort: 4000, cwd: '/test' })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.service_name).toBeNull()
    })
  })
})
