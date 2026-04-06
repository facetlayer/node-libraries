import Path from 'path';

export interface SecurityScanOptions {
    ignorePaths?: string[];
}

// Files that should never be deployed (exact basename or path match)
export const DISALLOWED_FILES = [
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
    'secrets.json',
    'credentials.json',
    'database.env',
    '.npmrc',
    '.yarnrc',
    '.docker',
    'docker-compose.override.yml'
];

// Patterns matched against the full file path
export const DISALLOWED_PATH_PATTERNS = [
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
];

// Keyword patterns matched only against the basename to avoid false positives
// on directory names like "forgot-password/" or "reset-password/"
export const DISALLOWED_BASENAME_PATTERNS = [
    /secret/i,           // any file with "secret" in basename
    /credential/i,       // any file with "credential" in basename
    /password/i,         // any file with "password" in basename
];

function isIgnored(file: string, ignorePaths: string[]): boolean {
    for (const ignorePath of ignorePaths) {
        if (file === ignorePath || file.startsWith(ignorePath + '/')) {
            return true;
        }
    }
    return false;
}

export function validateFileList(files: string[], options?: SecurityScanOptions): void {
    const ignorePaths = options?.ignorePaths ?? [];
    const dangerousFiles: string[] = [];

    for (const file of files) {
        if (isIgnored(file, ignorePaths)) {
            continue;
        }

        const basename = Path.basename(file);
        const fullPath = file;

        // Check exact matches
        if (DISALLOWED_FILES.includes(basename) || DISALLOWED_FILES.includes(fullPath)) {
            dangerousFiles.push(file);
            continue;
        }

        // Check path patterns (matched against full path and basename)
        let matched = false;
        for (const pattern of DISALLOWED_PATH_PATTERNS) {
            if (pattern.test(fullPath) || pattern.test(basename)) {
                dangerousFiles.push(file);
                matched = true;
                break;
            }
        }
        if (matched) continue;

        // Check basename-only keyword patterns (avoids false positives on directory names)
        for (const pattern of DISALLOWED_BASENAME_PATTERNS) {
            if (pattern.test(basename)) {
                dangerousFiles.push(file);
                break;
            }
        }
    }

    if (dangerousFiles.length > 0) {
        throw new Error(`Security Error: The following files should not be deployed as they may contain sensitive information:\n${dangerousFiles.map(f => `  - ${f}`).join('\n')}\n\nPlease add these files to your exclude rules in the config file, or use ignore-security-scan in deploy-settings to allowlist specific paths.`);
    }
}
