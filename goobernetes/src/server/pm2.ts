
import { runShellCommand, startShellCommand } from "@facetlayer/subprocess";

export async function pm2list() {
    try {
        const jlistResult = await runShellCommand('pm2 jlist', [], {
            shell: true,
        });
        let pm2list = JSON.parse(jlistResult.stdoutAsString());
        return pm2list;
    } catch (e) {
        console.error(`Unexpected error with 'pm2 jlist':`, e);
        throw e;
    }
}

interface Pm2StartOptions {
    deployName: string;
    deployDir: string;
    startCommand: string;
    env: Record<string, string>;
}

export async function pm2start({ deployName, deployDir, startCommand, env }: Pm2StartOptions) {
    const cmd = `pm2 start --name ${deployName} "${startCommand}"`;
    console.log('Starting project in pm2 with command: ', cmd);

    await runShellCommand(cmd, [], {
        cwd: deployDir,
        env,
        shell: true,
        onStdout: (data) => {
            console.log('[pm2 start] ', data);
        },
        onStderr: (data) => {
            console.error('[pm2 start] ', data);
        },
    });
}

export async function pm2delete({ deployName }: { deployName: string }) {
    const cmd = `pm2 delete ${deployName}`;
    await runShellCommand(cmd, [], {
        shell: true,
        onStdout: (data) => {
            console.log('[pm2 delete] ', data);
        },
        onStderr: (data) => {
            console.error('[pm2 delete] ', data);
        },
    });
}

export async function pm2restart({ deployName }: { deployName: string }) {
    const cmd = `pm2 restart ${deployName}`;
    console.log('Restarting pm2 process:', deployName);

    await runShellCommand(cmd, [], {
        shell: true,
        onStdout: (data) => {
            console.log('[pm2 restart] ', data);
        },
        onStderr: (data) => {
            console.error('[pm2 restart] ', data);
        },
    });
}

export async function findPm2Process(processName: string): Promise<{ name: string, pm2_env?: { exec_command?: string } } | null> {
    const processList = await pm2list();
    const process = processList.find((p: any) => p.name === processName);
    return process || null;
}
