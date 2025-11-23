# @facetlayer/goob-static-web-server

Simple Express-based static web server. Uses the Goobernetes deployment
system to find and host static files.

## Usage

```typescript
import express from 'express'
import { setupStaticWebEndpoints } from '@facetlayer/goob-static-web-server'

const app = express()

// Set up static file serving for deployed projects
setupStaticWebEndpoints(app, {
  appName: 'goobernetes',
  deployDir: '/path/to/deployments'
})

app.listen(3000)
```

