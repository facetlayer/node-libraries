# Goobernetes

Lightweight deployment tool for deploying services.

A bare-bones and less-complex alternative to Kubernetes.

Supports:
 - Deploy files with smart change detection, uploading only files that changed
 - Manage a database of deployments
 - Roll back to previous deployments

## Installation

```bash
npm install
npm run build
```

## Server Usage

### Setting up the deployments dir

The server needs to have the 'deployments directory' configured. This will be the
path where all incoming deploys are saved.

```bash
npx goobernetes set-deployments-dir <dir>
```

### Setting up the secret key

The client will need to use a secret key to interact with the server.

On the server, create a new one with:

```bash
npx goobernetes create-secret-key
```

### Running the server

Start the Goobernetes server:

```bash
npx goobernetes serve
```

The server will listen on port 4715 by default at `http://localhost:4715/api`.

### Server Data Storage

The server will use your XDG home directory to store a database with deployment metadata.

Example location: `~/.local/state/goobernetes/db.sqlite`

## Client Usage

### Setting up the secret

The client will need a secret key that was created earlier.

Add this as an environment variable `GOOBERNETES_API_KEY`.

### Deployment

From the client, deploy a project using a configuration file:

```bash
npx goobernetes deploy <config-file>
```

## Configuration Files

The .goob configuration file has the following format:

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4715/api

include src
include web
include package.json

exclude web/node_modules
exclude web/yarn-error.log
exclude web/.next

ignore web/.next
```

### Configuration Options

#### deploy-settings block

- `project-name`: Name of the project being deployed
- `dest-url`: Destination URL of the Goobernetes server API endpoint

#### File inclusion/exclusion

- `include <path>`: Include files or directories in the deployment.
- `exclude <path>`: Exclude files or directories from the deployment.
- `ignore <path>`: Ignore a path or directory on the source side or receiving side.

### Example Configuration

```
deploy-settings
  project-name=my-web-app
  dest-url=http://production-server:4715/api

include src
include public
include package.json
include package-lock.json

exclude src/**/*.test.js
exclude public/temp
exclude node_modules
exclude .git
exclude .env.local
```

