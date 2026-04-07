import express from 'express'
import bodyParser from 'body-parser'
import http from 'http'
import fs from 'fs'
import { GooberneteRPCServer } from './rpc-server.ts';
import { getDeploymentsDir } from './Database.ts'

export interface StartServerOptions {
    disableAPIKeyCheck?: boolean;
    port: number;
}

export async function startServer(options: StartServerOptions) {
    const disableAPIKeyCheck = options.disableAPIKeyCheck ?? false;
    const port = options.port;

    if (disableAPIKeyCheck) {
        console.warn('️warning: API key check is disabled');
    }
    
    const app = express();
    const server = http.createServer(app);
    
    app.use(bodyParser.json({ limit: '50mb' }));
    
    const rpcServer = new GooberneteRPCServer(disableAPIKeyCheck);
    
    const deployDir = getDeploymentsDir();

    if (!fs.existsSync(deployDir)) {
        throw new Error(`Deployments directory does not exist: ${deployDir}`);
    }

    if (!fs.statSync(deployDir).isDirectory()) {
        throw new Error(`Deployments directory path is not a directory: ${deployDir}`);
    }

    console.log('Using deploy directory:', deployDir);

    // Handle HTTP JSON-RPC requests
    app.post('/json-rpc', (req, res) => {
        rpcServer.handleHttpRequest(req, res);
    });

    server.listen(port, () => {
        console.log(`Server listening on port ${port}`);
        console.log(`Listening for deployments at: localhost:${port}/json-rpc`);
    });

    server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use!`);
            process.exit(1);
        } else {
            console.error('Unexpected HTTP server error:', error);
        }
    });
}
