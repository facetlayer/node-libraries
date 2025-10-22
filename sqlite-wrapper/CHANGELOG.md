
# 1.1.0
 - Adding MigrationSetting
 - Change .update() call to take `where: Record<string,any>`

# 0.9.1

 - Bug fix when building SQL when the `where` object is empty.

# 0.9.0

 - Moved to new repo

# 0.3.2

 - Add SlowQueryWarning

# 0.3.1

 - Fix bugs in the SQL parsing logic for some expressions.

# 0.3.0

 - The `.logs` field in SetupOptions is now required.

# 0.2.0

 - Fix a bug where the library was failing on PRAGMA in the initial statements list.
 - Add support for an `onRunStatement` callback.

# 0.1.2

- Bug fixes related to NPM publishing.


# 0.1.0

Initial public release.
