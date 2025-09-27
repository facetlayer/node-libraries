export class ProcessExitWhileWaitingForResponseOptions {
  exitCode: number;
  exitSignal: string;
  method: string;
}

export class ProcessExitWhileWaitingForResponse extends Error {
  exitCode: number;
  exitSignal: string;
  method: string;

  constructor(options: ProcessExitWhileWaitingForResponseOptions) {
    const message = `Process exited with code ${options.exitCode}${options.exitSignal ? ` (signal: ${options.exitSignal})` : ''} while waiting for response to '${options.method}'`;
    super(message);
    this.name = 'ProcessExitWhileWaitingForResponse';
    this.exitCode = options.exitCode;
    this.exitSignal = options.exitSignal;
    this.method = options.method;
  }

  getErrorMessageWithoutMethod(): string {
    return `Process exited with code ${this.exitCode}${this.exitSignal ? ` (signal: ${this.exitSignal})` : ''}`;
  }
}
