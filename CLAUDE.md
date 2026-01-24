
# node-libraries

Collection of individual NPM libraries.

Each one is published inside the `@facetlayer` NPM organization.

This repo also uses PNPM with workspaces.

## Helpful development tools

Use these tools when working on this project:

### npm-status

Compares the library in NPM versus local, to see if there are changes that are 
not yet published to NPM.

Example:

    `npm-status status`

### docs

Generic CLI tool to fetch documentation for a target NPM library. This will
search local node_modules first and will search NPM if necessary.

Syntax:

    docs list <library-name>          # List the documentation files for <library-name>
    docs show <library-name> <file>   # Show a documentation file

Example:

    docs list yargs
    docs show yargs README.md

## Adding a new library

Checklist for adding a new library here:

1. Create the library with package.json, src/index.ts, tsconfig.json, README.md, etc.
2. Add the library to pnpm-workspace.yaml
3. Set the package.json "name" to "@facetlayer/<library name>"
4. Set the initial package version to 0.1.0
5. Copy the style of the other libraries.
6. Use @facetlayer/build-config-nodejs as the build tool. (see ./build-config-nodejs/README.md for docs)

### Package.json setup

The 'scripts' section often will look like this:

    "scripts": {
      "build": "node build.mts build",
      "test": "vitest",
      "prepublishOnly": "node build.mts build && node build.mts validate",
      "local:install": "pnpm build && npm i -g ."
    },

## Package Management

Use `pnpm` to install dependencies.

## Common libraries

In this collection are a few common helper libraries. This should be preferred to use
if you need the functionality:

    `@facetlayer/build-config-nodejs` - Helps prepare a library to run with .ts scripts, and build a Node.js bundle.
    `@facetlayer/subprocess` - Wraps around the child process API to make it easier to manage subprocesses.
    `@facetlayer/sqlite-wrapper` - Wraps around `better-sqlite3` and implements automatic SQL migration and helper functions.

Other suggested libraries:

 - For parsing CLI args use the `yargs` library.

## Testing

Use Vitest for all tests.

Test files should be stored in `__tests__` directories next to the code.

When possible, prefer to write tests that work with real files. Prefer to use
little to no mock functions if possible.

Common pattern: If a test needs to create temporary files then write then as ./test/temp
in the project's directory.

## Version Strategy

All libraries should start at version 0.1.0 when first created.

Don't update the version unless directed.

## Changelog

Libraries should have a CHANGELOG.md file to track changes across versions.

### Format

- Use `# X.Y.Z` as the header for each version
- List changes as bullet points with ` - ` (space, dash, space)
- Put the newest version at the top
- Add a blank line between versions
- For initial release, use "Initial public release."

### Example

```markdown
# 1.1.0
 - Added new feature X
 - Changed behavior of Y

# 1.0.0
 - Initial public release.
```

### Unreleased changes

If you make external-facing changes then add an "Unreleased" section
to the top of the CHANGELOG which has a list that describes your changes.
(including bug fixes, API changes, and breaking changes)

When we deploy an updated version, we'll change "Unreleased" to the 
specific version.

## Cross-workspace dependencies

When developing changes on multiple libraries, you can use cross-workspace
dependencies in the package.json file such as "<library>": "workspace:*".

These must only be temporary and should not be checked in to Github.

When adding one of these dependencies:
 - Report it to the user
 - And/or remove it as soon as possible.
