import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { DatabaseLoader, nullDatabaseLogs } from '@facetlayer/sqlite-wrapper';

function openDb(dbPath: string) {
    return new DatabaseLoader({ filename: dbPath, schema: { name: 'test', statements: [] }, migrationBehavior: 'ignore', logs: nullDatabaseLogs }).load();
}

// Test configuration
const TEST_PORT = 4718;
const TEST_DIR = path.join(__dirname, 'temp-sql');
const HOME_DIR = path.join(TEST_DIR, 'home');
const DEPLOYS_DIR = path.join(TEST_DIR, 'deploys');
const SAMPLE_PROJECTS_DIR = path.join(__dirname, 'sample-projects');

const DB_APP = path.join(SAMPLE_PROJECTS_DIR, 'db-app');
const DB_APP_SINGLE = path.join(SAMPLE_PROJECTS_DIR, 'db-app-single-db');

describe('SQL Command Tests', () => {
    let serverProcess: ChildProcess;

    beforeAll(async () => {
        process.env.XDG_STATE_HOME = HOME_DIR;
        delete process.env.GOOBERNETES_API_KEY;

        await cleanDirectory(TEST_DIR);
        await fs.mkdir(HOME_DIR, { recursive: true });
        await fs.mkdir(DEPLOYS_DIR, { recursive: true });

        await setupDeploymentsDirViaSubprocess();
        serverProcess = await startServer();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Deploy the apps
        await runDeploy(path.join(DB_APP, 'deploy.goob'));
        await runDeploy(path.join(DB_APP_SINGLE, 'deploy.goob'));

        // Create databases in the deployment directories
        await createTestDatabases();
    }, 30000);

    afterAll(async () => {
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
            await new Promise<void>((resolve) => {
                serverProcess.on('exit', () => resolve());
                setTimeout(() => { serverProcess.kill('SIGKILL'); resolve(); }, 5000);
            });
        }
    }, 15000);

    describe('parseSqlTableNames', () => {
        test('extracts table from SELECT FROM', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('SELECT * FROM users')).toEqual(['users']);
        });

        test('extracts table from INSERT INTO', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('INSERT INTO orders (id, name) VALUES (1, "test")')).toEqual(['orders']);
        });

        test('extracts table from UPDATE', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('UPDATE products SET price = 10 WHERE id = 1')).toEqual(['products']);
        });

        test('extracts table from DELETE FROM', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('DELETE FROM sessions WHERE expired = 1')).toEqual(['sessions']);
        });

        test('extracts multiple tables from JOIN', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            const tables = parseSqlTableNames('SELECT u.name, o.total FROM users u JOIN orders o ON u.id = o.user_id');
            expect(tables).toContain('users');
            expect(tables).toContain('orders');
        });

        test('extracts table from CREATE TABLE', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY)')).toEqual(['items']);
        });

        test('extracts table from DROP TABLE', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('DROP TABLE IF EXISTS temp_data')).toEqual(['temp_data']);
        });

        test('handles INSERT OR IGNORE INTO', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('INSERT OR IGNORE INTO cache (key, val) VALUES (?, ?)')).toEqual(['cache']);
        });

        test('returns empty array for non-table SQL', async () => {
            const { parseSqlTableNames } = await import('../src/shared/parseSqlTableNames');
            expect(parseSqlTableNames('SELECT 1 + 1')).toEqual([]);
        });
    });

    describe('parseGoobDatabases', () => {
        test('parses single database entry', async () => {
            const { parseGoobDatabases } = await import('../src/shared/parseGoobDatabases');
            const config = `deploy-settings\n  project-name=test\n  dest-url=http://localhost:4717\n\ndatabase data/app.sqlite\n`;
            expect(parseGoobDatabases(config)).toEqual(['data/app.sqlite']);
        });

        test('parses multiple database entries', async () => {
            const { parseGoobDatabases } = await import('../src/shared/parseGoobDatabases');
            const config = `deploy-settings\n  project-name=test\n  dest-url=http://localhost:4717\n\ndatabase data/main.sqlite\ndatabase data/logs.sqlite\n`;
            expect(parseGoobDatabases(config)).toEqual(['data/main.sqlite', 'data/logs.sqlite']);
        });

        test('returns empty array when no databases configured', async () => {
            const { parseGoobDatabases } = await import('../src/shared/parseGoobDatabases');
            const config = `deploy-settings\n  project-name=test\n  dest-url=http://localhost:4717\n`;
            expect(parseGoobDatabases(config)).toEqual([]);
        });
    });

    describe('list-databases command', () => {
        test('lists databases for db-app with two databases', async () => {
            const output = await runGoobCmd([
                'list-databases',
                path.join(DB_APP, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('data/main.sqlite');
            expect(output).toContain('data/logs.sqlite');
        }, 15000);

        test('lists databases for db-app-single-db with one database', async () => {
            const output = await runGoobCmd([
                'list-databases',
                path.join(DB_APP_SINGLE, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('data/app.sqlite');
        }, 15000);

        test('shows tables for each database', async () => {
            const output = await runGoobCmd([
                'list-databases',
                path.join(DB_APP, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('users');
            expect(output).toContain('events');
        }, 15000);
    });

    describe('sql command - single database', () => {
        test('SELECT query returns results', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP_SINGLE, 'deploy.goob'),
                'SELECT * FROM products ORDER BY id',
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('id');
            expect(output).toContain('name');
            expect(output).toContain('Widget');
            expect(output).toContain('Gadget');
        }, 15000);

        test('SELECT with WHERE clause filters rows', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP_SINGLE, 'deploy.goob'),
                'SELECT name FROM products WHERE id = 1',
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('Widget');
            expect(output).not.toContain('Gadget');
        }, 15000);
    });

    describe('sql command - multi-database routing', () => {
        test('routes SELECT to correct database by table name', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP, 'deploy.goob'),
                'SELECT * FROM users ORDER BY id',
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('alice');
            expect(output).toContain('bob');
        }, 15000);

        test('routes to logs database by table name', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP, 'deploy.goob'),
                'SELECT * FROM events ORDER BY id',
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('login');
            expect(output).toContain('logout');
        }, 15000);

        test('--database flag overrides auto-detection', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP, 'deploy.goob'),
                'SELECT * FROM users',
                '--database', 'data/main.sqlite',
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('alice');
        }, 15000);

        test('errors when tables exist in multiple databases', async () => {
            // Insert 'users' table into logs db too to create ambiguity
            const logsDb = path.join(DEPLOYS_DIR, 'db-app', 'data', 'logs.sqlite');
            const db = openDb(logsDb);
            db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`);
            db.run(`INSERT OR IGNORE INTO users VALUES (99, 'ghost')`);
            db.close();

            let errorOutput = '';
            try {
                await runGoobCmd([
                    'sql',
                    path.join(DB_APP, 'deploy.goob'),
                    'SELECT * FROM users',
                    '--override-dest', `http://localhost:${TEST_PORT}`,
                ]);
            } catch (e: any) {
                errorOutput = e.message;
            }

            expect(errorOutput).toContain('Ambiguous');
            expect(errorOutput).toContain('data/main.sqlite');
            expect(errorOutput).toContain('data/logs.sqlite');

            // Clean up: drop users from logs db
            const db2 = openDb(logsDb);
            db2.run(`DROP TABLE IF EXISTS users`);
            db2.close();
        }, 15000);

        test('errors with helpful message when no database has the queried table', async () => {
            let errorOutput = '';
            try {
                await runGoobCmd([
                    'sql',
                    path.join(DB_APP, 'deploy.goob'),
                    'SELECT * FROM nonexistent_table',
                    '--override-dest', `http://localhost:${TEST_PORT}`,
                ]);
            } catch (e: any) {
                errorOutput = e.message;
            }

            expect(errorOutput).toContain('nonexistent_table');
            expect(errorOutput).toContain('data/main.sqlite');
            expect(errorOutput).toContain('data/logs.sqlite');
        }, 15000);
    });

    describe('sql command - write operations', () => {
        test('INSERT returns rows affected', async () => {
            const output = await runGoobCmd([
                'sql',
                path.join(DB_APP_SINGLE, 'deploy.goob'),
                "INSERT INTO products (name, price) VALUES ('NewItem', 99)",
                '--override-dest', `http://localhost:${TEST_PORT}`,
            ]);
            expect(output).toContain('1 row');
        }, 15000);
    });
});

// Helpers

async function cleanDirectory(dir: string): Promise<void> {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch {}
    await fs.mkdir(dir, { recursive: true });
}

async function setupDeploymentsDirViaSubprocess(): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'set-deployments-dir',
            DEPLOYS_DIR,
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, XDG_STATE_HOME: HOME_DIR },
        });
        proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`set-deployments-dir failed with code ${code}`)));
        proc.on('error', reject);
    });
}

async function startServer(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'serve',
            '--disable-api-key-check',
            '--port', TEST_PORT.toString(),
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, XDG_STATE_HOME: HOME_DIR },
        });

        let started = false;

        serverProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('Server:', output.trim());
            if (output.includes('Server listening on port') && !started) {
                started = true;
                resolve(serverProcess);
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            console.error('Server error:', data.toString().trim());
        });

        serverProcess.on('error', (err) => { if (!started) reject(err); });

        setTimeout(() => {
            if (!started) {
                serverProcess.kill('SIGTERM');
                reject(new Error('Server failed to start within timeout'));
            }
        }, 15000);
    });
}

async function runDeploy(configPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'deploy',
            configPath,
            '--override-dest', `http://localhost:${TEST_PORT}`,
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(configPath),
            env: { ...process.env, XDG_STATE_HOME: HOME_DIR },
        });

        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d) => { stdout += d.toString(); });
        proc.stderr?.on('data', (d) => { stderr += d.toString(); });
        proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Deploy failed: ${stdout}\n${stderr}`)));
        proc.on('error', reject);
    });
}

async function runGoobCmd(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            ...args,
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, XDG_STATE_HOME: HOME_DIR },
        });

        let stdout = '';
        let stderr = '';
        proc.stdout?.on('data', (d) => { stdout += d.toString(); console.log('CMD:', d.toString().trim()); });
        proc.stderr?.on('data', (d) => { stderr += d.toString(); console.error('CMD err:', d.toString().trim()); });
        proc.on('exit', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`Command failed (exit ${code}):\n${stdout}\n${stderr}`));
            }
        });
        proc.on('error', reject);
    });
}

async function createTestDatabases(): Promise<void> {
    // db-app: two databases - main.sqlite (users) and logs.sqlite (events)
    const dbAppDir = path.join(DEPLOYS_DIR, 'db-app', 'data');
    await fs.mkdir(dbAppDir, { recursive: true });

    const mainDb = openDb(path.join(dbAppDir, 'main.sqlite'));
    mainDb.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT
        )
    `);
    mainDb.run(`INSERT INTO users (name, email) VALUES ('alice', 'alice@example.com')`);
    mainDb.run(`INSERT INTO users (name, email) VALUES ('bob', 'bob@example.com')`);
    mainDb.close();

    const logsDb = openDb(path.join(dbAppDir, 'logs.sqlite'));
    logsDb.run(`
        CREATE TABLE IF NOT EXISTS events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            user_id INTEGER,
            created_at TEXT
        )
    `);
    logsDb.run(`INSERT INTO events (type, user_id, created_at) VALUES ('login', 1, '2024-01-01')`);
    logsDb.run(`INSERT INTO events (type, user_id, created_at) VALUES ('logout', 1, '2024-01-01')`);
    logsDb.close();

    // db-app-single-db: one database - app.sqlite (products)
    const singleDbAppDir = path.join(DEPLOYS_DIR, 'db-app-single-db', 'data');
    await fs.mkdir(singleDbAppDir, { recursive: true });

    const appDb = openDb(path.join(singleDbAppDir, 'app.sqlite'));
    appDb.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL
        )
    `);
    appDb.run(`INSERT INTO products (name, price) VALUES ('Widget', 9.99)`);
    appDb.run(`INSERT INTO products (name, price) VALUES ('Gadget', 19.99)`);
    appDb.close();
}
