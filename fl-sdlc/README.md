# @facetlayer/fl-sdlc

CLI tool for software development lifecycle management. Helps with branch management, PR management, and project guidelines.

## Installation

```bash
pnpm add @facetlayer/fl-sdlc
```

Or install globally:

```bash
npm i -g @facetlayer/fl-sdlc
```

## Commands

### `fl-sdlc get-guidelines`

Reads the `.PROJECT_GUIDELINES.md` file from the current directory and prints its contents. If the file doesn't exist, prints a message explaining that it must be created.

### `fl-sdlc determine-guidelines`

Gathers project information that's useful for initializing a `.PROJECT_GUIDELINES.md` file:

- **Main branch** - detected via `gh repo view` or `git remote show origin`
- **Recent commits** - last 20 commits to identify commit style conventions
- **Recent merged PRs** - last 5 merged PRs to identify PR body conventions

## Programmatic API

```typescript
import { getGuidelines, determineGuidelines } from '@facetlayer/fl-sdlc';

// Read guidelines file
const guidelines = getGuidelines();
if (guidelines.found) {
  console.log(guidelines.content);
}

// Gather project info
const info = await determineGuidelines();
console.log(info.mainBranch);
console.log(info.recentCommits);
console.log(info.recentPRs);
```
