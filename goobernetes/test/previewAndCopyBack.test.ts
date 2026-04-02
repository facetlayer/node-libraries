import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const TEST_PORT = 4717;
const TEST_DIR = path.join(__dirname, 'temp-preview');
const HOME_DIR = path.join(TEST_DIR, 'home');
const DEPLOYS_DIR = path.join(TEST_DIR, 'deploys');
const SAMPLE_PROJECTS_DIR = path.join(__dirname, 'sample-projects');
const BASIC_APP = path.join(SAMPLE_PROJECTS_DIR, 'basic-app');
const CLI_PATH = path.join(__dirname, '..', 'dist', 'cli.js');

describe('Preview Deploy and Copy Back Tests', () => {
    let serverProcess: ChildProcess;
    let originalEnv: NodeJS.ProcessEnv;

    beforeAll(async () => {
        originalEnv = { ...process.env };
        process.env.XDG_STATE_HOME = HOME_DIR;
        delete process.env.GOOBERNETES_API_KEY;

        // Clean and create temp directories
        await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(HOME_DIR, { recursive: true });
        await fs.mkdir(DEPLOYS_DIR, { recursive: true });

        // Set up deployments directory
        await runCli(['set-deployments-dir', DEPLOYS_DIR]);

        // Start server
        serverProcess = await startServer();
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Deploy basic-app to establish an active deployment
        await runCli([
            'deploy', path.join(BASIC_APP, 'deploy.goob'),
            '--override-dest', `http://localhost:${TEST_PORT}`
        ], path.dirname(path.join(BASIC_APP, 'deploy.goob')));
    }, 30000);

    afterAll(async () => {
        process.env = originalEnv;
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

    describe('preview-deploy', () => {
        test('should show no drift when nothing has changed', async () => {
            const output = await runCli([
                'preview-deploy', path.join(BASIC_APP, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`
            ], BASIC_APP);

            expect(output).toContain('No drift detected');
        }, 30000);

        test('should detect files that would be uploaded when server file is modified', async () => {
            // Modify a file on the server side
            const serverFile = path.join(DEPLOYS_DIR, 'basic-app', 'index.js');
            await fs.writeFile(serverFile, 'modified content on server');

            const output = await runCli([
                'preview-deploy', path.join(BASIC_APP, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`
            ], BASIC_APP);

            expect(output).toContain('Files to upload');
            expect(output).toContain('index.js');
        }, 30000);

        test('should detect server files that would be deleted', async () => {
            // Create an extra file on the server that is not in the manifest
            const extraFile = path.join(DEPLOYS_DIR, 'basic-app', 'extra-server-file.txt');
            await fs.writeFile(extraFile, 'this file only exists on the server');

            const output = await runCli([
                'preview-deploy', path.join(BASIC_APP, 'deploy.goob'),
                '--override-dest', `http://localhost:${TEST_PORT}`
            ], BASIC_APP);

            expect(output).toContain('Server files to be deleted');
            expect(output).toContain('extra-server-file.txt');

            // Clean up extra file
            await fs.unlink(extraFile);
        }, 30000);
    });

    describe('preview-deploy-files', () => {
        test('should list local files without contacting server', async () => {
            const output = await runCli([
                'preview-deploy-files', path.join(BASIC_APP, 'deploy.goob'),
            ], BASIC_APP);

            expect(output).toContain('Project: basic-app');
            expect(output).toContain('Files to upload');
            expect(output).toContain('index.js');
            expect(output).toContain('package.json');
        }, 30000);
    });

    describe('copy-back', () => {
        test('should copy a file from the server to local filesystem', async () => {
            // Modify a file on the server so it differs from local
            const serverFile = path.join(DEPLOYS_DIR, 'basic-app', 'index.js');
            const serverContent = 'server-modified content for copy-back test';
            await fs.writeFile(serverFile, serverContent);

            // Create a temp working copy of the project to receive the file
            const tempProject = path.join(TEST_DIR, 'copy-back-project');
            await fs.cp(BASIC_APP, tempProject, { recursive: true });

            // Copy the config and override dest-url
            const configPath = path.join(tempProject, 'deploy.goob');

            await runCli([
                'copy-back', configPath, 'index.js',
                '--override-dest', `http://localhost:${TEST_PORT}`
            ], tempProject);

            // Verify the local file now has the server's content
            const localContent = await fs.readFile(path.join(tempProject, 'index.js'), 'utf-8');
            expect(localContent).toBe(serverContent);
        }, 30000);

        test('should create parent directories if needed', async () => {
            const tempProject = path.join(TEST_DIR, 'copy-back-nested');
            await fs.cp(BASIC_APP, tempProject, { recursive: true });

            // Remove the public directory locally
            await fs.rm(path.join(tempProject, 'public'), { recursive: true, force: true });

            const configPath = path.join(tempProject, 'deploy.goob');

            await runCli([
                'copy-back', configPath, 'public/index.html',
                '--override-dest', `http://localhost:${TEST_PORT}`
            ], tempProject);

            // File should exist with content from server
            const content = await fs.readFile(path.join(tempProject, 'public', 'index.html'), 'utf-8');
            expect(content).toContain('Welcome to Basic App');
        }, 30000);
    });
});

// Helper functions

function runCli(args: string[], cwd?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn('node', [CLI_PATH, ...args], {
            stdio: ['pipe', 'pipe', 'pipe'],
            cwd: cwd || process.cwd(),
            env: {
                ...process.env,
                XDG_STATE_HOME: HOME_DIR,
            }
        });

        let stdout = '';
        let stderr = '';

        proc.stdout?.on('data', (data) => { stdout += data.toString(); });
        proc.stderr?.on('data', (data) => { stderr += data.toString(); });

        proc.on('exit', (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(`CLI failed with code ${code}\nArgs: ${args.join(' ')}\nstdout: ${stdout}\nstderr: ${stderr}`));
            }
        });

        proc.on('error', reject);
    });
}

function startServer(): Promise<ChildProcess> {
    return new Promise((resolve, reject) => {
        const serverProcess = spawn('node', [
            CLI_PATH, 'serve',
            '--disable-api-key-check',
            '--port', TEST_PORT.toString()
        ], {
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                XDG_STATE_HOME: HOME_DIR,
            }
        });

        let started = false;

        serverProcess.stdout?.on('data', (data) => {
            if (data.toString().includes('Server listening on port') && !started) {
                started = true;
                resolve(serverProcess);
            }
        });

        serverProcess.stderr?.on('data', () => {});

        serverProcess.on('error', (error) => {
            if (!started) reject(error);
        });

        setTimeout(() => {
            if (!started) {
                serverProcess.kill('SIGTERM');
                reject(new Error('Server failed to start within timeout'));
            }
        }, 15000);
    });
}
