import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/**
 * Resolves a directory path relative to the calling module's location.
 * Simplifies the common ESM pattern of computing __dirname + join.
 *
 * @example
 * // Instead of:
 * //   const __dirname = dirname(fileURLToPath(import.meta.url));
 * //   web: { dir: join(__dirname, '..', 'web') }
 * // Use:
 * //   web: resolveDir(import.meta.url, '../web')
 */
export function resolveDir(importMetaUrl: string, relativePath: string): string {
  const dir = dirname(fileURLToPath(importMetaUrl));
  return resolve(dir, relativePath);
}
