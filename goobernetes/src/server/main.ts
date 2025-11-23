import express from 'express'
import bodyParser from 'body-parser'
import http from 'http'
import fs from 'fs'
import { GooberneteRPCServer } from './rpc-server.ts';
import { getDeploymentsDir } from './Database.ts'

export interface StartServerOptions {
    disableAPIKeyCheck?: boolean;
    port?: number;
}

export async function startServer(options: StartServerOptions = {}) {
    const disableAPIKeyCheck = options.disableAPIKeyCheck ?? false;
    const port = options.port ?? 4715;

    if (disableAPIKeyCheck) {
        console.warn('️warning: API key check is disabled');
    }
    
    const app = express();
    const server = http.createServer(app);
    
    app.use(bodyParser.json());
    
    const rpcServer = new GooberneteRPCServer(disableAPIKeyCheck);
    
    // Handle HTTP JSON-RPC requests
    app.post('/json-rpc', (req, res) => {
        rpcServer.handleHttpRequest(req, res);
    });

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
    });

    server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use!`);
            process.exit(1);
        } else {
            console.error('Unexpected HTTP server error:', error);
        }
    });

    const deployDir = getDeploymentsDir();

    if (!fs.existsSync(deployDir)) {
        throw new Error(`Deployments directory does not exist: ${deployDir}`);
    }

    if (!fs.statSync(deployDir).isDirectory()) {
        throw new Error(`Deployments directory path is not a directory: ${deployDir}`);
    }

    console.log('Using deploy directory:', deployDir);
    console.log(`Listening for deployments at: localhost:${port}/json-rpc`);
}
