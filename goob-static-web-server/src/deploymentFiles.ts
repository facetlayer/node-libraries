import { getDatabase, getDeploymentsDir } from "./Database";
import Path from 'path';

function assertPathWithin(parentPath: string, childPath: string): void {
    const resolvedParentPath = Path.resolve(parentPath);
    const resolvedChildPath = Path.resolve(childPath);
    if (!resolvedChildPath.startsWith(resolvedParentPath + Path.sep) && resolvedChildPath !== resolvedParentPath) {
        throw new Error(`Invalid path: ${childPath}`);
    }
}

export function getPathInDeploymentDir(deployName: string, relPath: string): string {
    const deploymentRecord = getDatabase().get(`select deploy_dir from deployment where deploy_name = ?`, [deployName]);
    if (!deploymentRecord) {
        throw new Error(`Deployment not found: ${deployName}`);
    }

    const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
    const fullPath = Path.join(deployDir, relPath);
    assertPathWithin(deployDir, fullPath);
    return fullPath;
}

export function getDeploymentWebStaticDir(deployName: string): string | null {
    const deploymentRecord = getDatabase().get(`select web_static_dir, deploy_dir from deployment where deploy_name = ?`, [deployName]);
    if (!deploymentRecord) {
        throw new Error(`Deployment not found: ${deployName}`);
    }

    if (!deploymentRecord.deploy_dir) {
        //console.log('deploymentRecord.deploy_dir is null');
        return null;
    }

    if (!deploymentRecord.web_static_dir) {
        //console.log('deploymentRecord.web_static_dir is null');
        return null;
    }

    const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
    const webStaticDir = Path.join(deployDir, deploymentRecord.web_static_dir);
    assertPathWithin(deployDir, webStaticDir);
    return webStaticDir;
}