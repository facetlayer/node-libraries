import { describe, it, expect } from 'vitest';
import { join } from 'path';
import {
  splitLines,
  parseHeadingLine,
  parseHeadings,
  parseHeadingsFromFile,
  generateToc,
  formatToc,
  formatTocFromFile,
  findHeading,
  extractSection,
  getSection,
  getSectionFromFile,
} from '../index.ts';

const fixturesDir = join(import.meta.dirname, '../../test/fixtures');

describe('splitLines', () => {
  it('should split content by newlines', () => {
    const content = 'line1\nline2\nline3';
    expect(splitLines(content)).toEqual(['line1', 'line2', 'line3']);
  });

  it('should handle Windows line endings', () => {
    const content = 'line1\r\nline2\r\nline3';
    expect(splitLines(content)).toEqual(['line1', 'line2', 'line3']);
  });

  it('should handle empty content', () => {
    expect(splitLines('')).toEqual(['']);
  });
});

describe('parseHeadingLine', () => {
  it('should parse a valid heading', () => {
    const result = parseHeadingLine('## Section Title', 5);
    expect(result).toEqual({ level: 2, text: 'Section Title', line: 5 });
  });

  it('should return null for non-heading lines', () => {
    expect(parseHeadingLine('Just text', 1)).toBeNull();
    expect(parseHeadingLine('#No space after hash', 1)).toBeNull();
    expect(parseHeadingLine('####### Too many hashes', 1)).toBeNull();
  });

  it('should handle all heading levels', () => {
    expect(parseHeadingLine('# H1', 1)?.level).toBe(1);
    expect(parseHeadingLine('###### H6', 1)?.level).toBe(6);
  });
});

describe('parseHeadings', () => {
  it('should parse headings with their levels and line numbers', () => {
    const content = `# Title

Some text.

## Section 1

More text.

### Subsection

Even more text.`;

    const headings = parseHeadings(content);

    expect(headings).toEqual([
      { level: 1, text: 'Title', line: 1 },
      { level: 2, text: 'Section 1', line: 5 },
      { level: 3, text: 'Subsection', line: 9 },
    ]);
  });

  it('should handle all heading levels (1-6)', () => {
    const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`;

    const headings = parseHeadings(content);

    expect(headings).toHaveLength(6);
    expect(headings[0]).toEqual({ level: 1, text: 'H1', line: 1 });
    expect(headings[5]).toEqual({ level: 6, text: 'H6', line: 6 });
  });

  it('should return empty array for content with no headings', () => {
    const content = `Just some text.

More text here.

No headings at all.`;

    const headings = parseHeadings(content);

    expect(headings).toEqual([]);
  });

  it('should ignore lines that look like headings but are not', () => {
    const content = `# Valid Heading

This is not a heading: #hashtag

Neither is this: ##invalid

#Also not a heading (no space)`;

    const headings = parseHeadings(content);

    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe('Valid Heading');
  });

  it('should trim heading text', () => {
    const content = `#   Heading with spaces   `;

    const headings = parseHeadings(content);

    expect(headings[0].text).toBe('Heading with spaces');
  });

  it('should handle Windows line endings', () => {
    const content = `# Title\r\n\r\n## Section\r\n`;

    const headings = parseHeadings(content);

    expect(headings).toHaveLength(2);
    expect(headings[0]).toEqual({ level: 1, text: 'Title', line: 1 });
    expect(headings[1]).toEqual({ level: 2, text: 'Section', line: 3 });
  });
});

describe('parseHeadingsFromFile', () => {
  it('should parse headings from a file', () => {
    const filePath = join(fixturesDir, 'simple.md');
    const headings = parseHeadingsFromFile(filePath);

    expect(headings.length).toBeGreaterThan(0);
    expect(headings[0]).toEqual({ level: 1, text: 'Main Title', line: 1 });
  });

  it('should return empty array for file with no headings', () => {
    const filePath = join(fixturesDir, 'empty.md');
    const headings = parseHeadingsFromFile(filePath);

    expect(headings).toEqual([]);
  });
});

describe('generateToc', () => {
  it('should generate toc entries with proper indentation', () => {
    const headings = [
      { level: 1, text: 'Title', line: 1 },
      { level: 2, text: 'Section', line: 3 },
      { level: 3, text: 'Subsection', line: 5 },
      { level: 2, text: 'Another Section', line: 7 },
    ];

    const toc = generateToc(headings);

    expect(toc).toEqual([
      { level: 1, text: 'Title', line: 1, indent: '' },
      { level: 2, text: 'Section', line: 3, indent: '  ' },
      { level: 3, text: 'Subsection', line: 5, indent: '    ' },
      { level: 2, text: 'Another Section', line: 7, indent: '  ' },
    ]);
  });

  it('should handle files starting with h2', () => {
    const headings = [
      { level: 2, text: 'First Section', line: 1 },
      { level: 3, text: 'Subsection', line: 3 },
      { level: 2, text: 'Second Section', line: 5 },
    ];

    const toc = generateToc(headings);

    expect(toc[0].indent).toBe('');
    expect(toc[1].indent).toBe('  ');
    expect(toc[2].indent).toBe('');
  });

  it('should return empty array for empty headings', () => {
    const toc = generateToc([]);
    expect(toc).toEqual([]);
  });
});

describe('formatToc', () => {
  it('should format toc with line numbers and indentation', () => {
    const headings = [
      { level: 1, text: 'Title', line: 1 },
      { level: 2, text: 'Section', line: 5 },
      { level: 3, text: 'Subsection', line: 10 },
    ];

    const output = formatToc(headings);

    expect(output).toBe(` 1: Title
 5:   Section
10:     Subsection`);
  });

  it('should pad line numbers for alignment', () => {
    const headings = [
      { level: 1, text: 'Start', line: 1 },
      { level: 1, text: 'End', line: 100 },
    ];

    const output = formatToc(headings);
    const lines = output.split('\n');

    expect(lines[0]).toBe('  1: Start');
    expect(lines[1]).toBe('100: End');
  });

  it('should return message for empty headings', () => {
    const output = formatToc([]);
    expect(output).toBe('No headings found.');
  });
});

describe('formatTocFromFile', () => {
  it('should format toc from simple.md', () => {
    const filePath = join(fixturesDir, 'simple.md');
    const output = formatTocFromFile(filePath);

    expect(output).toContain('Main Title');
    expect(output).toContain('Getting Started');
    expect(output).toContain('API Reference');
  });

  it('should handle mixed heading levels', () => {
    const filePath = join(fixturesDir, 'mixed-levels.md');
    const output = formatTocFromFile(filePath);
    const lines = output.split('\n');

    // Should have proper structure
    expect(lines.length).toBe(5);
    expect(output).toContain('Starting with H2');
    expect(output).toContain('Back to H1');
  });

  it('should return message for file with no headings', () => {
    const filePath = join(fixturesDir, 'empty.md');
    const output = formatTocFromFile(filePath);

    expect(output).toBe('No headings found.');
  });
});

describe('findHeading', () => {
  const headings = [
    { level: 1, text: 'Introduction', line: 1 },
    { level: 2, text: 'Getting Started', line: 5 },
    { level: 2, text: 'API Reference', line: 20 },
  ];

  it('should find heading by exact match', () => {
    const result = findHeading(headings, 'Introduction');
    expect(result?.text).toBe('Introduction');
  });

  it('should find heading by substring match', () => {
    const result = findHeading(headings, 'Started');
    expect(result?.text).toBe('Getting Started');
  });

  it('should be case-insensitive', () => {
    const result = findHeading(headings, 'api');
    expect(result?.text).toBe('API Reference');
  });

  it('should return first match when multiple headings match', () => {
    // 't' matches both "Introduction" and "Getting Started"
    const result = findHeading(headings, 't');
    expect(result?.text).toBe('Introduction');
  });

  it('should return null when no match found', () => {
    const result = findHeading(headings, 'nonexistent');
    expect(result).toBeNull();
  });

  it('should return null for empty headings array', () => {
    const result = findHeading([], 'test');
    expect(result).toBeNull();
  });
});

describe('extractSection', () => {
  it('should extract section until next heading of same level', () => {
    const content = `# Title

## Section 1

Content of section 1.

More content.

## Section 2

Content of section 2.`;

    const heading = { level: 2, text: 'Section 1', line: 3 };
    const section = extractSection(content, heading);

    expect(section.startLine).toBe(3);
    expect(section.content).toBe(`## Section 1

Content of section 1.

More content.`);
  });

  it('should include nested subsections', () => {
    const content = `# Title

## Section

Content.

### Subsection

Sub content.

#### Deep section

Deep content.

## Next Section

Different content.`;

    const heading = { level: 2, text: 'Section', line: 3 };
    const section = extractSection(content, heading);

    expect(section.content).toContain('## Section');
    expect(section.content).toContain('### Subsection');
    expect(section.content).toContain('#### Deep section');
    expect(section.content).not.toContain('## Next Section');
  });

  it('should stop at heading of higher level (lower number)', () => {
    const content = `## Section

Content.

### Subsection

Sub content.

# Top Level

Top content.`;

    const heading = { level: 2, text: 'Section', line: 1 };
    const section = extractSection(content, heading);

    expect(section.content).toContain('## Section');
    expect(section.content).toContain('### Subsection');
    expect(section.content).not.toContain('# Top Level');
  });

  it('should extract until end of file if no following same-level heading', () => {
    const content = `# Title

## Only Section

Content here.

### Nested

More content.

The end.`;

    const heading = { level: 2, text: 'Only Section', line: 3 };
    const section = extractSection(content, heading);

    expect(section.content).toContain('## Only Section');
    expect(section.content).toContain('The end.');
  });

  it('should trim trailing whitespace', () => {
    const content = `## Section

Content.

`;

    const heading = { level: 2, text: 'Section', line: 1 };
    const section = extractSection(content, heading);

    expect(section.content).toBe(`## Section

Content.`);
  });
});

describe('getSection', () => {
  const content = `# Main Title

Introduction text.

## Installation

Install with npm:

\`\`\`bash
npm install package
\`\`\`

## Usage

### Basic Usage

Simple example here.

### Advanced Usage

Complex example here.

## Contributing

We welcome contributions.`;

  it('should find and extract section by search text', () => {
    const section = getSection(content, 'Installation');

    expect(section).not.toBeNull();
    expect(section?.heading.text).toBe('Installation');
    expect(section?.content).toContain('Install with npm');
    expect(section?.content).not.toContain('## Usage');
  });

  it('should find section by partial match', () => {
    const section = getSection(content, 'Basic');

    expect(section).not.toBeNull();
    expect(section?.heading.text).toBe('Basic Usage');
  });

  it('should include nested sections', () => {
    const section = getSection(content, 'Usage');

    // Should match "Usage" first (not "Basic Usage")
    expect(section?.heading.text).toBe('Usage');
    expect(section?.content).toContain('### Basic Usage');
    expect(section?.content).toContain('### Advanced Usage');
    expect(section?.content).not.toContain('## Contributing');
  });

  it('should return null for no match', () => {
    const section = getSection(content, 'nonexistent');
    expect(section).toBeNull();
  });

  it('should be case-insensitive', () => {
    const section = getSection(content, 'installation');
    expect(section?.heading.text).toBe('Installation');
  });
});

describe('getSectionFromFile', () => {
  it('should extract section from simple.md', () => {
    const filePath = join(fixturesDir, 'simple.md');
    const section = getSectionFromFile(filePath, 'Getting Started');

    expect(section).not.toBeNull();
    expect(section?.heading.text).toBe('Getting Started');
    expect(section?.content).toContain('### Prerequisites');
    expect(section?.content).toContain('### Installation');
  });

  it('should extract nested section from simple.md', () => {
    const filePath = join(fixturesDir, 'simple.md');
    const section = getSectionFromFile(filePath, 'Prerequisites');

    expect(section).not.toBeNull();
    expect(section?.heading.text).toBe('Prerequisites');
    expect(section?.content).toContain('Node.js');
    expect(section?.content).not.toContain('### Installation');
  });

  it('should return null for non-existent section', () => {
    const filePath = join(fixturesDir, 'simple.md');
    const section = getSectionFromFile(filePath, 'Does Not Exist');

    expect(section).toBeNull();
  });

  it('should handle file with no headings', () => {
    const filePath = join(fixturesDir, 'empty.md');
    const section = getSectionFromFile(filePath, 'anything');

    expect(section).toBeNull();
  });
});
