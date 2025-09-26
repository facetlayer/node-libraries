#!/usr/bin/env node

// Simple echo server that responds to JSON-RPC requests
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line.trim());

    if (request.method === 'echo') {
      const response = {
        jsonrpc: '2.0',
        result: request.params,
        id: request.id
      };
      console.log(JSON.stringify(response));
    } else if (request.method === 'ping') {
      const response = {
        jsonrpc: '2.0',
        result: 'pong',
        id: request.id
      };
      console.log(JSON.stringify(response));
    } else {
      const response = {
        jsonrpc: '2.0',
        error: {
          code: -32601,
          message: 'Method not found'
        },
        id: request.id
      };
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