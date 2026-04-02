import { getFileListFromConfig, FileListResult } from './fileList.ts';
import { GooberneteRPCClient } from './rpc-client.ts';

export interface ClientSetupOptions {
    configFilename: string;
    overrideDest?: string;
}

export interface ClientSetupResult extends FileListResult {
    client: GooberneteRPCClient;
}

export async function setupClient(options: ClientSetupOptions): Promise<ClientSetupResult> {
    const fileListResult = await getFileListFromConfig({ configFilename: options.configFilename });
    let { destUrl } = fileListResult;

    if (options.overrideDest) {
        destUrl = options.overrideDest;
    }

    const client = new GooberneteRPCClient(destUrl);

    const apiKey = process.env.GOOBERNETES_API_KEY;
    if (apiKey) {
        client.setApiKey(apiKey);
    } else {
        console.warn('No API key found in GOOBERNETES_API_KEY environment variable');
    }

    return {
        ...fileListResult,
        destUrl,
        client,
    };
}
