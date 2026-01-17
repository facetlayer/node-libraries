# CLAUDE.md Setup

Add the following to your project's `CLAUDE.md` file to enable AI assistants to use the `docs` tool for looking up NPM library documentation.

## Recommended Section

```markdown
### docs

Generic CLI tool to fetch documentation for a target NPM library. This will
search local node_modules first and will search NPM if necessary.

Syntax:

    docs list <library-name>          # List the documentation files for <library-name>
    docs show <library-name> <file>   # Show a documentation file

Example:

    docs list yargs
    docs show yargs README.md
```

## Notes

- The `docs` tool must be installed globally (`npm install -g @facetlayer/docs-tool`)
- Place this section under a heading like `## Helpful development tools` or similar
