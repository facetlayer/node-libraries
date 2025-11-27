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
        try {
            return await this.client.request(RPC_METHODS.CREATE_DEPLOYMENT, params);
        } catch (error) {
            console.error('JSON-RPC Error in createDeployment');
            console.error('Method:', RPC_METHODS.CREATE_DEPLOYMENT);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async getNeededFiles(params: GetNeededFilesParams): Promise<NeededFileEntry[]> {
        try {
            return await this.client.request(RPC_METHODS.GET_NEEDED_FILES, params);
        } catch (error) {
            console.error('JSON-RPC Error in getNeededFiles');
            console.error('Method:', RPC_METHODS.GET_NEEDED_FILES);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async uploadOneFile(params: UploadOneFileParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.UPLOAD_ONE_FILE, params);
        } catch (error) {
            console.error('JSON-RPC Error in uploadOneFile');
            console.error('Method:', RPC_METHODS.UPLOAD_ONE_FILE);
            console.error('Params (without content):', JSON.stringify({
                deployName: params.deployName,
                relPath: params.relPath,
                contentLength: params.contentBase64?.length
            }, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async verifyDeployment(params: VerifyDeploymentParams): Promise<VerifyDeploymentResult> {
        try {
            return await this.client.request(RPC_METHODS.VERIFY_DEPLOYMENT, params);
        } catch (error) {
            console.error('JSON-RPC Error in verifyDeployment');
            console.error('Method:', RPC_METHODS.VERIFY_DEPLOYMENT);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async activateDeployment(params: ActivateDeploymentParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.ACTIVATE_DEPLOYMENT, params);
        } catch (error) {
            console.error('JSON-RPC Error in activateDeployment');
            console.error('Method:', RPC_METHODS.ACTIVATE_DEPLOYMENT);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async startMultiPartUpload(params: StartMultiPartUploadParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.START_MULTIPART_UPLOAD, params);
        } catch (error) {
            console.error('JSON-RPC Error in startMultiPartUpload');
            console.error('Method:', RPC_METHODS.START_MULTIPART_UPLOAD);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async uploadFilePart(params: UploadFilePartParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.UPLOAD_FILE_PART, params);
        } catch (error) {
            console.error('JSON-RPC Error in uploadFilePart');
            console.error('Method:', RPC_METHODS.UPLOAD_FILE_PART);
            console.error('Params (without content):', JSON.stringify({
                deployName: params.deployName,
                relPath: params.relPath,
                chunkStartsAt: params.chunkStartsAt,
                chunkLength: params.chunkBase64?.length
            }, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async finishMultiPartUpload(params: FinishMultiPartUploadParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.FINISH_MULTIPART_UPLOAD, params);
        } catch (error) {
            console.error('JSON-RPC Error in finishMultiPartUpload');
            console.error('Method:', RPC_METHODS.FINISH_MULTIPART_UPLOAD);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }

    async finishUploads(params: FinishUploadsParams): Promise<void> {
        try {
            await this.client.request(RPC_METHODS.FINISH_UPLOADS, params);
        } catch (error) {
            console.error('JSON-RPC Error in finishUploads');
            console.error('Method:', RPC_METHODS.FINISH_UPLOADS);
            console.error('Params:', JSON.stringify(params, null, 2));
            console.error('Error:', error);
            throw error;
        }
    }
}