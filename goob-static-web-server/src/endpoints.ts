import fs from 'fs/promises'
import Path from 'path'
import { Express } from 'express'
import { ActiveDeployment, getDatabase } from './Database'
import { getDeploymentWebStaticDir, } from './deploymentFiles'

export interface Options {
}

export function setupStaticWebEndpoints(app: Express, options: Options) {
    app.use('/web/:projectName', async (req, res, next) => {
      const projectName = req.params.projectName
  
      try {
        const db = getDatabase()
  
        // Look up the active deployment for this project
        const activeDeployment: ActiveDeployment | undefined = db.get(`
          SELECT ad.deploy_name, d.deploy_dir, d.web_static_dir
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
        const filePath = Path.join(webStaticDir, req.path)
  
        // Security check: ensure the resolved path is within the static directory
        const resolvedFilePath = Path.resolve(filePath)
        const resolvedStaticDir = Path.resolve(webStaticDir)
        if (!resolvedFilePath.startsWith(resolvedStaticDir)) {
          res.status(403).send('Forbidden')
          return
        }
  
        // Check if file exists
        try {
          await fs.access(filePath)
          res.sendFile(filePath)
        } catch (err) {
          // File not found, try to serve 404.html
          const notFoundPath = Path.join(webStaticDir, '404.html')
          try {
            await fs.access(notFoundPath)
            res.status(404).sendFile(notFoundPath)
          } catch {
            res.status(404).send('File not found')
          }
        }
      } catch (error) {
        console.error('Error serving static file:', error)
        res.status(500).send('Internal server error')
      }
    })
  }
  