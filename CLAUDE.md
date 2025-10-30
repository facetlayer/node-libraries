
# node-libraries

Collection of individual NPM libraries.

Each one is published inside the @facetlayer NPM organization.

This repo also uses PNPM with workspaces.

## Adding a new library

Checklist for adding a new library here:

1. Create the library with package.json, src/index.ts, tsconfig.json, README.md, etc.
2. Add the library to pnpm-workspace.yaml
3. Set the package.json "name" to "@facetlayer/<library name>"
4. Set the initial package version to 0.1.0
5. Copy the style of the other libraries.
