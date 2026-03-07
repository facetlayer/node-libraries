import { SseResponse } from '../web/SseResponse.ts';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('SseResponse', () => {
  let mockResponse: Response;
  let sseResponse: SseResponse;

  beforeEach(() => {
    mockResponse = {
      writeHead: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn(),
    } as any;

    sseResponse = new SseResponse(mockResponse);
  });

  describe('constructor', () => {
    it('should set up SSE headers correctly', () => {
      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
    });

    it('should set up close event handlers', () => {
      expect(mockResponse.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
  });

  describe('send', () => {
    it('should send JSON data in SSE format', () => {
      const testData = { type: 'test', message: 'hello' };

      sseResponse.send(testData);

      expect(mockResponse.write).toHaveBeenCalledWith(
        `event: item\ndata: ${JSON.stringify(testData)}\n\n`
      );
    });

    it('should not send data when response is closed', () => {
      // Simulate close event
      const closeCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      closeCallback?.();

      const testData = { type: 'test', message: 'hello' };
      sseResponse.send(testData);

      expect(mockResponse.write).toHaveBeenCalledTimes(0);
    });

    it('should handle complex objects correctly', () => {
      const complexData = {
        type: 'complex',
        data: {
          nested: { value: 123 },
          array: [1, 2, 3],
          nullValue: null,
          boolValue: true,
        },
      };

      sseResponse.send(complexData);

      expect(mockResponse.write).toHaveBeenCalledWith(
        `event: item\ndata: ${JSON.stringify(complexData)}\n\n`
      );
    });
  });

  describe('isOpen', () => {
    it('should return true initially', () => {
      expect(sseResponse.isOpen()).toBe(true);
    });

    it('should return false after close event', () => {
      // Simulate close event
      const closeCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      closeCallback?.();

      expect(sseResponse.isOpen()).toBe(false);
    });

    it('should return false after finish event', () => {
      // Simulate finish event
      const finishCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'finish'
      )?.[1];
      finishCallback?.();

      expect(sseResponse.isOpen()).toBe(false);
    });
  });

  describe('close', () => {
    it('should send done event and end the response', () => {
      sseResponse.close();

      expect(mockResponse.write).toHaveBeenCalledWith('event: done\n\n');
      expect(mockResponse.end).toHaveBeenCalled();
      expect(sseResponse.isOpen()).toBe(false);
    });

    it('should not send done event or call end twice if already closed', () => {
      sseResponse.close();

      // Clear mocks
      (mockResponse.write as any).mockClear();
      (mockResponse.end as any).mockClear();

      sseResponse.close();

      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });

    it('should not send done event or call end if response was already closed by client', () => {
      // Simulate close event
      const closeCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      closeCallback?.();

      // Clear mocks from setup
      (mockResponse.write as any).mockClear();
      (mockResponse.end as any).mockClear();

      sseResponse.close();

      expect(mockResponse.write).not.toHaveBeenCalled();
      expect(mockResponse.end).not.toHaveBeenCalled();
    });
  });

  describe('onClose', () => {
    it('should call the onClose callback when response closes', () => {
      const onCloseCallback = vi.fn();
      sseResponse.onClose(onCloseCallback);

      // Simulate close event
      const closeCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      closeCallback?.();

      expect(onCloseCallback).toHaveBeenCalledTimes(1);
    });

    it('should call the onClose callback when close() is called', () => {
      const onCloseCallback = vi.fn();
      sseResponse.onClose(onCloseCallback);

      sseResponse.close();

      expect(onCloseCallback).toHaveBeenCalledTimes(1);
    });

    it('should throw error if onClose is set twice', () => {
      sseResponse.onClose(() => {});

      expect(() => {
        sseResponse.onClose(() => {});
      }).toThrow('usage error: alrady have onClose callback');
    });

    it('should not call onClose callback twice', () => {
      const onCloseCallback = vi.fn();
      sseResponse.onClose(onCloseCallback);

      // Trigger close multiple times
      const closeCallback = (mockResponse.on as any).mock.calls.find(
        (call: any) => call[0] === 'close'
      )?.[1];
      closeCallback?.();
      closeCallback?.();

      expect(onCloseCallback).toHaveBeenCalledTimes(1);
    });
  });
});
