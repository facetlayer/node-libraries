import Fs from 'fs/promises';
import Path from 'path';
import { setupClient } from './clientSetup.ts';

export interface CopyBackOptions {
    configFilename: string;
    filename: string;
    overrideDest?: string;
}

export async function copyBack(options: CopyBackOptions) {
    const { filename } = options;
    const { projectName, destUrl, localDir, client } = await setupClient(options);

    console.log(`Downloading ${filename} from ${projectName} at ${destUrl}...`);

    const result = await client.downloadFile({
        projectName,
        relPath: filename,
    });

    const localPath = Path.join(localDir, filename);

    // Ensure the parent directory exists
    await Fs.mkdir(Path.dirname(localPath), { recursive: true });

    const content = Buffer.from(result.contentBase64, 'base64');
    await Fs.writeFile(localPath, content);

    console.log(`Saved to ${localPath}`);
}
