
import { it, expect } from 'vitest'
import Path from 'path'
import { resolveFileList} from '../resolveFileList';
import { FileEntry } from '../FileEntry';

const sampleDir = Path.resolve(__dirname, 'samplefiles');

// Helper to normalize paths in test snapshots
function normalizePathsForSnapshot(files: FileEntry[]): FileEntry[] {
    return files.map(file => ({
        ...file,
        sourcePath: Path.relative(sampleDir, file.sourcePath)
    }));
}

it("include dir-1 and file-1", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-1
        include file-1
    `);
    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-1/file-3",
          "sourcePath": "dir-1/file-3",
        },
        {
          "id": 2,
          "relPath": "file-1",
          "sourcePath": "file-1",
        },
      ]
    `);
});

it("include dir-2", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-2
    `);
    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 2,
          "relPath": "dir-2/file-5",
          "sourcePath": "dir-2/file-5",
        },
        {
          "id": 3,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
      ]
    `);
});

it("exclude a nested file", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-2
        exclude dir-2/file-5
    `);

    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 2,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
      ]
    `);
});

it("include a subdirectory", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-2/subdir-1
    `);
    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
      ]
    `);
});

it("include a file inside a subdirectory", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-2/file-4
    `);
    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
      ]
    `);
});

// Glob pattern tests

const globSampleDir = Path.resolve(__dirname, 'samplefiles-glob');

function normalizeGlobPaths(files: FileEntry[]): string[] {
    return files.map(f => Path.relative(globSampleDir, f.sourcePath)).sort();
}

it("glob: include with wildcard matching directories", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-*
    `);
    expect(normalizePathsForSnapshot(files.listAll()).map(f => f.relPath)).toEqual([
        "dir-1/file-3",
        "dir-2/file-4",
        "dir-2/file-5",
        "dir-2/subdir-1/file-6",
    ]);
});

it("glob: include with wildcard matching files", async () => {
    const files = await resolveFileList(sampleDir, `
        include file-*
    `);
    expect(normalizePathsForSnapshot(files.listAll()).map(f => f.relPath)).toEqual([
        "file-1",
        "file-2",
    ]);
});

it("glob: include with ** to match deep paths", async () => {
    const files = await resolveFileList(globSampleDir, `
        include src/**/*.ts
    `);
    expect(normalizeGlobPaths(files.listAll())).toEqual([
        "src/index.test.ts",
        "src/index.ts",
        "src/lib/helper.test.ts",
        "src/lib/helper.ts",
        "src/utils.ts",
    ]);
});

it("glob: exclude with ** pattern", async () => {
    const files = await resolveFileList(globSampleDir, `
        include src/**/*.ts
        exclude **/*.test.ts
    `);
    expect(normalizeGlobPaths(files.listAll())).toEqual([
        "src/index.ts",
        "src/lib/helper.ts",
        "src/utils.ts",
    ]);
});

it("glob: include with extension wildcard at top level", async () => {
    const files = await resolveFileList(globSampleDir, `
        include *.json
    `);
    expect(normalizeGlobPaths(files.listAll())).toEqual([
        "package.json",
    ]);
});

it("glob: mix glob and exact patterns", async () => {
    const files = await resolveFileList(globSampleDir, `
        include src
        include *.json
        exclude src/lib
    `);
    expect(normalizeGlobPaths(files.listAll())).toEqual([
        "package.json",
        "src/index.test.ts",
        "src/index.ts",
        "src/utils.ts",
    ]);
});

it("exclude a nested directory", async () => {
    const files = await resolveFileList(sampleDir, `
        include dir-2
        exclude dir-2/subdir-1
    `);

    expect(normalizePathsForSnapshot(files.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 2,
          "relPath": "dir-2/file-5",
          "sourcePath": "dir-2/file-5",
        },
      ]
    `);
});