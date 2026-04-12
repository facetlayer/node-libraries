import { getSourceManifest } from '@facetlayer/file-manifest';
import { resolveFileList } from '@facetlayer/file-manifest';
import { Query, parseFile } from '@facetlayer/qc';
import { setupClient } from './clientSetup.ts';
import { ManifestBatchSize } from './constants.ts';

export interface PreviewDeployOptions {
    configFilename: string;
    overrideDest?: string;
}

type HookAction =
    | { type: 'shell'; command: string }
    | { type: 'candle-restart'; serviceName: string };

function parseHooks(configs: Query[], hookCommand: string): HookAction[] {
    const actions: HookAction[] = [];
    for (const query of configs) {
        if (query.command === hookCommand) {
            for (const tag of query.tags) {
                if (tag.attr === 'shell') {
                    const shell = tag.toOriginalString();
                    if (shell) {
                        actions.push({ type: 'shell', command: shell });
                    }
                } else if (tag.attr === 'candle-restart') {
                    const serviceName = tag.toOriginalString();
                    if (serviceName) {
                        actions.push({ type: 'candle-restart', serviceName });
                    }
                }
            }
        }
    }
    return actions;
}

function printHooks(label: string, actions: HookAction[]) {
    if (actions.length === 0) return;
    console.log(`${label} (${actions.length}):`);
    for (const action of actions) {
        if (action.type === 'shell') {
            console.log(`  $ ${action.command}`);
        } else if (action.type === 'candle-restart') {
            console.log(`  candle restart ${action.serviceName}`);
        }
    }
    console.log('');
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

    const useBatchedManifest = manifestList.length > ManifestBatchSize;

    let result;
    if (useBatchedManifest) {
        // For large manifests, create a temporary deployment to hold the manifest,
        // then preview using the deployment name.
        const { deployName } = await client.createDeployment({
            projectName,
            sourceFileManifest: [],
            sourceFileConfig: configText,
        });

        for (let i = 0; i < manifestList.length; i += ManifestBatchSize) {
            const batch = manifestList.slice(i, i + ManifestBatchSize);
            await client.addManifestFiles({ deployName, files: batch });
        }
        await client.finalizeManifest({ deployName });

        result = await client.previewByDeployName({ deployName });
    } else {
        result = await client.previewDeployment({
            projectName,
            sourceFileManifest: manifestList,
            sourceFileConfig: configText,
        });
    }

    // Parse lifecycle hooks from config
    const configs = parseFile(configText) as Query[];
    const beforeDeployActions = parseHooks(configs, 'before-deploy');
    const afterDeployActions = parseHooks(configs, 'after-deploy');

    // Display results
    if (result.filesToUpload.length === 0 && result.filesToDelete.length === 0) {
        console.log('No drift detected. Server is up to date.');
    } else {
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
        console.log('');
    }

    printHooks('Before-deploy hooks', beforeDeployActions);
    printHooks('After-deploy hooks', afterDeployActions);
}
