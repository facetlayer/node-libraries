---
name: getting-started
description: Guide for setting up a new Prism Framework project with type-safe API and frontend client generation
---

# Prism Framework Getting Started Guide

## Intro

"Prism framework" is a set of Node.js libraries for a full-stack app that can target multiple platforms.

This includes the following NPM libraries:

### `@facetlayer/prism-framework-tools`
 - Tooling for various development and testing tasks
 - Should be installed at the top level in the devDependencies section

### `@facetlayer/prism-framework-api`
 - Backend API framework
 - Can be hosted on HTTP with Express.js
 - Also supports other launch methods such as IPC for Electron

### `@facetlayer/prism-framework-ui`
 - Helpers for React-based frontend web apps

### `@facetlayer/prism-framework-desktop`
 - Helper framework for Electron based desktop apps

## Getting started

 - Install `@facetlayer/prism-framework-tools`
 - Start using the `prism` CLI tool, especially:
   - `prism list-docs` - List available documentation files.
   - `prism get-doc <name>` - Read a documentation file.

## Example Project Setup

Some ways to set up the repo for a Prism project:

### Option 1: API in separate directory

 - `./api` - Backend API
   - `./api/package.json` - Contains prism-framework-api
   - `./api/src/` - Backend service implementation
 - `./web` - Frontend web app
   - `./web/package.json` - Contains Next.js and prism-framework-ui
   - `./web/src` - Frontend implementation

### Option 2: API in top level directory

 - `./package.json` - Contains prism-framework-api
 - `./src` - Backend API source code
 - `./web` - Frontend web app
   - `./web/package.json` - Contains Next.js and prism-framework-ui
   - `./web/src`

Also depending on the type of project, the frontend may be in `./ui` instead of `./web`

## Packages

 - For package management use `pnpm`
   - Make sure to set up a `pnpm-workspace.yaml` file in the top level

### Top level tools

The top level of the project should have these dependencies:

    `pnpm add typescript dotenv @facetlayer-prism-framework-tools`

## Local service management

Prism projects usually use the `candle` tool (from @facetlayer/candle) to run local services.

Examples:

 Browse documentation:
   `candle list-docs`

 Set up services in the .candle.json file:
   `candle add-service api "node --watch src/_main/api.ts" --root ./api
   `candle add-service web "pnpm dev" --root ./web

