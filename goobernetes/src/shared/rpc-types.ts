// We'll define our own simple types instead of importing from json-rpc-2.0

export interface FileEntry {
    relPath: string;
    sha: string;
}

// Request types
export interface CreateDeploymentParams {
    projectName: string;
    sourceFileManifest: FileEntry[];
    sourceFileConfig: string;
}

export interface UploadOneFileParams {
    deployName: string;
    relPath: string;
    contentBase64: string;
}

export interface VerifyDeploymentParams {
    deployName: string;
}

export interface ActivateDeploymentParams {
    deployName: string;
}

export interface StartMultiPartUploadParams {
    deployName: string;
    relPath: string;
}

export interface UploadFilePartParams {
    deployName: string;
    relPath: string;
    chunkStartsAt: number;
    chunkBase64: string;
}

export interface FinishMultiPartUploadParams {
    deployName: string;
    relPath: string;
}

export interface FinishUploadsParams {
    deployName: string;
}

export interface GetNeededFilesParams {
    deployName: string;
}

export interface PreviewDeploymentParams {
    projectName: string;
    sourceFileManifest: FileEntry[];
    sourceFileConfig: string;
}

export interface PreviewDeploymentResult {
    filesToUpload: FileEntry[];
    filesToDelete: string[];
}

export interface DownloadFileParams {
    projectName: string;
    relPath: string;
}

export interface DownloadFileResult {
    contentBase64: string;
    relPath: string;
}

export interface AddManifestFilesParams {
    deployName: string;
    files: FileEntry[];
}

export interface FinalizeManifestParams {
    deployName: string;
}

export interface PreviewByDeployNameParams {
    deployName: string;
}

// Response event types
export interface DeploymentCreatedEvent {
    t: 'deployment_created';
    deployName: string;
}

export interface VerifyDeploymentResult {
    status: 'success' | 'error';
    error?: string;
}

export interface ExecuteSqlParams {
    projectName: string;
    sql: string;
    database?: string;
}

export interface ExecuteSqlResult {
    columns: string[];
    rows: any[][];
    rowsAffected: number;
}

export interface ListDatabasesParams {
    projectName: string;
}

export interface DatabaseInfo {
    path: string;
    absolutePath: string;
    tables: string[];
}

export interface ListDatabasesResult {
    databases: DatabaseInfo[];
}

// JSON-RPC method names
export const RPC_METHODS = {
    CREATE_DEPLOYMENT: 'createDeployment',
    GET_NEEDED_FILES: 'getNeededFiles',
    UPLOAD_ONE_FILE: 'uploadOneFile',
    VERIFY_DEPLOYMENT: 'verifyDeployment',
    ACTIVATE_DEPLOYMENT: 'activateDeployment',
    START_MULTIPART_UPLOAD: 'startMultiPartUpload',
    UPLOAD_FILE_PART: 'uploadFilePart',
    FINISH_MULTIPART_UPLOAD: 'finishMultiPartUpload',
    FINISH_UPLOADS: 'finishUploads',
    PREVIEW_DEPLOYMENT: 'previewDeployment',
    DOWNLOAD_FILE: 'downloadFile',
    ADD_MANIFEST_FILES: 'addManifestFiles',
    FINALIZE_MANIFEST: 'finalizeManifest',
    PREVIEW_BY_DEPLOY_NAME: 'previewByDeployName',
    EXECUTE_SQL: 'executeSql',
    LIST_DATABASES: 'listDatabases',
} as const;

