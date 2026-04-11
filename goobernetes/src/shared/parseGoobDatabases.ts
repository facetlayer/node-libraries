import { parseFile } from '@facetlayer/qc';

/**
 * Parses 'database <path>' entries from a .goob config file.
 *
 * Config format:
 *   database data/app.sqlite
 *   database logs/metrics.sqlite
 *
 * Returns an array of relative paths to the database files.
 * Paths are relative to the project's deployment directory.
 */
export function parseGoobDatabases(configText: string): string[] {
    const queries = parseFile(configText);
    const databases: string[] = [];

    for (const query of queries) {
        if (query.command === 'database') {
            const pathTag = query.tags[0];
            if (pathTag && pathTag.attr) {
                databases.push(pathTag.attr);
            }
        }
    }

    return databases;
}
