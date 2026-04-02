import { getSourceManifest } from '@facetlayer/file-manifest';
import { resolveFileList } from '@facetlayer/file-manifest';
import { setupClient } from './clientSetup.ts';

export interface PreviewDeployOptions {
    configFilename: string;
    overrideDest?: string;
}

export async function previewDeploy(options: PreviewDeployOptions) {
    const { projectName, destUrl, localDir, configText, client } = await setupClient(options);

    console.log(`Project: ${projectName}`);
    console.log(`Destination: ${destUrl}`);
    console.log('');

    // Compute local manifest
    const sources = await resolveFileList(localDir, configText);
    const sourcesManifest = await getSourceManifest(sources);
    const manifestList = sourcesManifest.listAll().map(item => ({
        relPath: item.relPath,
        sha: item.sha,
    }));

    const result = await client.previewDeployment({
        projectName,
        sourceFileManifest: manifestList,
        sourceFileConfig: configText,
    });

    // Display results
    if (result.filesToUpload.length === 0 && result.filesToDelete.length === 0) {
        console.log('No drift detected. Server is up to date.');
        return;
    }

    if (result.filesToUpload.length > 0) {
        console.log(`Files to upload (${result.filesToUpload.length}):`);
        for (const file of result.filesToUpload) {
            console.log(`  + ${file.relPath}`);
        }
        console.log('');
    }

    if (result.filesToDelete.length > 0) {
        console.log(`Server files to be deleted (${result.filesToDelete.length}):`);
        for (const file of result.filesToDelete) {
            console.log(`  - ${file}`);
        }
        console.log('');
    }

    console.log(`Summary: ${result.filesToUpload.length} to upload, ${result.filesToDelete.length} to delete`);
}
