/**
 * Shape of the bridge installed on `window.electron` by the preload script.
 * Kept in a dedicated file (rather than preload.ts) because the preload
 * itself is shipped as hand-authored CJS — see `src/preload.cjs`.
 */

export interface ElectronAPI {
    apiCall: (method: string, path: string, options: any) => Promise<any>;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
