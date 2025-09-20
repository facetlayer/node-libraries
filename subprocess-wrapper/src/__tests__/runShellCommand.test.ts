import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runShellCommand, startShellCommand } from '../runShellCommand';
import path from 'path';

const fixturesDir = path.join(__dirname, 'fixtures');

describe('runShellCommand', () => {
    describe('basic functionality', () => {
        it('should run a simple command and return result', async () => {
            const helloScript = path.join(fixturesDir, 'hello.js');
            
            const result = await runShellCommand('node', [helloScript]);
            
            expect(result.exitCode).toBe(0);
            expect(result.failed()).toBe(false);
            expect(result.stdout).toContain('Hello, World!');
            expect(result.stderr).toEqual([]);
        });

        it('should handle commands with arguments', async () => {
            const argsScript = path.join(fixturesDir, 'echo-args.js');
            
            const result = await runShellCommand('node', [argsScript, 'test', 'args']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdoutAsString()).toContain('Args received: test args');
        });

        it('should capture stderr output', async () => {
            const stderrScript = path.join(fixturesDir, 'stderr-test.js');
            
            const result = await runShellCommand('node', [stderrScript]);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdoutAsString()).toContain('This is stdout');
            expect(result.stderrAsString()).toContain('This is stderr');
        });

        it('should handle non-zero exit codes', async () => {
            const exitCodeScript = path.join(fixturesDir, 'exit-code.js');
            
            const result = await runShellCommand('node', [exitCodeScript, '5']);
            
            expect(result.exitCode).toBe(5);
            expect(result.failed()).toBe(true);
            expect(result.stdoutAsString()).toContain('Exiting with code: 5');
        });

        it('should run commands with arguments', async () => {
            const result = await runShellCommand('echo', ['Hello from string command']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdout).toContain('Hello from string command');
        });

        it('should handle arguments containing spaces', async () => {
            const result = await runShellCommand('echo', ['hello world with spaces']);
            
            expect(result.exitCode).toBe(0);
            expect(result.stdoutAsString()).toContain('hello world with spaces');
        });

        it('should handle command line flags with quoted values', async () => {
            const argsScript = path.join(fixturesDir, 'echo-args.js');
            const result = await runShellCommand('node', [argsScript, '--name=John Doe', '--age=30']);

            expect(result.exitCode).toBe(0);
            expect(result.stdoutAsString()).toContain('Args received: --name=John Doe --age=30');
        });

        it('should resolve when output buffering is disabled', async () => {
            const helloScript = path.join(fixturesDir, 'hello.js');

            const result = await runShellCommand('node', [helloScript], {
                enableOutputBuffering: false
            });

            expect(result.exitCode).toBe(0);
            expect(result.stdout).toBeUndefined();
            expect(result.stderr).toBeUndefined();
        });
    });

    describe('options handling', () => {
        it('should handle enableOutputBuffering option', async () => {
            const helloScript = path.join(fixturesDir, 'hello.js');
            
            const result = await runShellCommand('node', [helloScript], {
                enableOutputBuffering: true
            });
            
            expect(result.stdout).toContain('Hello, World!');
        });

        it('should handle cwd and env options', async () => {
            const helloScript = path.join(fixturesDir, 'hello.js');
            
            const result = await runShellCommand('node', [helloScript], {
                cwd: process.cwd(),
                env: { ...process.env, TEST_VAR: 'test' }
            });
            
            expect(result.exitCode).toBe(0);
        });
    });

    describe('callback options', () => {
        it('should call onStdout callback', async () => {
            const multilineScript = path.join(fixturesDir, 'multiline-output.js');
            const stdoutLines: string[] = [];
            
            const result = await runShellCommand('node', [multilineScript], {
                onStdout: (line) => {
                    stdoutLines.push(line);
                }
            });
            
            expect(result.exitCode).toBe(0);
            expect(stdoutLines).toContain('First line');
            expect(stdoutLines).toContain('Second line');
            expect(stdoutLines).toContain('Third line with spaces');
        });

        it('should call onStderr callback', async () => {
            const multilineScript = path.join(fixturesDir, 'multiline-output.js');
            const stderrLines: string[] = [];
            
            const result = await runShellCommand('node', [multilineScript], {
                onStderr: (line) => {
                    stderrLines.push(line);
                }
            });
            
            expect(result.exitCode).toBe(0);
            expect(stderrLines).toContain('Error line 1');
            expect(stderrLines).toContain('Error line 2');
        });
    });

    describe('error scenarios', () => {
        it('should handle process that fails to start', async () => {
            const result = await runShellCommand('nonexistent-command');
            
            expect(result.failed()).toBe(true);
            expect(result.exitCode).not.toBe(0);
        });

        it('should provide proper error information in result', async () => {
            const exitCodeScript = path.join(fixturesDir, 'exit-code.js');
            
            const result = await runShellCommand('node', [exitCodeScript, '1']);
            
            expect(result.failed()).toBe(true);
            expect(result.asError()).toBeInstanceOf(Error);
            expect(result.asError().message).toContain('failed with exit code: 1');
        });

        it('should include command details in failure error messages', async () => {
            const exitCodeScript = path.join(fixturesDir, 'exit-code.js');

            const result = await runShellCommand('node', [exitCodeScript, '2']);

            expect(result.failed()).toBe(true);
            const error = result.asError();
            expect(error.message).toContain('node');
            expect(error.message).toContain('exit-code.js');
        });
    });
});

describe('startShellCommand', () => {
    describe('basic functionality', () => {
        it('should start a command and return subprocess', async () => {
            const helloScript = path.join(fixturesDir, 'hello.js');
            
            const subprocess = startShellCommand('node', [helloScript]);
            
            expect(subprocess).toBeDefined();
            await subprocess.waitForExit();
            
            expect(subprocess.exitCode).toBe(0);
            expect(subprocess.getStdout()).toContain('Hello, World!');
        });

        it('should handle options properly', async () => {
            const multilineScript = path.join(fixturesDir, 'multiline-output.js');
            const stdoutLines: string[] = [];
            
            const subprocess = startShellCommand('node', [multilineScript], {
                enableOutputBuffering: true,
                onStdout: (line) => stdoutLines.push(line)
            });
            
            await subprocess.waitForExit();
            
            expect(subprocess.getStdout()).toContain('First line');
            expect(stdoutLines).toContain('First line');
        });

        it('should start process immediately', () => {
            const helloScript = path.join(fixturesDir, 'hello.js');
            
            const subprocess = startShellCommand('node', [helloScript]);
            
            expect(subprocess.proc).toBeDefined();
            subprocess.kill(); // Clean up
        });
    });

    describe('process management', () => {
        it('should allow killing started subprocess', async () => {
            const slowScript = path.join(fixturesDir, 'slow-output.js');
            
            const subprocess = startShellCommand('node', [slowScript, '1000']);
            
            await subprocess.waitForStart();
            expect(subprocess.hasStarted).toBe(true);
            
            subprocess.kill();
            await subprocess.waitForExit();
            
            expect(subprocess.hasExited).toBe(true);
        });
    });
});
