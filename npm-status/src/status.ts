import { runShellCommand } from '@facetlayer/subprocess-wrapper';
import * as fs from 'fs';
import * as path from 'path';

export interface PublishStatus {
  packageName: string;
  localVersion: string;
  npmVersion: string | null;
  npmLastPublished: Date | null;
  hasVersionDiff: boolean;
  hasUncommittedChanges: boolean;
  hasUnpublishedCommits: boolean;
  gitCommitsSincePublish: string[];
}

interface PackageJson {
  name: string;
  version: string;
}

interface NpmInfoResult {
  version: string;
  time?: Record<string, string>;
}

function readPackageJson(dir: string): PackageJson {
  const packageJsonPath = path.join(dir, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(`No package.json found in ${dir}`);
  }

  const content = fs.readFileSync(packageJsonPath, 'utf-8');
  return JSON.parse(content);
}

async function getNpmInfo(packageName: string): Promise<NpmInfoResult | null> {
  const result = await runShellCommand('npm', ['info', packageName, '--json']);

  if (result.exitCode !== 0) {
    // Package may not exist on npm yet
    return null;
  }

  try {
    return JSON.parse(result.stdoutAsString());
  } catch {
    return null;
  }
}

async function getGitChangesInDir(dir: string): Promise<string[]> {
  // Get uncommitted changes for files in this directory only
  const result = await runShellCommand('git', ['status', '--porcelain', '--', dir]);

  if (result.exitCode !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout.filter((line: string) => line.trim().length > 0);
}

async function getGitCommitsSince(dir: string, since: Date): Promise<string[]> {
  const sinceStr = since.toISOString();

  // Get commits that touch files in this directory since the given date
  const result = await runShellCommand('git', [
    'log',
    '--oneline',
    `--since=${sinceStr}`,
    '--',
    dir
  ]);

  if (result.exitCode !== 0 || !result.stdout) {
    return [];
  }

  return result.stdout.filter((line: string) => line.trim().length > 0);
}

export async function getPublishStatus(dir: string = process.cwd()): Promise<PublishStatus> {
  const packageJson = readPackageJson(dir);
  const npmInfo = await getNpmInfo(packageJson.name);

  const uncommittedChanges = await getGitChangesInDir(dir);

  let npmLastPublished: Date | null = null;
  let gitCommitsSincePublish: string[] = [];

  if (npmInfo?.time && npmInfo.version) {
    const publishTimeStr = npmInfo.time[npmInfo.version];
    if (publishTimeStr) {
      npmLastPublished = new Date(publishTimeStr);
      gitCommitsSincePublish = await getGitCommitsSince(dir, npmLastPublished);
    }
  }

  return {
    packageName: packageJson.name,
    localVersion: packageJson.version,
    npmVersion: npmInfo?.version ?? null,
    npmLastPublished,
    hasVersionDiff: npmInfo?.version !== packageJson.version,
    hasUncommittedChanges: uncommittedChanges.length > 0,
    hasUnpublishedCommits: gitCommitsSincePublish.length > 0,
    gitCommitsSincePublish,
  };
}

export function printStatus(status: PublishStatus): void {
  console.log(`\nPackage: ${status.packageName}`);
  console.log(`Local version: ${status.localVersion}`);
  console.log(`NPM version: ${status.npmVersion ?? '(not published)'}`);

  if (status.npmLastPublished) {
    console.log(`Last published: ${status.npmLastPublished.toISOString()}`);
  }

  console.log('');

  // Summary
  const issues: string[] = [];

  if (status.hasVersionDiff) {
    if (status.npmVersion === null) {
      issues.push('Package not yet published to NPM');
    } else {
      issues.push(`Version differs: local=${status.localVersion}, npm=${status.npmVersion}`);
    }
  }

  if (status.hasUncommittedChanges) {
    issues.push('Has uncommitted changes in directory');
  }

  if (status.hasUnpublishedCommits) {
    issues.push(`Has ${status.gitCommitsSincePublish.length} commits since last publish`);
  }

  if (issues.length === 0) {
    console.log('Status: Up to date with NPM');
  } else {
    console.log('Issues:');
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }

    if (status.gitCommitsSincePublish.length > 0) {
      console.log('\nCommits since last publish:');
      for (const commit of status.gitCommitsSincePublish.slice(0, 10)) {
        console.log(`  ${commit}`);
      }
      if (status.gitCommitsSincePublish.length > 10) {
        console.log(`  ... and ${status.gitCommitsSincePublish.length - 10} more`);
      }
    }
  }
}
