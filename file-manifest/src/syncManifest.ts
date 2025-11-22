

import Path from 'path'
import Fs from 'fs/promises'
import { Stream } from '@facetlayer/streams'
import { getFileHash } from './getFileHash'
import { FileList } from './FileList'
import { setupEmptyDirectories } from './setupEmptyDirectories'

export async function getSourceManifest(sources: FileList) {
    const manifest = new FileList();
    let promises = [];

    for (const source of sources.each()) {
        promises.push((async () => {
            manifest.insert({
                id: source.id,
                sourcePath: source.sourcePath,
                relPath: source.relPath,
                sha: await getFileHash(source.sourcePath),
            });
        })());
    }

    await Promise.all(promises);
    return manifest;
}

async function deleteExtraFiles(targetDir: string, manifest: FileList) {
    // TODO
}

async function getOptionalFileHash(localPath: string) {
    try {
        return await getFileHash(localPath);
    } catch (e) {
        return null;
    }
}

export async function checkManifest(targetDir: string, manifest: FileList) {
    const promises = [];
    const errors = [];
    for (const file of manifest.each()) {
        promises.push((async () => {
            const localPath = Path.join(targetDir, file.relPath);
            const localSha = await getOptionalFileHash(localPath);

            if (!localSha) {
                errors.push("Missing local file: " + file.relPath);
            } else if (localSha !== file.sha) {
                errors.push("Local file has wrong content: " + file.relPath);
            }
        })());
    }

    await Promise.all(promises);
    return {
        ok: errors.length === 0,
        errors
    };
}

/*
 * syncManifest
 *
 * Takes a file manifest and syncs all the listed files to a target directory.
 */

export interface SyncManifestOptions {
    // Target directory to sync to.
    targetDir: string

    // The file manifest
    manifest: FileList

    // The local source directory to borrow files from. Whenever a file is missing,
    // the script will first check if there is a file with the same path and same hash
    // in this directory. If so, the file will be copied from the local source directory.
    localSourceDir?: string

    responseStream: Stream
}

export async function syncManifest(options: SyncManifestOptions) {
    await setupEmptyDirectories(options.targetDir, options.manifest.each());

    // Check the sha of every incoming file
    const promises = [];
    for (const file of options.manifest.each()) {
        promises.push((async () => {
            const localPath = Path.join(options.targetDir, file.relPath);
            const localSha = await getOptionalFileHash(localPath);

            if (localSha && localSha === file.sha) {
                // Existing file is good.
                return;
            }

            if (options.localSourceDir) {
                const localBorrowPath = Path.join(options.localSourceDir, file.relPath);
                const borrowPathSha = await getOptionalFileHash(localBorrowPath);
                if (borrowPathSha && borrowPathSha === file.sha) {
                    // We can use the borrow file.
                    // Future: could speed this up with `ln` ?
                    await Fs.copyFile(localBorrowPath, localPath);
                    return;
                }
            }

            // Need the file.
            let reason = (localSha === null) ? 'missing' : 'changed';
            options.responseStream.item({ t: 'need_file', relPath: file.relPath, reason });
        })());
    }

    await deleteExtraFiles(options.targetDir, options.manifest);
    await Promise.all(promises);

    options.responseStream.done();
}
