import { Stream, captureError } from '@facetlayer/streams'
import { spawn as nodeSpawn, SpawnOptions } from 'child_process'
import { unixPipeToLines } from '@facetlayer/parse-stdout-lines'

export type ProcessEvent = StdoutEvent | StdoutClosedEvent | StderrEvent | SpawnEvent | SpawnErrorEvent | ExitEvent;

export enum ProcessEventType {
    stdout = 1,
    stderr,
    spawn,
    spawn_error,
    stdout_closed,
    exit
}

export interface StdoutEvent {
    type: ProcessEventType.stdout
    line: string
}

export interface StdoutClosedEvent {
    type: ProcessEventType.stdout_closed
}

export interface StderrEvent {
    type: ProcessEventType.stderr
    line: string
}

export interface SpawnEvent {
    type: ProcessEventType.spawn
}

export interface SpawnErrorEvent {
    type: ProcessEventType.spawn_error
    error: Error
}

export interface ExitEvent {
    type: ProcessEventType.exit
    code: number
}

export interface SpawnOutput {
    output: Stream<ProcessEvent>
    proc: any
}

const VerboseLog = false;

function verboseLog(...args: any[]) {
    if (VerboseLog) {
        console.log('[spawnProcess]', ...args);
    }
}

/*
  Launch a subprocess and return a single stream of events for all the process's activity.
*/
export function spawnProcess(command: string, args: string[] = [], options: SpawnOptions = {}): SpawnOutput {

    verboseLog(`spawning: ${command}`, args);

    if (!command) {
        throw new Error('spawnProcess usage error: command cannot be empty');
    }

    const output = new Stream<ProcessEvent>();

    const proc = nodeSpawn(command, args, options);

    unixPipeToLines(proc.stdout, line => {
        verboseLog(`got stdout data: ${line}`);

        if (output.isClosed())
            return;

        if (line === null) {
            output.item({
                type: ProcessEventType.stdout_closed
            });
            return;
        }

        output.item({
            type: ProcessEventType.stdout,
            line
        })
    });

    unixPipeToLines(proc.stderr, line => {
        verboseLog(`got stderr data: ${line}`);
        if (output.isClosed())
            return;

        if (line === null) {
            return;
        }

        output.item({
            type: ProcessEventType.stderr,
            line
        })
    });

    proc.on('spawn', () => {
        verboseLog(`on spawn`);
        if (output.isClosed())
            return;
        output.item({
            type: ProcessEventType.spawn
        });
    });

    proc.on('error', err => {
        verboseLog(`on error`, err.message);

        if (output.isClosed())
            return;

        output.logError({errorMessage: err.message, errorType: 'child_process_error', cause: captureError(err)});

        output.item({
            type: ProcessEventType.spawn_error,
            error: err
        });
    });

    proc.on('close', code => {
        verboseLog(`on close`, code);

        if (output.isClosed())
            return;

        output.item({
            type: ProcessEventType.exit,
            code
        });
        output.done();
    });

    return { output, proc }
}
