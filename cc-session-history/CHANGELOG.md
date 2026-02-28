# Unreleased
 - Fixed `list-sessions --project` bug where project names starting with `-` were misinterpreted as CLI flags by yargs, causing all projects to return the same sessions
 - Changed `--project` from a positional argument to a named option (with `-p` alias) for consistency with `get-chat --session`
