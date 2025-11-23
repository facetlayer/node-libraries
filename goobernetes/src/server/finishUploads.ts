import { findLeftoverFiles, FileList, parseRulesFile } from '@facetlayer/file-manifest';
import Fs from 'fs/promises';
import { FinishUploadsParams } from '../shared/rpc-types.ts';
import { getDatabase } from './Database.ts';
import { Stream } from '@facetlayer/streams';
import { getPathInDeploymentDir } from './deployDirs.ts';

export async function finishUploads(req: FinishUploadsParams): Promise<Stream<any>> {
    const { deployName } = req; 
    
    const deploymentRecord = getDatabase().get(`select * from deployment where deploy_name = ?`, [deployName]);
    
    // Load the manifest for this deployment
    const manifest = deploymentRecord.manifest_json ? JSON.parse(deploymentRecord.manifest_json) : null;
    if (!manifest) {
        throw new Error(`Manifest not found for deployment: ${deployName}`);
    }
    
    // Load the source config to get ignore-destination rules
    const sourceConfig = deploymentRecord.source_config_file;
    const deployDir = getPathInDeploymentDir(deployName, '');
    
    // Create a list of incoming file
    const incomingFiles = new FileList();
    for (const file of manifest) {
        incomingFiles.insert({
            relPath: file.relPath,
            sourcePath: file.sourcePath || getPathInDeploymentDir(deployName, file.relPath),
        });
    }
    
    // Find leftover files in the deploy directory
    const parsedRules = parseRulesFile(sourceConfig);
    const leftovers = await findLeftoverFiles(deployDir, incomingFiles, parsedRules);
    
    // Delete the leftover files
    const leftoverList = leftovers.listAll();
    if (leftoverList.length > 0) {
        for (const file of leftoverList) {
            console.log(`  Deleting: ${file.relPath}`);
            try {
                await Fs.unlink(file.sourcePath);
            } catch (error) {
                console.warn(`Failed to delete ${file.relPath}:`, error.message);
            }
        }
    }
    
    const result = new Stream();
    result.done();
    return result;
}