import { describe, it, expect } from 'vitest';
import { ErrorWithDetails } from '@facetlayer/streams';
import { encodeIpcError, decodeIpcError, normalizeIpcError } from '../ipcErrors.js';

describe('encodeIpcError / decodeIpcError', () => {
    it('round-trips an ErrorDetails through the Error message', () => {
        const original = {
            errorId: 'abc123',
            errorType: 'http_error',
            errorMessage: 'gone',
            related: [{ method: 'GET', path: '/missing' }, { statusCode: '404' }],
        };
        const encoded = encodeIpcError(original);
        expect(encoded).toBeInstanceOf(Error);
        expect(decodeIpcError(encoded)).toEqual(original);
    });

    it('returns null for plain errors that were not produced by encodeIpcError', () => {
        expect(decodeIpcError(new Error('regular error'))).toBeNull();
        expect(decodeIpcError('not an error')).toBeNull();
        expect(decodeIpcError(undefined)).toBeNull();
    });

    it('returns null if the payload is malformed JSON', () => {
        const broken = new Error('__prism_ipc_error__:{not valid json');
        expect(decodeIpcError(broken)).toBeNull();
    });
});

describe('normalizeIpcError', () => {
    it('re-hydrates an encoded error into an ErrorWithDetails preserving fields', () => {
        const original = {
            errorId: 'abc123',
            errorType: 'http_error',
            errorMessage: 'gone',
            related: [{ method: 'GET', path: '/missing' }],
        };
        const encoded = encodeIpcError(original);
        const rehydrated = normalizeIpcError(encoded);
        expect(rehydrated).toBeInstanceOf(ErrorWithDetails);
        expect(rehydrated.errorItem.errorId).toBe('abc123');
        expect(rehydrated.errorItem.errorType).toBe('http_error');
        expect(rehydrated.errorItem.errorMessage).toBe('gone');
    });

    it('appends extra related context when re-hydrating', () => {
        const encoded = encodeIpcError({
            errorType: 'http_error',
            errorMessage: 'gone',
            related: [{ statusCode: '404' }],
        });
        const rehydrated = normalizeIpcError(encoded, [{ source: 'desktopFetch' }]);
        expect(rehydrated.errorItem.related).toEqual(
            expect.arrayContaining([
                { statusCode: '404' },
                { source: 'desktopFetch' },
            ])
        );
    });

    it('captures plain Error instances via captureError', () => {
        const rehydrated = normalizeIpcError(new Error('plain failure'));
        expect(rehydrated).toBeInstanceOf(ErrorWithDetails);
        expect(rehydrated.errorItem.errorMessage).toBe('plain failure');
        expect(rehydrated.errorItem.errorId).toBeTruthy();
    });
});
