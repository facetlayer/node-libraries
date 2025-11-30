import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webFetch } from '../webFetch';

// Mock the global fetch function
global.fetch = vi.fn();

describe('webFetch', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });
    });

    describe('endpoint parsing', () => {
        it('should parse GET method and path from endpoint string', async () => {
            await webFetch('GET /api/users', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users',
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        it('should parse POST method and path from endpoint string', async () => {
            await webFetch('POST /api/users', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should convert method to lowercase', async () => {
            await webFetch('post /api/users', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users',
                expect.objectContaining({
                    method: 'POST',
                })
            );
        });

        it('should default to GET when only path is provided', async () => {
            await webFetch('/api/users', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users',
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        it('should handle PUT method', async () => {
            await webFetch('put /api/users/123', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.objectContaining({
                    method: 'PUT',
                })
            );
        });

        it('should handle PATCH method', async () => {
            await webFetch('patch /api/users/123', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.objectContaining({
                    method: 'PATCH',
                })
            );
        });

        it('should handle DELETE method', async () => {
            await webFetch('delete /api/users/123', {});

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.objectContaining({
                    method: 'DELETE',
                })
            );
        });
    });

    describe('path parameter replacement', () => {
        it('should replace single path parameter', async () => {
            await webFetch('GET /api/users/:id', {
                params: { id: '123' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(Object)
            );
        });

        it('should replace multiple path parameters', async () => {
            await webFetch('GET /api/users/:userId/posts/:postId', {
                params: { userId: '123', postId: '456' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123/posts/456',
                expect.any(Object)
            );
        });

        it('should replace path parameters and include remaining params in query string for GET', async () => {
            await webFetch('GET /api/users/:id', {
                params: { id: '123', status: 'active', role: 'admin' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123?status=active&role=admin',
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        it('should replace path parameters and include remaining params in body for POST', async () => {
            await webFetch('POST /api/users/:id/posts', {
                params: { id: '123', title: 'Test Post', content: 'Test content' },
            });

            const [url, options] = (global.fetch as any).mock.calls[0];
            expect(url).toBe('/api/users/123/posts');
            expect(options.method).toBe('POST');
            expect(JSON.parse(options.body)).toEqual({
                title: 'Test Post',
                content: 'Test content',
            });
        });

        it('should not duplicate path params in query string for GET', async () => {
            await webFetch('GET /api/users/:id', {
                params: { id: '123' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(Object)
            );
        });

        it('should not duplicate path params in body for POST', async () => {
            await webFetch('POST /api/users/:id', {
                params: { id: '123' },
            });

            const [url, options] = (global.fetch as any).mock.calls[0];
            expect(url).toBe('/api/users/123');
            expect(options.body).toBeUndefined();
        });

        it('should handle numeric path parameters', async () => {
            await webFetch('GET /api/users/:id', {
                params: { id: 123 },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(Object)
            );
        });

        it('should handle path without leading slash', async () => {
            await webFetch('GET api/users/:id', {
                params: { id: '123' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users/123',
                expect.any(Object)
            );
        });
    });

    describe('request body and query parameters', () => {
        it('should send params in body for POST requests', async () => {
            await webFetch('POST /api/users', {
                params: { name: 'John', email: 'john@example.com' },
            });

            const [, options] = (global.fetch as any).mock.calls[0];
            expect(JSON.parse(options.body)).toEqual({
                name: 'John',
                email: 'john@example.com',
            });
        });

        it('should send params in body for PUT requests', async () => {
            await webFetch('PUT /api/users/123', {
                params: { name: 'John Updated' },
            });

            const [, options] = (global.fetch as any).mock.calls[0];
            expect(JSON.parse(options.body)).toEqual({
                name: 'John Updated',
            });
        });

        it('should send params in body for PATCH requests', async () => {
            await webFetch('PATCH /api/users/123', {
                params: { status: 'active' },
            });

            const [, options] = (global.fetch as any).mock.calls[0];
            expect(JSON.parse(options.body)).toEqual({
                status: 'active',
            });
        });

        it('should send params as query string for GET requests', async () => {
            await webFetch('GET /api/users', {
                params: { status: 'active', role: 'admin' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users?status=active&role=admin',
                expect.any(Object)
            );
        });

        it('should send params as query string for DELETE requests', async () => {
            await webFetch('DELETE /api/users', {
                params: { status: 'inactive' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users?status=inactive',
                expect.any(Object)
            );
        });

        it('should skip undefined and null params in query string', async () => {
            await webFetch('GET /api/users', {
                params: { name: 'John', status: undefined, role: null },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/users?name=John',
                expect.any(Object)
            );
        });
    });

    describe('host option', () => {
        it('should prepend host to URL', async () => {
            await webFetch('GET /api/users', {
                host: 'https://api.example.com',
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/users',
                expect.any(Object)
            );
        });

        it('should work with host and path parameters', async () => {
            await webFetch('GET /api/users/:id', {
                host: 'https://api.example.com',
                params: { id: '123', filter: 'active' },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.example.com/api/users/123?filter=active',
                expect.any(Object)
            );
        });
    });

    describe('headers option', () => {
        it('should include custom headers', async () => {
            await webFetch('GET /api/users', {
                headers: { Authorization: 'Bearer token123' },
            });

            const [, options] = (global.fetch as any).mock.calls[0];
            expect(options.headers).toEqual({
                'Content-Type': 'application/json',
                Authorization: 'Bearer token123',
            });
        });

        it('should override default Content-Type', async () => {
            await webFetch('POST /api/users', {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            });

            const [, options] = (global.fetch as any).mock.calls[0];
            expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
        });
    });

    describe('error handling', () => {
        it('should throw error when response is not ok', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 404,
            });

            await expect(webFetch('GET /api/users/999', {})).rejects.toThrow(
                'Fetch error, status: 404'
            );
        });

        it('should throw error for 500 status', async () => {
            (global.fetch as any).mockResolvedValue({
                ok: false,
                status: 500,
            });

            await expect(webFetch('POST /api/users', {})).rejects.toThrow(
                'Fetch error, status: 500'
            );
        });
    });

    describe('response handling', () => {
        it('should return parsed JSON response', async () => {
            const mockData = { id: 123, name: 'John' };
            (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => mockData,
            });

            const result = await webFetch('GET /api/users/123', {});
            expect(result).toEqual(mockData);
        });
    });

    describe('complex scenarios', () => {
        it('should handle complex path with multiple params and query string', async () => {
            await webFetch('GET /api/organizations/:orgId/users/:userId/posts', {
                params: {
                    orgId: 'org123',
                    userId: 'user456',
                    status: 'published',
                    sort: 'date',
                },
            });

            expect(global.fetch).toHaveBeenCalledWith(
                '/api/organizations/org123/users/user456/posts?status=published&sort=date',
                expect.objectContaining({
                    method: 'GET',
                })
            );
        });

        it('should handle POST with path params and body data', async () => {
            await webFetch('POST /api/users/:userId/posts/:postId/comments', {
                params: {
                    userId: '123',
                    postId: '456',
                    text: 'Great post!',
                    rating: 5,
                },
            });

            const [url, options] = (global.fetch as any).mock.calls[0];
            expect(url).toBe('/api/users/123/posts/456/comments');
            expect(JSON.parse(options.body)).toEqual({
                text: 'Great post!',
                rating: 5,
            });
        });
    });
});
