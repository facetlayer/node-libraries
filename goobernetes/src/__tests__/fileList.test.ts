import { describe, it, expect } from 'vitest';
import { getFileListFromConfig } from '../client/fileList.ts';
import path from 'path';
import fs from 'fs/promises';

const TEMP_DIR = path.join(__dirname, '..', '..', 'test', 'temp', 'filelist-test');

async function setupTempProject(files: Record<string, string>, configContent: string): Promise<string> {
    await fs.rm(TEMP_DIR, { recursive: true, force: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });

    for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(TEMP_DIR, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content);
    }

    const configPath = path.join(TEMP_DIR, 'deploy.goob');
    await fs.writeFile(configPath, configContent);
    return configPath;
}

describe('fileList security validation', () => {
    it('should reject .env files', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                '.env': 'SECRET=abc',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include .env
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });

    it('should reject .env.production files', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                '.env.production': 'SECRET=abc',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include .env.production
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });

    it('should reject files with "secret" in the name', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                'my-secret-config.json': '{}',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include my-secret-config.json
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });

    it('should reject .pem files', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                'server.pem': 'cert data',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include server.pem
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });

    it('should allow normal files', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                'package.json': '{"name": "test"}',
                'src/app.ts': 'export default {}',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include package.json
include src
`
        );

        const result = await getFileListFromConfig({ configFilename: configPath });
        expect(result.projectName).toBe('test');
        expect(result.destUrl).toBe('http://localhost:4800');
        expect(result.files).toContain('index.js');
        expect(result.files).toContain('package.json');
    });

    it('should reject credentials.json', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                'credentials.json': '{"key": "value"}',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include credentials.json
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });

    it('should reject SSH key files', async () => {
        const configPath = await setupTempProject(
            {
                'index.js': 'console.log("hello")',
                'id_rsa': 'private key data',
            },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
include id_rsa
`
        );

        await expect(getFileListFromConfig({ configFilename: configPath }))
            .rejects.toThrow('Security Error');
    });
});

describe('fileList config parsing', () => {
    it('should parse project name and dest url', async () => {
        const configPath = await setupTempProject(
            { 'index.js': 'console.log("hello")' },
            `deploy-settings
  project-name=my-project
  dest-url=http://example.com:5000

include index.js
`
        );

        const result = await getFileListFromConfig({ configFilename: configPath });
        expect(result.projectName).toBe('my-project');
        expect(result.destUrl).toBe('http://example.com:5000');
    });

    it('should resolve localDir to config file directory', async () => {
        const configPath = await setupTempProject(
            { 'index.js': 'console.log("hello")' },
            `deploy-settings
  project-name=test
  dest-url=http://localhost:4800

include index.js
`
        );

        const result = await getFileListFromConfig({ configFilename: configPath });
        expect(result.localDir).toBe(TEMP_DIR);
    });
});
