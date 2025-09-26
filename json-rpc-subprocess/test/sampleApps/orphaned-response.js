#!/usr/bin/env node

// Server that sends orphaned responses to test response-error handling
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function handleRequest(request) {
  switch (request.method) {
    case 'normal':
      return {
        jsonrpc: '2.0',
        result: 'normal response',
        id: request.id
      };

    case 'send_orphaned':
      // Send a response with a made-up ID that doesn't match the request
      const orphanedResponse = {
        jsonrpc: '2.0',
        result: 'orphaned response',
        id: 99999 // This won't match any pending request
      };
      console.log(JSON.stringify(orphanedResponse));

      // Also send the normal response
      return {
        jsonrpc: '2.0',
        result: 'normal response after orphaned',
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