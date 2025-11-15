#!/usr/bin/env node
import { build } from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'));

// Get all dependencies that should be external
const external = [
  ...Object.keys(pkg.dependencies || {}),
  ...Object.keys(pkg.peerDependencies || {}),
];

const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  external,
  sourcemap: true,
  logLevel: 'info',
};

// Build the library entry point
await build({
  ...commonOptions,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  format: 'esm',
});

console.log('Build completed successfully!');
