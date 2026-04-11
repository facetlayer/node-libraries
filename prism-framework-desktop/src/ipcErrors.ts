/**
 * IPC error codec — encodes an `ErrorDetails` into a serializable `Error`
 * for transport across Electron's IPC boundary, and decodes it on the other
 * side back into a `ErrorWithDetails` exception.
 *
 * Electron's `ipcRenderer.invoke` only preserves `Error.message` across the
 * boundary — custom properties are stripped. To keep `errorId`, `errorType`,
 * `stack`, `cause`, and `related` intact we stringify the `ErrorDetails`
 * into the message field, tagged with a magic prefix so the renderer can
 * tell an encoded error apart from an ordinary thrown Error.
 */

import {
    captureError,
    toException,
    type ErrorDetails,
    ErrorWithDetails,
} from '@facetlayer/streams';

const IPC_ERROR_PREFIX = '__prism_ipc_error__:';

/**
 * Wrap an `ErrorDetails` in a plain `Error` whose message carries the full
 * details as JSON. The main-process IPC handler throws one of these so the
 * renderer can re-hydrate it.
 */
export function encodeIpcError(details: ErrorDetails): Error {
    return new Error(IPC_ERROR_PREFIX + JSON.stringify(details));
}

/**
 * Inspect an error caught on the renderer side. If it was produced by
 * `encodeIpcError` (either here or in the main process), return the decoded
 * `ErrorDetails`. Otherwise return `null`.
 */
export function decodeIpcError(error: unknown): ErrorDetails | null {
    if (!(error instanceof Error)) return null;
    if (!error.message.startsWith(IPC_ERROR_PREFIX)) return null;
    try {
        return JSON.parse(error.message.slice(IPC_ERROR_PREFIX.length)) as ErrorDetails;
    } catch {
        return null;
    }
}

/**
 * Normalize any caught value into an `ErrorWithDetails`. If the value came
 * across IPC via `encodeIpcError`, the original details are recovered
 * (preserving `errorId`, `errorType`, `related`, etc.). Otherwise we fall
 * back to `captureError` which handles plain `Error`, string, and unknown
 * inputs uniformly.
 */
export function normalizeIpcError(error: unknown, extraRelated?: Array<Record<string, string>>): ErrorWithDetails {
    const decoded = decodeIpcError(error);
    if (decoded) {
        if (extraRelated?.length) {
            decoded.related = [...(decoded.related ?? []), ...extraRelated];
        }
        return toException(decoded);
    }
    const details = captureError(error as Error, extraRelated);
    return toException(details);
}
