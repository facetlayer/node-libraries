import type { ServiceDefinition } from '../ServiceDefinition.ts';
import type { LoadDatabaseFn, MigrationBehavior } from '@facetlayer/sqlite-wrapper';

export interface DatabaseInitializationOptions {
  migrationBehavior: MigrationBehavior;
  databasePath: string;
  services?: ServiceDefinition[];
  loadDatabase: LoadDatabaseFn;
}