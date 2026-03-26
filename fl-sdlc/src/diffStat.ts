import { runShellCommand } from '@facetlayer/subprocess';

export interface DiffStatResult {
  unstaged: string | null;
  staged: string | null;
}

export async function diffStat(): Promise<DiffStatResult> {
  const [unstagedResult, stagedResult] = await Promise.all([
    runShellCommand('git', ['diff', '--stat']),
    runShellCommand('git', ['diff', '--cached', '--stat']),
  ]);

  return {
    unstaged: unstagedResult.stdoutAsString().trim() || null,
    staged: stagedResult.stdoutAsString().trim() || null,
  };
}
