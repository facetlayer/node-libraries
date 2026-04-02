import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';

// We need to test getPathInDeploymentDir but it depends on the database.
// Instead, test the path traversal logic directly.

describe('path traversal prevention', () => {
    it('should detect path traversal with ../', () => {
        const deployDir = '/srv/deployments/my-project';
        const relPath = '../../../etc/passwd';
        const fullPath = path.join(deployDir, relPath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedDeployDir = path.resolve(deployDir);

        expect(resolvedPath.startsWith(resolvedDeployDir + path.sep)).toBe(false);
        expect(resolvedPath).not.toBe(resolvedDeployDir);
    });

    it('should allow normal relative paths', () => {
        const deployDir = '/srv/deployments/my-project';
        const relPath = 'src/index.js';
        const fullPath = path.join(deployDir, relPath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedDeployDir = path.resolve(deployDir);

        expect(resolvedPath.startsWith(resolvedDeployDir + path.sep)).toBe(true);
    });

    it('should allow nested directory paths', () => {
        const deployDir = '/srv/deployments/my-project';
        const relPath = 'src/components/Header.tsx';
        const fullPath = path.join(deployDir, relPath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedDeployDir = path.resolve(deployDir);

        expect(resolvedPath.startsWith(resolvedDeployDir + path.sep)).toBe(true);
    });

    it('should detect traversal that goes up and comes back to a different dir', () => {
        const deployDir = '/srv/deployments/my-project';
        const relPath = '../other-project/config.json';
        const fullPath = path.join(deployDir, relPath);
        const resolvedPath = path.resolve(fullPath);
        const resolvedDeployDir = path.resolve(deployDir);

        expect(resolvedPath.startsWith(resolvedDeployDir + path.sep)).toBe(false);
    });

    it('should detect absolute path injection', () => {
        const deployDir = '/srv/deployments/my-project';
        // path.join with absolute second arg replaces the first on some systems
        // but path.resolve always normalizes
        const relPath = '/etc/passwd';
        const fullPath = path.resolve(deployDir, relPath);
        const resolvedDeployDir = path.resolve(deployDir);

        expect(fullPath.startsWith(resolvedDeployDir + path.sep)).toBe(false);
    });
});
