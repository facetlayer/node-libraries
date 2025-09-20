
import { SpawnOptions as NodeSpawnOptions } from 'child_process';
import { Subprocess } from './Subprocess'
import { SubprocessResult } from './SubprocessResult';

export interface StartShellCommandOptions extends NodeSpawnOptions {
    enableOutputBuffering?: boolean
    onStdout?: (line: string) => void;
    onStderr?: (line: string) => void;
};

// getNodeSpawnOptions - Filters the options object to only include objects
// that are used by node:child_process
function getNodeSpawnOptions(options: StartShellCommandOptions): NodeSpawnOptions {
    const filteredOptions = { ...options };
    delete filteredOptions.enableOutputBuffering;
    delete filteredOptions.onStdout;
    delete filteredOptions.onStderr;
    return filteredOptions;
}

export function startShellCommand(command: string, args: string[] = [], options: StartShellCommandOptions = {}): Subprocess {
    const subprocess = new Subprocess({
        enableOutputBuffering: options.enableOutputBuffering
    });

    if (!command) {
        throw new Error('startShellCommand usage error: command cannot be empty');
    }
    
    if (options.onStdout) {
        subprocess.onStdout(options.onStdout);
    }

    if (options.onStderr) {
        subprocess.onStderr(options.onStderr);
    }

    subprocess.spawn(command, args, getNodeSpawnOptions(options));

    return subprocess;
}

/*
 runShellCommand

    Runs a shell command in a subprocess, with lots of convenience options.
*/
export async function runShellCommand(command: string, args: string[] = [], options: StartShellCommandOptions = {}) {

    const subprocess = startShellCommand(command, args, options);

    await subprocess.waitForExit();

    // Enable output buffering by default, turn it off if the options have enableOutputBuffering=false.
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
