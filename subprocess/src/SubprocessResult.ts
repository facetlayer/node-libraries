import type { Subprocess } from "./Subprocess"

export class SubprocessResult {
    exitCode: number | null
    stdout?: string[]
    stderr?: string[]
    subprocess: Subprocess

    failed() {
        // Process failed if exitCode is null (process didn't complete normally) or non-zero
        return this.exitCode === null || this.exitCode !== 0;
    }

    asError() {
        if (!this.failed())
            throw new Error("SubprocessResult usage error: asError called but failed() = false");
        
        let commandDescription = 'Subprocess';
        
        if (this.subprocess?.command) {
            commandDescription += ` "${this.subprocess.command.join(' ')}"`;
        }

        const stderrLines = this.stderr ?? [];

        if (stderrLines.length > 0) {
            return new Error(`${commandDescription} failed with stderr: ${stderrLines.join(' ')}`);
        }

        return new Error(`${commandDescription} failed with exit code: ${this.exitCode ?? 'unknown'}`);
    }

    stdoutAsString() {
        if (!this.stdout) {
            throw new Error('SubprocessResult usage error: stdout not captured; enable output buffering to access it');
        }
        return this.stdout.join('\n');
    }

    stderrAsString() {
        if (!this.stderr) {
            throw new Error('SubprocessResult usage error: stderr not captured; enable output buffering to access it');
        }
        return this.stderr.join('\n');
    }
}
