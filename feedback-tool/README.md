# feedback-tool

CLI tool for storing and searching feedback and bug reports. Similar to a lightweight issue tracking system.

## Installation

```bash
pnpm build && npm i -g .
```

## Usage

### Report feedback

Create a new feedback item:

```bash
feedback report -l <library> -d <description> [options]
```

Options:
- `-l, --library` (required): Target library name
- `-d, --description` (required): Feedback description
- `-s, --severity`: Severity level (critical, high, medium, low, positive). Default: medium
- `-c, --context`: Additional context (e.g., stack trace, environment)
- `-u, --user`: User who reported the feedback

Examples:

```bash
# Report a bug
feedback report -l my-library -d "Function throws error on empty input" -s high

# Report with context
feedback report -l api-client -d "Timeout on large requests" -s critical -c "Happens with payloads > 1MB" -u alice

# Report positive feedback
feedback report -l utils -d "Great error messages, very helpful!" -s positive -u bob
```

### List feedback

Search and list feedback items:

```bash
feedback list [options]
```

Options:
- `-l, --library`: Filter by library name
- `-s, --severity`: Filter by severity level
- `-u, --user`: Filter by user
- `-n, --limit`: Number of items per page (default: 20)
- `-p, --page`: Page number, 1-based (default: 1)

Examples:

```bash
# List all feedback
feedback list

# List feedback for a specific library
feedback list -l my-library

# List only critical issues
feedback list -s critical

# Paginate through results
feedback list -n 10 -p 2
```

## Data Storage

Feedback is stored in a SQLite database at `~/.local/state/feedback-tool/db.sqlite` (following XDG standards).

## Development

```bash
pnpm build   # Build the project
pnpm test    # Run tests
```
