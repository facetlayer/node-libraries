import { setupClient } from './clientSetup.ts';
import readline from 'readline';

export interface RollbackOptions {
    configFilename: string;
    deployName?: string;
    overrideDest?: string;
    limit?: number;
}

export async function rollback(options: RollbackOptions): Promise<void> {
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

    let targetDeployName: string;

    if (options.deployName) {
        // Verify the named deployment exists in the list (or at all)
        const found = result.deployments.find(d => d.deploy_name === options.deployName);
        if (!found) {
            console.error(`Deployment '${options.deployName}' not found in the recent history for project '${projectName}'.`);
            console.error(`Use 'goob rollback <config-file>' (without a deploy name) to see available deployments.`);
            process.exit(1);
        }
        targetDeployName = options.deployName;
    } else {
        // Show list and prompt user to pick
        console.log(`\nRecent deployments for project '${projectName}':\n`);

        result.deployments.forEach((d, i) => {
            const activeMarker = d.is_active ? ' (active)' : '';
            console.log(`  ${i + 1}. ${d.deploy_name}  [${d.created_at}]${activeMarker}`);
        });

        console.log('');
        const answer = await promptUser('Enter deployment number to roll back to (or press Enter to cancel): ');

        if (!answer || answer.trim() === '') {
            console.log('Rollback cancelled.');
            return;
        }

        const index = parseInt(answer.trim(), 10) - 1;
        if (isNaN(index) || index < 0 || index >= result.deployments.length) {
            console.error(`Invalid selection: '${answer.trim()}'. Please enter a number between 1 and ${result.deployments.length}.`);
            process.exit(1);
        }

        targetDeployName = result.deployments[index].deploy_name;
    }

    const chosen = result.deployments.find(d => d.deploy_name === targetDeployName);
    if (chosen?.is_active) {
        console.log(`Deployment '${targetDeployName}' is already the active deployment. Nothing to do.`);
        return;
    }

    console.log(`\nRolling back project '${projectName}' to deployment: ${targetDeployName}`);
    await client.rollback({ projectName, deployName: targetDeployName });
    console.log(`Rollback complete. Active deployment is now: ${targetDeployName}`);
}

function promptUser(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer);
        });
    });
}
