import Fs from 'fs/promises';

export async function mkdirp(path: string) {
    try {
        await Fs.mkdir(path, { recursive: true });
    } catch (e) {
        if (e.code !== 'EEXIST') {
            throw e;
        }
    }
}