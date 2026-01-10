import { resolve } from 'path';
import { DocFilesHelper } from './index.ts';

export interface LocalLibraryDocs {
  libraryPath: string;
  helper: DocFilesHelper;
}

/**
 * Create a DocFilesHelper for browsing docs in a local directory.
 */
export function browseLocalLibrary(targetPath: string): LocalLibraryDocs {
  const resolvedPath = resolve(targetPath);

  const helper = new DocFilesHelper({
    dirs: [resolvedPath],
    overrideGetSubcommand: `show ${targetPath}`,
  });

  return {
    libraryPath: resolvedPath,
    helper,
  };
}
