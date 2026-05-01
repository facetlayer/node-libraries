# Unreleased
 - Per-session audit metrics on row-oriented commands. `list-sessions --json` and
   `get-skill-runs --json` now embed `toolErrors`, `interruptCount`, `durationMs`,
   `permissionRejections`, `firstUserPrompt`, `skillsInvoked`, and `toolCounts`
   on each row. Auditing N sessions no longer requires N follow-up `summarize`
   calls.
 - **Breaking**: harmonized field names across the list-style commands so
   jq/Python consumers don't have to special-case per command:
   - `list-skills` rows: `invocationCount` → `runCount`, `lastSeen` → `lastRun`.
   - `list-routines` rows: `routineName` → `name` (matches `list-skills.name`).
   - `get-skill-runs` rows: `scheduledTaskName` → `routineName`.
 - **Breaking**: `list-skills`, `list-routines`, and `get-skill-runs` now wrap
   their `--json` output in a `{ total, items, ... }` envelope (matching what
   `list-sessions --json` already did). `get-skill-runs --json` additionally
   exposes `offset`, `limit`, and `matchedRoutine`. `list-sessions --json`
   adds `items` alongside the legacy `sessions` key for forward compat.
 - `get-skill-runs <name>` falls back to matching `<name>` as a routine name
   when no skill invocation matches, and surfaces the fallback via the
   `matchedRoutine` flag in the JSON envelope. Routines whose `<scheduled-task name>`
   differs from their skill basename now resolve without the caller having to
   know which name to pass.
 - `summarize` attributes the `Skill` tool by name in its `tools:` line
   (renders `Skill[load-testing]=1` instead of the bare `Skill=1`), and exposes
   the same data structurally via `SessionSummary.skillToolInvocations`.
 - Added `--jsonl` to `list-sessions`, `list-skills`, `list-routines`, and
   `get-skill-runs` for one-record-per-line output that pipes cleanly into
   `jq -c`.
 - `--version` now reads from package.json instead of a hard-coded constant
   that drifted across releases.
 - Exported `computeSessionMetrics` and `SessionMetrics` from the public API.

# 0.2.0
 - Added skill and Claude-Routine awareness:
   - New CLI commands: `list-skills`, `list-routines`, `get-skill-runs`
   - New filter flags on `list-sessions`, `search`, `summarize`, `list-permission-checks`: `--skill`, `--routine`, `--routine-name`, `--entrypoint`, `--since`, `--until`
   - `ChatSession` now carries `entrypoint`, `scheduledTask`, and `skillsUsed` fields populated from the session messages
   - Exported `extractSessionMetadata`, `filterSessions`, `parseTimeBound`, `listSkills`, `listRoutines`, `getSkillRuns`, `listAllSessions`
 - Added `--json` and `--count` output modes to `list-sessions`, `search`, `list-permission-checks`, and the new commands
 - Added `--offset` to `search`, `list-permission-checks`, and `summarize` for pagination
 - Added `summarize` command that produces a compact digest of sessions (user prompts, tool counts, errors, permission rejections)
 - Fixed `list-sessions --project` bug where project names starting with `-` were misinterpreted as CLI flags by yargs, causing all projects to return the same sessions
 - Changed `--project` from a positional argument to a named option (with `-p` alias) for consistency with `get-chat --session`
 - `list-permission-checks` now shows both approved and rejected permission checks (previously only showed rejected)
 - Added `outcome` field to `PermissionCheck` type (`'approved' | 'rejected'`)
 - Added `permissionMode` tracking from session data to determine which tools require permission
 - Exported `toolNeedsPermission` utility function
