import { describe, it, expect, vi } from 'vitest';
import { ErrorWithDetails } from '@facetlayer/streams';
import { createDesktopFetch } from '../desktopFetch.js';
import { encodeIpcError } from '../ipcErrors.js';

describe('createDesktopFetch', () => {
    it('forwards the method and path to bridge.apiCall', async () => {
        const bridge = {
            apiCall: vi.fn().mockResolvedValue({ ok: true }),
        };
        const fetch = createDesktopFetch({ bridge });

        const result = await fetch('GET /items');

        expect(result).toEqual({ ok: true });
        expect(bridge.apiCall).toHaveBeenCalledWith('GET', '/items', {
            params: undefined,
            headers: undefined,
        });
    });

    it('defaults to GET when method is omitted', async () => {
        const bridge = { apiCall: vi.fn().mockResolvedValue(null) };
        const fetch = createDesktopFetch({ bridge });

        await fetch('/items');

        expect(bridge.apiCall).toHaveBeenCalledWith('GET', '/items', expect.anything());
    });

    it('passes params and headers through', async () => {
        const bridge = { apiCall: vi.fn().mockResolvedValue(null) };
        const fetch = createDesktopFetch({ bridge });

        await fetch('POST /items', {
            params: { name: 'new' },
            headers: { 'x-test': '1' },
        });

        expect(bridge.apiCall).toHaveBeenCalledWith('POST', '/items', {
            params: { name: 'new' },
            headers: { 'x-test': '1' },
        });
    });

    it('uppercases the method', async () => {
        const bridge = { apiCall: vi.fn().mockResolvedValue(null) };
        const fetch = createDesktopFetch({ bridge });

        await fetch('delete /items/:id', { params: { id: '1' } });

        expect(bridge.apiCall).toHaveBeenCalledWith('DELETE', '/items/:id', expect.anything());
    });

    it('throws a helpful error when window.electron is missing', () => {
        expect(() => createDesktopFetch()).toThrow(/window\.electron\.apiCall is not available/);
    });

    it('resolves window.electron from globalThis.window when present', async () => {
        const original = (globalThis as any).window;
        const apiCall = vi.fn().mockResolvedValue('hi');
        (globalThis as any).window = { electron: { apiCall } };

        try {
            const fetch = createDesktopFetch();
            const result = await fetch('GET /ping');
            expect(result).toBe('hi');
            expect(apiCall).toHaveBeenCalled();
        } finally {
            (globalThis as any).window = original;
        }
    });

    it('rehydrates encoded main-process errors into ErrorWithDetails', async () => {
        const bridge = {
            apiCall: vi.fn().mockRejectedValue(
                encodeIpcError({
                    errorId: 'err-1',
                    errorType: 'http_error',
                    errorMessage: 'gone',
                    related: [{ statusCode: '404' }],
                })
            ),
        };
        const fetch = createDesktopFetch({ bridge });

        let caught: unknown;
        try {
            await fetch('GET /items/:id', { params: { id: '1' } });
        } catch (err) {
            caught = err;
        }
        expect(caught).toBeInstanceOf(ErrorWithDetails);
        const details = (caught as ErrorWithDetails).errorItem;
        expect(details.errorId).toBe('err-1');
        expect(details.errorType).toBe('http_error');
        expect(details.errorMessage).toBe('gone');
        // Original related context plus the method/path we appended in the fetch bridge.
        expect(details.related).toEqual(
            expect.arrayContaining([
                { statusCode: '404' },
                expect.objectContaining({ method: 'GET', path: '/items/:id' }),
            ])
        );
    });

    it('wraps plain errors from the bridge in ErrorWithDetails', async () => {
        const bridge = {
            apiCall: vi.fn().mockRejectedValue(new Error('bridge exploded')),
        };
        const fetch = createDesktopFetch({ bridge });

        await expect(fetch('GET /items')).rejects.toBeInstanceOf(ErrorWithDetails);
    });

    it('warns when host option is supplied', async () => {
        const bridge = { apiCall: vi.fn().mockResolvedValue(null) };
        const fetch = createDesktopFetch({ bridge });
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        try {
            await fetch('GET /x', { host: 'http://somewhere' });
            expect(warn).toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });
});
