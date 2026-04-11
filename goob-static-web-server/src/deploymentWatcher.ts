import { getDatabase } from './Database.ts'

export interface WatcherOptions {
  intervalMs?: number
}

interface ActiveDeploymentSnapshot {
  project_name: string
  deploy_name: string
  updated_at: string
}

/**
 * Polls the active_deployment table and logs whenever the active deployment
 * for a project changes. The static endpoints already read the DB on each
 * request so they pick up changes automatically; this watcher is what
 * surfaces that activity in the server log.
 */
export function startDeploymentWatcher(options: WatcherOptions = {}): () => void {
  const intervalMs = options.intervalMs ?? 2000
  let previous = new Map<string, ActiveDeploymentSnapshot>()
  let initialized = false

  const check = () => {
    try {
      const db = getDatabase()
      const rows: ActiveDeploymentSnapshot[] = db.all(`
        SELECT project_name, deploy_name, updated_at
        FROM active_deployment
      `, [])

      const current = new Map<string, ActiveDeploymentSnapshot>()
      for (const row of rows) {
        current.set(row.project_name, row)
      }

      if (initialized) {
        for (const [project, snap] of current) {
          const prev = previous.get(project)
          if (!prev) {
            console.log(`[deployment-watcher] new active deployment: ${project} -> ${snap.deploy_name}`)
          } else if (prev.deploy_name !== snap.deploy_name || prev.updated_at !== snap.updated_at) {
            console.log(`[deployment-watcher] active deployment changed: ${project} -> ${snap.deploy_name}`)
          }
        }
        for (const [project] of previous) {
          if (!current.has(project)) {
            console.log(`[deployment-watcher] active deployment removed: ${project}`)
          }
        }
      }

      previous = current
      initialized = true
    } catch (err) {
      console.error('[deployment-watcher] error while polling active_deployment:', err)
    }
  }

  check()
  const handle = setInterval(check, intervalMs)
  handle.unref?.()
  return () => clearInterval(handle)
}
