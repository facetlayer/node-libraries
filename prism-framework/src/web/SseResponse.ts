import { Response } from 'express';

/*
SseResponse

Helper object used when sending an SSE response.
*/

export class SseResponse {
  public response: Response;
  private isResponseOpen: boolean = true;
  private _onClose: () => void;

  constructor(response: Response) {
    this.response = response;
    this.setupSseHeaders();
    this.setupCloseHandlers();
  }

  private setupSseHeaders(): void {
    this.response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
  }

  private setupCloseHandlers(): void {
    this.response.on('close', () => {
      this._triggerOnClose();
    });

    this.response.on('finish', () => {
      this._triggerOnClose();
    });
  }

  send(data: object): void {
    if (!this.isResponseOpen) {
      return;
    }

    const jsonData = JSON.stringify(data);
    this.response.write(`event: item\ndata: ${jsonData}\n\n`);
  }

  isOpen(): boolean {
    return this.isResponseOpen;
  }

  // close() - Can be called by the handler to close the response.
  close(): void {
    if (this.isResponseOpen) {
      // Send done event before closing
      this.response.write(`event: done\n\n`);
      this.response.end();

      this._triggerOnClose();
    }
  }

  // Internal: Called when the response is closed.
  _triggerOnClose(): void {
    this.isResponseOpen = false;
    if (this._onClose) {
      this._onClose();
      this._onClose = null;
    }
  }

  // Adds a callback to be called when the response is closed.
  onClose(callback: () => void): void {
    if (this._onClose) {
      throw new Error('usage error: alrady have onClose callback');
    }
    this._onClose = callback;
  }
}
