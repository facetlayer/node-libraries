import Fs from 'fs/promises';
import Path from 'path';
import { parseFile, Query } from '@facetlayer/qc';
import { resolveFileList, RuleType, FileMatchRule, parseRulesFile } from '@facetlayer/file-manifest';
import { validateFileList } from './securityScan.ts';

export interface FileListOptions {
    configFilename: string;
    localDir?: string;
}

export interface FileListResult {
    files: string[];
    localDir: string;
    projectName: string;
    destUrl: string;
    configText: string;
}

export async function getFileListFromConfig({ configFilename, localDir }: FileListOptions): Promise<FileListResult> {
    const localDirOfConfigFile = Path.dirname(configFilename);
    const configText = await Fs.readFile(configFilename, 'utf-8');
    const configs = parseFile(configText) as Query[];

    let projectName: string;
    let destUrl: string;
    const ignorePaths: string[] = [];
    const resolvedLocalDir = localDir ?? localDirOfConfigFile;

    // Parse deploy settings
    for (const query of configs) {
        if (query.command === 'deploy-settings') {
            projectName = query.getStringValue('project-name');
            destUrl = query.getStringValue('dest-url');

            for (const tag of query.tags) {
                if (tag.attr === 'ignore-security-scan') {
                    ignorePaths.push(tag.value as string);
                }
            }
        }
    }

    // Resolve the file list
    const fileRules = parseRulesFile(configText);
    const sources = await resolveFileList(resolvedLocalDir, fileRules);
    const files = sources.listAll().map(item => item.relPath);

    // Validate that no sensitive files are being deployed
    validateFileList(files, { ignorePaths });

    return {
        files,
        localDir: resolvedLocalDir,
        projectName,
        destUrl,
        configText,
    };
}