import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getUserdataDatabase, getStateDirectory } from '../src/index'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Use a temp directory for testing
const TEST_TEMP_DIR = path.join(__dirname, 'temp')

describe('userdata-db', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Clean up temp directory
    if (fs.existsSync(TEST_TEMP_DIR)) {
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
    }
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true })
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv

    // Clean up temp directory
    if (fs.existsSync(TEST_TEMP_DIR)) {
      fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true })
    }
  })

  describe('getStateDirectory', () => {
    it('should use custom app state dir environment variable first', () => {
      process.env.MY_TEST_APP_STATE_DIR = '/custom/path'
      const dir = getStateDirectory('my-test-app')
      expect(dir).toBe('/custom/path')
    })

    it('should use XDG_STATE_HOME as fallback', () => {
      process.env.XDG_STATE_HOME = '/custom/xdg'
      delete process.env.MY_TEST_APP_STATE_DIR
      const dir = getStateDirectory('my-test-app')
      expect(dir).toBe('/custom/xdg/my-test-app')
    })

    it('should use default ~/.local/state as final fallback', () => {
      delete process.env.MY_TEST_APP_STATE_DIR
      delete process.env.XDG_STATE_HOME
      const dir = getStateDirectory('my-test-app')
      expect(dir).toBe(path.join(os.homedir(), '.local', 'state', 'my-test-app'))
    })

    it('should convert app name to uppercase for env var', () => {
      process.env.MY_COOL_APP_STATE_DIR = '/test/path'
      const dir = getStateDirectory('my-cool-app')
      expect(dir).toBe('/test/path')
    })

    it('should replace hyphens with underscores in env var name', () => {
      process.env.FOO_BAR_BAZ_STATE_DIR = '/test/path'
      const dir = getStateDirectory('foo-bar-baz')
      expect(dir).toBe('/test/path')
    })
  })

  describe('getUserdataDatabase', () => {
    it('should create database directory if it does not exist', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-1')
      process.env.TEST_APP_1_STATE_DIR = testDir

      expect(fs.existsSync(testDir)).toBe(false)

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )`
        ]
      }

      await getUserdataDatabase({
        appName: 'test-app-1',
        schema
      })

      // Verify directory was created
      expect(fs.existsSync(testDir)).toBe(true)
      expect(fs.statSync(testDir).isDirectory()).toBe(true)
    })

    it('should create db.sqlite file in the state directory', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-2')
      process.env.TEST_APP_2_STATE_DIR = testDir

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )`
        ]
      }

      await getUserdataDatabase({
        appName: 'test-app-2',
        schema
      })

      const dbPath = path.join(testDir, 'db.sqlite')
      expect(fs.existsSync(dbPath)).toBe(true)
      expect(fs.statSync(dbPath).isFile()).toBe(true)
    })

    it('should initialize database with provided schema', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-3')
      process.env.TEST_APP_3_STATE_DIR = testDir

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE
          )`,
          `CREATE INDEX idx_users_email ON users(email)`
        ]
      }

      const db = await getUserdataDatabase({
        appName: 'test-app-3',
        schema
      })

      // Verify table was created
      const tables = db.list(
        `SELECT name FROM sqlite_schema WHERE type='table' AND name='users'`
      )
      expect(tables).toHaveLength(1)
      expect(tables[0].name).toBe('users')

      // Verify index was created
      const indexes = db.list(
        `SELECT name FROM sqlite_schema WHERE type='index' AND name='idx_users_email'`
      )
      expect(indexes).toHaveLength(1)
      expect(indexes[0].name).toBe('idx_users_email')
    })

    it('should allow inserting and querying data', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-4')
      process.env.TEST_APP_4_STATE_DIR = testDir

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            age INTEGER
          )`
        ]
      }

      const db = await getUserdataDatabase({
        appName: 'test-app-4',
        schema
      })

      // Insert data
      db.insert('users', { name: 'Alice', age: 30 })
      db.insert('users', { name: 'Bob', age: 25 })

      // Query data
      const users = db.list('SELECT * FROM users ORDER BY name')
      expect(users).toHaveLength(2)
      expect(users[0].name).toBe('Alice')
      expect(users[0].age).toBe(30)
      expect(users[1].name).toBe('Bob')
      expect(users[1].age).toBe(25)
    })

    it('should handle safe-upgrades migration behavior', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-7')
      process.env.TEST_APP_7_STATE_DIR = testDir

      // First schema
      const schema1 = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )`
        ]
      }

      let db = await getUserdataDatabase({
        appName: 'test-app-7',
        schema: schema1,
        migrationBehavior: 'safe-upgrades'
      })

      db.insert('users', { id: 1, name: 'Alice' })
      db.close()

      // Updated schema with new column
      const schema2 = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT
          )`
        ]
      }

      db = await getUserdataDatabase({
        appName: 'test-app-7',
        schema: schema2,
        migrationBehavior: 'safe-upgrades'
      })

      // Verify data persisted and new column was added
      const user = db.get('SELECT * FROM users WHERE id = 1')
      expect(user.name).toBe('Alice')
      expect(user).toHaveProperty('email')
    })

    it('should work with XDG_STATE_HOME environment variable', async () => {
      const xdgBase = path.join(TEST_TEMP_DIR, 'xdg-state')
      process.env.XDG_STATE_HOME = xdgBase
      delete process.env.TEST_APP_8_STATE_DIR

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE items (id INTEGER PRIMARY KEY)`
        ]
      }

      await getUserdataDatabase({
        appName: 'test-app-8',
        schema
      })

      const expectedDbPath = path.join(xdgBase, 'test-app-8', 'db.sqlite')
      expect(fs.existsSync(expectedDbPath)).toBe(true)
    })

    it('should return same database instance on multiple calls', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-9')
      process.env.TEST_APP_9_STATE_DIR = testDir

      const schema = {
        name: 'test-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL
          )`
        ]
      }

      const db1 = await getUserdataDatabase({
        appName: 'test-app-9',
        schema
      })

      db1.insert('users', { id: 1, name: 'Alice' })

      const db2 = await getUserdataDatabase({
        appName: 'test-app-9',
        schema
      })

      // Should be able to query data inserted via db1
      const user = db2.get('SELECT * FROM users WHERE id = 1')
      expect(user.name).toBe('Alice')
    })

    it('should handle complex schema with multiple tables and indexes', async () => {
      const testDir = path.join(TEST_TEMP_DIR, 'test-app-10')
      process.env.TEST_APP_10_STATE_DIR = testDir

      const schema = {
        name: 'complex-db',
        statements: [
          `CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL
          )`,
          `CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT,
            created_at INTEGER NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`,
          `CREATE INDEX idx_posts_user_id ON posts(user_id)`,
          `CREATE INDEX idx_posts_created_at ON posts(created_at)`
        ]
      }

      const db = await getUserdataDatabase({
        appName: 'test-app-10',
        schema
      })

      // Verify all tables were created
      const tables = db.list(
        `SELECT name FROM sqlite_schema WHERE type='table' AND name IN ('users', 'posts') ORDER BY name`
      )
      expect(tables).toHaveLength(2)
      expect(tables[0].name).toBe('posts')
      expect(tables[1].name).toBe('users')

      // Verify indexes were created
      const indexes = db.list(
        `SELECT name FROM sqlite_schema WHERE type='index' AND name LIKE 'idx_posts_%' ORDER BY name`
      )
      expect(indexes).toHaveLength(2)

      // Test that we can insert and query related data
      const userId = db.insert('users', {
        username: 'alice',
        email: 'alice@example.com'
      }).lastInsertRowid

      db.insert('posts', {
        user_id: userId,
        title: 'First Post',
        content: 'Hello World',
        created_at: Date.now()
      })

      const posts = db.list('SELECT * FROM posts WHERE user_id = ?', userId)
      expect(posts).toHaveLength(1)
      expect(posts[0].title).toBe('First Post')
    })
  })
})
