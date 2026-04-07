import fs from 'fs/promises'
import Path from 'path'
import { Express } from 'express'
import { ActiveDeployment, getDatabase } from './Database'
import { getDeploymentWebStaticDir, } from './deploymentFiles'

export interface Options {
}

interface DynamicRoute {
  pattern: string  // e.g. /facility/:id
  file: string     // e.g. /facility.html
  regex: RegExp
}

function compileDynamicRoutes(json: string | null): DynamicRoute[] {
  if (!json) return []
  try {
    const routes: { pattern: string, file: string }[] = JSON.parse(json)
    return routes.map(r => ({
      ...r,
      regex: new RegExp('^' + r.pattern.replace(/:[^/]+/g, '[^/]+') + '$'),
    }))
  } catch {
    return []
  }
}

function matchDynamicRoute(reqPath: string, routes: DynamicRoute[]): string | null {
  for (const route of routes) {
    if (route.regex.test(reqPath)) {
      return route.file
    }
  }
  return null
}

export function setupStaticWebEndpoints(app: Express, options: Options) {
    app.use('/web/:projectName', async (req, res, next) => {
      const projectName = req.params.projectName

      try {
        const db = getDatabase()

        // Look up the active deployment for this project
        const activeDeployment: ActiveDeployment | undefined = db.get(`
          SELECT ad.deploy_name, d.deploy_dir, d.web_static_dir, d.dynamic_routes_json
          FROM active_deployment ad
          JOIN deployment d ON ad.deploy_name = d.deploy_name
          WHERE ad.project_name = ?
        `, [projectName])

        if (!activeDeployment) {
          res.status(404).send(`Project '${projectName}' not found`)
          return
        }

        if (!activeDeployment.web_static_dir) {
          res.status(404).send(`Project '${projectName}' does not have a web_static_dir configured`)
          return
        }

        const webStaticDir = getDeploymentWebStaticDir(activeDeployment.deploy_name)
        let filePath = Path.join(webStaticDir, req.path)

        // Security check: ensure the resolved path is within the static directory
        const resolvedStaticDir = Path.resolve(webStaticDir)

        function isPathSafe(p: string): boolean {
          return Path.resolve(p).startsWith(resolvedStaticDir)
        }

        if (!isPathSafe(filePath)) {
          res.status(403).send('Forbidden')
          return
        }

        // Try to serve the literal file
        try {
          const stat = await fs.stat(filePath)
          if (stat.isFile()) {
            res.sendFile(Path.resolve(filePath))
            return
          }
          // If it's a directory, try index.html inside it
          if (stat.isDirectory()) {
            const indexPath = Path.join(filePath, 'index.html')
            if (isPathSafe(indexPath)) {
              try {
                await fs.access(indexPath)
                res.sendFile(Path.resolve(indexPath))
                return
              } catch {
                // Fall through
              }
            }
          }
        } catch (err) {
          // File not found - fall through
        }

        // Try appending .html (for paths like /about -> /about.html)
        if (!Path.extname(filePath)) {
          const htmlPath = filePath + '.html'
          if (isPathSafe(htmlPath)) {
            try {
              await fs.access(htmlPath)
              res.sendFile(Path.resolve(htmlPath))
              return
            } catch (err) {
              // Fall through
            }
          }
        }

        // Try dynamic route matching
        const dynamicRoutes = compileDynamicRoutes(activeDeployment.dynamic_routes_json)
        const matchedFile = matchDynamicRoute(req.path, dynamicRoutes)

        if (matchedFile) {
          const dynamicFilePath = Path.join(webStaticDir, matchedFile)
          if (isPathSafe(dynamicFilePath)) {
            try {
              await fs.access(dynamicFilePath)
              res.sendFile(Path.resolve(dynamicFilePath))
              return
            } catch (err) {
              // Mapped file doesn't exist
            }
          }
        }

        // Nothing matched - serve 404.html or plain 404
        const notFoundPath = Path.join(webStaticDir, '404.html')
        try {
          await fs.access(notFoundPath)
          res.status(404).sendFile(Path.resolve(notFoundPath))
        } catch {
          res.status(404).send('File not found')
        }
      } catch (error) {
        console.error('Error serving static file:', error)
        res.status(500).send('Internal server error')
      }
    })
  }
