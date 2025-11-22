
import { ParsedRules } from './resolveFileList';
import { RuleType } from './FileMatchRule';
import { FileList } from './FileList';
import Path from 'path';
import Fs from 'fs/promises';

async function isDirectory(path: string) {
    try {
        return (await Fs.lstat(path)).isDirectory();
    } catch (e) {
        return false;
    }
}

export async function findLeftoverFiles(targetDir: string, incomingFiles: FileList, ruleConfig: ParsedRules): Promise<FileList> {
    const leftovers = new FileList();
    
    async function scanDirectory(currentDir: string) {
        let dirContents: string[];
        try {
            dirContents = await Fs.readdir(currentDir);
        } catch (e) {
            return;
        }
        
        for (const fileName of dirContents) {
            const fullPath = Path.join(currentDir, fileName);
            const relPath = Path.relative(targetDir, fullPath);
            
            // Check if any rule tells us to ignore this destination file
            let shouldIgnore = false;
            for (const rule of ruleConfig) {
                if ((rule.type === RuleType.IgnoreDestination || rule.type === RuleType.Ignore) && rule.pattern === relPath) {
                    shouldIgnore = true;
                    break;
                }
            }
            
            if (shouldIgnore) {
                continue;
            }
            
            if (await isDirectory(fullPath)) {
                await scanDirectory(fullPath);
            } else {
                // Check if this file exists in incomingFiles
                const exists = incomingFiles.getByRelPath(relPath);
                if (!exists) {
                    leftovers.insert({
                        sourcePath: fullPath,
                        relPath: relPath,
                    });
                }
            }
        }
    }
    
    await scanDirectory(targetDir);
    return leftovers;
}
