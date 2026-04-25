---
name: skill-auditing
description: How to use cc-session-history to audit skill invocations and Claude Routine runs
---

# Auditing Skills and Claude Routines

This guide shows how to use `cc-session-history` to reflect on how a particular
skill — including skills that fire automatically as Claude Routines (scheduled
tasks) — has been behaving. The typical use case is a "retrospective" skill that
looks back at the last N runs of a target skill and surfaces problems such as
missing permission checks, recurring tool errors, or interrupted runs.

## Background

A Claude Code session can invoke a skill in three different ways. The library
detects all three and exposes them under one umbrella:

| Source            | What it looks like in the JSONL                                                                                          |
|-------------------|--------------------------------------------------------------------------------------------------------------------------|
| `slash-command`   | A user message containing `<command-name>/<skill-name></command-name>`                                                   |
| `skill-tool`      | An assistant `tool_use` block with `name: "Skill"` and `input.skill: "<skill-name>"`                                     |
| `scheduled-task`  | The session's first user message starts with `<scheduled-task name="…" file="/…/<skill>/SKILL.md">` — i.e. a Claude Routine |

A Claude Routine is just a scheduled invocation of a skill. The routine has its
own `name` attribute (e.g. `example-daily-monitor`) which is usually distinct
from the underlying skill name (the parent directory of the `SKILL.md` file).
Both are tracked separately so you can ask either "show me every run of this
skill" or "show me every run of this specific routine".

Each loaded session carries:

- `entrypoint` — `cli`, `claude-desktop`, etc.
- `scheduledTask` — `{ name, skillFile, skillName }`, only set when the session was started by a routine
- `skillsUsed` — distinct skill names invoked anywhere in the session

## CLI commands

### Discovery

```bash
# Which skills have I been using? (across all projects)
cc-session-history list-skills --all-projects

# Which routines fire on my machine, and how often?
cc-session-history list-routines --all-projects

# Just the count, useful in scripts
cc-session-history list-skills --all-projects --count
```

### Looking at a specific skill

```bash
# Every session that invoked this skill, most recent first
cc-session-history get-skill-runs daily-monitor --all-projects

# Limited to the last two weeks, as JSON for scripting
cc-session-history get-skill-runs daily-monitor --all-projects --since 14d --json

# Only runs triggered by a routine (i.e. exclude manual /skill invocations)
cc-session-history get-skill-runs daily-monitor --all-projects --routine
```

### Filtering anywhere

These flags work on `list-sessions`, `search`, `summarize`, and
`list-permission-checks`:

| Flag                      | Behavior                                                                                       |
|---------------------------|------------------------------------------------------------------------------------------------|
| `--skill <name>`          | Match against the skill basename (parent dir of `SKILL.md`). Repeatable / comma-separated.     |
| `--routine`               | Only sessions started by a `<scheduled-task>` tag.                                             |
| `--routine-name <name>`   | Match against the routine's `name` attribute. Implies `--routine`. Repeatable.                 |
| `--entrypoint <ep>`       | `cli`, `claude-desktop`, etc.                                                                  |
| `--since <when>` / `--until <when>` | ISO date or relative duration (`7d`, `24h`, `30m`, `2w`).                            |

Output controls:

| Flag        | Behavior                                                          |
|-------------|-------------------------------------------------------------------|
| `--json`    | Machine-readable output (recommended for skills calling the CLI). |
| `--count`   | Print only the matching count — one number, no other output.      |
| `--limit N` | Pagination.                                                       |
| `--offset N`| Pagination.                                                       |

## Worked example: reflection on a daily-monitor routine

Suppose you have a routine `example-daily-monitor` that runs the
`daily-monitor` skill every morning against `~/projects/example`, and you want a
retrospective skill to check the last two weeks of runs for trouble.

### Step 1 — confirm the routine exists and is firing

```bash
cc-session-history list-routines --all-projects --json
```

```json
[
  {
    "routineName": "example-daily-monitor",
    "skillName": "example-daily-monitor",
    "skillFile": "/Users/example/.claude/scheduled-tasks/example-daily-monitor/SKILL.md",
    "runCount": 14,
    "lastRun": "2026-04-25T14:26:47.197Z",
    "projects": ["-Users-example-project"]
  }
]
```

If `runCount` is lower than expected, the routine has been failing to start
(e.g. missed days). If `lastRun` is stale, the schedule is broken.

### Step 2 — list recent runs

```bash
cc-session-history get-skill-runs example-daily-monitor \
  --all-projects --since 14d --json
```

The JSON output is one row per invocation:

```json
[
  {
    "sessionId": "40a77354-520f-44ef-b729-c098789a5466",
    "projectPath": "-Users-example-project",
    "timestamp": "2026-04-25T14:26:47.197Z",
    "source": "scheduled-task",
    "scheduledTaskName": "example-daily-monitor",
    "messageCount": 312
  },
  …
]
```

A retrospective skill iterates over each row and inspects the session.

### Step 3 — pull a per-run digest

For each session ID returned above, ask for a structured summary:

```bash
cc-session-history summarize -s <sessionId> -p -Users-example-project
```

Each summary includes `toolErrors`, `userInterrupts`, `permissionRejections`,
and a tool-use breakdown — exactly the signal a retrospective wants. Skip runs
where everything is clean and dig into the messy ones.

### Step 4 — check for permission-check problems

Run the permission-check audit scoped to the routine:

```bash
cc-session-history list-permission-checks \
  --all-projects \
  --routine-name example-daily-monitor \
  --since 14d \
  --json
```

A retrospective skill should look for:

- **Rejections** (`outcome: "rejected"`) — the routine asked for a tool the user
  declined. In a routine, the user is *not present* to approve, so a rejection
  almost certainly came from the user later cancelling. Treat any non-zero count
  as a regression.
- **Approvals** showing up at all — routines are meant to run autonomously, so
  any permission *prompt* (approved or rejected) means the routine is missing
  pre-approved permissions in the project's `.claude/settings.json`. Use this
  list to suggest exactly which Bash command / tool to add to the allowlist.

### Step 5 — full transcript when a single run looks bad

```bash
cc-session-history get-chat -s <sessionId> --json | jq '.messages[]'
```

The retrospective skill can then read the messages directly to reconstruct what
went wrong.

## Sketch of a retrospective skill

A `retrospective` skill that audits the last 14 days of one routine could look
roughly like:

```bash
#!/usr/bin/env bash
set -euo pipefail

ROUTINE="${1:?usage: retrospective <routine-name>}"
SINCE="14d"

# 1. Get every run in the window.
runs=$(cc-session-history get-skill-runs "$ROUTINE" \
  --all-projects --since "$SINCE" --json)

run_count=$(echo "$runs" | jq 'length')
echo "Found $run_count runs of $ROUTINE in the last $SINCE."

# 2. Fail-fast list of permission prompts (rare in a healthy routine).
prompts=$(cc-session-history list-permission-checks \
  --all-projects --routine-name "$ROUTINE" --since "$SINCE" --json)
prompt_count=$(echo "$prompts" | jq 'length')
echo "Permission prompts: $prompt_count"
if [[ "$prompt_count" -gt 0 ]]; then
  echo "$prompts" | jq -r '.[] | "  \(.outcome)\t\(.toolName)\t\(.toolSummary)"'
fi

# 3. Per-run digest, ranked by tool errors.
echo "$runs" | jq -r '.[] | "\(.sessionId)\t\(.projectPath)"' | \
  while IFS=$'\t' read -r sid project; do
    cc-session-history summarize -s "$sid" -p "$project"
  done
```

The skill can then synthesize a report: "X out of Y runs had tool errors; here
are the recurring failure patterns; routine is missing pre-approved permission
for `Bash(curl:*)` (saw 4 prompts for it)".

## Defining what counts as "healthy"

Reasonable signals to flag in a retrospective of a daily routine:

- `runCount` < expected (e.g. fewer than 13 runs in the last 14 days)
- `lastRun` more than 36h ago
- Any `permissionResult` (the routine should be fully pre-approved)
- Non-zero `toolErrors` in `summarize` output
- Non-zero `interruptCount` (user manually interrupting an automated run)
- Routine session ending unusually short (low `messageCount` compared to peers)

These are all derivable from the JSON output of the commands above without
parsing transcripts.
