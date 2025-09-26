#!/usr/bin/env node

// Slow server that simulates delays for timeout testing
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function handleRequest(request) {
  switch (request.method) {
    case 'fast':
      return {
        jsonrpc: '2.0',
        result: 'fast response',
        id: request.id
      };

    case 'slow':
      // This will take 5 seconds to respond
      const delay = request.params?.delay || 5000;
      setTimeout(() => {
        const response = {
          jsonrpc: '2.0',
          result: `slow response after ${delay}ms`,
          id: request.id
        };
        console.log(JSON.stringify(response));
      }, delay);
      return null; // Don't send immediate response

    case 'never':
      // This will never respond (for timeout testing)
      return null;

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