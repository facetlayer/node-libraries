import { Stream } from "@facetlayer/streams";
import { getDatabase, getDeploymentsDir } from "./Database.ts";
import { parseFile } from "@facetlayer/qc";
import Path from 'path';
import Fs from 'fs/promises';
import { runShellCommand } from "@facetlayer/subprocess";
import { getSafePathInDir } from "./deployDirs.ts";

/**
 * Locate the candle binary without relying on PATH.
 *
 * Non-interactive SSH sessions often lack the user's full shell profile, so
 * `candle` may not be on PATH even when it's installed.  We check a list of
 * common install locations first and fall back to `which candle` as a last
 * resort.
 */
async function findCandleBinary(): Promise<string> {
    const candidatePaths = [
        '/usr/local/bin/candle',
        '/usr/bin/candle',
        '/root/.local/bin/candle',
        '/root/.npm-global/bin/candle',
    ];

    // Also check home directories under /home/*/.local/bin/candle
    try {
        const homeEntries = await Fs.readdir('/home');
        for (const entry of homeEntries) {
            candidatePaths.push(`/home/${entry}/.local/bin/candle`);
            candidatePaths.push(`/home/${entry}/.npm-global/bin/candle`);
        }
    } catch {
        // /home may not exist or be readable; ignore
    }

    for (const candidate of candidatePaths) {
        try {
            await Fs.access(candidate, Fs.constants.X_OK);
            return candidate;
        } catch {
            // Not found or not executable at this path; try next
        }
    }

    // Fall back to `which candle` using the shell's PATH
    try {
        const result = await runShellCommand('which candle', [], { shell: true });
        const whichOutput = result.stdout?.join('').trim();
        if (result.exitCode === 0 && whichOutput) {
            return whichOutput;
        }
    } catch {
        // which failed; fall through
    }

    // Last resort: just return 'candle' and let the shell resolve it
    return 'candle';
}

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

        // Upsert active_deployment BEFORE running after-deploy hooks so the
        // pointer always advances to the newest successful upload regardless
        // of hook outcomes.
        getDatabase().upsert('active_deployment', {
            project_name: deploymentRecord.project_name,
        }, {
            project_name: deploymentRecord.project_name,
            deploy_name: deployName,
            updated_at: new Date().toISOString(),
        });

        console.log('Successfully activated deployment:', deployName);

        const hookErrors: string[] = [];

        // Resolve the candle binary path once if any candle actions are needed
        const needsCandle = afterDeployActions.some(a => a.type === 'candle-restart') || !!candleConfigPath;
        const candleBin = needsCandle ? await findCandleBinary() : 'candle';

        for (const action of afterDeployActions) {
            try {
                if (action.type === 'shell') {
                    await executeShellCommand(action.command, deployDir, 'after-deploy');
                } else if (action.type === 'candle-restart') {
                    await executeShellCommand(`${candleBin} restart ${action.serviceName}`, deployDir, 'after-deploy:candle-restart');
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`after-deploy hook error: ${msg}`);
                hookErrors.push(msg);
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
            try {
                await executeShellCommand(`${candleBin} restart`, deployDir, 'candle-config:restart');
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`candle-config:restart hook error: ${msg}`);
                hookErrors.push(msg);
            }

            try {
                await executeShellCommand(`${candleBin} check-start`, deployDir, 'candle-config:check-start');
            } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error(`candle-config:check-start hook error: ${msg}`);
                hookErrors.push(msg);
            }
        }

        if (hookErrors.length > 0) {
            output.item({ type: 'warning', message: `Deployment is active, but some after-deploy hooks failed:\n${hookErrors.map(e => `  - ${e}`).join('\n')}` });
        }

        output.done();
    })()
    .catch(e => {
        output.fail(e);
    });

    return output;
}
