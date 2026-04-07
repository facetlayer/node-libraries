import { JSONRPCClient } from 'json-rpc-2.0';
import fetch from 'node-fetch';
import {
    RPC_METHODS,
    CreateDeploymentParams,
    DeploymentCreatedEvent,
    GetNeededFilesParams,
    FileEntry,
    UploadOneFileParams,
    VerifyDeploymentParams,
    VerifyDeploymentResult,
    ActivateDeploymentParams,
    StartMultiPartUploadParams,
    UploadFilePartParams,
    FinishMultiPartUploadParams,
    FinishUploadsParams,
    PreviewDeploymentParams,
    PreviewDeploymentResult,
    DownloadFileParams,
    DownloadFileResult,
    AddManifestFilesParams,
    FinalizeManifestParams,
    PreviewByDeployNameParams,
} from '../shared/rpc-types.ts';

export class GooberneteRPCClient {
    client: JSONRPCClient;
    httpUrl: string;
    apiKey?: string;

    constructor(url: string) {

        if (!url.endsWith('/json-rpc')) {
            if (!url.endsWith('/')) {
                url += '/';
            }
            url += 'json-rpc';
        }

        this.httpUrl = url;
        
        this.client = new JSONRPCClient((jsonRPCRequest) => {
            const headers: Record<string, string> = {
                'content-type': 'application/json',
            };

            const body = JSON.stringify(jsonRPCRequest);

            if (body.length > 1024 * 512) {
                console.warn('GooberneteRPCClient: Large request body (method: ' + jsonRPCRequest.method + ', size: ' + body.length + ')');
            }
            
            if (this.apiKey) {
                headers['x-api-key'] = this.apiKey;
            }

            return fetch(this.httpUrl, {
                method: 'POST',
                headers,
                body,
            }).then((response) => {
                if (response.status === 200) {
                    return response
                        .json()
                        .then((jsonRPCResponse) => this.client.receive(jsonRPCResponse));
                } else if (jsonRPCRequest.id !== undefined) {
                    return Promise.reject(new Error(response.statusText));
                }
            });
        });
    }

    public setApiKey(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async rpcCall<T>(method: string, params: Record<string, any>): Promise<T> {
        try {
            return await this.client.request(method, params);
        } catch (error) {
            console.error(`JSON-RPC Error in ${method}`);
            console.error('Method:', method);
            console.error('Error:', error);
            throw error;
        }
    }

    async createDeployment(params: CreateDeploymentParams): Promise<DeploymentCreatedEvent> {
        return this.rpcCall(RPC_METHODS.CREATE_DEPLOYMENT, params);
    }

    async getNeededFiles(params: GetNeededFilesParams): Promise<FileEntry[]> {
        return this.rpcCall(RPC_METHODS.GET_NEEDED_FILES, params);
    }

    async uploadOneFile(params: UploadOneFileParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.UPLOAD_ONE_FILE, params);
    }

    async verifyDeployment(params: VerifyDeploymentParams): Promise<VerifyDeploymentResult> {
        return this.rpcCall(RPC_METHODS.VERIFY_DEPLOYMENT, params);
    }

    async activateDeployment(params: ActivateDeploymentParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.ACTIVATE_DEPLOYMENT, params);
    }

    async startMultiPartUpload(params: StartMultiPartUploadParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.START_MULTIPART_UPLOAD, params);
    }

    async uploadFilePart(params: UploadFilePartParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.UPLOAD_FILE_PART, params);
    }

    async finishMultiPartUpload(params: FinishMultiPartUploadParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.FINISH_MULTIPART_UPLOAD, params);
    }

    async finishUploads(params: FinishUploadsParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.FINISH_UPLOADS, params);
    }

    async previewDeployment(params: PreviewDeploymentParams): Promise<PreviewDeploymentResult> {
        return this.rpcCall(RPC_METHODS.PREVIEW_DEPLOYMENT, params);
    }

    async downloadFile(params: DownloadFileParams): Promise<DownloadFileResult> {
        return this.rpcCall(RPC_METHODS.DOWNLOAD_FILE, params);
    }

    async addManifestFiles(params: AddManifestFilesParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.ADD_MANIFEST_FILES, params);
    }

    async finalizeManifest(params: FinalizeManifestParams): Promise<void> {
        return this.rpcCall(RPC_METHODS.FINALIZE_MANIFEST, params);
    }

    async previewByDeployName(params: PreviewByDeployNameParams): Promise<PreviewDeploymentResult> {
        return this.rpcCall(RPC_METHODS.PREVIEW_BY_DEPLOY_NAME, params);
    }
}