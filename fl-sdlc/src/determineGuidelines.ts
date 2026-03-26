import { runShellCommand } from '@facetlayer/subprocess';

export interface DetermineGuidelinesResult {
  mainBranch: string | null;
  recentCommits: string | null;
  recentPRs: string | null;
}

async function tryCommand(command: string, args: string[]): Promise<string | null> {
  try {
    const result = await runShellCommand(command, args);
    if (result.failed()) {
      return null;
    }
    return result.stdoutAsString().trim() || null;
  } catch {
    return null;
  }
}

export async function determineGuidelines(): Promise<DetermineGuidelinesResult> {
  // Get main branch name
  let mainBranch = await tryCommand('gh', [
    'repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name',
  ]);

  if (!mainBranch) {
    const remoteOutput = await tryCommand('git', ['remote', 'show', 'origin']);
    if (remoteOutput) {
      const match = remoteOutput.match(/HEAD branch:\s*(.+)/);
      if (match) {
        mainBranch = match[1].trim();
      }
    }
  }

  // Get recent commits
  const recentCommits = await tryCommand('git', ['log', '--oneline', '-20']);

  // Get recent merged PRs
  const recentPRs = await tryCommand('gh', [
    'pr', 'list', '--state', 'merged', '--limit', '5', '--json', 'title,body',
  ]);

  return {
    mainBranch,
    recentCommits,
    recentPRs,
  };
}
