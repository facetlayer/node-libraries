import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const GUIDELINES_FILENAME = '.PROJECT_GUIDELINES.md';

export interface GetGuidelinesResult {
  found: boolean;
  content: string | null;
  path: string;
}

export function getGuidelines(cwd?: string): GetGuidelinesResult {
  const dir = cwd ?? process.cwd();
  const filePath = join(dir, GUIDELINES_FILENAME);

  if (!existsSync(filePath)) {
    return {
      found: false,
      content: null,
      path: filePath,
    };
  }

  const content = readFileSync(filePath, 'utf-8');
  return {
    found: true,
    content,
    path: filePath,
  };
}
