import { DatabaseSync } from 'node:sqlite';
import { getDatabase } from './Database.ts';
import { getActiveDeploymentDir, getSafePathInDir } from './deployDirs.ts';
import { parseGoobDatabases } from '../shared/parseGoobDatabases.ts';
import { parseSqlTableNames } from '../shared/parseSqlTableNames.ts';
import type { ExecuteSqlParams, ExecuteSqlResult, ListDatabasesParams, ListDatabasesResult, DatabaseInfo } from '../shared/rpc-types.ts';

function getProjectConfig(projectName: string): string {
    const db = getDatabase();
    const activeRecord = db.get(
        `select deploy_name from active_deployment where project_name = ?`,
        [projectName]
    );
    if (!activeRecord) {
        throw new Error(`No active deployment found for project: ${projectName}`);
    }
    const deploymentRecord = db.get(
        `select source_config_file from deployment where deploy_name = ?`,
        [activeRecord.deploy_name]
    );
    if (!deploymentRecord || !deploymentRecord.source_config_file) {
        throw new Error(`Deployment config not found for project: ${projectName}`);
    }
    return deploymentRecord.source_config_file;
}

function getTableNamesInDb(dbPath: string): string[] {
    const db = new DatabaseSync(dbPath);
    try {
        const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as { name: string }[];
        return rows.map(r => r.name.toLowerCase());
    } finally {
        db.close();
    }
}

function buildDatabaseInfoList(deployDir: string, dbPaths: string[]): { path: string; tables: string[] }[] {
    return dbPaths.map(relPath => {
        const absPath = getSafePathInDir(deployDir, relPath);
        let tables: string[] = [];
        try {
            tables = getTableNamesInDb(absPath);
        } catch {
            // database file may not exist yet
        }
        return { path: relPath, tables };
    });
}

function formatDatabaseList(dbInfo: { path: string; tables: string[] }[]): string {
    return dbInfo.map(db => {
        const tableList = db.tables.length > 0 ? db.tables.join(', ') : '(none)';
        return `  ${db.path} (tables: ${tableList})`;
    }).join('\n');
}

function findDatabaseForTables(deployDir: string, dbPaths: string[], tableNames: string[]): string {
    const matches: string[] = [];

    for (const relPath of dbPaths) {
        const absPath = getSafePathInDir(deployDir, relPath);
        try {
            const tables = getTableNamesInDb(absPath);
            const hasAllTables = tableNames.every(t => tables.includes(t.toLowerCase()));
            if (hasAllTables) {
                matches.push(relPath);
            }
        } catch {
            // database file doesn't exist or unreadable
        }
    }

    if (matches.length === 0) {
        const dbInfo = buildDatabaseInfoList(deployDir, dbPaths);
        throw new Error(
            `No database found containing tables: ${tableNames.join(', ')}\n` +
            `Available databases:\n${formatDatabaseList(dbInfo)}`
        );
    }

    if (matches.length > 1) {
        const dbInfo = buildDatabaseInfoList(deployDir, dbPaths);
        throw new Error(
            `Ambiguous query: tables [${tableNames.join(', ')}] found in multiple databases: ${matches.join(', ')}\n` +
            `Use --database to specify which one.\n` +
            `Available databases:\n${formatDatabaseList(dbInfo)}`
        );
    }

    return getSafePathInDir(deployDir, matches[0]);
}

function runSql(dbPath: string, sql: string): ExecuteSqlResult {
    const db = new DatabaseSync(dbPath);
    try {
        const stmt = db.prepare(sql);
        const isSelect = /^\s*(SELECT|WITH|EXPLAIN)\b/i.test(sql);

        if (isSelect) {
            const rows = stmt.all() as Record<string, any>[];
            const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
            return {
                columns,
                rows: rows.map(row => columns.map(col => row[col])),
                rowsAffected: 0,
            };
        } else {
            const result = stmt.run() as { changes: number };
            return {
                columns: [],
                rows: [],
                rowsAffected: result.changes,
            };
        }
    } finally {
        db.close();
    }
}

export function listProjectDatabases({ projectName }: ListDatabasesParams): ListDatabasesResult {
    const deployDir = getActiveDeploymentDir(projectName);
    if (!deployDir) {
        throw new Error(`No active deployment found for project: ${projectName}`);
    }

    const configText = getProjectConfig(projectName);
    const dbPaths = parseGoobDatabases(configText);

    const databases: DatabaseInfo[] = dbPaths.map(relPath => {
        const absolutePath = getSafePathInDir(deployDir, relPath);
        let tables: string[] = [];
        try {
            tables = getTableNamesInDb(absolutePath);
        } catch {
            // database file may not exist yet
        }
        return { path: relPath, absolutePath, tables };
    });

    return { databases };
}

export function executeSql({ projectName, sql, database }: ExecuteSqlParams): ExecuteSqlResult {
    const deployDir = getActiveDeploymentDir(projectName);
    if (!deployDir) {
        throw new Error(`No active deployment found for project: ${projectName}`);
    }

    const configText = getProjectConfig(projectName);
    const dbPaths = parseGoobDatabases(configText);

    if (dbPaths.length === 0) {
        throw new Error(
            `No databases configured for project: ${projectName}. ` +
            `Add 'database <path>' to the .goob config file.`
        );
    }

    let targetDbPath: string;

    if (database) {
        targetDbPath = getSafePathInDir(deployDir, database);
    } else if (dbPaths.length === 1) {
        targetDbPath = getSafePathInDir(deployDir, dbPaths[0]);
    } else {
        const tableNames = parseSqlTableNames(sql);

        if (tableNames.length === 0) {
            const dbInfo = buildDatabaseInfoList(deployDir, dbPaths);
            throw new Error(
                `Cannot determine which database to use for this query. Use --database to specify one.\n` +
                `Available databases:\n${formatDatabaseList(dbInfo)}`
            );
        }

        targetDbPath = findDatabaseForTables(deployDir, dbPaths, tableNames);
    }

    return runSql(targetDbPath, sql);
}
