import { getDatabase } from '../server/Database.ts';
import Fs from 'fs';
import Path from 'path';

export function setDeploymentsDir(dir: string): void {
    const absolutePath = Path.resolve(dir);

    // Verify the directory exists
    if (!Fs.existsSync(absolutePath)) {
        throw new Error(`Directory does not exist: ${absolutePath}`);
    }

    const stat = Fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${absolutePath}`);
    }

    const db = getDatabase();

    // Clear existing and insert new
    db.run(`delete from deployments_dir`, []);
    db.run(`insert into deployments_dir (deployments_dir, created_at) values (?, datetime('now'))`, [
        absolutePath,
    ]);

    console.log(`Deployments directory set to: ${absolutePath}`);
}
