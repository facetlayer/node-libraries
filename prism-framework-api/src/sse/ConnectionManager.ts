import { SseResponse } from '../web/SseResponse.ts';

interface SetupOptions {
  managerName: string;
  logDebug?: (message: string) => void;
  logError?: (message: string, error?: any) => void;
}

interface Connection {
  key: string;
  sseResponse: SseResponse;
  connectedAt: Date;
}

/*
 * ConnectionManager
 *
 * This keeps an in-memory map of active connections. Each one corresponds to
 * an active HTTP SSE request that is currently open.
 *
 * This class can be used to list active connections or to push a message to
 * a connection.
 */
export class ConnectionManager<EventType extends object> {
  private connections: Map<string, Connection[]> = new Map();
  private managerName: string;
  private logDebug: (message: string) => void;
  private logError: (message: string, error?: any) => void;

  constructor(options: SetupOptions) {
    this.managerName = options.managerName;
    this.logDebug = options.logDebug || (() => {});
    this.logError = options.logError || (() => {});
  }

  addConnection(key: string, sseResponse: SseResponse): void {
    this.logDebug(`${this.managerName} (ConnectionManager) adding connection for: ${key}`);

    const connectionList = this.connections.get(key) || [];
    const connection = {
      key,
      sseResponse,
      connectedAt: new Date(),
    };

    connectionList.push(connection);
    this.connections.set(key, connectionList);

    // Clean up when connection closes
    sseResponse.onClose(() => {
      this.logDebug(`${this.managerName} (ConnectionManager) closed connection for: ${key}`);

      const updatedList = this.connections.get(key)?.filter(c => c !== connection) || [];
      if (updatedList.length === 0) {
        this.connections.delete(key);
      } else {
        this.connections.set(key, updatedList);
      }
    });
  }

  getConnections(key: string): Connection[] {
    return this.connections.get(key) || [];
  }

  async postEvent(key: string, event: EventType): Promise<void> {
    const connections = this.getConnections(key);

    for (const connection of connections) {
      if (connection.sseResponse.isOpen()) {
        try {
          connection.sseResponse.send(event as object);
        } catch (error) {
          this.logError('Error sending SSE event:', error);
        }
      }
    }
  }
}
