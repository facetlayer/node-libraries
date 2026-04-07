import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { join } from 'path'
import { rmSync, existsSync, mkdirSync } from 'fs'
import {
  assignPort,
  claimUnusedPort,
  getPortAssignments,
  releasePort,
  serializeAssignments,
  parseAssignmentText,
  applyAssignmentEdits,
  _resetDatabaseForTesting
} from '../../src/index.ts'

const TEST_TEMP_DIR = join(__dirname, 'temp')
process.env.XDG_STATE_HOME = TEST_TEMP_DIR

beforeEach(async () => {
  _resetDatabaseForTesting()
  if (existsSync(TEST_TEMP_DIR)) {
    rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
  }
  mkdirSync(TEST_TEMP_DIR, { recursive: true })
})

afterAll(() => {
  if (existsSync(TEST_TEMP_DIR)) {
    rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
  }
})

describe('integration: uniqueness enforcement', () => {

  it('should reject duplicate name within the same project_dir', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })

    await expect(
      assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'api' })
    ).rejects.toThrow('Name "api" is already assigned to port 5000 in project /proj')
  })

  it('should allow the same name in different project_dirs', async () => {
    await assignPort({ port: 5000, cwd: '/proj-a', project_dir: '/proj-a', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj-b', project_dir: '/proj-b', name: 'api' })

    const assignments = await getPortAssignments()
    expect(assignments.length).toBe(2)
  })

  it('should allow different names in the same project_dir', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'web' })

    const assignments = await getPortAssignments()
    expect(assignments.length).toBe(2)
  })

  it('should enforce uniqueness through claimUnusedPort too', async () => {
    await claimUnusedPort({ project_dir: '/proj', name: 'api' })

    await expect(
      claimUnusedPort({ project_dir: '/proj', name: 'api' })
    ).rejects.toThrow(/already assigned/)
  })

  it('should allow reuse of a name after releasing the port', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })
    await releasePort(5000)

    // Should succeed now
    await assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'api' })
    const assignments = await getPortAssignments()
    expect(assignments.length).toBe(1)
    expect(assignments[0].port).toBe(5001)
  })
})

describe('integration: edit-as-text round-trip', () => {
  it('should serialize and parse assignments round-trip', async () => {
    await assignPort({ port: 5000, cwd: '/proj-a', project_dir: '/proj-a', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj-b', project_dir: '/proj-b', name: 'web' })

    const assignments = await getPortAssignments()
    const text = serializeAssignments(assignments)
    const parsed = parseAssignmentText(text)

    expect(parsed.length).toBe(2)
    // Both entries should be present (order may differ from original due to DESC sorting)
    const ports = parsed.map(p => p.port).sort()
    expect(ports).toEqual([5000, 5001])

    const apiEntry = parsed.find(p => p.name === 'api')
    expect(apiEntry).toBeDefined()
    expect(apiEntry!.project_dir).toBe('/proj-a')

    const webEntry = parsed.find(p => p.name === 'web')
    expect(webEntry).toBeDefined()
    expect(webEntry!.project_dir).toBe('/proj-b')
  })

  it('should skip comment lines when parsing', () => {
    const text = '# This is a comment\n5000 api /proj\n# Another comment\n5001 web /proj2\n'
    const parsed = parseAssignmentText(text)
    expect(parsed.length).toBe(2)
  })

  it('should skip blank lines when parsing', () => {
    const text = '5000 api /proj\n\n\n5001 web /proj2\n'
    const parsed = parseAssignmentText(text)
    expect(parsed.length).toBe(2)
  })

  it('should detect and apply released ports', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'web' })

    const assignments = await getPortAssignments()

    // Edit text: remove the 'api' line
    const newText = '5001 web /proj\n'
    const result = await applyAssignmentEdits(assignments, newText)

    expect(result.released).toEqual([5000])
    expect(result.assigned).toEqual([])
    expect(result.updated).toEqual([])

    const remaining = await getPortAssignments()
    expect(remaining.length).toBe(1)
    expect(remaining[0].port).toBe(5001)
  })

  it('should detect and apply new ports', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })

    const assignments = await getPortAssignments()

    // Add a new port line
    const newText = '5000 api /proj\n5002 worker /proj\n'
    const result = await applyAssignmentEdits(assignments, newText)

    expect(result.released).toEqual([])
    expect(result.assigned).toEqual([5002])
    expect(result.updated).toEqual([])

    const all = await getPortAssignments()
    expect(all.length).toBe(2)
  })

  it('should detect and apply updated names', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })

    const assignments = await getPortAssignments()

    // Change name from 'api' to 'backend'
    const newText = '5000 backend /proj\n'
    const result = await applyAssignmentEdits(assignments, newText)

    expect(result.released).toEqual([])
    expect(result.assigned).toEqual([])
    expect(result.updated).toEqual([5000])

    const all = await getPortAssignments()
    expect(all[0].name).toBe('backend')
  })

  it('should detect and apply updated project_dir', async () => {
    await assignPort({ port: 5000, cwd: '/proj-a', project_dir: '/proj-a', name: 'api' })

    const assignments = await getPortAssignments()

    // Change project_dir
    const newText = '5000 api /proj-b\n'
    const result = await applyAssignmentEdits(assignments, newText)

    expect(result.updated).toEqual([5000])

    const all = await getPortAssignments()
    expect(all[0].project_dir).toBe('/proj-b')
  })

  it('should handle no changes gracefully', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })

    const assignments = await getPortAssignments()
    const text = serializeAssignments(assignments)

    const result = await applyAssignmentEdits(assignments, text)

    expect(result.released).toEqual([])
    expect(result.assigned).toEqual([])
    expect(result.updated).toEqual([])
  })

  it('should handle combined add, remove, and update in one edit', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'web' })
    await assignPort({ port: 5002, cwd: '/proj', project_dir: '/proj', name: 'worker' })

    const assignments = await getPortAssignments()

    // Remove 'api' (5000), rename 'web' to 'frontend' (5001), keep 'worker' (5002), add new (5003)
    const newText = '5001 frontend /proj\n5002 worker /proj\n5003 scheduler /proj\n'
    const result = await applyAssignmentEdits(assignments, newText)

    expect(result.released).toEqual([5000])
    expect(result.assigned).toEqual([5003])
    expect(result.updated).toEqual([5001])

    const all = await getPortAssignments()
    expect(all.length).toBe(3)
    const names = all.map(a => a.name).sort()
    expect(names).toEqual(['frontend', 'scheduler', 'worker'])
  })

  it('should handle empty file (release everything)', async () => {
    await assignPort({ port: 5000, cwd: '/proj', project_dir: '/proj', name: 'api' })
    await assignPort({ port: 5001, cwd: '/proj', project_dir: '/proj', name: 'web' })

    const assignments = await getPortAssignments()

    const result = await applyAssignmentEdits(assignments, '# all deleted\n')

    expect(result.released.sort()).toEqual([5000, 5001])
    const all = await getPortAssignments()
    expect(all.length).toBe(0)
  })
})
