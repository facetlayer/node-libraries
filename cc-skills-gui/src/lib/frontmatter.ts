/**
 * Simple YAML frontmatter parser/serializer for SKILL.md files.
 * Handles the --- delimited YAML block at the top of markdown files.
 */

export interface ParsedSkillFile {
  frontmatter: Record<string, any>;
  content: string;
}

export function parseFrontmatter(raw: string): ParsedSkillFile {
  const trimmed = raw.trimStart();

  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, content: raw };
  }

  const endIndex = trimmed.indexOf('---', 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: raw };
  }

  const yamlBlock = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 3).replace(/^\r?\n/, '');

  const frontmatter: Record<string, any> = {};

  for (const line of yamlBlock.split('\n')) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.slice(0, colonIndex).trim();
    const rawValue = trimmedLine.slice(colonIndex + 1).trim();

    frontmatter[key] = parseYamlValue(rawValue);
  }

  return { frontmatter, content };
}

function parseYamlValue(raw: string): any {
  if (raw === '' || raw === 'null' || raw === '~') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;

  // Quoted string
  if ((raw.startsWith('"') && raw.endsWith('"')) ||
      (raw.startsWith("'") && raw.endsWith("'"))) {
    return raw.slice(1, -1);
  }

  // Inline array: [item1, item2]
  if (raw.startsWith('[') && raw.endsWith(']')) {
    const inner = raw.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map(item => parseYamlValue(item.trim()));
  }

  // Number
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw);
  }

  return raw;
}

export function serializeFrontmatter(frontmatter: Record<string, any>, content: string): string {
  const keys = Object.keys(frontmatter);
  if (keys.length === 0) {
    return content;
  }

  const lines: string[] = ['---'];

  for (const key of keys) {
    const value = frontmatter[key];
    lines.push(`${key}: ${serializeYamlValue(value)}`);
  }

  lines.push('---');

  return lines.join('\n') + '\n' + content;
}

function serializeYamlValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);

  if (Array.isArray(value)) {
    const items = value.map(v => serializeYamlValue(v));
    return `[${items.join(', ')}]`;
  }

  // String - quote if it contains special characters
  const str = String(value);
  if (str.includes(':') || str.includes('#') || str.includes('"') ||
      str.includes("'") || str.includes('[') || str.includes(']') ||
      str === 'true' || str === 'false' || str === 'null' ||
      /^-?\d+(\.\d+)?$/.test(str)) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }

  return str;
}
