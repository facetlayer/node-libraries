import { getDatabase, getDeploymentsDir } from "./Database.ts";
import Path from 'path';

export function getPathInDeploymentDir(deployName: string, relPath: string): string {
    const deploymentRecord = getDatabase().get(`select deploy_dir from deployment where deploy_name = ?`, [deployName]);
    if (!deploymentRecord) {
        throw new Error(`Deployment not found: ${deployName}`);
    }

    const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
    return getSafePathInDir(deployDir, relPath);
}

/**
 * Resolves the directory for a project's active deployment.
 * Returns null if the project has no active deployment.
 */
export function getActiveDeploymentDir(projectName: string): string | null {
    const db = getDatabase();

    const activeRecord = db.get(
        `select deploy_name from active_deployment where project_name = ?`,
        [projectName]
    );
    if (!activeRecord) {
        return null;
    }

    const deploymentRecord = db.get(
        `select deploy_dir from deployment where deploy_name = ?`,
        [activeRecord.deploy_name]
    );
    if (!deploymentRecord) {
        return null;
    }

    return Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
}

/**
 * Joins a relative path within a directory, with path traversal protection.
 */
export function getSafePathInDir(dir: string, relPath: string): string {
    const fullPath = Path.join(dir, relPath);
    const resolvedPath = Path.resolve(fullPath);
    const resolvedDir = Path.resolve(dir);

    if (!resolvedPath.startsWith(resolvedDir + Path.sep) && resolvedPath !== resolvedDir) {
        throw new Error(`Invalid path: ${relPath}`);
    }

    return fullPath;
}