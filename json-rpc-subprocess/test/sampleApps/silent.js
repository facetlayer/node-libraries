#!/usr/bin/env node

// Silent server that starts but never responds to requests
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Just listen for lines but never respond - this will cause timeouts
rl.on('line', (line) => {
  // Do nothing - this causes requests to timeout
});