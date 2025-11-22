

import Path from 'path'
import Fs from 'fs/promises'
import { FileMatchRule, RuleType } from './FileMatchRule';
import { parseRulesFile } from './parseRulesFile';
import { FileList } from './FileList';

/*
Example config file:

const config = `
    include chrome-extension;
    include src;

    exclude .git;
    exclude chrome-extension/dist;
    exclude src/.rqe-import-settings.rqe;
    exclude src/build/exportSource.ts;
    exclude src/resort-tracker;
    exclude src/web-server;
    exclude src/playback-server;
    exclude src/misc-tasks;
    exclude src/task-schedule;
*/

export type ParsedRules = FileMatchRule[];


async function isDirectory(path: string) {
    return (await Fs.lstat(path)).isDirectory();
}

export async function resolveFileList(sourceDir: string, ruleConfig: string | ParsedRules): Promise<FileList> {

    let rules: ParsedRules;

    if (typeof ruleConfig === 'string') {
        rules = parseRulesFile(ruleConfig);
    } else {
        rules = ruleConfig;
    }

    if (!await isDirectory(sourceDir)) {
        throw new Error('Usage error: sourceDir must be a directory');
    }

    function getRelPath(localPath: string) {
        return Path.relative(sourceDir, localPath);
    }

    function shouldInclude(localPath: string, defaultValue: boolean) {
        // Returns whether the file should be included (based on the config rules)
        const relPath = getRelPath(localPath);

        for (const rule of rules) {
            if (rule.type === RuleType.Include && rule.pattern === relPath)
                return true;
        }

        for (const rule of rules) {
            if ((rule.type === RuleType.Exclude || rule.type === RuleType.Ignore) && rule.pattern === relPath)
                return false;
        }

        return defaultValue;
    }

    async function recursiveIncludeSubDirectory(localDir: string, assumeIncludeContents: boolean) {
        // Include the contents of this directory.
        //
        // assumeIncludeContents:
        //  - Set to 'false' when processing the top-level source directory. We don't include a top
        //    level file unless it is explicitly included.
        //  - Set to 'true' when processing a subdirectory. The subdirectory already matched an
        //    'include' rule so the full recursive contents are included unless otherwise stated.

        const dirContents = await Fs.readdir(localDir);

        for (const dirRelFile of dirContents) {
            const localSubFile = Path.join(localDir, dirRelFile);

            if (!shouldInclude(localSubFile, assumeIncludeContents)) {
                continue;
            }

            if (await isDirectory(localSubFile)) {
                await recursiveIncludeSubDirectory(localSubFile, true);
                continue;
            }

            if (shouldInclude(localSubFile, true)) {
                sourceFiles.insert({
                    sourcePath: localSubFile,
                    relPath: getRelPath(localSubFile),
                });
            }
        }
    }

    // Populate SourceFiles
    const sourceFiles = new FileList();

    await recursiveIncludeSubDirectory(sourceDir, false);

    return sourceFiles;
}
