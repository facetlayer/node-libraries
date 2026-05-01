import type { ServiceDefinition } from '../ServiceDefinition.ts';
import type { MigrationBehavior } from '@facetlayer/sqlite-wrapper';

export interface DatabaseInitializationOptions {
  migrationBehavior: MigrationBehavior;
  databasePath: string;
  services?: ServiceDefinition[];
}