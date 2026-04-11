import { setupClient } from './clientSetup.ts';
import type { ExecuteSqlResult } from '../shared/rpc-types.ts';

export interface SqlCommandOptions {
    configFilename: string;
    sql: string;
    database?: string;
    overrideDest?: string;
}

export interface ListDatabasesCommandOptions {
    configFilename: string;
    overrideDest?: string;
}

export async function runSqlCommand(options: SqlCommandOptions): Promise<void> {
    const { client, projectName } = await setupClient({
        configFilename: options.configFilename,
        overrideDest: options.overrideDest,
    });

    const result = await client.executeSql({
        projectName,
        sql: options.sql,
        database: options.database,
    });

    printSqlResult(result);
}

export async function listDatabasesCommand(options: ListDatabasesCommandOptions): Promise<void> {
    const { client, projectName } = await setupClient({
        configFilename: options.configFilename,
        overrideDest: options.overrideDest,
    });

    const result = await client.listDatabases({ projectName });

    if (result.databases.length === 0) {
        console.log('No databases configured for this project.');
        console.log("Add 'database <path>' entries to the .goob config file.");
        return;
    }

    console.log(`Databases for project '${projectName}':`);
    for (const db of result.databases) {
        console.log(`\n  ${db.path}`);
        if (db.tables.length > 0) {
            console.log(`  Tables: ${db.tables.join(', ')}`);
        } else {
            console.log(`  Tables: (none or file not found)`);
        }
    }
}

function printSqlResult(result: ExecuteSqlResult): void {
    if (result.columns.length === 0) {
        console.log(`${result.rowsAffected} row(s) affected`);
        return;
    }

    if (result.rows.length === 0) {
        console.log(result.columns.join('\t'));
        console.log('(0 rows)');
        return;
    }

    // Compute column widths
    const widths = result.columns.map((col, i) => {
        const maxDataWidth = Math.max(...result.rows.map(row => String(row[i] ?? '').length));
        return Math.max(col.length, maxDataWidth);
    });

    const separator = widths.map(w => '-'.repeat(w)).join('  ');
    const header = result.columns.map((col, i) => col.padEnd(widths[i])).join('  ');

    console.log(header);
    console.log(separator);
    for (const row of result.rows) {
        const line = row.map((val, i) => String(val ?? '').padEnd(widths[i])).join('  ');
        console.log(line);
    }
    console.log(`\n(${result.rows.length} row${result.rows.length === 1 ? '' : 's'})`);
}
