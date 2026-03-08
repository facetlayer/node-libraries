# tickets-tool

CLI tool for storing and searching tickets and bug reports. Similar to a lightweight issue tracking system.

## Installation

```bash
pnpm build && npm i -g .
```

## Usage

### Report feedback

Create a new ticket:

```bash
tickets report -l <library> -d <description> [options]
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
tickets report -l my-library -d "Function throws error on empty input" -s high

# Report with context
tickets report -l api-client -d "Timeout on large requests" -s critical -c "Happens with payloads > 1MB" -u alice

# Report positive feedback
tickets report -l utils -d "Great error messages, very helpful!" -s positive -u bob
```

### List feedback

Search and list tickets:

```bash
tickets list [options]
```

Options:
- `-l, --library`: Filter by library name
- `-s, --severity`: Filter by severity level
- `-u, --user`: Filter by user
- `-n, --limit`: Number of items per page (default: 20)
- `-p, --page`: Page number, 1-based (default: 1)

Examples:

```bash
# List all tickets
tickets list

# List tickets for a specific library
tickets list -l my-library

# List only critical issues
tickets list -s critical

# Paginate through results
tickets list -n 10 -p 2
```

## Data Storage

Tickets are stored in a SQLite database at `~/.local/state/tickets-tool/db.sqlite` (following XDG standards).

## Development

```bash
pnpm build   # Build the project
pnpm test    # Run tests
```
