# Unreleased
 - Fixed `list-sessions --project` bug where project names starting with `-` were misinterpreted as CLI flags by yargs, causing all projects to return the same sessions
 - Changed `--project` from a positional argument to a named option (with `-p` alias) for consistency with `get-chat --session`
 - `list-permission-checks` now shows both approved and rejected permission checks (previously only showed rejected)
 - Added `outcome` field to `PermissionCheck` type (`'approved' | 'rejected'`)
 - Added `permissionMode` tracking from session data to determine which tools require permission
 - Exported `toolNeedsPermission` utility function
