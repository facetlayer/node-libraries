
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