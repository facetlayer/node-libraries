import Path from 'path';
import { getFileHash } from '@facetlayer/file-manifest';
import { getDatabase } from './Database.ts';
import { GetNeededFilesParams, NeededFileEntry } from '../shared/rpc-types.ts';
import { getPathInDeploymentDir } from './deployDirs.ts';

export async function getNeededFiles({deployName}: GetNeededFilesParams): Promise<NeededFileEntry[]> {
    const db = getDatabase();

    if (!deployName) {
        throw new Error('deployName is required');
    }
    
    const deploymentRecord = db.get(`select * from deployment where deploy_name = ?`, [deployName]);
    if (!deploymentRecord) {
        throw new Error(`Deployment not found: ${deployName}`);
    }
    
    const { manifest_json } = deploymentRecord;
    const manifest = JSON.parse(manifest_json || '[]');
    
    const neededFiles: NeededFileEntry[] = [];

    for (const file of manifest) {
        const targetPath = getPathInDeploymentDir(deployName, file.relPath);
        const existingSha = await getFileHash(targetPath);
        
        if (existingSha !== file.sha) {
            neededFiles.push({
                relPath: file.relPath,
                sha: file.sha,
            });

            // Insert into database to track needed files
            try {
                db.insert('deployment_needed_file', {
                    deploy_name: deployName,
                    rel_path: file.relPath,
                    sha: file.sha,
                    created_at: new Date().toISOString(),
                });
            } catch (e) {
                // File may already be in the table, that's ok
            }
        }
    }

    return neededFiles;
}