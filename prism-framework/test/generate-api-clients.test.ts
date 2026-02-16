import { describe, it, expect } from 'vitest';
import { convertToExpressPath } from '../src/generate-api-clients';

describe('convertToExpressPath', () => {
  it('should convert single path parameter', () => {
    expect(convertToExpressPath('/users/{id}')).toBe('/users/:id');
  });

  it('should convert multiple path parameters', () => {
    expect(convertToExpressPath('/users/{userId}/posts/{postId}')).toBe('/users/:userId/posts/:postId');
  });

  it('should handle paths without parameters', () => {
    expect(convertToExpressPath('/users')).toBe('/users');
    expect(convertToExpressPath('/api/health')).toBe('/api/health');
  });

  it('should handle root path', () => {
    expect(convertToExpressPath('/')).toBe('/');
  });

  it('should handle complex parameter names', () => {
    expect(convertToExpressPath('/designs/{designId}/nodes/{nodeId}')).toBe('/designs/:designId/nodes/:nodeId');
  });

  it('should handle parameter at the end of path', () => {
    expect(convertToExpressPath('/api/items/{id}')).toBe('/api/items/:id');
  });

  it('should handle parameter with underscores', () => {
    expect(convertToExpressPath('/api/{user_id}/profile')).toBe('/api/:user_id/profile');
  });
});
