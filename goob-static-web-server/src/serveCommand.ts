import express from 'express'
import http from 'http'
import { setupStaticWebEndpoints } from './index'
import { listDeployments } from './listCommand'
import type { CommonOptions } from './cli'

export interface ServeOptions extends CommonOptions {
  port: number
}

export async function serveCommand(options: ServeOptions): Promise<void> {
  const { appName, deployDir, port } = options

  const app = express()
  const server = http.createServer(app)

  setupStaticWebEndpoints(app, { appName, deployDir })

  server.listen(port, async () => {
    console.log(`Static web server listening on port ${port}`)
    console.log(`Serving deployments from: ${deployDir}`)
    console.log(`Using database for app: ${appName}`)
    console.log('')

    // List all deployments on startup
    await listDeployments({ appName, deployDir, port })
  })

  server.on('error', (error: any) => {
    console.error('Server error:', error)
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use!`)
      process.exit(1)
    }
  })
}
