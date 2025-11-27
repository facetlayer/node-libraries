import { getDatabase } from './Database'
import type { CommonOptions } from './cli'
import { getDeploymentWebStaticDir } from './deploymentFiles'

interface ActiveDeployment {
  project_name: string
  deploy_name: string
  updated_at: string
}

interface DeploymentDetails {
  deploy_name: string
  project_name: string
  web_static_dir: string | null
  deploy_dir: string
  created_at: string
}

export interface ListOptions extends CommonOptions {
  port: number
}

export async function listDeployments(options: ListOptions): Promise<void> {
  const db = getDatabase()

  // First, get all active deployments
  const activeDeployments: ActiveDeployment[] = db.all(`
    SELECT project_name, deploy_name, updated_at
    FROM active_deployment
    ORDER BY project_name
  `, [])

  if (activeDeployments.length === 0) {
    console.log('No active deployments found.')
    return
  }

  console.log('Active deployments with web static directories:');

  let countFound = 0;

  // For each active deployment, get the deployment details
  for (const activeDeployment of activeDeployments) {
    const deployment: DeploymentDetails | undefined = db.get(`
      SELECT deploy_name, project_name, web_static_dir, deploy_dir, created_at
      FROM deployment
      WHERE deploy_name = ?
    `, [activeDeployment.deploy_name]);

    if (!deployment) {
      console.log(`Warning: Active deployment ${activeDeployment.project_name}/${activeDeployment.deploy_name} not found in deployment table`);
      continue;
    }

    // Skip deployments without web_static_dir
    if (!deployment.web_static_dir) {
      continue;
    }

    const webStaticDir = getDeploymentWebStaticDir(deployment.deploy_name);
    if (webStaticDir === null) {
      console.warn(`skipping ${deployment.deploy_name}: no webStaticDir found?`);
      continue;
    }

    console.log(`  ${deployment.project_name}/${deployment.deploy_name}`)
    console.log(`    URL: http://localhost:${options.port}/web/${deployment.project_name}`)
    console.log(`    Directory: ${webStaticDir}`)
    console.log('');
    countFound++;
  }

  if (countFound === 0) {
    console.log(' (none found)');
  }
}
