import Path from 'path';
import { setupEmptyDirectories } from '@facetlayer/file-manifest';
import { getDatabase, getDeploymentsDir } from './Database.ts';
import { FinalizeManifestParams, FileEntry } from '../shared/rpc-types.ts';

export async function finalizeManifest({ deployName }: FinalizeManifestParams) {
    const db = getDatabase();
    const deployment = db.get(`select * from deployment where deploy_name = ?`, [deployName]);

    if (!deployment) {
        throw new Error(`Deployment not found: ${deployName}`);
    }

    const manifest: FileEntry[] = JSON.parse(deployment.manifest_json);
    const fullDeployDir = Path.join(getDeploymentsDir(), deployment.deploy_dir);

    await setupEmptyDirectories(fullDeployDir, manifest);

    console.log(`Manifest finalized for ${deployName} with ${manifest.length} files`);
}
