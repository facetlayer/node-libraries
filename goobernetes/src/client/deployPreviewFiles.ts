import { getFileListFromConfig } from './fileList.ts';

export interface PreviewDeployOptions {
    configFilename: string;
}

export async function previewDeploy(options: PreviewDeployOptions) {
    const { configFilename } = options;

    const result = await getFileListFromConfig({ configFilename });

    console.log(`Project: ${result.projectName}`);
    console.log(`Destination: ${result.destUrl}`);
    console.log(`Local directory: ${result.localDir}`);
    console.log(`Files to upload (${result.files.length}):`);
    console.log('');

    for (const file of result.files) {
        console.log(`  ${file}`);
    }
}