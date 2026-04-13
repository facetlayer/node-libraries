# Dynamic URL Mapping

goob-static-web-server supports mapping dynamic URL patterns (like `/facility/:id`) to
static files on disk. This allows a statically-exported frontend (e.g. Next.js with
`output: "export"`) to handle parameterized routes without a runtime server-side renderer.

## How It Works

The system has three parts:

1. **Configuration** -- dynamic routes are declared in a `.goob` deployment config file.
2. **Storage** -- goobernetes parses the config and stores the routes as JSON in its database.
3. **Serving** -- goob-static-web-server matches incoming requests against the route patterns
   and serves the corresponding static file.

### 1. Declaring Routes in the Deployment Config

In your `.goob` file, add `dynamic-route` blocks with `from` (URL pattern) and `to` (static file path):

```
deploy-settings
  project-name=my-project
  web-static-dir=frontend/out

dynamic-route
  from=/facility/:id
  to=/facility/_.html

dynamic-route
  from=/dashboard/jobs/:id
  to=/dashboard/jobs/_.html
```

- `from` uses Express-style `:param` placeholders. Each `:param` matches a single path segment
  (any characters except `/`).
- `to` is a path relative to `web-static-dir`.

### 2. How goobernetes Stores Routes

When `goobernetes` processes a deployment, it parses the `dynamic-route` blocks in
`createDeployment` (`goobernetes/src/server/createDeployment.ts`) and stores them as a JSON
array in the `deployment` table's `dynamic_routes_json` column:

```json
[
  { "pattern": "/facility/:id", "file": "/facility/_.html" },
  { "pattern": "/dashboard/jobs/:id", "file": "/dashboard/jobs/_.html" }
]
```

### 3. How goob-static-web-server Resolves Requests

The request handler in `src/endpoints.ts` uses a fallback chain. Dynamic route matching is
the third priority:

1. **Literal file** -- serve the exact file if it exists on disk.
2. **`.html` extension** -- for extensionless paths, try appending `.html` (e.g. `/about` -> `/about.html`).
3. **Dynamic route match** -- compile the stored patterns into regexes and test the request path.
4. **404** -- serve `404.html` if it exists, otherwise a plain 404 response.

The pattern compilation replaces each `:param` with `[^/]+`:

```
/facility/:id  ->  /^\/facility\/[^/]+$/
```

When a match is found, the server serves the static file from the `to` path. The actual
parameter value is not extracted or forwarded -- the static file is responsible for reading
the URL on the client side.

## Frontend Integration (Next.js Example)

This pattern works well with Next.js static export (`output: "export"` in `next.config.ts`).

### The `_` Placeholder Trick

Next.js static export requires `generateStaticParams()` to know which dynamic pages to
pre-render. Since we want a single catch-all template (not one HTML file per ID), we return
a single placeholder value `_`:

```tsx
// app/facility/[id]/layout.tsx
export function generateStaticParams() {
  return [{ id: '_' }];
}
```

This causes Next.js to emit `facility/_.html` -- a single pre-rendered shell. The
goobernetes `dynamic-route` then maps all `/facility/*` requests to that one file.

### Client-Side Data Loading

The static HTML shell hydrates in the browser and reads the actual ID from the URL:

```tsx
// app/facility/[id]/page.tsx
export default function FacilityPage({ params }: { params: { id: string } }) {
  // params.id comes from the URL at runtime (e.g. "110000123")
  // Fetch data from the API using this ID
  useEffect(() => {
    fetch(`/api/facilities/${params.id}`).then(/* ... */);
  }, [params.id]);
}
```

## Full Request Flow

```
Browser requests:  /facility/110000123
        |
        v
goob-static-web-server receives request
        |
        v
No literal file at /facility/110000123 -- skip
No file at /facility/110000123.html    -- skip
        |
        v
Dynamic route match:
  /facility/:id  matches  /facility/110000123
  -> serve /facility/_.html
        |
        v
Browser receives pre-built HTML + JS bundle
        |
        v
React hydrates, reads "110000123" from URL
        |
        v
Client fetches /api/facilities/110000123
        |
        v
Page renders with live data
```

## Usage in envscore.com

The `envscore.com` project uses this pattern with two dynamic routes defined in
`deploy-frontend.goob`:

| Pattern | Static File | Purpose |
|---------|------------|---------|
| `/facility/:id` | `/facility/_.html` | Facility detail pages (risk scores, violations) |
| `/dashboard/jobs/:id` | `/dashboard/jobs/_.html` | Batch job result pages |

Both pages are client-rendered React components that fetch data from backend API endpoints
at runtime. The static shell provides the layout, loading states, and JS bundles, while
the actual content is loaded dynamically.
