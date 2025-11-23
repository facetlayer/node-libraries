import { getDatabase, SqliteDatabase } from './Database.ts';

interface TableRecord {
    deploy_name: string;
    rel_path: string;
}

function cleanupStaleRecords(
    db: SqliteDatabase,
    tableName: string,
    cutoffTime: string
) {
    const records: TableRecord[] = db.all(
        `select distinct deploy_name, rel_path from ${tableName}`
    );

    for (const record of records) {
        const deployment = db.get(
            `select * from deployment where deploy_name = ?`,
            [record.deploy_name]
        );

        if (!deployment || deployment.created_at < cutoffTime) {
            db.run(
                `delete from ${tableName} where deploy_name = ? and rel_path = ?`,
                [record.deploy_name, record.rel_path]
            );
        }
    }
}

export async function databaseCleanup() {
    const db = getDatabase();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    cleanupStaleRecords(db, 'deployment_needed_file', fourHoursAgo);
    cleanupStaleRecords(db, 'deployment_pending_multi_part_file_chunk', fourHoursAgo);

    db.run('vacuum');
}