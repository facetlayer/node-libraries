import { Stream } from "@facetlayer/streams";
import { getDatabase, getDeploymentsDir } from "./Database.ts";
import { pm2start, pm2delete, pm2restart, findPm2Process } from "./pm2.ts";
import { parseFile } from "@facetlayer/qc";
import Path from 'path';
import { runShellCommand } from "@facetlayer/subprocess";

interface Pm2StartAction {
    name: string;
    command: string;
}

type AfterDeployAction =
    | { type: 'shell'; shell: string }
    | { type: 'pm2-start'; pm2: Pm2StartAction };

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
        const afterDeployActions: AfterDeployAction[] = [];

        for (const config of configs) {
            switch (config.command) {
                case 'deploy-settings':
                    projectName = config.getStringValue('project-name');
                    break;
                case 'after-deploy':
                    if (config.hasAttr('shell')) {
                        const shell = config.getAttr('shell').toOriginalString();
                        if (shell) {
                            afterDeployActions.push({ type: 'shell', shell });
                        }
                    }

                    if (config.hasAttr('pm2-start')) {
                        const name = config.getStringValue('name');
                        const command = config.getAttr('command').toOriginalString();

                        if (name && command) {
                            afterDeployActions.push({ type: 'pm2-start', pm2: { name, command } });
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
                await executeShellCommand(action.shell, deployDir, 'after-deploy');
            } else if (action.type === 'pm2-start') {
                const { name, command } = action.pm2;
                
                // Check if there's an existing pm2 process with this name
                const existingProcess = await findPm2Process(name);
                
                if (!existingProcess) {
                    // Create new process
                    console.log(`Creating new pm2 process: ${name}`);
                    await pm2start({
                        deployName: name,
                        deployDir,
                        startCommand: command,
                        env: {
                            ...process.env,
                            PORT: projectRecord.assigned_port + '',
                        },
                    });
                } else {
                    // Process exists, check if command is the same
                    const existingCommand = existingProcess.pm2_env?.exec_command || '';
                    
                    if (existingCommand !== command) {
                        // Command is different, delete and recreate
                        console.log(`Command changed for ${name}, recreating process`);
                        await pm2delete({ deployName: name });
                        await pm2start({
                            deployName: name,
                            deployDir,
                            startCommand: command,
                            env: {
                                ...process.env,
                                PORT: projectRecord.assigned_port + '',
                            },
                        });
                    } else {
                        // Command is the same, just restart
                        console.log(`Restarting existing pm2 process: ${name}`);
                        await pm2restart({ deployName: name });
                    }
                }
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