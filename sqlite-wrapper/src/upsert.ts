import { SqliteDatabase } from "./SqliteDatabase";
import {
  prepareInsertStatement,
  prepareUpdateStatement,
} from "./statementBuilders";

/*
 * upsert
 *
 * Userspace implementation of an UPSERT style operation.
 *
 * This will first perform an UPDATE operation. If no rows are affected by the UPDATE, then it
 * will perform an INSERT.
 */
export function upsert(
  db: SqliteDatabase,
  tableName: string,
  where: Record<string, any>,
  row: Record<string, any>,
) {
  const update = prepareUpdateStatement(tableName, where, row);

  // Try to update
  const changesMade = db.run(update.sql, update.values);

  if (changesMade.changes === 0) {
    // If no rows were updated, then insert.
    const insert = prepareInsertStatement(tableName, {
      ...where,
      ...row,
    });

    db.run(insert.sql, insert.values);
  }
}
