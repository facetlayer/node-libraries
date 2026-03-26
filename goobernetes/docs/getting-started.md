# Getting Started with Goobernetes

This guide walks you through setting up a new project to deploy with Goobernetes.

## Prerequisites

- Node.js (v18 or later)
- npm or pnpm
- A server machine where your code will be deployed
- (Optional) pm2, if you want Goobernetes to manage your process

## Overview

Goobernetes uses a client-server model:

- The **server** runs on your deployment target (e.g. a VPS or production machine) and receives files.
- The **client** runs wherever you trigger deploys from (your local machine, or CI).

You create a `.goob` config file in your project that describes what to deploy and where.

## Step 1: Install Goobernetes

Install the package on both your server and client machines:

```bash
npm install -g @facetlayer/goobernetes
```

Or add it as a dev dependency in your project:

```bash
npm install --save-dev @facetlayer/goobernetes
```

## Step 2: Set Up the Server

On your deployment target machine, run these three commands:

### Configure the deployments directory

Choose a directory where deployed files will be stored:

```bash
npx goobernetes set-deployments-dir /var/deployments
```

### Create a secret key

Generate an API key that clients will use to authenticate:

```bash
npx goobernetes create-secret-key
```

Save the key that is printed -- you'll need it on the client side.

### Start the server

The server requires a `--port` argument. You can use a tool like [port-assignment](https://www.npmjs.com/package/@facetlayer/port-assignment) to claim a port:

```bash
npx goobernetes serve --port 4800
```

It stores metadata in a SQLite database at `~/.local/state/goobernetes/db.sqlite`.

## Step 3: Set Up the Client

On the machine where you'll trigger deploys, set the API key as an environment variable:

```bash
export GOOBERNETES_API_KEY=<your-secret-key>
```

Add this to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist it.

## Step 4: Create a Configuration File

Create a `.goob` file in your project root. Here's a minimal example for a Node.js app:

```
deploy-settings
  project-name=my-app
  dest-url=http://your-server:PORT

include src
include package.json
include package-lock.json

exclude node_modules
exclude .git
exclude .env*
```

### Configuration breakdown

**deploy-settings** (required):
- `project-name` -- Identifies your project. Each project tracks its own deployment history.
- `dest-url` -- The URL of your Goobernetes server (including the port it's running on).
- `update-in-place` -- (optional) Overwrites files in the same directory instead of creating a new versioned directory for each deploy.
- `web-static-dir` -- (optional) Path to a static file directory within your project.

**include** -- List the files and directories to deploy. Each `include` is on its own line.

**exclude** -- Files or directories to skip. Supports wildcards like `*.log` or `src/**/*.test.js`.

**ignore** -- Paths to ignore on both the source and receiving side.

## Step 5: Deploy

From your project directory, run:

```bash
npx goobernetes deploy deploy.goob
```

Goobernetes will:
1. Scan included files and compute checksums
2. Ask the server which files have changed
3. Upload only the changed files
4. Verify all files arrived correctly
5. Activate the deployment

To preview what would be deployed without actually deploying:

```bash
npx goobernetes preview-deploy deploy.goob
```

## Adding Deploy Hooks

You can run commands before or after a deployment. Add these blocks to your `.goob` file:

```
before-deploy
  shell(npm run build)

after-deploy
  shell(npm install --production)
```

`before-deploy` commands run on the **client** before files are uploaded. Use this for build steps.

`after-deploy` commands run on the **server** after the deployment is activated. Use this for installing dependencies or restarting services.

### Managing processes with pm2

If your app runs as a long-lived process, you can have Goobernetes manage it with pm2:

```
after-deploy
  pm2-start name=MyApp
    command(node src/index.js)
```

This will start (or restart) a pm2 process named "MyApp" after each deploy.

## Full Example

Here's a complete `.goob` file for a web application:

```
deploy-settings
  project-name=my-web-app
  dest-url=http://production-server:4800
  web-static-dir=public

before-deploy
  shell(npm run build)

after-deploy
  pm2-start name=MyWebApp
    command(npm start)

include src
include public
include package.json
include package-lock.json

exclude node_modules
exclude .git
exclude .env*
exclude src/**/*.test.js
exclude public/temp
```

## Deployment Modes

### Versioned (default)

Each deploy creates a new directory (e.g. `my-app-1`, `my-app-2`). This allows rollbacks to previous versions.

### Update in place

With `update-in-place` in your deploy-settings, files are overwritten in the same project directory. This is simpler but does not support rollback.

## Security

Goobernetes automatically blocks deployment of sensitive files like `.env`, `.pem`, SSH keys, and credentials files. If your config would include these files, the deploy will fail with a validation error.

## Next Steps

- See the [README](../README.md) for the full configuration reference
- Use `npx goobernetes --help` to explore all available commands
