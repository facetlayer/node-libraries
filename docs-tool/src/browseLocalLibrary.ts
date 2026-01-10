import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { DocFilesHelper } from './index.ts';

export interface LocalLibraryDocs {
  libraryPath: string;
  helper: DocFilesHelper;
  hasDocsFolder: boolean;
}

/**
 * Create a DocFilesHelper for browsing docs in a local directory.
 * Looks for .md files in the target directory and also in a ./docs subdirectory if it exists.
 */
export function browseLocalLibrary(targetPath: string): LocalLibraryDocs {
  const resolvedPath = resolve(targetPath);
  const docsPath = join(resolvedPath, 'docs');
  const hasDocsFolder = existsSync(docsPath);

  const dirs: string[] = [resolvedPath];
  if (hasDocsFolder) {
    dirs.push(docsPath);
  }

  const helper = new DocFilesHelper({
    dirs,
    overrideGetSubcommand: `show ${targetPath}`,
  });

  return {
    libraryPath: resolvedPath,
    helper,
    hasDocsFolder,
  };
}
