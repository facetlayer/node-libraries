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

The server requires a `--port` argument. You can use a tool like
[port-assignment](https://www.npmjs.com/package/@facetlayer/port-assignment) to claim a port:

```bash
npx goobernetes serve --port 4800
```

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

### Previewing Drift

To check what has drifted between your local files and the server, use `preview-deploy`. This contacts the server and reports which files would be uploaded (new or changed) and which server-side files would be deleted:

```bash
npx goobernetes preview-deploy <config-file>
```

To only see the list of local files that would be included (without contacting the server):

```bash
npx goobernetes preview-deploy-files <config-file>
```

### Copying Files Back from the Server

If the server has a modified file that would be overwritten or deleted on the next deploy, you can copy it back to your local filesystem:

```bash
npx goobernetes copy-back <config-file> <filename>
```

The `<filename>` is the relative path of the file within the deployment (as shown by `preview-deploy`).

## Configuration Files

The .goob configuration file has the following format:

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4800

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
- `dest-url`: Destination URL of the Goobernetes server (e.g. `http://your-server:PORT`)
- `update-in-place`: Update the same directory instead of creating timestamped ones
- `web-static-dir=<path>`: Records which directory contains static files (used by `@facetlayer/goob-static-web-server` or your own web server)
- `ignore-security-scan(<path>)`: Allowlist a file or directory to bypass security checks (can be repeated)

#### Lifecycle hooks

- `before-deploy` block: Run shell commands on the client before uploading (e.g. `shell(npm run build)`)
- `after-deploy` block: Run shell commands on the server after deployment (e.g. `shell(npm start)`)
- `candle-restart(<service>)`: Restart a Candle-managed service after deployment

#### File inclusion/exclusion

- `include <path>`: Include files or directories in the deployment.
- `exclude <path>`: Exclude files or directories from the deployment.
- `ignore <path>`: Ignore a path or directory on the source side or receiving side.

### Example Configuration

```
deploy-settings
  project-name=my-web-app
  dest-url=http://production-server:4800

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

