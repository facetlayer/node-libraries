# Unreleased
 - Added: `preview-deploy` command that contacts the server to show deployment drift (files to upload, files to delete)
 - Added: `copy-back` command to download a file from the server's active deployment back to the local filesystem
 - Renamed: `preview-deploy` (local-only file list) is now `preview-deploy-files`
 - Fixed: SQL injection vulnerabilities in activateDeployment and createDeployment (now using parameterized queries)
 - Fixed: finishMultiPartUpload was not cleaning up chunk records from database after assembly
 - Fixed: verifyDeployment returned status 'ok' instead of 'success', mismatching the declared type
 - Fixed: internal server errors returned HTTP 200 instead of 500
 - Fixed: server validated deployments directory after binding the port instead of before
 - Fixed: body-parser had no size limit configured, risking failures on larger payloads
 - Refactored: deduplicated RPC client methods into a shared helper
 - Refactored: removed unused imports and fields
 - Refactored: extracted shared client setup helper, deduplicated server-side active deployment lookup
 - Refactored: unified NeededFileEntry with FileEntry, removed unused RPC types
 - Refactored: removed vestigial Stream return from finishUploads
 - Added: unit tests for server handlers (createDeployment, getNeededFiles, finishUploads, verifyDeployment, previewDeployment, downloadFile)

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
