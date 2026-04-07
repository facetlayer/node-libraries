
import Fs from 'fs/promises';
import Path from 'path';
import { setupEmptyDirectories,  } from '@facetlayer/file-manifest';
import { getDatabase, getDeploymentsDir, takeNextDeployId } from './Database.ts';
import { CreateDeploymentParams, DeploymentCreatedEvent, } from '../shared/rpc-types.ts';
import { parseFile } from '@facetlayer/qc';
import { databaseCleanup } from './databaseCleanup.ts';

async function mkdirp(dir: string) {
    try {
        await Fs.mkdir(dir);
    } catch (e) {}
}

export async function createDeployment({projectName, sourceFileManifest, sourceFileConfig}: CreateDeploymentParams)
    : Promise<DeploymentCreatedEvent> {

    await databaseCleanup();

    const deployId = takeNextDeployId();
    const deployName = `${projectName}-${deployId}`;
    
    const parsedConfig = parseFile(sourceFileConfig);
    let webStaticDir: string | undefined;
    let isUpdateInPlace = false;
    const dynamicRoutes: { pattern: string, file: string }[] = [];

    for (const rule of parsedConfig) {
        if (rule.command === 'deploy-settings') {
            if (rule.hasAttr('update-in-place')) {
                isUpdateInPlace = true;
            }
            if (rule.hasAttr('web-static-dir')) {
                webStaticDir = rule.getStringValue('web-static-dir');
            }
        }
        if (rule.command === 'dynamic-route') {
            const from = rule.getStringValue('from');
            const to = rule.getStringValue('to');
            if (from && to) {
                dynamicRoutes.push({ pattern: from, file: to });
            }
        }
    }

    // Set up project if needed
    const projectRecord = getDatabase().get(`select * from project where project_name = ?`, [projectName]);
    if (!projectRecord) {
        getDatabase().insert('project', {
            project_name: projectName,
            created_at: new Date().toISOString(),
        });
    }

    const deployDir = isUpdateInPlace ? projectName : deployName;
    const fullDeployDir = Path.join(getDeploymentsDir(), deployDir);

    // Create a deployment record
    const deploymentRecord = {
        deploy_name: deployName,
        deploy_dir: deployDir,
        project_name: projectName,
        web_static_dir: webStaticDir,
        dynamic_routes_json: dynamicRoutes.length > 0 ? JSON.stringify(dynamicRoutes) : null,
        created_at: new Date().toISOString(),
        source_config_file: sourceFileConfig,
        manifest_json: JSON.stringify(sourceFileManifest),
    };

    getDatabase().insert('deployment', deploymentRecord);

    // Set up directories
    console.log('Setting up new deployment at: ', fullDeployDir);
    await mkdirp(fullDeployDir);
    await setupEmptyDirectories(fullDeployDir, sourceFileManifest);

    console.log('Deployment created:', deployName);
    return {
        t: 'deployment_created',
        deployName,
    }
}

