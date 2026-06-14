import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseFrontmatter, DocFilesHelper } from '../index.ts';
import { mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

describe('parseFrontmatter', () => {
  it('should parse frontmatter with name and description', () => {
    const input = `---
name: test-doc
description: A test document
---

# Test Content

This is the body.`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('test-doc');
    expect(result.frontmatter.description).toBe('A test document');
    expect(result.content).toBe('# Test Content\n\nThis is the body.');
  });

  it('should parse frontmatter with custom fields', () => {
    const input = `---
name: my-doc
author: John Doe
version: 1.0
---

Content here`;

    const result = parseFrontmatter(input);

    expect(result.frontmatter.name).toBe('my-doc');
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
name: doc-name
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

describe('DocFilesHelper', () => {
  const testDir = join(import.meta.dirname, '../../test/temp/docs');
  const extraDir = join(import.meta.dirname, '../../test/temp/extra');
  const standaloneFile = join(import.meta.dirname, '../../test/temp/standalone.md');

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(extraDir, { recursive: true });

    writeFileSync(
      join(testDir, 'first-doc.md'),
      `---
name: first-doc
description: The first test doc
---

# First Doc

Content of first doc.`
    );

    writeFileSync(
      join(testDir, 'second-doc.md'),
      `---
name: second-doc
description: The second test doc
---

# Second Doc

Content of second doc.`
    );

    writeFileSync(
      join(testDir, 'no-frontmatter.md'),
      `# No Frontmatter

Just content without frontmatter.`
    );

    // Non-md file should be ignored
    writeFileSync(join(testDir, 'ignored.txt'), 'This should be ignored');

    // File in extra directory
    writeFileSync(
      join(extraDir, 'extra-doc.md'),
      `---
name: extra-doc
description: An extra doc file
---

# Extra Doc

Content of extra doc.`
    );

    // Standalone file outside of directories
    writeFileSync(
      standaloneFile,
      `---
name: standalone
description: A standalone file
---

# Standalone

Standalone content.`
    );
  });

  afterAll(() => {
    rmSync(join(import.meta.dirname, '../../test/temp'), { recursive: true, force: true });
  });

  describe('with dirs option', () => {
    let helper: DocFilesHelper;

    beforeAll(() => {
      helper = new DocFilesHelper({ dirs: [testDir] });
    });

    describe('listDocs', () => {
      it('should list all doc files with their metadata', () => {
        const docs = helper.listDocs();

        expect(docs).toHaveLength(3);

        const firstDoc = docs.find((s) => s.name === 'first-doc');
        expect(firstDoc).toBeDefined();
        expect(firstDoc?.description).toBe('The first test doc');
        expect(firstDoc?.filename).toBe('first-doc.md');

        const secondDoc = docs.find((s) => s.name === 'second-doc');
        expect(secondDoc).toBeDefined();
        expect(secondDoc?.description).toBe('The second test doc');
      });

      it('should use filename as name when frontmatter has no name', () => {
        const docs = helper.listDocs();

        const noFrontmatter = docs.find((s) => s.filename === 'no-frontmatter.md');
        expect(noFrontmatter?.name).toBe('no-frontmatter');
        expect(noFrontmatter?.description).toBe('');
      });

      it('should ignore non-md files', () => {
        const docs = helper.listDocs();

        const txtFile = docs.find((s) => s.filename === 'ignored.txt');
        expect(txtFile).toBeUndefined();
      });
    });

    describe('getDoc', () => {
      it('should return doc content by name', () => {
        const doc = helper.getDoc('first-doc');

        expect(doc.name).toBe('first-doc');
        expect(doc.description).toBe('The first test doc');
        expect(doc.content).toBe('# First Doc\n\nContent of first doc.');
        expect(doc.rawContent).toContain('---');
      });

      it('should throw error for non-existent doc', () => {
        expect(() => helper.getDoc('nonexistent')).toThrow('Doc file not found: nonexistent');
      });

      it('should handle doc without frontmatter', () => {
        const doc = helper.getDoc('no-frontmatter');

        expect(doc.name).toBe('no-frontmatter');
        expect(doc.description).toBe('');
        expect(doc.content).toContain('# No Frontmatter');
      });

      it('should handle name with .md extension', () => {
        const doc = helper.getDoc('first-doc.md');

        expect(doc.name).toBe('first-doc');
        expect(doc.filename).toBe('first-doc.md');
      });

      it('should find doc by partial match', () => {
        const doc = helper.getDoc('first');

        expect(doc.name).toBe('first-doc');
        expect(doc.filename).toBe('first-doc.md');
      });

      it('should throw error when multiple docs match', () => {
        expect(() => helper.getDoc('doc')).toThrow(/Multiple docs match/);
      });
    });
  });

  describe('with multiple dirs', () => {
    let helper: DocFilesHelper;

    beforeAll(() => {
      helper = new DocFilesHelper({ dirs: [testDir, extraDir] });
    });

    it('should list docs from all directories', () => {
      const docs = helper.listDocs();

      expect(docs).toHaveLength(4);
      expect(docs.find((s) => s.name === 'first-doc')).toBeDefined();
      expect(docs.find((s) => s.name === 'extra-doc')).toBeDefined();
    });

    it('should get doc from any directory', () => {
      const doc = helper.getDoc('extra-doc');

      expect(doc.name).toBe('extra-doc');
      expect(doc.description).toBe('An extra doc file');
    });
  });

  describe('with files option', () => {
    let helper: DocFilesHelper;

    beforeAll(() => {
      helper = new DocFilesHelper({ files: [standaloneFile] });
    });

    it('should list standalone files', () => {
      const docs = helper.listDocs();

      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('standalone');
      expect(docs[0].filename).toBe('standalone.md');
    });

    it('should get standalone file by base filename', () => {
      const doc = helper.getDoc('standalone');

      expect(doc.name).toBe('standalone');
      expect(doc.description).toBe('A standalone file');
      expect(doc.content).toBe('# Standalone\n\nStandalone content.');
    });
  });

  describe('with non-existent files', () => {
    it('should silently skip non-existent files in listDocs', () => {
      const helper = new DocFilesHelper({
        files: [
          standaloneFile,
          '/non/existent/file.md',
        ],
      });

      const docs = helper.listDocs();

      // Should only include the existing file, not throw an error
      expect(docs).toHaveLength(1);
      expect(docs[0].name).toBe('standalone');
    });
  });

  describe('with both dirs and files', () => {
    let helper: DocFilesHelper;

    beforeAll(() => {
      helper = new DocFilesHelper({
        dirs: [testDir],
        files: [standaloneFile],
      });
    });

    it('should list docs from both dirs and files', () => {
      const docs = helper.listDocs();

      expect(docs).toHaveLength(4);
      expect(docs.find((s) => s.name === 'first-doc')).toBeDefined();
      expect(docs.find((s) => s.name === 'standalone')).toBeDefined();
    });

    it('should get doc from dirs', () => {
      const doc = helper.getDoc('first-doc');
      expect(doc.name).toBe('first-doc');
    });

    it('should get doc from files', () => {
      const doc = helper.getDoc('standalone');
      expect(doc.name).toBe('standalone');
    });
  });
});
