# Next.js Project Setup Notes

Notes for setting up Next.js projects (based on dlq-tool web app).

## QueryClient Setup

Set up QueryClient in each project separately rather than importing from a shared library. The shared approach causes hydration issues.

Create a `providers.tsx` file in `src/app/`:

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

Use in `layout.tsx`:

```tsx
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Monorepo Lockfile Warning

When running Next.js in a monorepo (e.g., a `web/` subfolder with a parent `pnpm-lock.yaml`), you may see:

```
Warning: Next.js inferred your workspace root, but it may not be correct.
We detected multiple lockfiles...
```

Fix by setting `outputFileTracingRoot` in `next.config.ts`:

```ts
import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Set to the monorepo root (parent of web/)
  outputFileTracingRoot: path.resolve(__dirname, '..'),
};

export default nextConfig;
```
