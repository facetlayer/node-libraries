# Agent Hint Tool - Functional Requirements

## Overview

A command-line tool for searching through hint files with different kinds of search. Hint files are Markdown documents with YAML front matter containing metadata.

## Hint File Format

Each hint file is a Markdown file (`.md` extension) with YAML front matter containing:
- `name`: The name/identifier for the hint
- `description`: A brief description of what the hint covers

Example:
```markdown
---
name: typescript-best-practices
description: Best practices for writing TypeScript code
---

# TypeScript Best Practices

Content goes here...
```

## Search Directories

The tool searches for hint files in the following directories (in order):
1. `~/.claude/hints` - User's global hints directory
2. `./specs/hints` - Local project hints directory (if it exists)

## Subcommands

### `show-hint <name>`

Shows the full contents of a hint file by name.

**Arguments:**
- `name` (required): The name to search for. Can be a partial filename match.

**Behavior:**
- Searches all hint directories for files matching the name
- The name can be a partial match (e.g., "typescript" matches "typescript-best-practices")
- If multiple matches are found, lists them and asks user to be more specific
- If exactly one match is found, displays the full contents of the hint file
- If no matches are found, displays an error message

**Output:**
- Displays the hint file contents including front matter metadata

### `claude-intake`

Starts an interactive Claude CLI session to create a new hint file.

**Arguments:**
- None

**Behavior:**
1. Launches the Claude CLI as a subprocess with a custom system prompt
2. Claude greets the user and asks them to describe the hint they want to create
3. Claude asks clarifying questions to gather details about the hint
4. Claude asks the user where to save the hint:
   - **User level**: `~/.claude/hints/<filename>.md` - For globally available hints
   - **Project level**: `./specs/hints/<filename>.md` - For project-specific hints
5. Claude generates an appropriate kebab-case filename based on the topic
6. Claude creates the hint file with proper YAML front matter and saves it to the chosen location

**System Prompt Instructions:**
Claude is instructed to:
- Ask for the hint description and topic
- Gather details through clarifying questions
- Ask about save location preference (user vs project level)
- Generate a kebab-case filename
- Create the file with proper front matter format
- Create the target directory if it doesn't exist

**Interactive Session:**
The command runs Claude interactively, allowing the user to have a natural conversation to define their hint file. The session ends when the user exits Claude (Ctrl+C or typing "exit").
