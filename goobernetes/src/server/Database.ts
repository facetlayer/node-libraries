import { getUserdataDatabase, SqliteDatabase } from '@facetlayer/userdata-db'
import { toConsoleLog } from '@facetlayer/streams'

export type { SqliteDatabase }

let _db: SqliteDatabase;

export const DatabaseSchema = {
  name: 'goobernetes',
  statements: [
    `create table deployments_dir(
      deployments_dir text primary key,
      created_at datetime not null
    )`,
    `create table next_deploy_id(
      value integer not null
    )`,
    `create table project(
      project_name text primary key,
      created_at datetime not null
    )`,
    `create table deployment(
      deploy_name text primary key,
      deploy_dir text not null,
      project_name text not null,
      created_at datetime not null,
      source_config_file text,
      manifest_json text,
      web_static_dir text
    )`,
    `create table deployment_needed_file(
      deploy_name text not null,
      rel_path text not null,
      sha text not null,
      created_at datetime not null
    )`,
    `create table deployment_pending_multi_part_file_chunk(
      deploy_name text not null,
      rel_path text not null,
      chunk_start_at integer not null,
      chunk_base64 text not null,
      created_at datetime not null
    )`,
    `create table active_deployment(
      project_name text primary key,
      deploy_name text not null,
      updated_at datetime not null
    )`,
    `create table secret_key(
      key_id integer primary key autoincrement,
      key_text text not null,
      created_at datetime not null
    )`
  ]
}

export function getDatabase(): SqliteDatabase {
  if (!_db) {
    _db = getUserdataDatabase({
      appName: 'goobernetes',
      schema: DatabaseSchema,
      migrationBehavior: 'safe-upgrades',
      logs: toConsoleLog('[database]'),
    })
  }

  return _db
}

export function takeNextDeployId(): number {
  const db = getDatabase()
  return db.incrementingId('next_deploy_id').take()
}


export function getDeploymentsDir(): string {
  const db = getDatabase()
  const found = db.get(`select deployments_dir from deployments_dir`, []);
  if (found) {
    return found.deployments_dir;
  }

  throw new Error('Deployments directory has not been configured');
}
