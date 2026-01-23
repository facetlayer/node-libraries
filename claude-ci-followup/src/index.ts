import { runShellCommand } from '@facetlayer/subprocess-wrapper';

export interface CIRunInfo {
  databaseId: number;
  workflowName: string;
  status: string;
  conclusion: string | null;
  headBranch: string;
  url: string;
}

export interface CIFollowupOptions {
  /** Poll interval in milliseconds (default: 10000) */
  pollInterval?: number;
  /** Maximum time to wait in milliseconds (default: 30 minutes) */
  maxWaitTime?: number;
  /** Whether to print status updates (default: true) */
  verbose?: boolean;
  /** Custom prompt to send to Claude (optional) */
  customPrompt?: string;
}

export interface CIFollowupResult {
  success: boolean;
  branch: string;
  run: CIRunInfo | null;
  claudeInvoked: boolean;
  error?: string;
}

export async function getCurrentBranch(): Promise<string> {
  const result = await runShellCommand('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
  if (result.failed()) {
    throw new Error(`Failed to get current branch: ${result.stderrAsString()}`);
  }
  return result.stdoutAsString().trim();
}

export async function getLatestCIRun(branch: string): Promise<CIRunInfo | null> {
  const result = await runShellCommand('gh', [
    'run', 'list',
    '--branch', branch,
    '--limit', '1',
    '--json', 'databaseId,workflowName,status,conclusion,headBranch,url'
  ]);

  if (result.failed()) {
    throw new Error(`Failed to get CI runs: ${result.stderrAsString()}`);
  }

  const runs = JSON.parse(result.stdoutAsString()) as CIRunInfo[];
  return runs.length > 0 ? runs[0] : null;
}

export async function getCIRunStatus(runId: number): Promise<CIRunInfo> {
  const result = await runShellCommand('gh', [
    'run', 'view', String(runId),
    '--json', 'databaseId,workflowName,status,conclusion,headBranch,url'
  ]);

  if (result.failed()) {
    throw new Error(`Failed to get CI run status: ${result.stderrAsString()}`);
  }

  return JSON.parse(result.stdoutAsString()) as CIRunInfo;
}

export async function getCIRunLogs(runId: number): Promise<string> {
  const result = await runShellCommand('gh', [
    'run', 'view', String(runId),
    '--log-failed'
  ]);

  // Even if exitCode is non-zero, we might have useful output
  const logs = result.stdoutAsString();
  if (logs.trim()) {
    return logs;
  }

  // Try getting all logs if --log-failed returns nothing
  const allLogsResult = await runShellCommand('gh', [
    'run', 'view', String(runId),
    '--log'
  ]);

  return allLogsResult.stdoutAsString();
}

export function isRunComplete(run: CIRunInfo): boolean {
  return run.status === 'completed';
}

export function isRunFailed(run: CIRunInfo): boolean {
  return run.status === 'completed' && run.conclusion !== 'success';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function invokeClaude(logs: string, customPrompt?: string): Promise<void> {
  const prompt = customPrompt ||
    'The CI job for the current branch has failed. Please diagnose the following CI logs and suggest fixes:\n\n' +
    logs;

  const result = await runShellCommand('claude', [
    '--print',
    prompt
  ]);

  if (result.failed()) {
    throw new Error(`Failed to invoke Claude: ${result.stderrAsString()}`);
  }

  // Print Claude's response
  console.log(result.stdoutAsString());
}

export async function followupCI(options: CIFollowupOptions = {}): Promise<CIFollowupResult> {
  const {
    pollInterval = 10000,
    maxWaitTime = 30 * 60 * 1000,
    verbose = true,
    customPrompt,
  } = options;

  const log = verbose ? console.log.bind(console) : () => {};

  // Get current branch
  const branch = await getCurrentBranch();
  log(`Checking CI for branch: ${branch}`);

  // Get latest CI run
  let run = await getLatestCIRun(branch);
  if (!run) {
    return {
      success: true,
      branch,
      run: null,
      claudeInvoked: false,
      error: 'No CI runs found for this branch',
    };
  }

  log(`Found CI run: ${run.workflowName} (${run.status})`);
  log(`URL: ${run.url}`);

  // Wait for CI to complete
  const startTime = Date.now();
  while (!isRunComplete(run)) {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxWaitTime) {
      return {
        success: false,
        branch,
        run,
        claudeInvoked: false,
        error: 'Timeout waiting for CI to complete',
      };
    }

    log(`CI still running... (${Math.round(elapsed / 1000)}s elapsed)`);
    await sleep(pollInterval);
    run = await getCIRunStatus(run.databaseId);
  }

  log(`CI completed with conclusion: ${run.conclusion}`);

  // Check if CI failed
  if (isRunFailed(run)) {
    log('CI failed. Fetching logs and invoking Claude...');

    const logs = await getCIRunLogs(run.databaseId);
    await invokeClaude(logs, customPrompt);

    return {
      success: false,
      branch,
      run,
      claudeInvoked: true,
    };
  }

  log('CI passed successfully.');
  return {
    success: true,
    branch,
    run,
    claudeInvoked: false,
  };
}
