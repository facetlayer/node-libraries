

import Path from 'path'
import Fs from 'fs/promises'
import picomatch from 'picomatch';
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
        // Returns whether the file should be included (based on the config rules).
        // Exclude rules take priority over include rules.
        const relPath = getRelPath(localPath);

        for (const rule of rules) {
            if ((rule.type === RuleType.Exclude || rule.type === RuleType.Ignore) && picomatch.isMatch(relPath, rule.pattern))
                return false;
        }

        for (const rule of rules) {
            if (rule.type === RuleType.Include && picomatch.isMatch(relPath, rule.pattern))
                return true;
        }

        return defaultValue;
    }

    function couldContainMatch(dirRelPath: string, pattern: string): boolean {
        // Check if a directory could contain files that match the given pattern
        // by walking through path segments and pattern segments together.
        const dirParts = dirRelPath.split('/');
        const patParts = pattern.split('/');

        let pi = 0;
        let di = 0;

        while (di < dirParts.length && pi < patParts.length) {
            if (patParts[pi] === '**') {
                // ** can match any number of segments - directory could contain matches
                return true;
            }
            if (picomatch.isMatch(dirParts[di], patParts[pi])) {
                di++;
                pi++;
            } else {
                return false;
            }
        }

        // If we consumed all dir segments and still have pattern segments left,
        // then this directory is an ancestor of potential matches.
        return di === dirParts.length && pi < patParts.length;
    }

    function isAncestorOfInclude(localPath: string) {
        // Check if this directory is an ancestor of any include pattern, so we
        // know to traverse into it even when it's not directly included.
        const relPath = getRelPath(localPath);

        for (const rule of rules) {
            if (rule.type === RuleType.Include && couldContainMatch(relPath, rule.pattern))
                return true;
        }

        return false;
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

            if (await isDirectory(localSubFile)) {
                if (shouldInclude(localSubFile, assumeIncludeContents)) {
                    await recursiveIncludeSubDirectory(localSubFile, true);
                } else if (isAncestorOfInclude(localSubFile)) {
                    await recursiveIncludeSubDirectory(localSubFile, false);
                }
                continue;
            }

            if (!shouldInclude(localSubFile, assumeIncludeContents)) {
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
