import type { ServiceDefinition } from '../ServiceDefinition.ts';
import type { LoadDatabaseFn, MigrationBehavior } from '@facetlayer/sqlite-wrapper';

/*
 * getStatementsForDatabase
 *
 * Returns all of the SQL statements for a given database name from the given services.
 */
export function getStatementsForDatabase(
  databaseName: string,
  services: ServiceDefinition[]
): string[] {
  return (services || [])
    .map(service => {
      const databases = service.databases as any;
      return databases?.[databaseName]?.statements || [];
    })
    .flat();
}