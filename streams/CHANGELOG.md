
# Unreleased
 - Add `Stream.filter(cb)` for filtering items with a predicate.
 - Add `StreamProtocolValidator.finalize()` and validate hint ordering (hints must come before items, and only one hint is allowed).
 - `Stream.closeWithError` now accepts either `Error` or `ErrorDetails`.
 - `Stream.forEach` now rejects its returned promise when the callback throws, instead of swallowing the error.
 - `Stream.promiseItem` now calls `stopListening()` on `fail`, matching the behavior of its other branches.
 - `dynamicOutputToStream` now catches errors thrown inside async iterators and routes them to `stream.fail` (or the global error listener if the stream is already closed).
 - Expanded `src/index.ts` re-exports: `StreamFail`, `StreamLogInfo`, `StreamLogWarn`, `StreamLogError`, `StreamHint`, `EventType`, `c_hint_list`, `c_hint_single_item`, `toException`, `wrapStreamInValidator`, `ProtocolError`, `UsageError`, and loose receiver types.
 - Removed the `c_result_list` / `c_result_single_item` aliases; use `c_hint_list` / `c_hint_single_item` instead.
 - `ErrorDetails.related` is now typed `Record<string, any>[]` to match `captureError`'s signature.
 - Docs: new `docs/error-handling.md` guide and expanded README coverage of `StreamDispatcher`, `StreamProtocolValidator`, consumer helpers, and transformation methods.

# 1.0.1

 - Add toConsoleLog and errorDetailsToString

# 1.0.0

 - Code cleanup and new repo, ready for 1.x release.

# 0.3.2

 - Add Stream.listen()

# 0.3.1

 - Fix code formatting.
 - Add 'return this' to Stream.logToConsole()

# 0.3.0

Removing a lot of code that isn't essential.

# 0.2.0

First public release.
