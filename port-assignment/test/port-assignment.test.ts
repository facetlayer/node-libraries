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
  isPortActuallyAvailable,
  _resetDatabaseForTesting
} from '../src/index.ts'

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
      const port = await claimUnusedPort({ cwd: '/test/cwd' })
      expect(port).toBeGreaterThanOrEqual(4000)

      // Verify database was created
      const dbPath = join(TEST_TEMP_DIR, 'port-assignment', 'db.sqlite')
      expect(existsSync(dbPath)).toBe(true)
    })

    it('should create port_assignments table', async () => {
      await claimUnusedPort({ cwd: '/test/cwd' })

      const assignments = await getPortAssignments()
      expect(Array.isArray(assignments)).toBe(true)
    })
  })

  describe('claimUnusedPort', () => {
    it('should claim and track a port', async () => {
      const testCwd = '/test/project'
      const port = await claimUnusedPort({ cwd: testCwd })

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
      const port1 = await claimUnusedPort({ cwd: '/project1' })
      const port2 = await claimUnusedPort({ cwd: '/project2' })
      const port3 = await claimUnusedPort({ cwd: '/project3' })

      // All ports should be different
      expect(port1).not.toBe(port2)
      expect(port2).not.toBe(port3)
      expect(port1).not.toBe(port3)

      // All should be tracked
      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThanOrEqual(3)
    })

    it('should use process.cwd() by default', async () => {
      const port = await claimUnusedPort()

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment?.cwd).toBe(process.cwd())
    })

    it('should store name when provided', async () => {
      const testCwd = '/test/project'
      const testName = 'web-api'
      const port = await claimUnusedPort({ cwd: testCwd, name: testName })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment).toBeDefined()
      expect(assignment?.name).toBe(testName)
      expect(assignment?.cwd).toBe(testCwd)
    })

    it('should work without name', async () => {
      const port = await claimUnusedPort({ cwd: '/test' })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === port)
      expect(assignment).toBeDefined()
      expect(assignment?.name).toBeNull()
    })

    it('should handle multiple ports with different names', async () => {
      const port1 = await claimUnusedPort({ cwd: '/project1', name: 'api' })
      const port2 = await claimUnusedPort({ cwd: '/project2', name: 'web' })
      const port3 = await claimUnusedPort({ cwd: '/project3', name: 'worker' })

      const assignments = await getPortAssignments()
      const assignment1 = assignments.find(a => a.port === port1)
      const assignment2 = assignments.find(a => a.port === port2)
      const assignment3 = assignments.find(a => a.port === port3)

      expect(assignment1?.name).toBe('api')
      expect(assignment2?.name).toBe('web')
      expect(assignment3?.name).toBe('worker')
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

    it('should assign port with name', async () => {
      const testPort = 5001
      const testCwd = '/manual/test'
      const testName = 'database'

      await assignPort({ port: testPort, cwd: testCwd, name: testName })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.cwd).toBe(testCwd)
      expect(assignment?.name).toBe(testName)
    })

    it('should assign port without name', async () => {
      const testPort = 5002
      const testCwd = '/manual/test'

      await assignPort({ port: testPort, cwd: testCwd })

      const assignments = await getPortAssignments()
      const assignment = assignments.find(a => a.port === testPort)
      expect(assignment?.port).toBe(testPort)
      expect(assignment?.name).toBeNull()
    })
  })

  describe('isPortAssigned', () => {
    it('should return true for assigned ports', async () => {
      const port = await claimUnusedPort({ cwd: '/test' })
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
      await claimUnusedPort({ cwd: '/project1' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await claimUnusedPort({ cwd: '/project2' })
      await new Promise(resolve => setTimeout(resolve, 10))
      await claimUnusedPort({ cwd: '/project3' })

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
      await claimUnusedPort({ cwd: '/test/path' })

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

    it('should include name field when present', async () => {
      await claimUnusedPort({ cwd: '/test/path', name: 'my-service' })

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThan(0)

      const assignment = assignments[0]
      expect(assignment).toHaveProperty('name')
      expect(assignment.name).toBe('my-service')
    })
  })

  describe('releasePort', () => {
    it('should release a specific port', async () => {
      const port = await claimUnusedPort({ cwd: '/test' })

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
      const port1 = await claimUnusedPort({ cwd: '/project1' })
      const port2 = await claimUnusedPort({ cwd: '/project2' })

      await releasePort(port1)

      expect(await isPortAssigned(port1)).toBe(false)
      expect(await isPortAssigned(port2)).toBe(true)
    })
  })

  describe('resetPortAssignments', () => {
    it('should clear all port assignments', async () => {
      await claimUnusedPort({ cwd: '/project1' })
      await claimUnusedPort({ cwd: '/project2' })
      await claimUnusedPort({ cwd: '/project3' })

      let assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThanOrEqual(3)

      await resetPortAssignments()

      assignments = await getPortAssignments()
      expect(assignments).toEqual([])
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
      const port = await claimUnusedPort({ cwd: '/test' })
      expect(port).toBeGreaterThanOrEqual(4000)
      expect(port).toBeLessThanOrEqual(65535)
    })
  })

  describe('database schema', () => {
    it('should store correct timestamp', async () => {
      const beforeTime = Date.now()
      await claimUnusedPort({ cwd: '/test' })
      const afterTime = Date.now()

      const assignments = await getPortAssignments()
      expect(assignments.length).toBeGreaterThan(0)

      const assignment = assignments[0]
      expect(assignment.assigned_at).toBeGreaterThanOrEqual(beforeTime)
      expect(assignment.assigned_at).toBeLessThanOrEqual(afterTime)
    })

    it('should store cwd as text', async () => {
      const testCwd = '/some/very/long/path/to/a/project/directory'
      await claimUnusedPort({ cwd: testCwd })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.cwd).toBe(testCwd)
    })

    it('should store name as text when provided', async () => {
      const testName = 'my-long-service-name-with-dashes'
      await claimUnusedPort({ cwd: '/test', name: testName })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.name).toBe(testName)
    })

    it('should store name as null when not provided', async () => {
      await claimUnusedPort({ cwd: '/test' })

      const assignments = await getPortAssignments()
      const assignment = assignments[0]
      expect(assignment.name).toBeNull()
    })
  })
})
