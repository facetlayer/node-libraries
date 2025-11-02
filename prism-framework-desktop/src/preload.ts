/**
 * Preload script for Electron in Prism Framework desktop applications.
 *
 * This script runs in a sandboxed context with access to both the renderer
 * and some Node.js APIs. It exposes a safe API to the renderer process.
 *
 * The preload script creates a bridge between the Electron main process
 * and the UI, allowing the UI to make API calls through IPC in release mode,
 * or directly through HTTP in development mode.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Make API calls to the main process
  apiCall: (method: string, path: string, options: any) => {
    return ipcRenderer.invoke('apiCall', method, path, options);
  },

  // Subscribe to a stream
  subscribe: (streamId: string, path: string, options: any) => {
    return ipcRenderer.invoke('subscribe', streamId, path, options);
  },

  // Unsubscribe from a stream
  unsubscribe: (streamId: string) => {
    return ipcRenderer.invoke('api-unsubscribe', streamId);
  },

  // Listen for stream data
  onStreamData: (callback: (streamId: string, data: any) => void) => {
    ipcRenderer.on('stream-data', (_event, streamId, data) => {
      callback(streamId, data);
    });
  },

  // Remove stream data listener
  removeStreamDataListener: () => {
    ipcRenderer.removeAllListeners('stream-data');
  },
});

// Type definition for the exposed API
export interface ElectronAPI {
  apiCall: (method: string, path: string, options: any) => Promise<any>;
  subscribe: (streamId: string, path: string, options: any) => Promise<any>;
  unsubscribe: (streamId: string) => Promise<any>;
  onStreamData: (callback: (streamId: string, data: any) => void) => void;
  removeStreamDataListener: () => void;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}
