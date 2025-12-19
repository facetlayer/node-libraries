import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseFrontmatter, SpecFilesHelper } from '../index.ts';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('parseFrontmatter', () => {
  it('should parse frontmatter with name and description', () => {
    const input = `---
name: test-spec
description: A test specification
---

# Test Content

This is the body.`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('test-spec');
    expect(result.frontmatter.description).toBe('A test specification');
    expect(result.content).toBe('# Test Content\n\nThis is the body.');
  });

  it('should parse frontmatter with custom fields', () => {
    const input = `---
name: my-spec
author: John Doe
version: 1.0
---

Content here`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('my-spec');
    expect(result.frontmatter.author).toBe('John Doe');
    expect(result.frontmatter.version).toBe('1.0');
  });

  it('should return empty frontmatter when none exists', () => {
    const input = '# No Frontmatter\n\nJust content.';

    const result = parseFrontmatter(input);

    expect(result.frontmatter).toEqual({});
    expect(result.content).toBe(input);
  });

  it('should handle frontmatter with colons in values', () => {
    const input = `---
name: spec-name
description: This has: a colon in it
---

Content`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.description).toBe('This has: a colon in it');
  });

  it('should handle Windows-style line endings', () => {
    const input = '---\r\nname: test\r\ndescription: desc\r\n---\r\n\r\nContent';

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('test');
    expect(result.frontmatter.description).toBe('desc');
    expect(result.content).toBe('Content');
  });

  it('should handle empty content after frontmatter', () => {
    const input = `---
name: empty
---

`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('empty');
    expect(result.content).toBe('');
  });
});

describe('SpecFilesHelper', () => {
  const testDir = join(import.meta.dirname, '../../test/temp/specs');
  let helper: SpecFilesHelper;

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });

    writeFileSync(
      join(testDir, 'first-spec.md'),
      `---
name: first-spec
description: The first test spec
---

# First Spec

Content of first spec.`
    );

    writeFileSync(
      join(testDir, 'second-spec.md'),
      `---
name: second-spec
description: The second test spec
---

# Second Spec

Content of second spec.`
    );

    writeFileSync(
      join(testDir, 'no-frontmatter.md'),
      `# No Frontmatter

Just content without frontmatter.`
    );

    // Non-md file should be ignored
    writeFileSync(join(testDir, 'ignored.txt'), 'This should be ignored');

    helper = new SpecFilesHelper({ specsDir: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('listSpecs', () => {
    it('should list all spec files with their metadata', () => {
      const specs = helper.listSpecs();

      expect(specs).toHaveLength(3);

      const firstSpec = specs.find((s) => s.name === 'first-spec');
      expect(firstSpec).toBeDefined();
      expect(firstSpec?.description).toBe('The first test spec');
      expect(firstSpec?.filename).toBe('first-spec.md');

      const secondSpec = specs.find((s) => s.name === 'second-spec');
      expect(secondSpec).toBeDefined();
      expect(secondSpec?.description).toBe('The second test spec');
    });

    it('should use filename as name when frontmatter has no name', () => {
      const specs = helper.listSpecs();

      const noFrontmatter = specs.find((s) => s.filename === 'no-frontmatter.md');
      expect(noFrontmatter?.name).toBe('no-frontmatter');
      expect(noFrontmatter?.description).toBe('');
    });

    it('should ignore non-md files', () => {
      const specs = helper.listSpecs();

      const txtFile = specs.find((s) => s.filename === 'ignored.txt');
      expect(txtFile).toBeUndefined();
    });
  });

  describe('getSpec', () => {
    it('should return spec content by name', () => {
      const spec = helper.getSpec('first-spec');

      expect(spec.name).toBe('first-spec');
      expect(spec.description).toBe('The first test spec');
      expect(spec.content).toBe('# First Spec\n\nContent of first spec.');
      expect(spec.rawContent).toContain('---');
    });

    it('should throw error for non-existent spec', () => {
      expect(() => helper.getSpec('nonexistent')).toThrow('Spec file not found: nonexistent');
    });

    it('should handle spec without frontmatter', () => {
      const spec = helper.getSpec('no-frontmatter');

      expect(spec.name).toBe('no-frontmatter');
      expect(spec.description).toBe('');
      expect(spec.content).toContain('# No Frontmatter');
    });

    it('should handle name with .md extension', () => {
      const spec = helper.getSpec('first-spec.md');

      expect(spec.name).toBe('first-spec');
      expect(spec.filename).toBe('first-spec.md');
    });

    it('should find spec by partial match', () => {
      const spec = helper.getSpec('first');

      expect(spec.name).toBe('first-spec');
      expect(spec.filename).toBe('first-spec.md');
    });

    it('should throw error when multiple specs match', () => {
      expect(() => helper.getSpec('spec')).toThrow(/Multiple specs match/);
    });
  });
});
