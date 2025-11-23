import Fs from 'fs/promises';
import Path from 'path';
import { parseFile, Query } from '@facetlayer/qc';
import { resolveFileList, RuleType, FileMatchRule, parseRulesFile } from '@facetlayer/file-manifest';

export interface FileListOptions {
    configFilename: string;
    localDir?: string;
}

export interface FileListResult {
    files: string[];
    localDir: string;
    projectName: string;
    destUrl: string;
}

// Files that should never be deployed (for one reason or another)
const DISALLOWED_FILES = [
    '.env',
    '.env.local',
    '.env.development',
    '.env.production',
    '.env.test',
    '.git',
    '.gitignore',
    '.DS_Store',
    'Thumbs.db',
    '.ssh',
    'id_rsa',
    'id_ed25519',
    '.pem',
    '.key',
    '.p12',
    '.pfx',
    'private.key',
    'server.key',
    'ssl.key',
    'certificate.key',
    '.aws',
    '.gcp',
    '.azure',
    'config.json',
    'secrets.json',
    'credentials.json',
    'database.env',
    '.npmrc',
    '.yarnrc',
    '.docker',
    'docker-compose.override.yml'
];

// Security: File patterns that should never be deployed
const DISALLOWED_PATTERNS = [
    /\.env\./,           // .env.anything
    /.*\.pem$/,          // any .pem file
    /.*\.key$/,          // any .key file
    /.*\.p12$/,          // any .p12 file
    /.*\.pfx$/,          // any .pfx file
    /.*_rsa$/,           // SSH keys
    /.*_ed25519$/,       // SSH keys
    /^\.git\//,          // .git directory contents
    /^\.ssh\//,          // .ssh directory contents
    /^\.aws\//,          // AWS config directory
    /^\.gcp\//,          // Google Cloud config
    /^\.azure\//,        // Azure config
    /secret/i,           // any file with "secret" in name
    /credential/i,       // any file with "credential" in name
    /password/i,         // any file with "password" in name
];

function validateFileList(files: string[]): void {
    const dangerousFiles: string[] = [];
    
    for (const file of files) {
        const basename = Path.basename(file);
        const fullPath = file;
        
        // Check exact matches
        if (DISALLOWED_FILES.includes(basename) || DISALLOWED_FILES.includes(fullPath)) {
            dangerousFiles.push(file);
            continue;
        }
        
        // Check patterns
        for (const pattern of DISALLOWED_PATTERNS) {
            if (pattern.test(fullPath) || pattern.test(basename)) {
                dangerousFiles.push(file);
                break;
            }
        }
    }
    
    if (dangerousFiles.length > 0) {
        throw new Error(`Security Error: The following files should not be deployed as they may contain sensitive information:\n${dangerousFiles.map(f => `  - ${f}`).join('\n')}\n\nPlease add these files to your exclude rules in the config file.`);
    }
}

export async function getFileListFromConfig({ configFilename, localDir }: FileListOptions): Promise<FileListResult> {
    const localDirOfConfigFile = Path.dirname(configFilename);
    const configText = await Fs.readFile(configFilename, 'utf-8');
    const configs = parseFile(configText) as Query[];

    let projectName: string;
    let destUrl: string;
    const resolvedLocalDir = localDir ?? localDirOfConfigFile;

    // Parse deploy settings
    for (const query of configs) {
        if (query.command === 'deploy-settings') {
            projectName = query.getStringValue('project-name');
            destUrl = query.getStringValue('dest-url');
        }
    }

    // Resolve the file list
    const fileRules = parseRulesFile(configText);
    const sources = await resolveFileList(resolvedLocalDir, fileRules);
    const files = sources.listAll().map(item => item.relPath);

    // Validate that no sensitive files are being deployed
    validateFileList(files);

    return {
        files,
        localDir: resolvedLocalDir,
        projectName,
        destUrl,
    };
}