// Re-export the library half (DocFilesHelper, parseFrontmatter, types) from
// @facetlayer/docs-helper so existing importers of @facetlayer/docs-tool keep working.
export {
  DocFilesHelper,
  parseFrontmatter,
  type Frontmatter,
  type ParsedDocument,
  type DocInfo,
  type DocContent,
  type DocFilesHelperOptions,
} from '@facetlayer/docs-helper';

// CLI / library-browsing helpers, owned by docs-tool.
export { browseLocalLibrary, type LocalLibraryDocs } from './browseLocalLibrary.ts';
export {
  browseNpmLibrary,
  findLibrary,
  findLibraryInNodeModules,
  getInstallationDirectory,
  getLibraryDocs,
  type LibraryLocation,
  type NpmLibraryDocs,
} from './browseNpmLibrary.ts';
export { parseTarget, type ParsedTarget } from './parseTarget.ts';
