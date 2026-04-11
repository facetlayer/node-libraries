import { Stream } from "@facetlayer/streams";
import { getDatabase, getDeploymentsDir } from "./Database.ts";
import { parseFile } from "@facetlayer/qc";
import Path from 'path';
import Fs from 'fs/promises';
import { runShellCommand } from "@facetlayer/subprocess";
import { getSafePathInDir } from "./deployDirs.ts";

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
        const deploymentRecord = getDatabase().get(`select * from deployment where deploy_name = ?`, [deployName]);
        const deployDir = Path.join(getDeploymentsDir(), deploymentRecord.deploy_dir);
        const configs = parseFile(deploymentRecord.source_config_file);

        let projectName: string;
        let candleConfigPath: string | undefined;

        type AfterDeployAction =
            | { type: 'shell'; command: string }
            | { type: 'candle-restart'; serviceName: string };

        const afterDeployActions: AfterDeployAction[] = [];

        for (const config of configs) {
            switch (config.command) {
                case 'deploy-settings':
                    projectName = config.getStringValue('project-name');
                    if (config.hasAttr('candle-config')) {
                        candleConfigPath = config.getStringValue('candle-config');
                    }
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

        const projectRecord = getDatabase().get(`select * from project where project_name = ?`, [projectName]);

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

        if (candleConfigPath) {
            const sourceFile = getSafePathInDir(deployDir, candleConfigPath);
            const destFile = Path.join(deployDir, '.candle.json');

            try {
                await Fs.access(sourceFile);
            } catch {
                throw new Error(
                    `candle-config file not found in deployment: ${candleConfigPath}. ` +
                    `Make sure this file is included in the deploy.`
                );
            }

            console.log(`Installing candle config: ${candleConfigPath} -> .candle.json`);
            await Fs.copyFile(sourceFile, destFile);

            // Restart any running services defined in the candle config, then
            // start any that aren't running yet.
            await executeShellCommand('candle restart', deployDir, 'candle-config:restart');
            await executeShellCommand('candle check-start', deployDir, 'candle-config:check-start');
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
