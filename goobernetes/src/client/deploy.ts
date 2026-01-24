import Fs from 'fs/promises';
import Path from 'path';
import { getSourceManifest } from "@facetlayer/file-manifest";
import { Query, parseFile } from '@facetlayer/qc';
import { resolveFileList } from '@facetlayer/file-manifest';
import { Limiter } from '@facetlayer/concurrency-limit';
import { runShellCommand } from '@facetlayer/subprocess';
import { getFileListFromConfig } from './fileList.ts';
import { RunningTimer } from '../utils/RunningTimer.ts';
import { GooberneteRPCClient } from './rpc-client.ts';

const MaxRequestSizeBytes = 80 * 1024;

const GOOBERNETES_API_KEY = process.env.GOOBERNETES_API_KEY;

export interface DeployOptions {
    configFilename: string;
    overrideDest?: string;
}

async function uploadFile(client: GooberneteRPCClient, deployName: string, relPath: string, content: Buffer) {
    const base64 = content.toString('base64');

    if (base64.length < MaxRequestSizeBytes) {
        // Send the file in a single request.
        await client.uploadOneFile({
            deployName,
            relPath,
            contentBase64: base64,
        });
        return;
    } 

    // Break the file into chunks.
    await client.startMultiPartUpload({
        deployName,
        relPath,
    });

    const singleChunkSize = Math.floor(MaxRequestSizeBytes / 2);
    for (let startAt = 0; startAt < content.length; startAt += singleChunkSize) {
        const chunk = content.slice(startAt, startAt + singleChunkSize);
        await client.uploadFilePart({
            deployName,
            relPath,
            chunkStartsAt: startAt,
            chunkBase64: chunk.toString('base64'),
        });
    }

    await client.finishMultiPartUpload({
        deployName,
        relPath,
    });

    console.log('Finished uploading file:', relPath);
}

export async function deploy(options: DeployOptions) {
    const timer = new RunningTimer();
    const { configFilename, overrideDest } = options;

    const configText = await Fs.readFile(configFilename, 'utf-8');
    const configs = parseFile(configText) as Query[];

    // Get file list and basic config
    const fileListResult = await getFileListFromConfig({ configFilename });
    let { projectName, destUrl, localDir } = fileListResult;
    console.log('Project name:', projectName);
    console.log('Destination URL:', destUrl);

    // Override destination URL if provided via command line
    if (overrideDest) {
        destUrl = overrideDest;
        console.log('Using overridden destination URL:', destUrl);
    }

    // Execute before-deploy shell commands
    for (const query of configs) {
        if (query.command === 'before-deploy') {
            const shell = query.getAttr('shell').toOriginalString();
            if (shell) {
                console.log('Running before-deploy command:', shell);
                const result = await runShellCommand(shell, [], {
                    cwd: localDir,
                    shell: true,
                });

                if (result.exitCode !== 0) {
                    console.error('before-deploy command failed with exit code:', result.exitCode);
                    console.error('Stderr:', result.stderr);
                    process.exit(1);
                }
            }
        }
    }

    const sources = await resolveFileList(localDir, configText);
    const sourcesManifest = await getSourceManifest(sources);
    const manifestList = sourcesManifest.listAll().map(item => ({
        relPath: item.relPath,
        sha: item.sha,
    }));
    console.log(`Resolved source file manifest (${timer.checkElapsedSecs()}s)`);

    // Set up client
    const client = new GooberneteRPCClient(destUrl);
    console.log('Creating deployment on server at:', destUrl);

    if (GOOBERNETES_API_KEY) {
        console.log('Using API key from: GOOBERNETES_API_KEY');
        client.setApiKey(GOOBERNETES_API_KEY);
    } else {
        console.warn('No API key found in GOOBERNETES_API_KEY environment variable');
    }

    // Create deployment entry
    const { deployName } = await client.createDeployment({
        projectName,
        sourceFileManifest: manifestList,
        sourceFileConfig: configText,
    });
    
    console.log('Deployment created with name:', deployName);

    const uploadConcurrency = new Limiter({
        maxConcurrent: 50,
    });

    const neededFiles = await client.getNeededFiles({
        deployName,
    });

    console.log('Server has requested', neededFiles.length, 'files to be uploaded');

    for (const fileEntry of neededFiles) {
        await uploadConcurrency.start(async () => {
            try {
                console.log('Uploading file:', fileEntry.relPath);
                const sourceFile = sources.getByRelPath(fileEntry.relPath);
                if (!sourceFile) {
                    console.error(`Couldn't find a requested relPath`, fileEntry.relPath);
                    return;
                }

                const localPath = Path.join(localDir, fileEntry.relPath);
                const fileContent = await Fs.readFile(localPath);
                await uploadFile(client, deployName, fileEntry.relPath, fileContent);

            } catch (e) {
                console.error('Error uploading file:', fileEntry.relPath, e);
            }
        });
    }

    await uploadConcurrency.allSettled();
    console.log(`Finished uploading files (${timer.checkElapsedSecs()}s)`);

    await client.finishUploads({
        deployName,
    });

    const verifyResponse = await client.verifyDeployment({
        deployName,
    });

    if (verifyResponse.status === 'error') {
        console.error('Deployment verification failed:', verifyResponse.error);
        process.exit(1);
    }

    console.log(`Deployment is verified (${timer.checkElapsedSecs()}s)`);

    await client.activateDeployment({
        deployName,
    });

    console.log(`Deployment is active (${timer.checkElapsedSecs()}s)`);
}

