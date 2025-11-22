import Fs from 'fs/promises'
export async function fileExists(path: string) {
    try {
        await Fs.stat(path);
        return true;
    } catch (err) {
        return false;
    }
}