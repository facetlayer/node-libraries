# @facetlayer/docs-tool

Standalone CLI tool (`docs`) for browsing documentation in local directories and
installed NPM packages.

For NPM packages, it searches local `node_modules` first, then the global npm
install, and will `npm install` the package into a local cache if it isn't found
anywhere else.

> Building a CLI that should expose *its own* doc files via `list-docs` / `get-doc`
> commands? Use the [`@facetlayer/docs-helper`](https://github.com/facetlayer/node-libraries)
> library instead. `docs-tool` is built on top of it.

## Installation

```bash
npm install -g @facetlayer/docs-tool
```

This installs the `docs` command.

## Usage

```bash
docs list <target>            # List doc files in a directory or NPM package
docs show <target> [name]     # Show one doc file (defaults to README)
docs search <target> <term>   # Search doc files for a term, with context
```

`<target>` is either:
 - a directory path (starts with `.` or `/`), or
 - an NPM package name.

### Examples

```bash
docs list ./docs                      # List all doc files in ./docs
docs list yargs                       # List doc files for the yargs NPM package
docs show ./docs project-setup        # Show the project-setup doc from ./docs
docs show yargs                       # Show the README for the yargs NPM package
docs search ./docs config             # Search for "config" in ./docs
docs search yargs debounce            # Search yargs docs for "debounce"
```

## Programmatic API

`docs-tool` also exports the library-browsing helpers it uses internally, plus a
re-export of everything in `@facetlayer/docs-helper`:

```typescript
import { browseNpmLibrary, browseLocalLibrary, parseTarget } from '@facetlayer/docs-tool';
```
