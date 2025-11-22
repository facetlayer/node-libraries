import { it, expect } from 'vitest'
import Path from 'path'
import { findLeftoverFiles } from '../findLeftoverFiles';
import { FileList } from '../FileList';
import { parseRulesFile } from '../parseRulesFile';
import { FileEntry } from '../FileEntry';

const sampleDir = Path.resolve(__dirname, 'samplefiles');

// Helper to normalize paths in test snapshots
function normalizePathsForSnapshot(files: FileEntry[]): FileEntry[] {
    return files.map(file => ({
        ...file,
        sourcePath: Path.relative(sampleDir, file.sourcePath)
    }));
}

it("finds leftover files when incoming files don't cover all existing files", async () => {
    const incomingFiles = new FileList();
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'file-1'),
        relPath: 'file-1'
    });

    const leftovers = await findLeftoverFiles(sampleDir, incomingFiles, []);
    
    expect(normalizePathsForSnapshot(leftovers.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-1/file-3",
          "sourcePath": "dir-1/file-3",
        },
        {
          "id": 2,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 3,
          "relPath": "dir-2/file-5",
          "sourcePath": "dir-2/file-5",
        },
        {
          "id": 4,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
        {
          "id": 5,
          "relPath": "file-2",
          "sourcePath": "file-2",
        },
      ]
    `);
});

it("returns empty table when all files are covered by incoming files", async () => {
    const incomingFiles = new FileList();
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'file-1'),
        relPath: 'file-1'
    });
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'file-2'),
        relPath: 'file-2'
    });
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'dir-1/file-3'),
        relPath: 'dir-1/file-3'
    });
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'dir-2/file-4'),
        relPath: 'dir-2/file-4'
    });
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'dir-2/file-5'),
        relPath: 'dir-2/file-5'
    });
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'dir-2/subdir-1/file-6'),
        relPath: 'dir-2/subdir-1/file-6'
    });

    const leftovers = await findLeftoverFiles(sampleDir, incomingFiles, []);
    
    expect(leftovers.listAll()).toEqual([]);
});

it("respects ignore-destination rules", async () => {
    const incomingFiles = new FileList();
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'file-1'),
        relPath: 'file-1'
    });

    const rules = parseRulesFile('ignore-destination file-2');

    const leftovers = await findLeftoverFiles(sampleDir, incomingFiles, rules);
    
    expect(normalizePathsForSnapshot(leftovers.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-1/file-3",
          "sourcePath": "dir-1/file-3",
        },
        {
          "id": 2,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 3,
          "relPath": "dir-2/file-5",
          "sourcePath": "dir-2/file-5",
        },
        {
          "id": 4,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
      ]
    `);
});

it("respects ignore rules", async () => {
    const incomingFiles = new FileList();
    incomingFiles.insert({
        sourcePath: Path.join(sampleDir, 'file-1'),
        relPath: 'file-1'
    });

    const rules = parseRulesFile('ignore file-2');

    const leftovers = await findLeftoverFiles(sampleDir, incomingFiles, rules);
    
    expect(normalizePathsForSnapshot(leftovers.listAll())).toMatchInlineSnapshot(`
      [
        {
          "id": 1,
          "relPath": "dir-1/file-3",
          "sourcePath": "dir-1/file-3",
        },
        {
          "id": 2,
          "relPath": "dir-2/file-4",
          "sourcePath": "dir-2/file-4",
        },
        {
          "id": 3,
          "relPath": "dir-2/file-5",
          "sourcePath": "dir-2/file-5",
        },
        {
          "id": 4,
          "relPath": "dir-2/subdir-1/file-6",
          "sourcePath": "dir-2/subdir-1/file-6",
        },
      ]
    `);
});