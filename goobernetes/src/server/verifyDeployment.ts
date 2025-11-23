
import Path from 'path'
import { fileExists, getFileHash } from '@facetlayer/file-manifest';
import { getDatabase } from './Database.ts';
import { databaseCleanup } from './databaseCleanup.ts';
import { getPathInDeploymentDir } from './deployDirs.ts';

interface VerifyDeploymentResponse {
    status: 'ok' | 'error';
    error?: string;
}

export async function verifyDeployment({deployName}: { deployName: string })
    : Promise<VerifyDeploymentResponse> {

    const db = getDatabase();

    if (!deployName) {
        throw new Error('deployName is required');
    }
    
    const { manifest_json } = db.get(`select manifest_json from deployment where deploy_name = ?`, [deployName]);
    const manifest = JSON.parse(manifest_json || '[]');

    const missingFileCount = db.count(`from deployment_needed_file where deploy_name = ?`, [deployName]);

    if (missingFileCount > 0) {
        console.log(`Deployment verification failed: ${deployName} - ${missingFileCount} files are missing`);
        return {
            status: 'error',
            error: `Incomplete deployment: ${missingFileCount} files are missing`,
        }
    }

    for (const item of manifest) {
        const localPath = getPathInDeploymentDir(deployName, item.relPath);

        if (!await fileExists(localPath)) {
            console.log(`Deployment verification failed: ${deployName} - file is missing: ${item.relPath}`);
            return {
                status: 'error',
                error: `Incomplete deployment: file is missing: ${item.relPath}`,
            }
        }

        const sha = await getFileHash(localPath);

        if (sha !== item.sha) {
            console.log(`Deployment verification failed: ${deployName} - file has wrong contents: ${item.relPath}`);
            return {
                status: 'error',
                error: `Incomplete deployment: file has wrong contents: ${item.relPath}`,
            }
        }
    }

    db.run(`delete from deployment_pending_multi_part_file_chunk where deploy_name = ?`, [deployName]);

    await databaseCleanup();

    return {
        status: 'ok',
    }
}

