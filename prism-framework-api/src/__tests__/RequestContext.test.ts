import {
  RequestContext,
  withRequestContext,
  getCurrentRequestContext,
} from '../RequestContext';
import { Authorization } from '../authorization/Authorization';
import { describe, expect, it, beforeEach } from 'vitest';

describe('RequestContext', () => {
  describe('withRequestContext', () => {
    it('should run function within request context', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      const result = withRequestContext(context, () => {
        const currentContext = getCurrentRequestContext();
        expect(currentContext).toBe(context);
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should return the function result', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      const result = withRequestContext(context, () => {
        return { data: 'test', count: 42 };
      });

      expect(result).toEqual({ data: 'test', count: 42 });
    });

    it('should properly clean up context after function executes', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      withRequestContext(context, () => {
        expect(getCurrentRequestContext()).toBe(context);
      });

      expect(getCurrentRequestContext()).toBeUndefined();
    });

    it('should handle nested contexts', () => {
      const auth1 = new Authorization();
      const auth2 = new Authorization();
      const context1: RequestContext = {
        requestId: 'req1',
        startTime: Date.now(),
        auth: auth1,
      };
      const context2: RequestContext = {
        requestId: 'req2',
        startTime: Date.now(),
        auth: auth2,
      };

      withRequestContext(context1, () => {
        expect(getCurrentRequestContext()?.requestId).toBe('req1');

        withRequestContext(context2, () => {
          expect(getCurrentRequestContext()?.requestId).toBe('req2');
        });

        expect(getCurrentRequestContext()?.requestId).toBe('req1');
      });

      expect(getCurrentRequestContext()).toBeUndefined();
    });

    it('should propagate errors thrown in the function', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      expect(() => {
        withRequestContext(context, () => {
          throw new Error('Test error');
        });
      }).toThrow('Test error');
    });

    it('should clear context even when function throws', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      try {
        withRequestContext(context, () => {
          throw new Error('Test error');
        });
      } catch (e) {
        // Expected error
      }

      expect(getCurrentRequestContext()).toBeUndefined();
    });
  });

  describe('getCurrentRequestContext', () => {
    it('should return undefined when no context is set', () => {
      expect(getCurrentRequestContext()).toBeUndefined();
    });

    it('should return the current context when inside withRequestContext', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      withRequestContext(context, () => {
        const currentContext = getCurrentRequestContext();
        expect(currentContext).toBeDefined();
        expect(currentContext?.requestId).toBe('req123');
        expect(currentContext?.auth).toBe(auth);
      });
    });

    it('should return undefined after context exits', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      withRequestContext(context, () => {
        // Inside context
      });

      expect(getCurrentRequestContext()).toBeUndefined();
    });
  });

  describe('RequestContext interface', () => {
    it('should support all required fields', () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      expect(context.requestId).toBe('req123');
      expect(typeof context.startTime).toBe('number');
      expect(context.auth).toBe(auth);
      expect(context.req).toBeUndefined();
      expect(context.res).toBeUndefined();
    });

    it('should support optional req and res fields', () => {
      const auth = new Authorization();
      const mockReq = {} as any;
      const mockRes = {} as any;

      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
        req: mockReq,
        res: mockRes,
      };

      expect(context.req).toBe(mockReq);
      expect(context.res).toBe(mockRes);
    });
  });

  describe('async operations', () => {
    it('should work with async functions', async () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'req123',
        startTime: Date.now(),
        auth,
      };

      const result = await withRequestContext(context, async () => {
        const currentContext = getCurrentRequestContext();
        expect(currentContext?.requestId).toBe('req123');

        await new Promise((resolve) => setTimeout(resolve, 10));

        const stillCurrentContext = getCurrentRequestContext();
        expect(stillCurrentContext?.requestId).toBe('req123');

        return 'async success';
      });

      expect(result).toBe('async success');
    });

    it('should maintain context across async operations', async () => {
      const auth = new Authorization();
      const context: RequestContext = {
        requestId: 'async-req',
        startTime: Date.now(),
        auth,
      };

      await withRequestContext(context, async () => {
        expect(getCurrentRequestContext()?.requestId).toBe('async-req');

        await Promise.resolve();
        expect(getCurrentRequestContext()?.requestId).toBe('async-req');

        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(getCurrentRequestContext()?.requestId).toBe('async-req');
      });
    });

    it('should handle parallel async operations with different contexts', async () => {
      const auth1 = new Authorization();
      const auth2 = new Authorization();
      const context1: RequestContext = {
        requestId: 'req1',
        startTime: Date.now(),
        auth: auth1,
      };
      const context2: RequestContext = {
        requestId: 'req2',
        startTime: Date.now(),
        auth: auth2,
      };

      const results = await Promise.all([
        withRequestContext(context1, async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return getCurrentRequestContext()?.requestId;
        }),
        withRequestContext(context2, async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return getCurrentRequestContext()?.requestId;
        }),
      ]);

      expect(results).toEqual(['req1', 'req2']);
    });
  });

  describe('context isolation', () => {
    it('should isolate contexts between different executions', () => {
      const auth1 = new Authorization();
      const auth2 = new Authorization();
      const context1: RequestContext = {
        requestId: 'req1',
        startTime: 100,
        auth: auth1,
      };
      const context2: RequestContext = {
        requestId: 'req2',
        startTime: 200,
        auth: auth2,
      };

      let capturedContext1: RequestContext | undefined;
      let capturedContext2: RequestContext | undefined;

      withRequestContext(context1, () => {
        capturedContext1 = getCurrentRequestContext();
      });

      withRequestContext(context2, () => {
        capturedContext2 = getCurrentRequestContext();
      });

      expect(capturedContext1?.requestId).toBe('req1');
      expect(capturedContext1?.startTime).toBe(100);
      expect(capturedContext2?.requestId).toBe('req2');
      expect(capturedContext2?.startTime).toBe(200);
    });
  });
});
