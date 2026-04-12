
import { fileExists, getFileHash } from '@facetlayer/file-manifest';
import { getDatabase } from './Database.ts';
import { databaseCleanup } from './databaseCleanup.ts';
import { getPathInDeploymentDir } from './deployDirs.ts';

interface VerifyDeploymentResponse {
    status: 'success' | 'error';
    error?: string;
}

const HASH_CONCURRENCY = 20;
const PROGRESS_LOG_INTERVAL_FILES = 500;
const PROGRESS_LOG_INTERVAL_MS = 5000;

async function withConcurrencyLimit<T>(
    tasks: (() => Promise<T>)[],
    limit: number
): Promise<T[]> {
    const results: T[] = new Array(tasks.length);
    let nextIndex = 0;

    async function worker() {
        while (nextIndex < tasks.length) {
            const index = nextIndex++;
            results[index] = await tasks[index]();
        }
    }

    const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
    await Promise.all(workers);
    return results;
}

export async function verifyDeployment({deployName}: { deployName: string })
    : Promise<VerifyDeploymentResponse> {

    const db = getDatabase();

    if (!deployName) {
        throw new Error('deployName is required');
    }

    const { manifest_json } = db.get(`select manifest_json from deployment where deploy_name = ?`, [deployName]);
    const manifest = JSON.parse(manifest_json || '[]');

    const missingFileCount = db.count(`from deployment_needed_file where deploy_name = ?`, [deployName]);

    if (missingFileCount > 0) {
        console.log(`Deployment verification failed: ${deployName} - ${missingFileCount} files are missing`);
        return {
            status: 'error',
            error: `Incomplete deployment: ${missingFileCount} files are missing`,
        }
    }

    const total = manifest.length;
    console.log(`Verifying deployment ${deployName}: hashing ${total} files...`);

    let verified = 0;
    let lastProgressTime = Date.now();

    // Build tasks for parallel hashing with a concurrency limit.
    // Each task returns null on success or an error string on failure.
    const tasks: (() => Promise<string | null>)[] = manifest.map((item: { relPath: string; sha: string }) => async () => {
        const localPath = getPathInDeploymentDir(deployName, item.relPath);

        if (!await fileExists(localPath)) {
            console.log(`Deployment verification failed: ${deployName} - file is missing: ${item.relPath}`);
            return `Incomplete deployment: file is missing: ${item.relPath}`;
        }

        const sha = await getFileHash(localPath);

        if (sha !== item.sha) {
            console.log(`Deployment verification failed: ${deployName} - file has wrong contents: ${item.relPath}`);
            return `Incomplete deployment: file has wrong contents: ${item.relPath}`;
        }

        verified++;

        const now = Date.now();
        if (verified % PROGRESS_LOG_INTERVAL_FILES === 0 || (now - lastProgressTime) >= PROGRESS_LOG_INTERVAL_MS) {
            console.log(`Verifying deployment ${deployName}: ${verified}/${total} files verified...`);
            lastProgressTime = now;
        }

        return null;
    });

    const results = await withConcurrencyLimit(tasks, HASH_CONCURRENCY);

    const firstError = results.find(r => r !== null);
    if (firstError) {
        return {
            status: 'error',
            error: firstError,
        };
    }

    console.log(`Deployment verification complete: ${deployName} - all ${total} files verified`);

    db.run(`delete from deployment_pending_multi_part_file_chunk where deploy_name = ?`, [deployName]);

    await databaseCleanup();

    return {
        status: 'success',
    }
}
