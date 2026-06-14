export type ParsedTarget =
  | { type: 'directory'; value: string }
  | { type: 'npm'; value: string };

/**
 * Determine if a target string is a directory path or an NPM package name.
 * Returns 'directory' if it starts with '.' or '/', otherwise 'npm'.
 */
export function parseTarget(target: string): ParsedTarget {
  if (target.startsWith('.') || target.startsWith('/')) {
    return { type: 'directory', value: target };
  }
  return { type: 'npm', value: target };
}
