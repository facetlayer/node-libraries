# 0.3.0
 - Fixed: multiple shell() commands in before-deploy and after-deploy blocks now all execute sequentially instead of only the last one running
 - Removed: pm2 process management support (pm2-start directive in after-deploy blocks)
 - Added: `candle-restart` directive for after-deploy blocks to restart Candle services

# 0.2.0
 - Added `goob` CLI alias
 - Removed default port; `--port` flag is now required
 - Updated dependency on `@facetlayer/qc` to ^0.1.1

# 0.1.0
 - Initial public release.
