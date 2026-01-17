# CLAUDE.md Setup

Add the following to your project's `CLAUDE.md` file to enable AI assistants to use the `npm-status` tool for checking publish status.

## Recommended Section

```markdown
### npm-status

Compares the library in NPM versus local, to see if there are changes that are
not yet published to NPM.

Example:

    npm-status status
```

## Notes

- The `npm-status` tool must be installed globally (`npm install -g @facetlayer/npm-status`)
- Place this section under a heading like `## Helpful development tools` or similar
- Run from the library directory you want to check
