# @facetlayer/agent-hint-tool

CLI tool for searching and displaying hint files for AI agents.

## Installation

```bash
pnpm add -g @facetlayer/agent-hint-tool
```

## Usage

### show-hint

Show the full contents of a hint file by name:

```bash
agent-hint-tool show-hint <name>
```

The `name` can be a partial match. For example, if you have a hint file named `typescript-best-practices.md`, you can search for it with:

```bash
agent-hint-tool show-hint typescript
```

### claude-intake

Start an interactive Claude session to create a new hint file:

```bash
agent-hint-tool claude-intake
```

This launches Claude with instructions to help you create a new hint file. Claude will:
1. Ask you to describe the hint you want to create
2. Ask clarifying questions to gather details
3. Ask whether to save at user level (`~/.claude/hints/`) or project level (`./specs/hints/`)
4. Generate an appropriate filename and save the hint file

## Hint File Format

Hint files are Markdown files with YAML front matter:

```markdown
---
name: typescript-best-practices
description: Best practices for writing TypeScript code
---

# TypeScript Best Practices

Content goes here...
```

## Search Directories

The tool searches for hint files in:

1. `~/.claude/hints` - User's global hints directory
2. `./specs/hints` - Local project hints directory (if it exists)
