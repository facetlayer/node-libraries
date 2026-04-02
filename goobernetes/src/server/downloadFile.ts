import Fs from 'fs/promises';
import { DownloadFileParams, DownloadFileResult } from '../shared/rpc-types.ts';
import { getActiveDeploymentDir, getSafePathInDir } from './deployDirs.ts';

export async function downloadFile(params: DownloadFileParams): Promise<DownloadFileResult> {
    const { projectName, relPath } = params;

    const deployDir = getActiveDeploymentDir(projectName);
    if (!deployDir) {
        throw new Error(`No active deployment found for project: ${projectName}`);
    }

    const fullPath = getSafePathInDir(deployDir, relPath);
    const content = await Fs.readFile(fullPath);
    return {
        contentBase64: content.toString('base64'),
        relPath,
    };
}
