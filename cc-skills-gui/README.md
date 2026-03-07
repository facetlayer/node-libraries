# cc-skills-gui

Web GUI for viewing and editing Claude Code skills (SKILL.md files).

## Usage

```bash
cc-skills-gui
```

Opens a web server on port 4820 (configurable via `PRISM_API_PORT`).

## Features

- Lists personal skills from `~/.claude/skills/`
- Lists project skills from `.claude/skills/` in the current working directory
- Edit skill content and frontmatter flags
- Toggle agent-discoverable and user-invocable settings via checkboxes
