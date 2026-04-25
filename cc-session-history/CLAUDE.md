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

## Two layers of tests

The library has two complementary styles of tests:

1. **Pure unit tests** — exercise a single function with hand-built inputs and
   no filesystem I/O. Used for logic that is easy to isolate, like
   `annotateMessages` (annotation rules, permission tracking) and
   `pathToProjectDir` (path normalization). These tests construct
   `ChatMessage` values inline (see the `makeMessage` helper in
   `annotateMessages.test.ts`) and assert on the mutated/returned data.

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
```

Each `.jsonl` is hand-crafted to exercise a specific edge case (snapshots,
hooks, terminal control, empty files, missing fields, parent/child UUID
chains, usage stats, version strings). When you need to cover a new edge case,
prefer adding a new fixture file over inventing one mid-test.

## Anonymized CLI fixtures

`test/fixtures/cli-claude/` contains anonymized copies of real Claude Code
sessions, used exclusively by `cli.test.ts`. They are produced by
`test/sanitize-real-sessions.mts`, which:

- Reads each input session file passed on the command line.
- Replaces `cwd`, `gitBranch`, user/assistant text, tool inputs, tool
  results, hook commands, thinking blobs, and any `~/.claude` path
  references with placeholders.
- Drops message types the project's Zod schema doesn't yet model
  (`attachment`, `permission-mode`, `last-prompt`) so `check-schema`
  reports zero errors against the fixtures.
- Writes the result to
  `test/fixtures/cli-claude/projects/<fixture-project>/<basename>`.

The script takes `<source-path>:<fixture-project-dir>` pairs as positional
args, so it has no knowledge of any developer's specific local project
names. Example:

```bash
node --experimental-strip-types test/sanitize-real-sessions.mts \
  ~/.claude/projects/<some-project>/<session>.jsonl:-Users-test-project-tools \
  ~/.claude/projects/<other-project>/<session>.jsonl:-Users-test-project-app
```

Each output project dir name should follow Claude Code's hyphen-separated
convention (e.g. `-Users-test-project-app`); the script derives the
fixture's synthetic `cwd` from it.

Always inspect the regenerated `.jsonl` files before committing — confirm no
PII (paths, names, prompts) leaks through. The script is the source of
truth; the generated fixtures are also committed so tests don't depend on
the developer's local sessions.

## Adding a new test

- **Pure logic** (annotators, formatters, parsers that take in-memory data):
  add a `*.test.ts` next to the source file and build inputs inline. Look at
  `annotateMessages.test.ts` for the `makeMessage` factory pattern.
- **Anything that reads session files**: pass `claudeDir: fixturesDir` so the
  function reads from `test/fixtures/claude` instead of the user's real
  `~/.claude`. If you need a new session shape, add a `.jsonl` fixture under
  the appropriate `test-project-*/` directory and reference it by session id.
- **Schema coverage**: there is no direct unit test for `Schemas.ts`. The
  fixture-based tests exercise it indirectly (every fixture line gets parsed),
  and `./src/cli.ts check-schema` validates against the user's real session
  files. When adding a schema field, add or extend a fixture line that
  contains the new field so the parser is exercised in tests.

## Known testing gaps

`cli.ts` is now smoke-covered by `cli.test.ts` (every command runs
end-to-end via subprocess against the cli-claude fixtures), but the
following are still uncovered or only covered transitively:

- **`searchSessions.ts`** — only the CLI-level happy/empty paths are
  covered; the in-memory `searchSessions()` API has no direct tests.
- **`summarizeSessions.ts`** — same: covered only via `cli summarize`.
- **`listPermissionChecks.ts`** — fixtures don't yet contain a permission
  rejection, so `cli list-permission-checks` is a no-op smoke test.
- **`printProjects.ts` / `printChatSessions.ts` rendering** — exercised via
  the CLI tests but no direct unit tests on the formatters.
- **`TextGrid.ts`** — table layout helper, no tests.
- **`Schemas.ts`** — only exercised transitively. A malformed-input fixture
  would catch schema regressions earlier than the `check-schema` CLI does.

When touching any of the above, consider adding either a fixture-based
unit test (for the in-memory API) or an extra case in `cli.test.ts` (for
end-to-end behavior).
