import Fs from 'fs/promises';
import Path from 'path';
import { fileExists } from "./fileExists";

interface File {
    relPath: string;
}

export async function setupEmptyDirectories(targetDir: string, manifest: Iterable<File>) {
    const neededLocalDirectories = new Set<string>();

    for (const file of manifest) {
        const localPath = Path.join(targetDir, file.relPath);

        // Check every parent directory
        let nextNeededLocalDir = Path.dirname(localPath);

        while (true) {
            if (neededLocalDirectories.has(nextNeededLocalDir)) {
                // Already known
                break;
            }

            if (nextNeededLocalDir === '.' || nextNeededLocalDir === targetDir || !nextNeededLocalDir.startsWith(targetDir)) {
                // Root directory or outside of targetDir
                break;
            }

            neededLocalDirectories.add(nextNeededLocalDir);
            nextNeededLocalDir = Path.dirname(nextNeededLocalDir);
            continue;
        }
    }

    const neededList = Array.from(neededLocalDirectories).sort((a, b) => a.length - b.length);

    for (const dir of neededList) {
        if (!await fileExists(dir)) {
            await Fs.mkdir(dir);
        }
    }
}
