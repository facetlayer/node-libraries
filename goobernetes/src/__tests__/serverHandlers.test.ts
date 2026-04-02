import { describe, test, beforeAll, afterAll, expect } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { getFileHash } from '@facetlayer/file-manifest';

const TEST_DIR = path.join(__dirname, '..', '..', 'test', 'temp-handlers');
const HOME_DIR = path.join(TEST_DIR, 'home');
const DEPLOYS_DIR = path.join(TEST_DIR, 'deploys');

// Must set XDG_STATE_HOME before any handler imports so the database
// singleton initializes in the test directory.
process.env.XDG_STATE_HOME = HOME_DIR;

// Dynamic imports after env is set - these trigger Database singleton init
let createDeployment: typeof import('../server/createDeployment.ts').createDeployment;
let getNeededFiles: typeof import('../server/getNeededFiles.ts').getNeededFiles;
let finishUploads: typeof import('../server/finishUploads.ts').finishUploads;
let verifyDeployment: typeof import('../server/verifyDeployment.ts').verifyDeployment;
let previewDeployment: typeof import('../server/previewDeployment.ts').previewDeployment;
let downloadFile: typeof import('../server/downloadFile.ts').downloadFile;
let setDeploymentsDir: typeof import('../commands/setDeploymentsDir.ts').setDeploymentsDir;

const SAMPLE_CONFIG = `deploy-settings
  project-name=test-project
  dest-url=http://localhost:9999
  update-in-place

include src
include package.json
`;

describe('Server Handlers', () => {
    beforeAll(async () => {
        await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
        await fs.mkdir(HOME_DIR, { recursive: true });
        await fs.mkdir(DEPLOYS_DIR, { recursive: true });

        // Dynamic imports so DB singleton uses our XDG_STATE_HOME
        const cd = await import('../server/createDeployment.ts');
        const gn = await import('../server/getNeededFiles.ts');
        const fu = await import('../server/finishUploads.ts');
        const vd = await import('../server/verifyDeployment.ts');
        const pd = await import('../server/previewDeployment.ts');
        const df = await import('../server/downloadFile.ts');
        const sd = await import('../commands/setDeploymentsDir.ts');

        createDeployment = cd.createDeployment;
        getNeededFiles = gn.getNeededFiles;
        finishUploads = fu.finishUploads;
        verifyDeployment = vd.verifyDeployment;
        previewDeployment = pd.previewDeployment;
        downloadFile = df.downloadFile;
        setDeploymentsDir = sd.setDeploymentsDir;

        setDeploymentsDir(DEPLOYS_DIR);
    });

    afterAll(async () => {
        await fs.rm(TEST_DIR, { recursive: true, force: true }).catch(() => {});
    });

    describe('createDeployment', () => {
        test('should create a deployment record and directory', async () => {
            const manifest = [
                { relPath: 'src/index.js', sha: 'abc123' },
                { relPath: 'package.json', sha: 'def456' },
            ];

            const result = await createDeployment({
                projectName: 'test-project',
                sourceFileManifest: manifest,
                sourceFileConfig: SAMPLE_CONFIG,
            });

            expect(result.t).toBe('deployment_created');
            expect(result.deployName).toMatch(/^test-project-/);

            // Directory should have been created
            const deployDir = path.join(DEPLOYS_DIR, 'test-project');
            const stat = await fs.stat(deployDir);
            expect(stat.isDirectory()).toBe(true);

            // Subdirectory for src/ should exist
            const srcDir = path.join(deployDir, 'src');
            const srcStat = await fs.stat(srcDir);
            expect(srcStat.isDirectory()).toBe(true);
        });

        test('should increment deploy names', async () => {
            const result1 = await createDeployment({
                projectName: 'incrementing-project',
                sourceFileManifest: [{ relPath: 'file.txt', sha: 'aaa' }],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const result2 = await createDeployment({
                projectName: 'incrementing-project',
                sourceFileManifest: [{ relPath: 'file.txt', sha: 'bbb' }],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            // Deploy names should be different and incrementing
            expect(result1.deployName).not.toBe(result2.deployName);
        });
    });

    describe('getNeededFiles', () => {
        let deployName: string;

        beforeAll(async () => {
            const result = await createDeployment({
                projectName: 'needed-files-project',
                sourceFileManifest: [
                    { relPath: 'a.txt', sha: 'sha-a' },
                    { relPath: 'b.txt', sha: 'sha-b' },
                ],
                sourceFileConfig: SAMPLE_CONFIG,
            });
            deployName = result.deployName;
        });

        test('should return all files when none exist on disk', async () => {
            const needed = await getNeededFiles({ deployName });

            expect(needed).toHaveLength(2);
            expect(needed.map(f => f.relPath).sort()).toEqual(['a.txt', 'b.txt']);
        });

        test('should not return files that already match', async () => {
            // Write a.txt with the correct content so its hash matches
            const deployDir = path.join(DEPLOYS_DIR, 'needed-files-project');
            const content = 'content for a';
            await fs.writeFile(path.join(deployDir, 'a.txt'), content);
            const actualSha = await getFileHash(path.join(deployDir, 'a.txt'));

            // Create a new deployment with a.txt's actual hash
            const result = await createDeployment({
                projectName: 'needed-files-project',
                sourceFileManifest: [
                    { relPath: 'a.txt', sha: actualSha },
                    { relPath: 'b.txt', sha: 'sha-b-different' },
                ],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const needed = await getNeededFiles({ deployName: result.deployName });

            expect(needed).toHaveLength(1);
            expect(needed[0].relPath).toBe('b.txt');
        });

        test('should throw for unknown deployment', async () => {
            await expect(getNeededFiles({ deployName: 'nonexistent-99' }))
                .rejects.toThrow('Deployment not found');
        });
    });

    describe('finishUploads', () => {
        test('should delete leftover files not in manifest', async () => {
            const result = await createDeployment({
                projectName: 'cleanup-project',
                sourceFileManifest: [
                    { relPath: 'keep.txt', sha: 'aaa' },
                ],
                sourceFileConfig: `deploy-settings
  project-name=cleanup-project
  dest-url=http://localhost:9999
  update-in-place

include keep.txt
`,
            });

            const deployDir = path.join(DEPLOYS_DIR, 'cleanup-project');
            await fs.writeFile(path.join(deployDir, 'keep.txt'), 'keep me');
            await fs.writeFile(path.join(deployDir, 'leftover.txt'), 'delete me');

            await finishUploads({ deployName: result.deployName });

            // keep.txt should still exist
            const keepExists = await fs.stat(path.join(deployDir, 'keep.txt')).then(() => true).catch(() => false);
            expect(keepExists).toBe(true);

            // leftover.txt should be deleted
            const leftoverExists = await fs.stat(path.join(deployDir, 'leftover.txt')).then(() => true).catch(() => false);
            expect(leftoverExists).toBe(false);
        });
    });

    describe('verifyDeployment', () => {
        test('should succeed when all files match', async () => {
            const deployDir = path.join(DEPLOYS_DIR, 'verify-project');
            await fs.mkdir(deployDir, { recursive: true });

            const content = 'hello verify';
            await fs.writeFile(path.join(deployDir, 'file.txt'), content);
            const sha = await getFileHash(path.join(deployDir, 'file.txt'));

            const deployment = await createDeployment({
                projectName: 'verify-project',
                sourceFileManifest: [{ relPath: 'file.txt', sha }],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const result = await verifyDeployment({ deployName: deployment.deployName });
            expect(result.status).toBe('success');
        });

        test('should fail when a file has wrong contents', async () => {
            const deployDir = path.join(DEPLOYS_DIR, 'verify-project');
            await fs.writeFile(path.join(deployDir, 'file.txt'), 'wrong content');

            const deployment = await createDeployment({
                projectName: 'verify-project',
                sourceFileManifest: [{ relPath: 'file.txt', sha: 'expected-sha-that-wont-match' }],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const result = await verifyDeployment({ deployName: deployment.deployName });
            expect(result.status).toBe('error');
            expect(result.error).toContain('wrong contents');
        });

        test('should fail when a file is missing', async () => {
            const deployment = await createDeployment({
                projectName: 'verify-project',
                sourceFileManifest: [{ relPath: 'nonexistent.txt', sha: 'abc' }],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const result = await verifyDeployment({ deployName: deployment.deployName });
            expect(result.status).toBe('error');
            expect(result.error).toContain('missing');
        });
    });

    describe('previewDeployment', () => {
        beforeAll(async () => {
            // Set up an active deployment with known files
            const deployDir = path.join(DEPLOYS_DIR, 'preview-project');
            await fs.mkdir(deployDir, { recursive: true });
            await fs.writeFile(path.join(deployDir, 'existing.txt'), 'existing content');
            await fs.writeFile(path.join(deployDir, 'server-only.txt'), 'only on server');

            const existingSha = await getFileHash(path.join(deployDir, 'existing.txt'));

            const deployment = await createDeployment({
                projectName: 'preview-project',
                sourceFileManifest: [{ relPath: 'existing.txt', sha: existingSha }],
                sourceFileConfig: `deploy-settings
  project-name=preview-project
  dest-url=http://localhost:9999
  update-in-place

include existing.txt
`,
            });

            // Activate this deployment so previewDeployment can find it
            const { getDatabase } = await import('../server/Database.ts');
            getDatabase().upsert('active_deployment', {
                project_name: 'preview-project',
            }, {
                project_name: 'preview-project',
                deploy_name: deployment.deployName,
                updated_at: new Date().toISOString(),
            });
        });

        test('should return all files as uploads when no active deployment exists', async () => {
            const manifest = [{ relPath: 'new.txt', sha: 'abc' }];
            const result = await previewDeployment({
                projectName: 'no-such-project',
                sourceFileManifest: manifest,
                sourceFileConfig: SAMPLE_CONFIG,
            });

            expect(result.filesToUpload).toEqual(manifest);
            expect(result.filesToDelete).toEqual([]);
        });

        test('should detect files that need uploading', async () => {
            const result = await previewDeployment({
                projectName: 'preview-project',
                sourceFileManifest: [
                    { relPath: 'existing.txt', sha: 'different-sha' },
                ],
                sourceFileConfig: `deploy-settings
  project-name=preview-project
  dest-url=http://localhost:9999
  update-in-place

include existing.txt
`,
            });

            expect(result.filesToUpload).toHaveLength(1);
            expect(result.filesToUpload[0].relPath).toBe('existing.txt');
        });

        test('should detect no drift when files match', async () => {
            const deployDir = path.join(DEPLOYS_DIR, 'preview-project');
            const existingSha = await getFileHash(path.join(deployDir, 'existing.txt'));

            const result = await previewDeployment({
                projectName: 'preview-project',
                sourceFileManifest: [
                    { relPath: 'existing.txt', sha: existingSha },
                ],
                sourceFileConfig: `deploy-settings
  project-name=preview-project
  dest-url=http://localhost:9999
  update-in-place

include existing.txt
`,
            });

            expect(result.filesToUpload).toHaveLength(0);
        });

        test('should detect server files that would be deleted', async () => {
            const deployDir = path.join(DEPLOYS_DIR, 'preview-project');
            const existingSha = await getFileHash(path.join(deployDir, 'existing.txt'));

            const result = await previewDeployment({
                projectName: 'preview-project',
                sourceFileManifest: [
                    { relPath: 'existing.txt', sha: existingSha },
                ],
                sourceFileConfig: `deploy-settings
  project-name=preview-project
  dest-url=http://localhost:9999
  update-in-place

include existing.txt
`,
            });

            // server-only.txt exists on disk but not in manifest, so it should be listed for deletion
            expect(result.filesToDelete).toContain('server-only.txt');
        });
    });

    describe('downloadFile', () => {
        beforeAll(async () => {
            const deployDir = path.join(DEPLOYS_DIR, 'download-project');
            await fs.mkdir(path.join(deployDir, 'subdir'), { recursive: true });
            await fs.writeFile(path.join(deployDir, 'hello.txt'), 'hello world');
            await fs.writeFile(path.join(deployDir, 'subdir/nested.txt'), 'nested content');

            const deployment = await createDeployment({
                projectName: 'download-project',
                sourceFileManifest: [
                    { relPath: 'hello.txt', sha: 'aaa' },
                    { relPath: 'subdir/nested.txt', sha: 'bbb' },
                ],
                sourceFileConfig: SAMPLE_CONFIG,
            });

            const { getDatabase } = await import('../server/Database.ts');
            getDatabase().upsert('active_deployment', {
                project_name: 'download-project',
            }, {
                project_name: 'download-project',
                deploy_name: deployment.deployName,
                updated_at: new Date().toISOString(),
            });
        });

        test('should return file contents as base64', async () => {
            const result = await downloadFile({
                projectName: 'download-project',
                relPath: 'hello.txt',
            });

            const decoded = Buffer.from(result.contentBase64, 'base64').toString('utf-8');
            expect(decoded).toBe('hello world');
            expect(result.relPath).toBe('hello.txt');
        });

        test('should handle nested files', async () => {
            const result = await downloadFile({
                projectName: 'download-project',
                relPath: 'subdir/nested.txt',
            });

            const decoded = Buffer.from(result.contentBase64, 'base64').toString('utf-8');
            expect(decoded).toBe('nested content');
        });

        test('should reject path traversal', async () => {
            await expect(downloadFile({
                projectName: 'download-project',
                relPath: '../../../etc/passwd',
            })).rejects.toThrow('Invalid path');
        });

        test('should throw for project with no active deployment', async () => {
            await expect(downloadFile({
                projectName: 'nonexistent-project',
                relPath: 'file.txt',
            })).rejects.toThrow('No active deployment found');
        });
    });
});
