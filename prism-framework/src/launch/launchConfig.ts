import type { DatabaseInitializationOptions } from '../databases/DatabaseInitializationOptions.ts';
import type { LoadDatabaseFn } from '@facetlayer/sqlite-wrapper';

/*
  launchConfig

  This is a global settings object that is set by the entry point when the app starts up. It contains
  settings for logging and database initialization.
*/

export interface LoggingSettings {
  databaseFilename: string;
  enableConsoleLogging: boolean;
  loadDatabase: LoadDatabaseFn;
}

export interface LaunchConfig {
  logging?: LoggingSettings;
  database?: {
    [databaseName: string]: DatabaseInitializationOptions;
  };
}

let _config: LaunchConfig | undefined;

export function getLaunchConfig(): LaunchConfig {
  if (!_config) {
    throw new Error('Launch config not initialized');
  }
  return _config;
}

export function setLaunchConfig(config: LaunchConfig): void {
  if (_config) {
    throw new Error('Launch config already initialized');
  }
  _config = config;
}

export function getDatabaseConfig(databaseName: string): DatabaseInitializationOptions {
  if (!_config) {
    throw new Error(
      'Launch config not initialized (tried to getDatabaseConfig for: ' + databaseName + ')'
    );
  }

  if (!_config.database[databaseName]) {
    throw new Error('Database config not found (tried to getDatabaseConfig for: ' + databaseName + ')');
  }

  return _config.database[databaseName];
}

export function getLoggingConfig(): LoggingSettings {
  if (!_config) {
    throw new Error('Launch config not initialized (in getLoggingConfig)');
  }
  return _config.logging;
}
