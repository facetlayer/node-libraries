import { getDatabase, getDeploymentsDir } from "./Database.ts";
import Path from 'path';

export function getPathInDeploymentDir(deployName: string, relPath: string): string {
    const deploymentRecord = getDatabase().get(`select deploy_dir from deployment where deploy_name = ?`, [deployName]);
    if (!deploymentRecord) {
        throw new Error(`Deployment not found: ${deployName}`);
    }

    const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
    const fullPath = Path.join(deployDir, relPath);

    // Safety check the path
    const resolvedPath = Path.resolve(fullPath);
    const resolvedDeployDir = Path.resolve(deployDir);

    if (!resolvedPath.startsWith(resolvedDeployDir + Path.sep) && resolvedPath !== resolvedDeployDir) {
        throw new Error(`Invalid path: ${relPath}`);
    }

    return fullPath;
}