#!/usr/bin/env node

// Error server that demonstrates various error conditions
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function handleRequest(request) {
  switch (request.method) {
    case 'success':
      return {
        jsonrpc: '2.0',
        result: 'success',
        id: request.id
      };

    case 'crash':
      // Simulate a crash
      process.exit(1);

    case 'stderr':
      // Write to stderr
      process.stderr.write('This is an error message\n');
      return {
        jsonrpc: '2.0',
        result: 'wrote to stderr',
        id: request.id
      };

    case 'invalid_json':
      // Send invalid JSON response
      console.log('invalid json response');
      return null;

    case 'custom_error':
      return {
        jsonrpc: '2.0',
        error: {
          code: 1001,
          message: 'Custom application error',
          data: { extra: 'information' }
        },
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
    if (response) {
      console.log(JSON.stringify(response));
    }
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