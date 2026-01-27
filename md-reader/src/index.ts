import { readFileSync } from 'fs';

export interface Heading {
  level: number;
  text: string;
  line: number;
}

export interface TocEntry extends Heading {
  indent: string;
}

export interface Section {
  heading: Heading;
  content: string;
  startLine: number;
  endLine: number;
}

export function splitLines(content: string): string[] {
  return content.split('\n').map((line) => line.replace(/\r$/, ''));
}

export function parseHeadingLine(line: string, lineNumber: number): Heading | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (match) {
    return {
      level: match[1].length,
      text: match[2].trim(),
      line: lineNumber,
    };
  }
  return null;
}

export function parseHeadings(content: string): Heading[] {
  const lines = splitLines(content);
  const headings: Heading[] = [];

  for (let i = 0; i < lines.length; i++) {
    const heading = parseHeadingLine(lines[i], i + 1);
    if (heading) {
      headings.push(heading);
    }
  }

  return headings;
}

export function parseHeadingsFromFile(filePath: string): Heading[] {
  const content = readFileSync(filePath, 'utf-8');
  return parseHeadings(content);
}

export function generateToc(headings: Heading[]): TocEntry[] {
  if (headings.length === 0) {
    return [];
  }

  // Find the minimum heading level to use as base
  const minLevel = Math.min(...headings.map((h) => h.level));

  return headings.map((heading) => ({
    ...heading,
    indent: '  '.repeat(heading.level - minLevel),
  }));
}

export function formatToc(headings: Heading[]): string {
  const tocEntries = generateToc(headings);

  if (tocEntries.length === 0) {
    return 'No headings found.';
  }

  // Calculate padding for line numbers
  const maxLineNumber = Math.max(...tocEntries.map((e) => e.line));
  const lineNumberWidth = String(maxLineNumber).length;

  const lines = tocEntries.map((entry) => {
    const lineNum = String(entry.line).padStart(lineNumberWidth, ' ');
    return `${lineNum}: ${entry.indent}${entry.text}`;
  });

  return lines.join('\n');
}

export function formatTocFromFile(filePath: string): string {
  const headings = parseHeadingsFromFile(filePath);
  return formatToc(headings);
}

export function findHeading(headings: Heading[], searchText: string): Heading | null {
  const searchLower = searchText.toLowerCase();
  return headings.find((h) => h.text.toLowerCase().includes(searchLower)) ?? null;
}

/**
 * Extract a section starting at a heading, including all content until
 * the next heading of the same or higher level.
 */
export function extractSection(content: string, heading: Heading): Section {
  const lines = splitLines(content);
  const startLine = heading.line;
  let endLine = lines.length;

  // Find the next heading of the same or higher level (lower or equal number)
  for (let i = startLine; i < lines.length; i++) {
    const lineHeading = parseHeadingLine(lines[i], i + 1);
    if (lineHeading && lineHeading.level <= heading.level) {
      endLine = i; // Stop before this line (0-indexed)
      break;
    }
  }

  // Extract lines from startLine-1 (0-indexed) to endLine (exclusive)
  const sectionLines = lines.slice(startLine - 1, endLine);
  const sectionContent = sectionLines.join('\n').trimEnd();

  return {
    heading,
    content: sectionContent,
    startLine,
    endLine,
  };
}

export function getSection(content: string, searchText: string): Section | null {
  const headings = parseHeadings(content);
  const heading = findHeading(headings, searchText);

  if (!heading) {
    return null;
  }

  return extractSection(content, heading);
}

export function getSectionFromFile(filePath: string, searchText: string): Section | null {
  const content = readFileSync(filePath, 'utf-8');
  return getSection(content, searchText);
}
