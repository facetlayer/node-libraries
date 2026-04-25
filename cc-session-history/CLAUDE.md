# claude-code-session-history

## Running the CLI during development

Run the CLI directly from source:

```bash
./src/cli.ts list-projects
./src/cli.ts list-sessions --project <project-name>
./src/cli.ts get-chat --session <session-id>
```

## Overriding the Claude directory

The CLI reads sessions from `~/.claude` by default. Two overrides exist:

- `--claude-dir <path>` — CLI flag, takes precedence.
- `CC_SESSION_HISTORY_DIR` env var — used when the flag is absent.

Both expect the path to the `.claude` root (the directory that contains
`projects/`), not to `projects/` itself. The env var is what the CLI test
suite uses to point the binary at fixture sessions.

## Schema Validation

This library implements a Zod schema which attempts to capture the data shape
of Claude Code .jsonl files. Since CC is constantly updating, then it's possible
that our schema can be out of date.

The tool has a command to check our schema:

./src/cli.ts check-schema

This will look at every found file and validate it with our schema, and print
errors.

If there are schema errors then the usual next step is to update our schema to
capture the new data shape.

# Testing Strategy

Tests use Vitest. Run with `pnpm test` (which runs `vitest run --testTimeout=30000`).
Test files live next to the code they cover, named `*.test.ts`. Vitest is
configured (in `vitest.config.ts`) to pick up `src/**/*.test.ts` only.

## Test types

The library has two complementary styles of tests:

1. **Pure unit tests** — exercise a single function with hand-built inputs and
   no filesystem I/O.

   To add: add a `*.test.ts` next to the source file.

2. **Fixture-based integration tests** — exercise functions that read Claude's
   on-disk session format. Fixtures live under `test/fixtures/claude/projects/`
   in the same `<project-name>/<session-id>.jsonl` layout that Claude Code uses
   in `~/.claude`. Tests pass `claudeDir: path.join(__dirname, '..', 'test',
   'fixtures', 'claude')` to override the default location. This follows the
   project rule of preferring real files over mocks.

3. **CLI subprocess tests** — `cli.test.ts` exercises `cli.ts` end-to-end by
   spawning it with `@facetlayer/subprocess` and asserting on stdout, stderr,
   and exit code. Tests set `CC_SESSION_HISTORY_DIR` to
   `test/fixtures/cli-claude` so the spawned CLI reads anonymized real
   sessions instead of the user's actual `~/.claude`. See "Anonymized CLI
   fixtures" below for how those were produced.

## Fixture layout

```
test/fixtures/claude/projects/
  test-project-1/
    session-001.jsonl   # baseline user/assistant exchange
    session-002.jsonl   # contains a hook (PreToolUse) message + git branch
    session-003.jsonl   # contains a terminal_control (/clear) message
  test-project-2/
    empty-session.jsonl # exercises the "skip empty file" path
    session-004.jsonl

test/fixtures/cli-claude/
  # Mock directory that matches ~/.claude which contains mock .jsonl session files
  
```
