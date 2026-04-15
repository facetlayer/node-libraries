import { getDatabase, SqliteDatabase } from './Database.ts';

function cleanupStaleRecords(
    db: SqliteDatabase,
    tableName: string,
    cutoffTime: string
) {
    // Delete records whose deployment is older than the cutoff or no longer exists
    db.run(
        `delete from ${tableName} where deploy_name in (
            select t.deploy_name from ${tableName} t
            left join deployment d on t.deploy_name = d.deploy_name
            where d.deploy_name is null or d.created_at < ?
        )`,
        [cutoffTime]
    );
}

function cleanupOldManifests(db: SqliteDatabase, keepCount: number) {
    // For each project, null out manifest_json on old deployments beyond the most recent keepCount
    const projects = db.all(`select distinct project_name from deployment`);
    for (const project of projects) {
        db.run(
            `update deployment set manifest_json = null
             where project_name = ?
               and manifest_json is not null
               and deploy_name not in (
                 select deploy_name from deployment
                 where project_name = ?
                 order by created_at desc
                 limit ?
               )`,
            [project.project_name, project.project_name, keepCount]
        );
    }
}

export async function databaseCleanup() {
    const db = getDatabase();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    cleanupStaleRecords(db, 'deployment_needed_file', fourHoursAgo);
    cleanupStaleRecords(db, 'deployment_pending_multi_part_file_chunk', fourHoursAgo);
    cleanupOldManifests(db, 5);
}