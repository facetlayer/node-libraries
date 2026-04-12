## Unreleased
 - Renamed `set-complete` CLI command to `resolve`
 - Removed `setComplete()` from the API (use `updateFeedbackStatus` + `addComment` directly)
 - Added integration tests for the resolve workflow

# 0.2.0
 - Renamed from feedback-tool to tickets-tool; CLI command is now `tickets`
 - Added globally unique `ticket_id` field to feedback items (format: `tk-XXXXXXXX`)
 - Added `feedback_comments` table for comment history on tickets
 - Added `completed` status to FeedbackStatus
 - Added `getFeedbackByTicketId()` function
 - Added `addComment()` function for adding comments to tickets
 - Added `getComments()` function for retrieving ticket comment history
 - Added `setComplete()` function to mark tickets complete with a message
 - Added `listProjects()` function with active/completed counts
 - Added `getActiveSummary()` function for viewing active feedback per project
 - Added CLI commands: `list-projects`, `active-summary`, `set-complete`, `add-comment`, `show`
 - Added `status` filter to CLI `list` command
 - Updated CLI `list` and `report` to display ticket IDs and status
 - Existing rows are automatically backfilled with ticket IDs on first load
 - Added `status` field to feedback items (pending, accepted, rejected)
 - Added `updateFeedbackStatus()` function
 - Added `listLibraries()` function
 - Added `status` filter to `listFeedback()`
 - New items default to `pending` status

# 0.1.0
 - Initial public release.
