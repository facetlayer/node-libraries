import { JSONRPCServer, JSONRPCResponse } from 'json-rpc-2.0';
import { IncomingMessage } from 'http';
import { Request, Response } from 'express';
import { 
    RPC_METHODS,
    CreateDeploymentParams,
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

import { createDeployment } from './createDeployment.ts';
import { getNeededFiles } from './getNeededFiles.ts';
import { activateDeployment } from './activateDeployment.ts';
import { verifyDeployment } from './verifyDeployment.ts';
import { finishUploads } from './finishUploads.ts';
import { getDatabase } from './Database.ts';
import Fs from 'fs/promises';
import { validateSecretKey } from './validateSecretKey.ts';
import { getPathInDeploymentDir } from './deployDirs.ts';

export class GooberneteRPCServer {
    private server: JSONRPCServer;

    constructor(private disableAPIKeyCheck: boolean = false) {
        this.server = new JSONRPCServer();
        this.setupMethods();
    }

    private setupMethods() {
        this.server.addMethod(RPC_METHODS.CREATE_DEPLOYMENT, async (params: CreateDeploymentParams) => {
            return await createDeployment(params);
        });

        this.server.addMethod(RPC_METHODS.GET_NEEDED_FILES, async (params: GetNeededFilesParams): Promise<NeededFileEntry[]> => {
            return await getNeededFiles(params);
        });

        this.server.addMethod(RPC_METHODS.UPLOAD_ONE_FILE, async (params: UploadOneFileParams) => {
            const { deployName, relPath, contentBase64 } = params;
            const db = getDatabase();
            const localPath = getPathInDeploymentDir(deployName, relPath);

            const contents = Buffer.from(contentBase64, 'base64');
            await Fs.writeFile(localPath, contents);

            db.run(
                `delete from deployment_needed_file where deploy_name = ? and rel_path = ?`,
                [deployName, relPath]);
        });

        this.server.addMethod(RPC_METHODS.START_MULTIPART_UPLOAD, async (_params: StartMultiPartUploadParams) => {
            // No need to do anything here for multipart uploads
        });

        this.server.addMethod(RPC_METHODS.UPLOAD_FILE_PART, async (params: UploadFilePartParams) => {
            const { deployName, relPath, chunkStartsAt, chunkBase64 } = params;

            getDatabase().insert('deployment_pending_multi_part_file_chunk', {
                deploy_name: deployName,
                rel_path: relPath,
                chunk_start_at: chunkStartsAt,
                chunk_base64: chunkBase64,
                created_at: new Date().toISOString(),
            });
        });

        this.server.addMethod(RPC_METHODS.FINISH_MULTIPART_UPLOAD, async (params: FinishMultiPartUploadParams) => {
            const { deployName, relPath } = params;
            const localPath = getPathInDeploymentDir(deployName, relPath);

            const chunks = getDatabase().all(`select * from deployment_pending_multi_part_file_chunk where deploy_name = ? and rel_path = ?`,
                [deployName, relPath]);

            chunks.sort((a, b) => a.chunk_start_at - b.chunk_start_at);

            // Delete existing
            try {
                await Fs.unlink(localPath);
            } catch (e) {
                // Ignore.
            }

            // Assemble chunks
            for (const chunk of chunks) {
                const contents = Buffer.from(chunk.chunk_base64, 'base64');
                await Fs.appendFile(localPath, contents);
            }

            // Delete chunks from the database
            getDatabase().run(`delete from deployment_needed_file where deploy_name = ? and rel_path = ?`, [deployName, relPath]);
        });

        this.server.addMethod(RPC_METHODS.FINISH_UPLOADS, async (params: FinishUploadsParams) => {
            return await finishUploads(params);
        });

        this.server.addMethod(RPC_METHODS.VERIFY_DEPLOYMENT, async (params: VerifyDeploymentParams): Promise<VerifyDeploymentResult> => {
            const result = await verifyDeployment(params);
            return { status: result.status as 'success' | 'error', error: result.error };
        });

        this.server.addMethod(RPC_METHODS.ACTIVATE_DEPLOYMENT, async (params: ActivateDeploymentParams) => {
            return activateDeployment(params);
        });
    }

    private validateApiKey(request: IncomingMessage | Request): boolean {
        if (this.disableAPIKeyCheck) {
            return true;
        }

        const apiKey = request.headers['x-api-key'];

        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }

        return validateSecretKey(apiKey);
    }

    async handleHttpRequest(req: Request, res: Response) {
        if (!this.validateApiKey(req)) {
            const errorResponse: JSONRPCResponse = {
                jsonrpc: '2.0',
                id: req.body?.id || null,
                error: {
                    code: -32001,
                    message: 'Unauthorized'
                }
            };
            res.status(401).json(errorResponse);
            return;
        }

        try {
            const jsonRPCRequest = req.body;
            const jsonRPCResponse = await this.server.receive(jsonRPCRequest);
            
            if (jsonRPCResponse) {
                res.json(jsonRPCResponse);
            } else {
                // If response is absent, it was a JSON-RPC notification method.
                // Respond with no content status (204).
                res.sendStatus(204);
            }
        } catch (error) {
            console.error('An unexpected error occurred while executing "' + 
                (req.body?.method || 'unknown') + 
                '" JSON-RPC method:', error);
            const errorResponse: JSONRPCResponse = {
                jsonrpc: '2.0',
                id: req.body?.id || null,
                error: {
                    code: -32603,
                    message: 'Internal error',
                    data: error.message
                }
            };
            res.json(errorResponse);
        }
    }
}