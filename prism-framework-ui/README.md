# Prism Framework UI

A React/Next.js UI component library for building web applications with the Prism framework.

## Overview

This library provides reusable UI components, providers, and utilities extracted from the gstone project to serve as the foundation for Prism-based web applications.

## Features

- React Query integration for data fetching
- Reusable UI components built with Radix UI
- Utility functions for styling with Tailwind CSS
- TypeScript support

## Installation

```bash
pnpm add @facetlayer/prism-framework-ui
```

## Usage

```typescript
import { QueryProvider, cn } from '@facetlayer/prism-framework-ui';

function App() {
  return (
    <QueryProvider>
      {/* Your app components */}
    </QueryProvider>
  );
}
```

## License

MIT
