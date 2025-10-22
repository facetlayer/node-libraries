
import { captureError } from '@facetlayer/streams';
import { randomHex } from '@facetlayer/streams';
import { DatabaseSchema } from './DatabaseSchema';
import {
  CreateTableStatement,
  createTableWithReplacedTableName,
  parseSql,
  SqlStatement,
} from './parser';
import { SqliteDatabase } from './SqliteDatabase';

/*
 * Rebuilds a table
 * 
 * The process is:
 * 1. Create a new table with the latest schema and a temporary name
 * 2. Migrate all existing rows over with 'INSERT INTO'
 * 3. Drop the old table
 * 4. Rename the new table to the old table name
 */
export function performTableRebuild(db: SqliteDatabase, schema: DatabaseSchema, tableName: string) {
  db.info('Starting a table rebuild');

  // Based on: https://www.sqlite.org/lang_altertable.html#otheralter
  db.pragma('foreign_keys=OFF');

  const temporaryTableName = 'temp_' + tableName + '_' + randomHex(6);

  let parsedStatements: SqlStatement[] = [];
  let createTableSql: string;
  let createTable: CreateTableStatement;

  for (const sql of schema.statements) {
    const parsed = parseSql(sql);

    parsedStatements.push(parsed);

    if (!createTable && parsed.t === 'create_table' && parsed.table_name === tableName) {
      createTable = parsed;
      createTableSql = sql;
    }
  }

  if (!createTable)
    throw new Error("couldn't find a 'create table' statement in the schame for: " + tableName);
    
    // Start transaction
    const perform = db.db.transaction(() => {
        // Delete all existing views & indexes related to the table
        for (const item of db.each('select type, name, sql FROM sqlite_schema where tbl_name = ?', tableName)) {
            if (item.type === 'table')
                continue;

            if (item.name.startsWith("sqlite_autoindex"))
                continue;

            console.log('TODO: Delete existing resource', item);
        }

        //
        // Create the new_xxx table
        const newTableSql = createTableWithReplacedTableName(createTableSql, temporaryTableName);
        db.run(newTableSql);

        // Copy all the rows over
        const allColumns = createTable.columns.map(column => column.name).join(', ');
        db.run(`INSERT INTO ${temporaryTableName} SELECT ${allColumns} FROM ${tableName};`);

        // Delete the old table
        db.run(`DROP TABLE ${tableName}`)
        
        // Rename the temp table
        db.run(`ALTER TABLE ${temporaryTableName} RENAME TO ${tableName}`);
        
        // Perform migration to recreate any indexes
        db.migrateToSchema(schema, { includeDestructive: false });
        
        db.pragma('foreign_key_check');
    });

    try {
        perform();
    } catch (e) {
        db.error({ errorMessage: "Tried a full migration but failed", cause: captureError(e)});
    }

    db.pragma('foreign_keys=ON');
    db.info("Finished a full migration");
}
