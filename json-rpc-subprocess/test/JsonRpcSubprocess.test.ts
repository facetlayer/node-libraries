import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { JsonRpcSubprocess } from '../src/JsonRpcSubprocess';
import path from 'path';

describe('JsonRpcSubprocess', () => {
  let jsonRpcSubprocess: JsonRpcSubprocess;

  beforeEach(() => {
    jsonRpcSubprocess = new JsonRpcSubprocess();
  });

  afterEach(async () => {
    if (jsonRpcSubprocess.isRunning()) {
      jsonRpcSubprocess.kill();
      await jsonRpcSubprocess.waitForExit();
    }
  });

  describe('Basic functionality', () => {
    it('should spawn a subprocess and communicate via JSON-RPC', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      expect(jsonRpcSubprocess.isRunning()).toBe(true);
      expect(jsonRpcSubprocess.hasStarted()).toBe(true);

      const result = await jsonRpcSubprocess.sendRequest('echo', { message: 'hello world' });
      expect(result).toEqual({ message: 'hello world' });
    });

    it('should handle ping-pong requests', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      const result = await jsonRpcSubprocess.sendRequest('ping');
      expect(result).toBe('pong');
    });

    it('should handle method not found errors', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      await expect(jsonRpcSubprocess.sendRequest('nonexistent')).rejects.toThrow(
        'JSON-RPC error in nonexistent: Method not found (code: -32601)'
      );
    });
  });

  describe('Math operations', () => {
    beforeEach(async () => {
      const mathAppPath = path.join(__dirname, 'sampleApps', 'math.js');
      jsonRpcSubprocess.spawn('node', [mathAppPath]);
      await jsonRpcSubprocess.waitForStart();
    });

    it('should perform addition', async () => {
      const result = await jsonRpcSubprocess.sendRequest('add', [5, 3]);
      expect(result).toBe(8);
    });

    it('should perform multiplication', async () => {
      const result = await jsonRpcSubprocess.sendRequest('multiply', [4, 6]);
      expect(result).toBe(24);
    });

    it('should perform division', async () => {
      const result = await jsonRpcSubprocess.sendRequest('divide', [10, 2]);
      expect(result).toBe(5);
    });

    it('should handle division by zero error', async () => {
      await expect(jsonRpcSubprocess.sendRequest('divide', [10, 0])).rejects.toThrow(
        'JSON-RPC error in divide: Division by zero (code: -32603)'
      );
    });

    it('should handle invalid parameters', async () => {
      await expect(jsonRpcSubprocess.sendRequest('add', [5])).rejects.toThrow(
        'JSON-RPC error in add: Invalid params: expected array of 2 numbers (code: -32602)'
      );

      await expect(jsonRpcSubprocess.sendRequest('add', ['a', 'b'])).rejects.toThrow(
        'JSON-RPC error in add: Invalid params: expected numbers (code: -32602)'
      );
    });
  });

  describe('Error handling', () => {
    it('should handle stderr output', async () => {
      const errorAppPath = path.join(__dirname, 'sampleApps', 'error.js');
      jsonRpcSubprocess.spawn('node', [errorAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let stderrOutput = '';
      jsonRpcSubprocess.on('stderr', (line: string) => {
        stderrOutput += line;
      });

      const result = await jsonRpcSubprocess.sendRequest('stderr');
      expect(result).toBe('wrote to stderr');
      expect(stderrOutput).toContain('This is an error message');
    });

    it('should handle subprocess crash', async () => {
      const errorAppPath = path.join(__dirname, 'sampleApps', 'error.js');
      jsonRpcSubprocess.spawn('node', [errorAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let exitCode: number | null = null;
      let exitSignal: string | null = null;
      jsonRpcSubprocess.on('exit', (code: number | null, signal: string | null) => {
        exitCode = code;
        exitSignal = signal;
      });

      // This will cause the subprocess to crash
      await expect(jsonRpcSubprocess.sendRequest('crash')).rejects.toThrow(
        'Process exited with code 1'
      );

      expect(exitCode).toBe(1);
      expect(exitSignal).toBe(null);
      expect(jsonRpcSubprocess.hasExited()).toBe(true);
      expect(jsonRpcSubprocess.exitCode()).toBe(1);
    });

    it('should handle invalid JSON output', async () => {
      const errorAppPath = path.join(__dirname, 'sampleApps', 'error.js');
      jsonRpcSubprocess.spawn('node', [errorAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let outputError = '';
      jsonRpcSubprocess.on('output-error', (line: string) => {
        outputError = line;
      });

      // This method sends invalid JSON, so we don't wait for a proper response
      // Instead, we just write the request and wait for the output-error event
      const request = {
        jsonrpc: '2.0' as const,
        method: 'invalid_json',
        id: 1
      };

      jsonRpcSubprocess.subprocess!.stdin!.write(JSON.stringify(request) + '\n');

      // Wait a moment for the invalid JSON to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(outputError).toBe('invalid json response');
    });

    it('should handle custom application errors', async () => {
      const errorAppPath = path.join(__dirname, 'sampleApps', 'error.js');
      jsonRpcSubprocess.spawn('node', [errorAppPath]);
      await jsonRpcSubprocess.waitForStart();

      await expect(jsonRpcSubprocess.sendRequest('custom_error')).rejects.toThrow(
        'JSON-RPC error in custom_error: Custom application error (code: 1001)'
      );
    });
  });

  describe('Timeout handling', () => {
    it('should timeout on slow responses', async () => {
      const slowAppPath = path.join(__dirname, 'sampleApps', 'slow.js');
      const subprocess = new JsonRpcSubprocess({ timeout: 1000 }); // 1 second timeout
      subprocess.spawn('node', [slowAppPath]);
      await subprocess.waitForStart();

      await expect(subprocess.sendRequest('slow', { delay: 2000 })).rejects.toThrow(
        'Request timeout for method: slow'
      );

      subprocess.kill();
      await subprocess.waitForExit();
    });

    it('should handle fast responses within timeout', async () => {
      const slowAppPath = path.join(__dirname, 'sampleApps', 'slow.js');
      const subprocess = new JsonRpcSubprocess({ timeout: 5000 }); // 5 second timeout
      subprocess.spawn('node', [slowAppPath]);
      await subprocess.waitForStart();

      const result = await subprocess.sendRequest('fast');
      expect(result).toBe('fast response');

      subprocess.kill();
      await subprocess.waitForExit();
    });
  });

  describe('Output events', () => {
    it('should emit stdout and stderr events', async () => {
      const errorAppPath = path.join(__dirname, 'sampleApps', 'error.js');
      jsonRpcSubprocess.spawn('node', [errorAppPath]);
      await jsonRpcSubprocess.waitForStart();

      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];

      jsonRpcSubprocess.on('stdout', (line: string) => {
        stdoutLines.push(line);
      });

      jsonRpcSubprocess.on('stderr', (line: string) => {
        stderrLines.push(line);
      });

      await jsonRpcSubprocess.sendRequest('stderr');
      await jsonRpcSubprocess.sendRequest('success');

      expect(stdoutLines.length).toBeGreaterThan(0);
      expect(stderrLines.length).toBeGreaterThan(0);
      expect(stderrLines.some(line => line.includes('This is an error message'))).toBe(true);
    });
  });

  describe('Configuration options', () => {
    it('should work with timeout option', async () => {
      const subprocess = new JsonRpcSubprocess({
        timeout: 5000
      });

      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      subprocess.spawn('node', [echoAppPath]);
      await subprocess.waitForStart();

      const result = await subprocess.sendRequest('ping');
      expect(result).toBe('pong');

      subprocess.kill();
      await subprocess.waitForExit();
    });
  });

  describe('Process lifecycle', () => {
    it('should handle graceful exit', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      expect(jsonRpcSubprocess.hasStarted()).toBe(true);
      expect(jsonRpcSubprocess.hasExited()).toBe(false);

      jsonRpcSubprocess.kill();
      const exitCode = await jsonRpcSubprocess.waitForExit();

      expect(jsonRpcSubprocess.hasExited()).toBe(true);
      expect(typeof exitCode).toBe('number');
    });

    it('should throw error when trying to spawn twice', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      expect(() => jsonRpcSubprocess.spawn('node', [echoAppPath])).toThrow(
        'Subprocess already spawned'
      );
    });

    it('should throw error when sending request to unstarted subprocess', async () => {
      await expect(jsonRpcSubprocess.sendRequest('test')).rejects.toThrow(
        'Subprocess not started'
      );
    });
  });

  describe('Event handling', () => {
    it('should emit events for requests and responses', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let requestEvent: any = null;
      let responseEvent: any = null;

      jsonRpcSubprocess.on('request', (req: any) => {
        requestEvent = req;
      });

      jsonRpcSubprocess.on('response', (res: any) => {
        responseEvent = res;
      });

      const result = await jsonRpcSubprocess.sendRequest('ping');

      expect(requestEvent).toMatchObject({
        jsonrpc: '2.0',
        method: 'ping',
        id: expect.any(Number)
      });

      expect(responseEvent).toMatchObject({
        jsonrpc: '2.0',
        result: 'pong',
        id: expect.any(Number)
      });
    });

    it('should emit started and killed events', async () => {
      let startedEmitted = false;
      let killedEmitted = false;

      jsonRpcSubprocess.on('started', () => {
        startedEmitted = true;
      });

      jsonRpcSubprocess.on('killed', () => {
        killedEmitted = true;
      });

      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      expect(startedEmitted).toBe(true);

      jsonRpcSubprocess.kill();
      await jsonRpcSubprocess.waitForExit();

      expect(killedEmitted).toBe(true);
    });
  });

  describe('Enqueued requests functionality', () => {
    it('should handle requests sent before waitForStart()', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);

      // Send request before waiting for start - this should be enqueued
      const resultPromise = jsonRpcSubprocess.sendRequest('echo', { message: 'before start' });

      // Now wait for start - this should process the enqueued request
      await jsonRpcSubprocess.waitForStart();

      const result = await resultPromise;
      expect(result).toEqual({ message: 'before start' });
    });

    it('should handle multiple enqueued requests', async () => {
      const mathAppPath = path.join(__dirname, 'sampleApps', 'math.js');
      jsonRpcSubprocess.spawn('node', [mathAppPath]);

      // Send multiple requests before waiting for start
      const addPromise = jsonRpcSubprocess.sendRequest('add', [5, 3]);
      const multiplyPromise = jsonRpcSubprocess.sendRequest('multiply', [4, 6]);
      const dividePromise = jsonRpcSubprocess.sendRequest('divide', [10, 2]);

      // Wait for start and then get all results
      await jsonRpcSubprocess.waitForStart();

      const addResult = await addPromise;
      const multiplyResult = await multiplyPromise;
      const divideResult = await dividePromise;

      expect(addResult).toBe(8);
      expect(multiplyResult).toBe(24);
      expect(divideResult).toBe(5);
    });

    it('should handle mixed enqueued and immediate requests', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);

      // Send request before start (enqueued)
      const enqueuedPromise = jsonRpcSubprocess.sendRequest('echo', { message: 'enqueued' });

      // Wait for start
      await jsonRpcSubprocess.waitForStart();

      // Send request after start (immediate)
      const immediatePromise = jsonRpcSubprocess.sendRequest('echo', { message: 'immediate' });

      const enqueuedResult = await enqueuedPromise;
      const immediateResult = await immediatePromise;

      expect(enqueuedResult).toEqual({ message: 'enqueued' });
      expect(immediateResult).toEqual({ message: 'immediate' });
    });

    it('should timeout enqueued requests when subprocess never responds', async () => {
      const silentAppPath = path.join(__dirname, 'sampleApps', 'silent.js');
      const subprocess = new JsonRpcSubprocess({ timeout: 100 }); // Very short timeout

      subprocess.spawn('node', [silentAppPath]);
      await subprocess.waitForStart(); // This should work fine

      // Send request - it will be sent immediately but subprocess won't respond
      const requestPromise = subprocess.sendRequest('test');

      // Should timeout since subprocess never responds
      await expect(requestPromise).rejects.toThrow('Request timeout for method: test');

      subprocess.kill();
      await subprocess.waitForExit();
    });

    it('should emit request events for enqueued requests', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);

      const requestEvents: any[] = [];
      jsonRpcSubprocess.on('request', (req: any) => {
        requestEvents.push(req);
      });

      // Send requests before start
      const promise1 = jsonRpcSubprocess.sendRequest('ping');
      const promise2 = jsonRpcSubprocess.sendRequest('echo', { test: 'data' });

      expect(requestEvents).toHaveLength(2);
      expect(requestEvents[0]).toMatchObject({
        jsonrpc: '2.0',
        method: 'ping',
        id: expect.any(Number)
      });
      expect(requestEvents[1]).toMatchObject({
        jsonrpc: '2.0',
        method: 'echo',
        params: { test: 'data' },
        id: expect.any(Number)
      });

      // Wait for start and complete requests
      await jsonRpcSubprocess.waitForStart();
      await promise1;
      await promise2;
    });

    it('should emit response-error for unmatched responses', async () => {
      const echoAppPath = path.join(__dirname, 'sampleApps', 'echo.js');
      jsonRpcSubprocess.spawn('node', [echoAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let responseErrorEvent: any = null;
      jsonRpcSubprocess.on('response-error', (error: any) => {
        responseErrorEvent = error;
      });

      // Send a manually crafted response that doesn't match any pending request
      // We'll write directly to the subprocess stdin to simulate this scenario
      const fakeResponse = {
        jsonrpc: '2.0' as const,
        result: 'fake result',
        id: 99999 // ID that doesn't match any pending request
      };

      // Write the fake response directly to trigger the response handler
      const responseJson = JSON.stringify(fakeResponse);

      // We need to simulate this by triggering the stdout handler directly
      // Since we can't easily inject fake stdout, let's use the invalid JSON test approach
      // but modify it to send a valid JSON response with wrong ID

      // First, let's send a real request to make sure the system is working
      await jsonRpcSubprocess.sendRequest('ping');

      // Now manually trigger a response with wrong ID by writing to subprocess stdout
      // We'll simulate this by directly calling the private method (for testing purposes)
      (jsonRpcSubprocess as any).handleJsonRpcResponse(fakeResponse);

      expect(responseErrorEvent).toMatchObject({
        error: 'Received a response that does not match any pending request',
        response: fakeResponse
      });
    });

    it('should emit response-error for orphaned responses from subprocess', async () => {
      const orphanedAppPath = path.join(__dirname, 'sampleApps', 'orphaned-response.js');
      jsonRpcSubprocess.spawn('node', [orphanedAppPath]);
      await jsonRpcSubprocess.waitForStart();

      let responseErrorEvent: any = null;
      jsonRpcSubprocess.on('response-error', (error: any) => {
        responseErrorEvent = error;
      });

      // Send a request that will trigger the subprocess to send both an orphaned response
      // and a normal response
      const result = await jsonRpcSubprocess.sendRequest('send_orphaned');

      // The normal response should work fine
      expect(result).toBe('normal response after orphaned');

      // The orphaned response should trigger a response-error event
      expect(responseErrorEvent).toMatchObject({
        error: 'Received a response that does not match any pending request',
        response: {
          jsonrpc: '2.0',
          result: 'orphaned response',
          id: 99999
        }
      });
    });
  });
});