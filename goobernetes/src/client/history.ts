import { setupClient } from './clientSetup.ts';

export interface HistoryOptions {
    configFilename: string;
    overrideDest?: string;
    limit?: number;
}

export async function history(options: HistoryOptions): Promise<void> {
    const { client, projectName } = await setupClient({
        configFilename: options.configFilename,
        overrideDest: options.overrideDest,
    });

    const limit = options.limit ?? 10;
    const result = await client.listDeployments({ projectName, limit });

    if (result.deployments.length === 0) {
        console.log(`No deployments found for project '${projectName}'.`);
        return;
    }

    const activeDeployName = result.activeDeployName;

    console.log(`\nDeployment history for project '${projectName}':\n`);

    if (activeDeployName) {
        console.log(`  Active deployment: ${activeDeployName}\n`);
    } else {
        console.log(`  No active deployment.\n`);
    }

    result.deployments.forEach((d) => {
        const activeMarker = d.is_active ? ' <- active' : '';
        console.log(`  ${d.deploy_name}  [${d.created_at}]${activeMarker}`);
    });

    console.log('');
}
