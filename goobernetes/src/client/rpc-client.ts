import { JSONRPCClient } from 'json-rpc-2.0';
import fetch from 'node-fetch';
import { 
    RPC_METHODS, 
    CreateDeploymentParams,
    DeploymentCreatedEvent,
    GetNeededFilesParams,
    NeededFileEntry,
    UploadOneFileParams,
    VerifyDeploymentParams,
    VerifyDeploymentResult,
    ActivateDeploymentParams,
    StartMultiPartUploadParams,
    UploadFilePartParams,
    FinishMultiPartUploadParams,
    FinishUploadsParams
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

            // Warn if body is too large
            if (body.length > 1024 * 100) {
                console.warn('GooberneteRPCClient: Request body is too large (method: ' + jsonRPCRequest.method + '): ' + body.length);
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

    async createDeployment(params: CreateDeploymentParams): Promise<DeploymentCreatedEvent> {
        return await this.client.request(RPC_METHODS.CREATE_DEPLOYMENT, params);
    }

    async getNeededFiles(params: GetNeededFilesParams): Promise<NeededFileEntry[]> {
        return await this.client.request(RPC_METHODS.GET_NEEDED_FILES, params);
    }

    async uploadOneFile(params: UploadOneFileParams): Promise<void> {
        await this.client.request(RPC_METHODS.UPLOAD_ONE_FILE, params);
    }

    async verifyDeployment(params: VerifyDeploymentParams): Promise<VerifyDeploymentResult> {
        return await this.client.request(RPC_METHODS.VERIFY_DEPLOYMENT, params);
    }

    async activateDeployment(params: ActivateDeploymentParams): Promise<void> {
        await this.client.request(RPC_METHODS.ACTIVATE_DEPLOYMENT, params);
    }

    async startMultiPartUpload(params: StartMultiPartUploadParams): Promise<void> {
        await this.client.request(RPC_METHODS.START_MULTIPART_UPLOAD, params);
    }

    async uploadFilePart(params: UploadFilePartParams): Promise<void> {
        await this.client.request(RPC_METHODS.UPLOAD_FILE_PART, params);
    }

    async finishMultiPartUpload(params: FinishMultiPartUploadParams): Promise<void> {
        await this.client.request(RPC_METHODS.FINISH_MULTIPART_UPLOAD, params);
    }

    async finishUploads(params: FinishUploadsParams): Promise<void> {
        await this.client.request(RPC_METHODS.FINISH_UPLOADS, params);
    }
}