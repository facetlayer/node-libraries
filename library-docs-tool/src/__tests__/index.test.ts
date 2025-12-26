import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import {
  findLibraryInNodeModules,
  getLibraryDocs,
  getInstallationDirectory,
} from '../index.ts';

const TEST_DIR = './test/temp';

describe('library-docs-tool', () => {
  beforeAll(() => {
    // Create test directory structure
    mkdirSync(TEST_DIR, { recursive: true });

    // Create a fake node_modules with a test package
    const nodeModulesPath = join(TEST_DIR, 'node_modules');
    const testPkgPath = join(nodeModulesPath, 'test-package');
    const testPkgDocsPath = join(testPkgPath, 'docs');

    mkdirSync(testPkgDocsPath, { recursive: true });

    // Create package.json
    writeFileSync(
      join(testPkgPath, 'package.json'),
      JSON.stringify({ name: 'test-package', version: '1.0.0' })
    );

    // Create README.md
    writeFileSync(
      join(testPkgPath, 'README.md'),
      '# Test Package\n\nThis is a test package.'
    );

    // Create a doc file
    writeFileSync(
      join(testPkgDocsPath, 'guide.md'),
      '---\nname: Getting Started\ndescription: A guide to getting started\n---\n\n# Getting Started\n\nHello world!'
    );

    // Create a scoped package
    const scopedPkgPath = join(nodeModulesPath, '@test-scope', 'scoped-pkg');
    mkdirSync(scopedPkgPath, { recursive: true });

    writeFileSync(
      join(scopedPkgPath, 'package.json'),
      JSON.stringify({ name: '@test-scope/scoped-pkg', version: '1.0.0' })
    );

    writeFileSync(
      join(scopedPkgPath, 'README.md'),
      '# Scoped Package\n\nThis is a scoped package.'
    );
  });

  afterAll(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('findLibraryInNodeModules', () => {
    it('should find an exact match for a regular package', () => {
      const result = findLibraryInNodeModules('test-package', TEST_DIR);

      expect(result).not.toBeNull();
      expect(result!.libraryName).toBe('test-package');
      expect(result!.matchType).toBe('exact');
      expect(result!.libraryPath).toContain('test-package');
    });

    it('should find an exact match for a scoped package', () => {
      const result = findLibraryInNodeModules('@test-scope/scoped-pkg', TEST_DIR);

      expect(result).not.toBeNull();
      expect(result!.libraryName).toBe('@test-scope/scoped-pkg');
      expect(result!.matchType).toBe('exact');
    });

    it('should find a partial match', () => {
      const result = findLibraryInNodeModules('test-pack', TEST_DIR);

      expect(result).not.toBeNull();
      expect(result!.libraryName).toBe('test-package');
      expect(result!.matchType).toBe('partial');
    });

    it('should find a partial match for scoped packages', () => {
      const result = findLibraryInNodeModules('scoped-pkg', TEST_DIR);

      expect(result).not.toBeNull();
      expect(result!.libraryName).toBe('@test-scope/scoped-pkg');
      expect(result!.matchType).toBe('partial');
    });

    it('should return null for non-existent packages', () => {
      const result = findLibraryInNodeModules('non-existent-package-xyz', TEST_DIR);

      expect(result).toBeNull();
    });
  });

  describe('getLibraryDocs', () => {
    it('should detect README.md', () => {
      const pkgPath = join(TEST_DIR, 'node_modules', 'test-package');
      const docs = getLibraryDocs(pkgPath, 'test-package');

      expect(docs.hasReadme).toBe(true);
      expect(docs.libraryName).toBe('test-package');
    });

    it('should detect docs folder', () => {
      const pkgPath = join(TEST_DIR, 'node_modules', 'test-package');
      const docs = getLibraryDocs(pkgPath, 'test-package');

      expect(docs.hasDocsFolder).toBe(true);
    });

    it('should list docs from both README and docs folder', () => {
      const pkgPath = join(TEST_DIR, 'node_modules', 'test-package');
      const docs = getLibraryDocs(pkgPath, 'test-package');

      const docsList = docs.helper.listDocs();

      expect(docsList.length).toBe(2);

      const names = docsList.map((d) => d.name);
      expect(names).toContain('README');
      expect(names).toContain('Getting Started');
    });

    it('should get specific doc content', () => {
      const pkgPath = join(TEST_DIR, 'node_modules', 'test-package');
      const docs = getLibraryDocs(pkgPath, 'test-package');

      const guideDoc = docs.helper.getDoc('guide');

      expect(guideDoc.name).toBe('Getting Started');
      expect(guideDoc.description).toBe('A guide to getting started');
      expect(guideDoc.content).toContain('Hello world!');
    });
  });

  describe('getInstallationDirectory', () => {
    it('should return a valid path', () => {
      const dir = getInstallationDirectory();

      expect(dir).toBeTruthy();
      expect(typeof dir).toBe('string');
      expect(dir).toContain('library-docs-tool');
    });
  });
});
