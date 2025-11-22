import fs from 'fs';
import crypto from 'crypto';

export function getFileHash(path: string) {
    return new Promise<string>((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const rs = fs.createReadStream(path);
        rs.on('error', (err: any) => {
            if (err.code === 'ENOENT') {
                resolve(null);
            } else {
                reject(err);
            }
        });
        rs.on('data', (chunk: Buffer) => hash.update(new Uint8Array(chunk)));
        rs.on('end', () => resolve(hash.digest('hex')));
   });
}