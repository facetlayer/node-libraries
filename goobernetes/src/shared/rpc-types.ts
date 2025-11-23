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

export interface NeededFileEntry {
    relPath: string;
    sha: string;
}

// Response event types
export interface DeploymentCreatedEvent {
    t: 'deployment_created';
    deployName: string;
}

export interface NeedFileEvent {
    t: 'need_file';
    relPath: string;
}

export interface VerifyDeploymentResult {
    status: 'success' | 'error';
    error?: string;
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
} as const;

// Simple JSON-RPC interface types (the library handles the actual protocol)
export interface BaseJSONRPCRequest {
    jsonrpc: '2.0';
    method: string;
    params?: any;
    id?: string | number;
}

export interface BaseJSONRPCResponse {
    jsonrpc: '2.0';
    id: string | number | null;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}