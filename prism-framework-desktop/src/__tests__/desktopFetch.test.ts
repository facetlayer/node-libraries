import { describe, it, expect, vi } from 'vitest';
import { createDesktopFetch } from '../desktopFetch.js';

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
