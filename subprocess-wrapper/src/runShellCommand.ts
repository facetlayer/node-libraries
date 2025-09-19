
import { SpawnOptions } from 'child_process';
import { Subprocess } from './Subprocess'
import { SubprocessResult } from './SubprocessResult';

export interface StartShellCommandOptions {
    spawnOptions?: SpawnOptions
    enableOutputBuffering?: boolean
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
    pipePrefix?: string | boolean;
}

export function startShellCommand(command: string, args: string[] = [], options: StartShellCommandOptions = {}): Subprocess {
    const subprocess = new Subprocess({
        enableOutputBuffering: options.enableOutputBuffering
    });

    if (!command) {
        throw new Error('startShellCommand usage error: command cannot be empty');
    }

    if (options.pipePrefix) {
        let prefix = `[${options.pipePrefix}]`;

        if (options.pipePrefix === true) {
            const displayCommand = [command, ...args].join(' ').trim() || command;
            prefix = `[${displayCommand}]`;
        }

        subprocess.onStdout(line => {
            console.log(`${prefix} ${line}`);
        });
        subprocess.onStderr(line => {
            console.error(`${prefix} [stderr] ${line}`);
        });
    }
    
    if (options.onStdout) {
        subprocess.onStdout(options.onStdout);
    }

    if (options.onStderr) {
        subprocess.onStderr(options.onStderr);
    }

    subprocess.start(command, args, options.spawnOptions);

    return subprocess;
}

/*
 runShellCommand

    Runs a shell command in a subprocess, with lots of convenience options.
*/
export async function runShellCommand(command: string, args: string[] = [], options: StartShellCommandOptions = {}) {

    const subprocess = startShellCommand(command, args, options);

    await subprocess.waitForExit();

    const bufferingEnabled = subprocess.setupOptions.enableOutputBuffering !== false;

    const result = new SubprocessResult();
    result.exitCode = subprocess.proc.exitCode; // This can be null if process was killed or didn't exit normally
    result.subprocess = subprocess;

    if (bufferingEnabled) {
        result.stdout = subprocess.getStdout();
        result.stderr = subprocess.getStderr();
    }

    return result;
}
