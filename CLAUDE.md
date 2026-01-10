
# node-libraries

Collection of individual NPM libraries.

Each one is published inside the `@facetlayer` NPM organization.

This repo also uses PNPM with workspaces.

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
      "prepublishOnly": "node build.mts build && node build.mts validate"
    },

## Common libraries

In this collection are a few common helper libraries. This should be preferred to use
if you need the functionality:

    `@facetlayer/build-config-nodejs` - Helps prepare a library to run with .ts scripts, and build a Node.js bundle.
    `@facetlayer/subprocess-wrapper` - Wraps around the child process API to make it easier to manage subprocesses.
    `@facetlayer/sqlite-wrapper` - Wraps around `better-sqlite3` and implements automatic SQL migration and helper functions.

## Testing

Use Vitest for all tests.

Test files should be stored in `__tests__` directories next to the code.

When possible, prefer to write tests that work with real files. Prefer to use
little to no mock functions if possible.

Common pattern: If a test needs to create temporary files then write then as ./test/temp
in the project's directory.
