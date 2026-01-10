# @facetlayer/npm-status

CLI tool to check NPM publish status and detect unpublished changes.

## Installation

```bash
pnpm add -D @facetlayer/npm-status
```

## Usage

### Status Command

Check the publish status of a package:

```bash
cd my-package
npm-status status
```

Output:
```
Package: @facetlayer/my-package
Local version: 1.2.0
NPM version: 1.1.0
Last published: 2024-01-15T10:30:00.000Z

Issues:
  - Version differs: local=1.2.0, npm=1.1.0
  - Has 3 commits since last publish

Commits since last publish:
  abc1234 fix: resolve edge case in parser
  def5678 feat: add new validation option
  ghi9012 docs: update readme
```

### JSON Output

For scripting, use the `--json` flag:

```bash
npm-status status --json
```

## What It Checks

The `status` command compares your local package with NPM:

- **Version difference**: Compares local `package.json` version with the published NPM version
- **Uncommitted changes**: Uses `git status` to detect uncommitted changes in the current directory
- **Unpublished commits**: Uses `git log` to find commits made after the last NPM publish time

This works correctly in monorepos by filtering git operations to only the current directory.

## License

MIT
