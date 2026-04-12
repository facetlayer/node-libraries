## Unreleased
 - Fixed: `candle-restart(service)` and `candle-config` directives now resolve the `candle` binary by searching common install paths (`/usr/local/bin`, `/root/.local/bin`, `/home/*/.local/bin`, etc.) before falling back to PATH, so they work reliably in non-interactive SSH sessions where the user's shell profile is not loaded.
 - Fixed: `config.json` is no longer blocked by the security scan. It was incorrectly listed as a disallowed file; only files that are essentially always secret-containing (e.g. `.env`, `*.pem`, `credentials.json`) are blocked.
 - Fixed: Multiple `shell()` commands in an `after-deploy` block now all execute sequentially; previously only one would run. Same fix applies to multiple `candle-restart()` calls in one block.
 - Fixed: `verifyDeployment` now hashes files in parallel (concurrency 20) and emits progress logs every 500 files or 5 seconds, preventing hangs on memory-constrained servers with large static deployments
 - Replace direct `node:sqlite` imports with `@facetlayer/sqlite-wrapper`, suppressing the SQLite experimental warning
 - Fixed: Upload errors during deployment are now collected and reported clearly, aborting the deployment instead of silently continuing to verification
 - Fixed: `active_deployment` pointer now updates before after-deploy hooks run, so it always reflects the newest successful upload even if a hook fails. Hook errors are reported to the client as warnings instead of silently rolling back the pointer.
 - Added `goob rollback <config-file> [deploy-name]` command to roll back a project to a previous deployment. Lists recent deployments with active marker and prompts interactively when no deploy name is given.

# 0.7.0
 - Replaced `better-sqlite3` with Node.js built-in `node:sqlite` module, eliminating the native compilation dependency
 - Updated `@facetlayer/userdata-db` to `^0.2.0` and `@facetlayer/sqlite-wrapper` to `^1.3.0`

# 0.6.0
 - Added `candle-config=<path>` setting for `deploy-settings`. On activation, goobernetes copies the referenced file to `.candle.json` inside the deployment directory and runs `candle restart` + `candle check-start` from that directory, replacing the need for a shared system-wide Candle config.

# 0.5.0
 - Added `database <path>` config entries to list SQLite database locations for a project.
 - Added `goob sql <config-file> <sql>` CLI command to run SQL on a deployed project's database.
 - Added `goob list-databases <config-file>` CLI command to list configured databases and their tables.
 - Added multi-database routing: the SQL command parses table names (via `@facetlayer/generic-lexer`) and picks the database containing them. Use `--database` to override.
 - Added `executeSql` and `listDatabases` JSON-RPC methods.

# 0.4.0
 - Added batched manifest upload for large deploys (500+ files) via `addManifestFiles` and `finalizeManifest` API methods
 - Added `previewByDeployName` API method for previewing large deploys
 - Added `docs/ClientServerAPI.md` documenting all JSON-RPC methods
 - Added glob pattern support for include/exclude/ignore rules (e.g. `include src/**/*.ts`, `exclude **/*.test.js`)
 - Fixed include rules not working for subdirectory paths (e.g. `include frontend/out`)

# 0.3.3
 - Update sqlite3 version
 
# 0.3.2
 - Fixed: misleading "Request body is too large" warning.
 - Fixed: Relaxed security scan rules (don't reject a filename that looks like `forgot-password/page.js`)
 - Added: `ignore-security-scan` config option

# 0.3.1
 - Added: `preview-deploy
 - Added: `copy-back` command
 - Renamed: Existing `preview-deploy` command (local-only file list) is now `preview-deploy-files`
 - Fixed: various bugs

# 0.3.0
 - Fixed: Support multiple shell() commands in before-deploy and after-deploy blocks
 - Removed: pm2 integration
 - Added: `candle-restart` config option

# 0.2.0
 - Added `goob` CLI alias
 - Removed default port; `--port` flag is now required
 - Updated dependency on `@facetlayer/qc` to ^0.1.1

# 0.1.0
 - Initial public release.
