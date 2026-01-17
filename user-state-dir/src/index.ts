import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Get the state directory for an application following XDG standards
 *
 * Priority order:
 * 1. {APPNAME}_STATE_DIR environment variable
 * 2. $XDG_STATE_HOME/{appName}
 * 3. ~/.local/state/{appName} (XDG default)
 *
 * @param appName - Application name used for directory naming
 *                  Example: 'my-awesome-app' -> ~/.local/state/my-awesome-app/
 * @returns The path to the state directory (may not exist yet)
 */
export function getStateDirectory(appName: string): string {
  // Convert appName to uppercase and replace hyphens with underscores for env var
  const envVarName = appName.toUpperCase().replace(/-/g, '_') + '_STATE_DIR'

  // First: Use APP_STATE_DIR if set
  if (process.env[envVarName]) {
    return process.env[envVarName]!
  }

  // Next: Use XDG_STATE_HOME if set
  if (process.env.XDG_STATE_HOME) {
    return path.join(process.env.XDG_STATE_HOME, appName)
  }

  // Default: Use the XDG style default: ~/.local/state/{appName}/
  return path.join(os.homedir(), '.local', 'state', appName)
}

/**
 * Get or create the state directory for an application
 *
 * This function calls getStateDirectory() and ensures the directory exists,
 * creating it recursively if needed.
 *
 * @param appName - Application name used for directory naming
 * @returns The path to the state directory (guaranteed to exist)
 */
export function getOrCreateStateDirectory(appName: string): string {
  const stateDir = getStateDirectory(appName)

  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true })
  }

  return stateDir
}
