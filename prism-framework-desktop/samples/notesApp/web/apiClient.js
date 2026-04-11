/**
 * Transport-agnostic API client for the sample.
 *
 * Picks one of two transports at load time:
 *
 *   Electron mode — `window.electron.apiCall` is installed by the
 *     framework preload script. Calls go directly over IPC to
 *     `app.callEndpoint` in the main process.
 *
 *   Web mode — running in a plain browser (via `pnpm serve`). Calls go
 *     over HTTP to `/api/*`, where Prism's Express integration has mounted
 *     the same PrismApp.
 *
 * Either way, call sites look identical:
 *     api.call('GET', '/notes')
 *     api.call('DELETE', '/notes/:id', { id: '1' })
 *     api.call('POST', '/notes', { title, body })
 *
 * This lets the sample be driven by `playwright-cli` (which can't talk to
 * Electron) without maintaining a parallel UI codebase.
 */

(function () {
    function createElectronTransport() {
        return async function call(method, path, params) {
            return window.electron.apiCall(method.toUpperCase(), path, { params });
        };
    }

    function createHttpTransport() {
        return async function call(method, path, params = {}) {
            const upper = method.toUpperCase();
            const usedKeys = new Set();

            const substituted = path
                .split('/')
                .map((segment) => {
                    if (!segment.startsWith(':')) return segment;
                    const key = segment.slice(1);
                    usedKeys.add(key);
                    return encodeURIComponent(String(params[key]));
                })
                .join('/');

            const remaining = {};
            for (const [k, v] of Object.entries(params)) {
                if (!usedKeys.has(k)) remaining[k] = v;
            }

            const hasRemaining = Object.keys(remaining).length > 0;
            const url = new URL('/api' + substituted, window.location.origin);
            const init = {
                method: upper,
                headers: { 'Content-Type': 'application/json' },
            };

            if (upper === 'GET' || upper === 'DELETE') {
                for (const [k, v] of Object.entries(remaining)) {
                    if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
                }
            } else if (hasRemaining) {
                init.body = JSON.stringify(remaining);
            }

            const response = await fetch(url.toString(), init);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} ${response.statusText}`);
            }
            return response.json();
        };
    }

    const isElectron = !!(window.electron && typeof window.electron.apiCall === 'function');
    const transport = isElectron ? 'electron' : 'http';
    const call = isElectron ? createElectronTransport() : createHttpTransport();

    window.api = { call, transport };
})();
