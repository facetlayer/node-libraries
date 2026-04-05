# 0.4.0
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
