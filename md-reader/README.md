# md-reader

CLI tool for reading and navigating Markdown files by sections.

## Installation

```bash
npm install -g @facetlayer/md-reader
```

## Commands

### toc

Show table of contents with line numbers for a Markdown file.

```bash
md-reader toc README.md
```

Output:
```
 1: Main Title
 5:   Getting Started
 9:     Prerequisites
15:     Installation
23: Usage
27:   Basic Usage
31:   Advanced Usage
```

The line numbers help AI agents and users quickly navigate to specific sections of large Markdown files.

### section

Extract a section from a Markdown file by matching the heading text (case-insensitive substring match).

```bash
md-reader section README.md "Installation"
```

The section includes all nested subsections until the next heading of the same or higher level.

Example - extracting a section with nested content:

```bash
md-reader section docs/guide.md "Getting Started"
```

Output:
```markdown
## Getting Started

This section explains how to get started.

### Prerequisites

You need Node.js installed.

### Installation

Run npm install.
```

## Programmatic Usage

```typescript
import { parseHeadings, formatToc, getSection } from '@facetlayer/md-reader';

// Parse headings from a string
const headings = parseHeadings(markdownContent);
// Returns: [{ level: 1, text: 'Title', line: 1 }, ...]

// Format as table of contents
const toc = formatToc(headings);
console.log(toc);

// Extract a section by heading text
const section = getSection(markdownContent, 'Installation');
if (section) {
  console.log(section.content);
}
```

## API

### parseHeadings(content: string): Heading[]

Parse a Markdown string and extract all headings with their line numbers.

### parseHeadingsFromFile(filePath: string): Heading[]

Parse a Markdown file and extract headings.

### formatToc(headings: Heading[]): string

Format headings as a table of contents with line numbers and indentation.

### formatTocFromFile(filePath: string): string

Convenience function to parse and format a file in one step.

### getSection(content: string, searchText: string): Section | null

Find and extract a section by search text. Returns the section content including nested subsections.

### getSectionFromFile(filePath: string, searchText: string): Section | null

Extract a section from a file by search text.

## License

MIT
