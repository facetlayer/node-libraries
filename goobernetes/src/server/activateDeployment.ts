import { Stream } from "@facetlayer/streams";
import { getDatabase, getDeploymentsDir } from "./Database.ts";
import { parseFile } from "@facetlayer/qc";
import Path from 'path';
import { runShellCommand } from "@facetlayer/subprocess";

async function executeShellCommand(command: string, workingDir: string, hookType: string) {
    console.log(`Running ${hookType} command (cwd: ${workingDir}):`, command);
    const result = await runShellCommand(command, [], {
        cwd: workingDir,
        shell: true,
        onStdout: (data) => {
            console.log(`[${hookType}] `, data);
        },
        onStderr: (data) => {
            console.error(`[${hookType}] `, data);
        },
    });

    if (result.exitCode !== 0) {
        throw new Error(`${hookType} command failed with exit code: ${result.exitCode}`);
    }
}

export function activateDeployment({ deployName }: { deployName: string }): Stream {
    const output = new Stream();

    (async () => {
        const deploymentRecord = getDatabase().get(`select * from deployment where deploy_name = '${deployName}'`);
        const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
        const configs = parseFile(deploymentRecord.source_config_file);

        let projectName: string;

        type AfterDeployAction =
            | { type: 'shell'; command: string }
            | { type: 'candle-restart'; serviceName: string };

        const afterDeployActions: AfterDeployAction[] = [];

        for (const config of configs) {
            switch (config.command) {
                case 'deploy-settings':
                    projectName = config.getStringValue('project-name');
                    break;
                case 'after-deploy':
                    for (const tag of config.tags) {
                        if (tag.attr === 'shell') {
                            const shell = tag.toOriginalString();
                            if (shell) {
                                afterDeployActions.push({ type: 'shell', command: shell });
                            }
                        } else if (tag.attr === 'candle-restart') {
                            const serviceName = tag.toOriginalString();
                            if (serviceName) {
                                afterDeployActions.push({ type: 'candle-restart', serviceName });
                            }
                        }
                    }
                    break;
            }
        }

        const projectRecord = getDatabase().get(`select * from project where project_name = '${projectName}'`);

        if (!projectRecord) {
            throw new Error(`No record found for project ${projectName}`);
        }

        for (const action of afterDeployActions) {
            if (action.type === 'shell') {
                await executeShellCommand(action.command, deployDir, 'after-deploy');
            } else if (action.type === 'candle-restart') {
                await executeShellCommand(`candle restart ${action.serviceName}`, deployDir, 'after-deploy:candle-restart');
            }
        }

        getDatabase().upsert('active_deployment', {
            project_name: deploymentRecord.project_name,
        }, {
            project_name: deploymentRecord.project_name,
            deploy_name: deployName,
            updated_at: new Date().toISOString(),
        });

        console.log('Successfully activated deployment:', deployName);

        output.done();
    })()
    .catch(e => {
        output.fail(e);
    });

    return output;
}
