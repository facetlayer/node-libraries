#!/usr/bin/env node

// Math operations server that responds to JSON-RPC requests
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function handleRequest(request) {
  switch (request.method) {
    case 'add':
      if (!Array.isArray(request.params) || request.params.length !== 2) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected array of 2 numbers'
          },
          id: request.id
        };
      }
      const [a, b] = request.params;
      if (typeof a !== 'number' || typeof b !== 'number') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected numbers'
          },
          id: request.id
        };
      }
      return {
        jsonrpc: '2.0',
        result: a + b,
        id: request.id
      };

    case 'multiply':
      if (!Array.isArray(request.params) || request.params.length !== 2) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected array of 2 numbers'
          },
          id: request.id
        };
      }
      const [x, y] = request.params;
      if (typeof x !== 'number' || typeof y !== 'number') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected numbers'
          },
          id: request.id
        };
      }
      return {
        jsonrpc: '2.0',
        result: x * y,
        id: request.id
      };

    case 'divide':
      if (!Array.isArray(request.params) || request.params.length !== 2) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected array of 2 numbers'
          },
          id: request.id
        };
      }
      const [dividend, divisor] = request.params;
      if (typeof dividend !== 'number' || typeof divisor !== 'number') {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Invalid params: expected numbers'
          },
          id: request.id
        };
      }
      if (divisor === 0) {
        return {
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Division by zero'
          },
          id: request.id
        };
      }
      return {
        jsonrpc: '2.0',
        result: dividend / divisor,
        id: request.id
      };

    default:
      return {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found'
        },
        id: request.id
      };
  }
}

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line.trim());
    const response = handleRequest(request);
    console.log(JSON.stringify(response));
  } catch (e) {
    // Invalid JSON
    const response = {
      jsonrpc: '2.0',
      error: {
        code: -32700,
        message: 'Parse error'
      },
      id: null
    };
    console.log(JSON.stringify(response));
  }
});