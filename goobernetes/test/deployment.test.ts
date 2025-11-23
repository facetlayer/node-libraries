import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { fileExists } from '@facetlayer/file-manifest';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Test configuration
const TEST_PORT = 4716;
const TEST_DIR = path.join(__dirname, 'temp');
const HOME_DIR = path.join(TEST_DIR, 'home');
const DEPLOYS_DIR = path.join(TEST_DIR, 'deploys');
const SAMPLE_PROJECTS_DIR = path.join(__dirname, 'sample-projects');

// Sample project paths
const BASIC_APP = path.join(SAMPLE_PROJECTS_DIR, 'basic-app');
const UPDATED_APP = path.join(SAMPLE_PROJECTS_DIR, 'updated-app');
const IGNORE_RULES_APP = path.join(SAMPLE_PROJECTS_DIR, 'ignore-rules-app');
const MULTI_INCLUDE_APP = path.join(SAMPLE_PROJECTS_DIR, 'multi-include-app');
const WILDCARD_EXCLUDE_APP = path.join(SAMPLE_PROJECTS_DIR, 'wildcard-exclude-app');

describe('Goobernetes Deployment Tests', () => {
    let serverProcess: ChildProcess;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(async () => {
        // Save original environment
        originalEnv = { ...process.env };

        // Set up test environment - MUST be set before any imports that use the database
        process.env.XDG_STATE_HOME = HOME_DIR;
        delete process.env.GOOBERNETES_API_KEY;

        // Clean and create temp directories
        await cleanDirectory(TEST_DIR);
        await fs.mkdir(HOME_DIR, { recursive: true });
        await fs.mkdir(DEPLOYS_DIR, { recursive: true });

        // Set up deployments directory in the database using a subprocess
        // This ensures the database is created in the correct location
        await setupDeploymentsDirViaSubprocess();

        // Start the goobernetes server
        serverProcess = await startServer();

        // Wait for server to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
    }, 30000);

    afterAll(async () => {
        // Restore original environment
        process.env = originalEnv;

        // Clean up server process
        if (serverProcess) {
            serverProcess.kill('SIGTERM');

            await new Promise<void>((resolve) => {
                serverProcess.on('exit', () => resolve());
                setTimeout(() => {
                    serverProcess.kill('SIGKILL');
                    resolve();
                }, 5000);
            });
        }
    }, 15000);

    describe('Basic Deployment', () => {
        test('should deploy basic-app successfully', async () => {
            await runDeploy(path.join(BASIC_APP, 'deploy.goob'));

            // Verify files were deployed
            const projectDir = path.join(DEPLOYS_DIR, 'basic-app');

            // Check that key files exist
            await verifyFileExists(path.join(projectDir, 'package.json'));
            await verifyFileExists(path.join(projectDir, 'index.js'));
            await verifyFileExists(path.join(projectDir, 'README.md'));
            await verifyFileExists(path.join(projectDir, 'public', 'index.html'));
            await verifyFileExists(path.join(projectDir, 'public', 'styles.css'));
            await verifyFileExists(path.join(projectDir, 'public', 'app.js'));

            // Verify file contents
            const packageJson = await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8');
            const packageData = JSON.parse(packageJson);
            expect(packageData.version).toBe('1.0.0');
            expect(packageData.name).toBe('basic-app');

            const indexJs = await fs.readFile(path.join(projectDir, 'index.js'), 'utf-8');
            expect(indexJs).toContain('Hello from Basic App v1!');

            const indexHtml = await fs.readFile(path.join(projectDir, 'public', 'index.html'), 'utf-8');
            expect(indexHtml).toContain('Welcome to Basic App');
        }, 30000);

        test('should verify deployment directory structure', async () => {
            const projectDir = path.join(DEPLOYS_DIR, 'basic-app');
            const stats = await fs.stat(projectDir);
            expect(stats.isDirectory()).toBe(true);

            // Check public directory exists
            const publicDir = path.join(projectDir, 'public');
            const publicStats = await fs.stat(publicDir);
            expect(publicStats.isDirectory()).toBe(true);

            // List all files to verify structure
            const files = await getAllFiles(projectDir);

            const expectedFiles = [
                'package.json',
                'index.js',
                'README.md',
                'public/index.html',
                'public/styles.css',
                'public/app.js'
            ];

            for (const expectedFile of expectedFiles) {
                const fullPath = path.join(projectDir, expectedFile);
                expect(files).toContain(fullPath);
            }

            // Verify no excluded files
            const excludedPatterns = ['node_modules', '.git', '.DS_Store'];
            for (const pattern of excludedPatterns) {
                const hasExcludedFile = files.some(file => file.includes(pattern));
                expect(hasExcludedFile).toBe(false);
            }
        });
    });

    describe('Update In Place Deployment', () => {
        test('should update existing deployment with new files', async () => {
            await runDeploy(path.join(UPDATED_APP, 'deploy.goob'));

            // Files should be in the same project directory (update-in-place)
            const projectDir = path.join(DEPLOYS_DIR, 'basic-app');

            // Check that updated files exist
            await verifyFileExists(path.join(projectDir, 'package.json'));
            await verifyFileExists(path.join(projectDir, 'index.js'));
            await verifyFileExists(path.join(projectDir, 'settings.json')); // New file in v2

            // Verify updated content
            const packageJson = await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8');
            const packageData = JSON.parse(packageJson);
            expect(packageData.version).toBe('2.0.0');
            expect(packageData.dependencies).toBeDefined();
            expect(packageData.dependencies.express).toBe('^4.18.0');

            const indexJs = await fs.readFile(path.join(projectDir, 'index.js'), 'utf-8');
            expect(indexJs).toContain('Hello from Basic App v2!');
            expect(indexJs).toContain('/new-feature');

            const indexHtml = await fs.readFile(path.join(projectDir, 'public', 'index.html'), 'utf-8');
            expect(indexHtml).toContain('Welcome to Basic App v2.0');
            expect(indexHtml).toContain('test-new-feature');

            const stylesCSS = await fs.readFile(path.join(projectDir, 'public', 'styles.css'), 'utf-8');
            expect(stylesCSS).toContain('#e8f4ff'); // Updated background color
            expect(stylesCSS).toContain('.new-feature'); // New CSS class

            const settingsJson = await fs.readFile(path.join(projectDir, 'settings.json'), 'utf-8');
            const settingsData = JSON.parse(settingsJson);
            expect(settingsData.version).toBe('2.0.0');
            expect(settingsData.features.newFeature).toBe(true);
        }, 30000);
    });

    describe('Ignore Rules', () => {
        test('should not deploy ignored files from source', async () => {
            await runDeploy(path.join(IGNORE_RULES_APP, 'deploy.goob'));

            const projectDir = path.join(DEPLOYS_DIR, 'ignore-rules-app');

            // Regular files should be deployed
            await verifyFileExists(path.join(projectDir, 'package.json'));
            await verifyFileExists(path.join(projectDir, 'index.js'));
            await verifyFileExists(path.join(projectDir, 'public', 'index.html'));

            // Ignored file from source should NOT be deployed
            const tempDataPath = path.join(projectDir, 'temp-data.txt');
            const tempDataExists = await fileExists(tempDataPath);
            expect(tempDataExists).toBe(false);
        }, 30000);

        test('should preserve preexisting ignored files in destination', async () => {
            const projectDir = path.join(DEPLOYS_DIR, 'ignore-rules-app');

            // Create a preexisting temp-data.txt in destination
            const preexistingContent = 'This is a preexisting file that should NOT be deleted!';
            await fs.writeFile(path.join(projectDir, 'temp-data.txt'), preexistingContent);

            await runDeploy(path.join(IGNORE_RULES_APP, 'deploy.goob'));

            // Verify the preexisting file still exists with original content
            const tempDataPath = path.join(projectDir, 'temp-data.txt');
            await verifyFileExists(tempDataPath);

            const content = await fs.readFile(tempDataPath, 'utf-8');
            expect(content).toBe(preexistingContent);

            // Content should NOT be the source content
            const sourceContent = await fs.readFile(path.join(IGNORE_RULES_APP, 'temp-data.txt'), 'utf-8');
            expect(content).not.toBe(sourceContent);
        }, 30000);
    });

    describe('Multiple Include Directories', () => {
        test('should deploy files from multiple include directories', async () => {
            await runDeploy(path.join(MULTI_INCLUDE_APP, 'deploy.goob'));

            const projectDir = path.join(DEPLOYS_DIR, 'multi-include-app');

            // Files from src/ should be deployed
            await verifyFileExists(path.join(projectDir, 'src', 'index.js'));
            await verifyFileExists(path.join(projectDir, 'src', 'config.js'));

            // Files from lib/ should be deployed
            await verifyFileExists(path.join(projectDir, 'lib', 'utils.js'));

            // Root files should be deployed
            await verifyFileExists(path.join(projectDir, 'package.json'));
            await verifyFileExists(path.join(projectDir, 'README.md'));

            // Verify content
            const indexJs = await fs.readFile(path.join(projectDir, 'src', 'index.js'), 'utf-8');
            expect(indexJs).toContain('Multi Include App');

            const utilsJs = await fs.readFile(path.join(projectDir, 'lib', 'utils.js'), 'utf-8');
            expect(utilsJs).toContain('Helper function');
        }, 30000);
    });

    describe('Explicit Exclude Patterns', () => {
        test('should exclude explicitly listed test files', async () => {
            await runDeploy(path.join(WILDCARD_EXCLUDE_APP, 'deploy.goob'));

            const projectDir = path.join(DEPLOYS_DIR, 'wildcard-exclude-app');

            // Regular source files should be deployed
            await verifyFileExists(path.join(projectDir, 'src', 'index.js'));
            await verifyFileExists(path.join(projectDir, 'src', 'helper.js'));
            await verifyFileExists(path.join(projectDir, 'package.json'));

            // Explicitly excluded test file should NOT be deployed
            const testFileExists = await fileExists(path.join(projectDir, 'src', 'index.test.js'));
            expect(testFileExists).toBe(false);

            // Explicitly excluded spec file should NOT be deployed
            const specFileExists = await fileExists(path.join(projectDir, 'src', 'helper.spec.js'));
            expect(specFileExists).toBe(false);

            // Verify content of deployed files
            const indexJs = await fs.readFile(path.join(projectDir, 'src', 'index.js'), 'utf-8');
            expect(indexJs).toContain('Wildcard Exclude App');
        }, 30000);
    });

    describe('Database Records', () => {
        test('should create project record in database', async () => {
            const result = await queryDatabase(`SELECT * FROM project WHERE project_name = 'basic-app'`);
            expect(result.length).toBeGreaterThan(0);

            const projectRecord = result[0];
            expect(projectRecord.project_name).toBe('basic-app');
            expect(projectRecord.created_at).toBeDefined();
        });

        test('should create deployment records in database', async () => {
            const deployments = await queryDatabase(`SELECT * FROM deployment WHERE project_name = 'basic-app'`);
            expect(deployments.length).toBeGreaterThan(0);

            const latestDeployment = deployments[deployments.length - 1];
            expect(latestDeployment.project_name).toBe('basic-app');
            expect(latestDeployment.deploy_dir).toBe('basic-app'); // update-in-place uses project name
            expect(latestDeployment.manifest_json).toBeDefined();
        });

        test('should track active deployment', async () => {
            const result = await queryDatabase(`SELECT * FROM active_deployment WHERE project_name = 'basic-app'`);
            expect(result.length).toBeGreaterThan(0);

            const activeDeployment = result[0];
            expect(activeDeployment.project_name).toBe('basic-app');
            expect(activeDeployment.deploy_name).toBeDefined();
        });
    });

    describe('File Change Detection', () => {
        test('should only upload changed files on subsequent deployments', async () => {
            // First deployment
            await runDeploy(path.join(BASIC_APP, 'deploy.goob'));

            // Second deployment with same files should detect no changes needed
            await runDeploy(path.join(BASIC_APP, 'deploy.goob'));

            // Verify files still exist and are correct
            const projectDir = path.join(DEPLOYS_DIR, 'basic-app');
            const packageJson = await fs.readFile(path.join(projectDir, 'package.json'), 'utf-8');
            const packageData = JSON.parse(packageJson);
            expect(packageData.name).toBe('basic-app');
        }, 60000);
    });

    // DISABLED: Known issue - file deletion on server not yet implemented
    describe.skip('File Deletion (Known Issue)', () => {
        test('should delete server files when client files are removed', async () => {
            // This test is disabled because file deletion is not yet implemented.
            // When a file is removed from the client manifest, it should also be
            // deleted from the server deployment directory.
            //
            // Current behavior: Files removed from the client are NOT deleted
            // from the server, leading to stale files in deployments.
            //
            // Expected behavior: When a deployment is activated and the manifest
            // no longer includes a file that exists in the deployment directory,
            // that file should be removed.

            const projectDir = path.join(DEPLOYS_DIR, 'basic-app');

            // First, verify a file exists from previous deployment
            await verifyFileExists(path.join(projectDir, 'README.md'));

            // Create a modified deploy.goob that excludes README.md
            const modifiedConfig = `deploy-settings
  project-name=basic-app
  dest-url=http://localhost:${TEST_PORT}
  web-static-dir=public
  update-in-place

include package.json
include index.js
include public

exclude node_modules
exclude .git
exclude .DS_Store
exclude *.log
exclude README.md
`;

            const tempConfigPath = path.join(BASIC_APP, 'deploy-no-readme.goob');
            await fs.writeFile(tempConfigPath, modifiedConfig);

            await runDeploy(tempConfigPath);

            // README.md should no longer exist on the server
            const readmeExists = await fileExists(path.join(projectDir, 'README.md'));
            expect(readmeExists).toBe(false);

            // Clean up temp config
            await fs.unlink(tempConfigPath);
        }, 30000);
    });
});

// Helper functions

async function cleanDirectory(dir: string): Promise<void> {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
        // Directory might not exist
    }
    await fs.mkdir(dir, { recursive: true });
}

async function setupDeploymentsDirViaSubprocess(): Promise<void> {
    // Use the CLI to set the deployments directory
    // This spawns a subprocess that creates the database in the test home directory
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'set-deployments-dir',
            DEPLOYS_DIR
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                XDG_STATE_HOME: HOME_DIR,
            }
        });

        proc.stdout?.on('data', (data) => {
            console.log('Setup:', data.toString().trim());
        });

        proc.stderr?.on('data', (data) => {
            console.error('Setup error:', data.toString().trim());
        });

        proc.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`set-deployments-dir failed with code ${code}`));
            }
        });

        proc.on('error', reject);
    });
}

async function runDeploy(configPath: string): Promise<void> {
    // Use the CLI to deploy, ensuring proper environment
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'deploy',
            configPath,
            '--override-dest',
            `http://localhost:${TEST_PORT}`
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: path.dirname(configPath),
            env: {
                ...process.env,
                XDG_STATE_HOME: HOME_DIR,
            }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => {
            stdout += data.toString();
            console.log('Deploy:', data.toString().trim());
        });

        proc.stderr?.on('data', (data) => {
            stderr += data.toString();
            console.error('Deploy error:', data.toString().trim());
        });

        proc.on('exit', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Deploy failed with code ${code}\nstdout: ${stdout}\nstderr: ${stderr}`));
            }
        });

        proc.on('error', reject);
    });
}

async function queryDatabase(sql: string): Promise<any[]> {
    // Read database directly using better-sqlite3
    const Database = (await import('better-sqlite3')).default;
    const dbPath = path.join(HOME_DIR, 'goobernetes', 'db.sqlite');
    const db = new Database(dbPath, { readonly: true });
    const result = db.prepare(sql).all();
    db.close();
    return result;
}

async function startServer(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn('node', [
            path.join(__dirname, '..', 'dist', 'cli.js'),
            'serve',
            '--disable-api-key-check',
            '--port', TEST_PORT.toString()
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                XDG_STATE_HOME: HOME_DIR,
            }
        });

        let serverStarted = false;

        serverProcess.stdout?.on('data', (data) => {
            const output = data.toString();
            console.log('Server:', output.trim());

            if (output.includes('Server listening on port') && !serverStarted) {
                serverStarted = true;
                resolve(serverProcess);
            }
        });

        serverProcess.stderr?.on('data', (data) => {
            console.error('Server error:', data.toString().trim());
        });

        serverProcess.on('error', (error) => {
            console.error('Server process error:', error);
            if (!serverStarted) {
                reject(error);
            }
        });

        serverProcess.on('exit', (code, signal) => {
            console.log(`Server exited with code ${code}, signal ${signal}`);
        });

        // Timeout if server doesn't start within 15 seconds
        setTimeout(() => {
            if (!serverStarted) {
                serverProcess.kill('SIGTERM');
                reject(new Error('Server failed to start within timeout'));
            }
        }, 15000);
    });
}

async function verifyFileExists(filePath: string): Promise<void> {
    try {
        const stats = await fs.stat(filePath);
        expect(stats.isFile()).toBe(true);
    } catch (error) {
        throw new Error(`Expected file does not exist: ${filePath}`);
    }
}


async function getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];

    async function scan(currentDir: string): Promise<void> {
        const entries = await fs.readdir(currentDir);

        for (const entry of entries) {
            const fullPath = path.join(currentDir, entry);
            const stats = await fs.stat(fullPath);

            if (stats.isDirectory()) {
                await scan(fullPath);
            } else {
                files.push(fullPath);
            }
        }
    }

    await scan(dir);
    return files;
}
