import { FileEntry } from './FileEntry';

export class FileList {
    private files: FileEntry[] = [];
    private byRelPath: Map<string, FileEntry> = new Map();
    private bySourcePath: Map<string, FileEntry> = new Map();
    private nextId: number = 1;

    constructor() {}

    insert(entry: Omit<FileEntry, 'id'> | FileEntry): void {
        const fileEntry: FileEntry = {
            id: 'id' in entry && entry.id ? entry.id : this.nextId++,
            relPath: entry.relPath,
            sourcePath: entry.sourcePath,
            ...(entry.sha !== undefined && { sha: entry.sha })
        };

        this.files.push(fileEntry);
        this.byRelPath.set(fileEntry.relPath, fileEntry);
        this.bySourcePath.set(fileEntry.sourcePath, fileEntry);
    }

    listAll(): FileEntry[] {
        return [...this.files];
    }

    get(key: string | number): FileEntry | undefined {
        if (typeof key === 'number') {
            return this.files.find(f => f.id === key);
        }
        
        // Try relPath first, then sourcePath
        return this.byRelPath.get(key) || this.bySourcePath.get(key);
    }

    getByRelPath(relPath: string): FileEntry | undefined {
        return this.byRelPath.get(relPath);
    }

    getBySourcePath(sourcePath: string): FileEntry | undefined {
        return this.bySourcePath.get(sourcePath);
    }

    has(key: string): boolean {
        return this.byRelPath.has(key) || this.bySourcePath.has(key);
    }

    hasRelPath(relPath: string): boolean {
        return this.byRelPath.has(relPath);
    }

    hasSourcePath(sourcePath: string): boolean {
        return this.bySourcePath.has(sourcePath);
    }

    each(): FileEntry[] {
        return this.files;
    }

    deleteAll(): void {
        this.files = [];
        this.byRelPath.clear();
        this.bySourcePath.clear();
        this.nextId = 1;
    }

    getStatus(): string {
        return `FileList with ${this.files.length} files`;
    }

    get length(): number {
        return this.files.length;
    }
}