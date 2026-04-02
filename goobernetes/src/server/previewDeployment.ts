import Path from 'path';
import { getFileHash, findLeftoverFiles, FileList, parseRulesFile } from '@facetlayer/file-manifest';
import { PreviewDeploymentParams, PreviewDeploymentResult, FileEntry } from '../shared/rpc-types.ts';
import { getActiveDeploymentDir } from './deployDirs.ts';

export async function previewDeployment(params: PreviewDeploymentParams): Promise<PreviewDeploymentResult> {
    const { projectName, sourceFileManifest, sourceFileConfig } = params;

    const deployDir = getActiveDeploymentDir(projectName);

    if (!deployDir) {
        // No active deployment - all files are new, nothing to delete
        return {
            filesToUpload: sourceFileManifest,
            filesToDelete: [],
        };
    }

    // Check which files need uploading (changed or new)
    const filesToUpload: FileEntry[] = [];
    for (const file of sourceFileManifest) {
        const targetPath = Path.join(deployDir, file.relPath);
        const existingSha = await getFileHash(targetPath);
        if (existingSha !== file.sha) {
            filesToUpload.push(file);
        }
    }

    // Check which server files would be deleted
    const incomingFiles = new FileList();
    for (const file of sourceFileManifest) {
        incomingFiles.insert({
            relPath: file.relPath,
            sourcePath: Path.join(deployDir, file.relPath),
        });
    }

    const parsedRules = parseRulesFile(sourceFileConfig);
    const leftovers = await findLeftoverFiles(deployDir, incomingFiles, parsedRules);
    const leftoverList = leftovers.listAll();

    return {
        filesToUpload,
        filesToDelete: leftoverList.map(f => f.relPath),
    };
}
