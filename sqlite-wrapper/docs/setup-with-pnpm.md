# Setup with PNPM

This library depends on `better-sqlite3`, which is a native Node.js module that requires compilation during installation.

## Approving Native Builds

PNPM requires explicit approval to run build scripts for native dependencies. Without this approval, `better-sqlite3` won't compile and the library won't work.

Add the following to your `pnpm-workspace.yaml`:

```yaml
onlyBuiltDependencies:
  - better-sqlite3
```

If you don't have a `pnpm-workspace.yaml` file, create one in your project root:

```yaml
packages:
  - .

onlyBuiltDependencies:
  - better-sqlite3
```

Then run `pnpm install` to rebuild the dependencies with the approved builds.

## Why This Is Required

PNPM's `onlyBuiltDependencies` setting is a security feature that prevents arbitrary packages from running build scripts during installation. Since `better-sqlite3` needs to compile native code to interface with SQLite, it must be explicitly allowed.
