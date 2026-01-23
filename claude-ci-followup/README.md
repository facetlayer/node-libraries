# @facetlayer/claude-ci-followup

CLI tool that monitors GitHub CI jobs for the current branch and automatically triggers Claude to diagnose failures.

## Installation

```bash
npm install -g @facetlayer/claude-ci-followup
```

## Requirements

- [GitHub CLI (`gh`)](https://cli.github.com/) must be installed and authenticated
- [Claude CLI](https://docs.anthropic.com/en/docs/claude-code) must be installed

## Usage

### Watch CI and diagnose failures

Run the tool in your git repository to watch the CI status for the current branch:

```bash
claude-ci-followup
```

Or explicitly use the watch command:

```bash
claude-ci-followup watch
```

The tool will:
1. Detect the current git branch
2. Find the latest CI run for that branch
3. Poll until the CI run completes
4. If the CI fails, fetch the logs and invoke Claude to diagnose the errors

### Options

```
--poll-interval, -i  Poll interval in seconds (default: 10)
--max-wait, -m       Maximum wait time in minutes (default: 30)
--quiet, -q          Suppress status messages
--prompt, -p         Custom prompt to send to Claude
```

### Check CI status

To quickly check the current CI status without waiting:

```bash
claude-ci-followup status
```

## Programmatic API

```typescript
import { followupCI, getCurrentBranch, getLatestCIRun } from '@facetlayer/claude-ci-followup';

// Watch CI and diagnose failures
const result = await followupCI({
  pollInterval: 10000,  // 10 seconds
  maxWaitTime: 1800000, // 30 minutes
  verbose: true,
});

if (result.success) {
  console.log('CI passed!');
} else if (result.claudeInvoked) {
  console.log('CI failed, Claude was invoked to diagnose');
}

// Get current branch
const branch = await getCurrentBranch();

// Get latest CI run
const run = await getLatestCIRun(branch);
```

## License

MIT
