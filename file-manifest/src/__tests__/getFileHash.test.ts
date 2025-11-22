import { it, expect, beforeAll, afterAll } from 'vitest'
import Path from 'path'
import fs from 'fs'
import { getFileHash } from '../getFileHash'

const tempDir = Path.resolve(__dirname, 'temp');

beforeAll(() => {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
});

afterAll(() => {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true });
    }
});

it("returns consistent hash for same content", async () => {
    const filePath = Path.join(tempDir, 'hash-test-1.txt');
    fs.writeFileSync(filePath, 'hello world');

    const hash1 = await getFileHash(filePath);
    const hash2 = await getFileHash(filePath);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
});

it("returns different hash for different content", async () => {
    const filePath1 = Path.join(tempDir, 'hash-test-2a.txt');
    const filePath2 = Path.join(tempDir, 'hash-test-2b.txt');
    fs.writeFileSync(filePath1, 'content A');
    fs.writeFileSync(filePath2, 'content B');

    const hash1 = await getFileHash(filePath1);
    const hash2 = await getFileHash(filePath2);

    expect(hash1).not.toBe(hash2);
});

it("returns null for non-existent file", async () => {
    const filePath = Path.join(tempDir, 'does-not-exist.txt');

    const hash = await getFileHash(filePath);

    expect(hash).toBeNull();
});

it("produces correct SHA-256 hash", async () => {
    const filePath = Path.join(tempDir, 'hash-test-known.txt');
    fs.writeFileSync(filePath, 'test');

    const hash = await getFileHash(filePath);

    // SHA-256 of "test" is known
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
});

it("handles empty file", async () => {
    const filePath = Path.join(tempDir, 'hash-test-empty.txt');
    fs.writeFileSync(filePath, '');

    const hash = await getFileHash(filePath);

    // SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

it("handles binary content", async () => {
    const filePath = Path.join(tempDir, 'hash-test-binary.bin');
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]);
    fs.writeFileSync(filePath, binaryData);

    const hash = await getFileHash(filePath);

    expect(hash).toHaveLength(64);
    expect(typeof hash).toBe('string');
});
