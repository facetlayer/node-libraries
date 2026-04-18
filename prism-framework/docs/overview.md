---
name: overview
description: Introduction to Prism Framework and its core concepts
---

# Prism Framework Overview

Prism Framework is a TypeScript framework for building web-based SaaS applications and desktop Electron apps. It provides a unified approach to creating applications that can run in both backend (Express.js) and desktop (Electron) contexts.

## Key Features

1. **Service-Based Architecture** - Organize your application into self-contained services
2. **Type-Safe Endpoints** - Define endpoints with Zod schemas for request/response validation
3. **Launch Configuration** - Single configuration system that works for both web and desktop
4. **Database Management** - Integration with `@facetlayer/sqlite-wrapper` for database operations
5. **Request Context** - AsyncLocalStorage-based request context tracking
6. **Authorization** - Built-in authorization system with resources and auth sources
7. **Metrics** - Prometheus metrics integration
8. **SSE Support** - Server-Sent Events for real-time communication
9. **Error Handling** - Comprehensive HTTP error classes

## Core Concepts

### Services

A service is a self-contained module that can include API endpoints, middleware, database schemas, and background jobs. Services are the building blocks of a Prism application.

See the `creating-services` doc for the full `ServiceDefinition` interface and examples.

### Launch Configuration

The launch configuration system allows the same code to work in different contexts (backend server, Electron desktop app). Call `setLaunchConfig()` early in your app to configure logging and database settings.

See the `launch-configuration` doc for setup details and examples.

### Request Context

Every request has an associated context (via AsyncLocalStorage) that flows through all async operations. Access it with `getCurrentRequestContext()` to get request ID, auth info, and more.

See the `authorization` doc for how auth integrates with request context.

### Error Handling

The framework provides built-in HTTP error classes (`BadRequestError`, `NotFoundError`, `ForbiddenError`, etc.) that automatically map to the correct status codes.

See the `error-handling` doc for available error classes and usage patterns.

## Project Structure

See the `source-directory-organization` doc for the recommended directory layout and conventions.

## Running on multiple platforms

The same `PrismApp` and services can run on:

- **Web / server** — via `startServer` from `@facetlayer/prism-framework` (HTTP over Express).
- **Desktop** — via `desktopLaunch` from `@facetlayer/prism-framework-desktop` (Electron IPC).
- **Mobile** — via `expoLaunch` from `@facetlayer/prism-framework-expo` (in-process calls on Expo/React Native). See the `creating-mobile-apps` doc.

Frontend code can use `apiFetch` from `@facetlayer/prism-framework-ui` to stay platform-agnostic.

## Getting Started

1. Install the framework (requires **Zod v4** — Zod v3 is not compatible):
```bash
pnpm add @facetlayer/prism-framework zod@^4
```

2. Set up environment variables (see `env-files` doc)
3. Create your first service (see `creating-services` doc)
4. Set up the launch configuration (see `launch-configuration` doc)
5. Start the server (see `server-setup` doc)

## Further reading

Additional docs (run `prism list-docs` for the full list):

- `endpoint-tools` — the `prism` CLI for inspecting and calling a running server
- `cors-setup` — CORS configuration for browser clients
- `error-handling` — HTTP error classes and patterns
- `generate-api-clients-config` — configuring auto-generated TypeScript clients
- `metrics` — Prometheus metrics integration
- `stdin-protocol` — running a Prism app as a JSON-over-stdio subprocess
- `creating-mobile-apps` — running a Prism app on Expo/React Native
