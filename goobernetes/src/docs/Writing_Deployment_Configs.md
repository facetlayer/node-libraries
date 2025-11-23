# Writing Deployment Configs

A comprehensive guide to writing `.goob` deployment configuration files for Goobernetes.

## Table of Contents

- [Overview](#overview)
- [Basic Structure](#basic-structure)
- [Deploy Settings Block](#deploy-settings-block)
- [File Rules](#file-rules)
- [Lifecycle Hooks](#lifecycle-hooks)
- [Security Considerations](#security-considerations)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)

## Overview

Goobernetes uses `.goob` configuration files to define how your application should be deployed. These files specify:
- Project metadata and deployment destinations
- Which files to include/exclude from deployments
- Pre and post-deployment commands
- Process management with PM2
- Static file serving configuration

The configuration format is declarative and uses a block-based syntax that's easy to read and maintain.

## Basic Structure

A `.goob` file consists of multiple blocks, each serving a specific purpose:

```
deploy-settings
  key=value
  key=value

before-deploy
  shell(command)

after-deploy
  pm2-start name=ProcessName
    command(start command)

include path
exclude path
ignore path
```

## Deploy Settings Block

The `deploy-settings` block contains core configuration for your deployment.

### Required Settings

#### project-name

The unique identifier for your project. This determines where deployments are stored on the server.

```
deploy-settings
  project-name=my-application
```

#### dest-url

The URL of the Goobernetes server API endpoint where deployments will be sent.

```
deploy-settings
  dest-url=http://production-server:4715/api
```

### Optional Settings

#### update-in-place

When set, deployments update the same directory instead of creating new timestamped directories. This is useful for applications that need a stable deployment path.

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4715/api
  update-in-place
```

**Without `update-in-place`:** Deployments are stored in timestamped directories like `my-app-20250125-143022`

**With `update-in-place`:** All deployments update the directory `my-app`

#### web-static-dir

Specifies a directory within your deployment that should be served as static files via HTTP. The Goobernetes server will automatically serve these files.

```
deploy-settings
  project-name=my-web-app
  dest-url=http://localhost:4715/api
  web-static-dir=public
```

This is particularly useful for:
- Single-page applications with built output
- Static sites
- Assets like images, CSS, and JavaScript files

**Example use case:** If you have a Next.js app that builds to `web/out`, you can serve it directly:

```
deploy-settings
  project-name=nextjs-app
  dest-url=http://localhost:4715/api
  web-static-dir=web/out
```

### Complete Deploy Settings Example

```
deploy-settings
  project-name=production-api
  dest-url=http://api.example.com:4715/api
  update-in-place
  web-static-dir=public/dist
```

## File Rules

File rules determine which files are included in your deployment. Goobernetes supports three types of rules: `include`, `exclude`, and `ignore`.

### Include Rules

The `include` directive specifies files or directories that should be deployed. You can include:
- Individual files
- Entire directories (recursively)
- Multiple items with multiple `include` statements

```
include package.json
include package-lock.json
include src
include config
include README.md
```

**Key Points:**
- All `include` rules are processed first
- Directories are included recursively
- You must explicitly include what you want to deploy

### Exclude Rules

The `exclude` directive removes specific files or patterns from the deployment, even if they match an `include` rule.

```
exclude node_modules
exclude .git
exclude .DS_Store
exclude *.log
exclude **/*.test.js
exclude src/**/*.spec.ts
```

**Use cases:**
- Remove development dependencies
- Exclude test files
- Remove build artifacts
- Filter out temporary files
- Exclude version control directories

**Pattern examples:**

```
# Exclude all log files anywhere
exclude *.log

# Exclude specific directories
exclude test
exclude coverage
exclude .git

# Exclude specific files in subdirectories
exclude web/node_modules
exclude api/.env

# Exclude test files using patterns
exclude **/*.test.js
exclude **/*.spec.ts
exclude src/index.test.js
```

### Ignore Rules

The `ignore` directive is special - it tells Goobernetes to ignore a file or directory on **both** the source and destination sides.

**What this means:**
1. The file won't be deployed from source (if it exists there)
2. If the file already exists on the server, it won't be deleted or modified
3. The file is essentially "hands-off" for Goobernetes

```
ignore data/local-cache.db
ignore logs/runtime.log
ignore temp-data.txt
```

**Perfect for:**
- Server-generated data files
- Runtime logs
- User-uploaded content
- Database files
- Files that should persist across deployments

**Example scenario:**

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4715/api
  update-in-place

include src
include package.json

exclude node_modules

# This database is generated on the server and should never be touched
ignore data/app.db

# These logs are created at runtime on the server
ignore logs
```

When you deploy:
1. New code from `src` is uploaded
2. `package.json` is updated if changed
3. `data/app.db` remains untouched (even if it exists in source)
4. Log files in `logs/` directory persist across deployments

### File Rule Evaluation Order

Rules are evaluated in this order:

1. **Include rules** - Collect all files matching include patterns
2. **Exclude rules** - Remove files matching exclude patterns
3. **Ignore rules** - Mark files to be ignored entirely

### Complete File Rules Example

```
# Include application files
include src
include web/out
include package.json
include package-lock.json
include README.md

# Exclude development and build artifacts
exclude node_modules
exclude .git
exclude .gitignore
exclude web/src
exclude web/node_modules
exclude web/.next
exclude **/*.test.js
exclude **/*.spec.ts
exclude coverage
exclude .DS_Store
exclude *.log

# Ignore server-side data
ignore data/uploads
ignore logs
ignore .env.production
```

## Lifecycle Hooks

Goobernetes supports lifecycle hooks to run commands at specific points in the deployment process.

### Before Deploy Hook

The `before-deploy` block executes commands on the **client side** before files are uploaded. This is perfect for build steps.

```
before-deploy
  shell(npm run build)
```

**Runs on:** Client machine (where you run `goobernetes deploy`)
**Timing:** Before any files are uploaded
**Working directory:** The directory containing the `.goob` file

**Common use cases:**
- Building production bundles
- Running TypeScript compilation
- Optimizing assets
- Running tests
- Generating documentation

**Examples:**

```
# Build a Next.js application
before-deploy
  shell(cd web && npm run build)
```

```
# Multiple build steps
before-deploy
  shell(pnpm install && pnpm build)
```

```
# TypeScript compilation
before-deploy
  shell(tsc -p .)
```

**Important:** If the command fails (non-zero exit code), the deployment is aborted.

### After Deploy Hook

The `after-deploy` block executes commands on the **server side** after files have been deployed. Use this for starting services, installing dependencies, or running migrations.

```
after-deploy
  shell(npm install --production)
```

**Runs on:** Server (where Goobernetes server is running)
**Timing:** After all files are uploaded and verified
**Working directory:** The deployment directory on the server

#### Shell Commands

Run arbitrary shell commands on the server:

```
after-deploy
  shell(npm install --production)
```

```
after-deploy
  shell(npm ci && npm run migrate)
```

#### PM2 Process Management

The `pm2-start` directive integrates with PM2 for process management. This is the recommended way to run Node.js services.

**Basic syntax:**

```
after-deploy
  pm2-start name=ProcessName
    command(start command)
```

**Example:**

```
after-deploy
  pm2-start name=MyAPI
    command(node dist/server.js)
```

**How it works:**

1. **First deployment:** Creates a new PM2 process with the specified name
2. **Subsequent deployments:**
   - If command unchanged: Restarts the existing process
   - If command changed: Deletes old process and creates new one
3. **Environment variables:** The `PORT` is automatically assigned by Goobernetes

**Common patterns:**

```
# Node.js API server
after-deploy
  pm2-start name=ProductionAPI
    command(node server.js)
```

```
# Using npm script
after-deploy
  pm2-start name=MyApp
    command(npm start)
```

```
# Using pnpm
after-deploy
  pm2-start name=WebService
    command(pnpm start)
```

**Important notes:**
- PM2 must be installed on the server
- Process names must be unique across all deployments
- The assigned PORT is available via `process.env.PORT`

#### Combining Shell and PM2

You can combine shell commands and PM2 process management:

```
after-deploy
  shell(npm ci)
  shell(npm run migrate)
  pm2-start name=MyAPI
    command(npm start)
```

**Note:** Currently, only one `shell()` command and one `pm2-start` block are supported per `after-deploy` block. For multiple shell commands, chain them:

```
after-deploy
  shell(npm ci && npm run migrate && npm run seed)
```

### Complete Lifecycle Example

```
deploy-settings
  project-name=fullstack-app
  dest-url=http://localhost:4715/api
  update-in-place
  web-static-dir=web/out

before-deploy
  shell(pnpm build)

after-deploy
  shell(pnpm install --prod)
  pm2-start name=FullstackAPI
    command(pnpm start)

include web/out
include api/dist
include package.json
include pnpm-lock.yaml

exclude web/src
exclude web/node_modules
exclude api/src
exclude node_modules
```

## Security Considerations

Goobernetes has built-in security features to prevent accidental deployment of sensitive files.

### Automatic Security Checks

The following files and patterns are **automatically blocked** from deployment:

**Environment files:**
- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.test`
- Any file matching `.env.*`

**SSH and certificates:**
- `.ssh` directory
- `id_rsa`, `id_ed25519`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `private.key`, `server.key`, `ssl.key`, `certificate.key`

**Cloud credentials:**
- `.aws` directory
- `.gcp` directory
- `.azure` directory

**Sensitive configs:**
- `config.json`
- `secrets.json`
- `credentials.json`
- `database.env`
- `.npmrc`, `.yarnrc`

**Patterns:**
- Any file containing `secret` in the name
- Any file containing `credential` in the name
- Any file containing `password` in the name

**Version control:**
- `.git` directory contents
- `.gitignore` (should be excluded, not blocked)

### If You Need to Deploy Sensitive Files

If you legitimately need to deploy a file that matches these patterns (rare), you can:

1. **Rename the file** to avoid the pattern
2. **Use environment variables** on the server instead
3. **Store secrets in a secure vault** (recommended)

### Best Practices

1. **Always exclude `.env` files explicitly:**
```
exclude .env
exclude .env.*
exclude .env.local
```

2. **Use `.gitignore` as a reference** - Most files in `.gitignore` should also be excluded from deployments

3. **Keep secrets on the server** - Use environment variables or secure secret management

4. **Audit your includes** - Use `goobernetes preview-deploy config.goob` to see what will be deployed:

```bash
npx goobernetes preview-deploy deploy.goob
```

## Complete Examples

### Example 1: Simple Node.js API

```
deploy-settings
  project-name=simple-api
  dest-url=http://production:4715/api
  update-in-place

before-deploy
  shell(npm run build)

after-deploy
  pm2-start name=SimpleAPI
    command(node dist/server.js)

include dist
include package.json
include package-lock.json

exclude node_modules
exclude src
exclude *.test.js
exclude .git
```

### Example 2: Next.js Full-Stack Application

```
deploy-settings
  project-name=nextjs-app
  dest-url=http://localhost:4715/api
  update-in-place
  web-static-dir=web/out

before-deploy
  shell(cd web && npm run build && cd .. && npm run build:api)

after-deploy
  pm2-start name=NextjsAPI
    command(npm run start:api)

# Include built frontend
include web/out
include web/public

# Include built backend
include api/dist
include api/package.json

# Include root configs
include package.json
include package-lock.json

# Exclude source code
exclude web/src
exclude web/node_modules
exclude web/.next
exclude api/src
exclude node_modules

# Exclude dev files
exclude .git
exclude .gitignore
exclude *.md
exclude .DS_Store
exclude *.log

# Ignore runtime data
ignore logs
ignore data/uploads
```

### Example 3: Monorepo with Multiple Services

```
deploy-settings
  project-name=monorepo-services
  dest-url=http://production:4715/api
  update-in-place

before-deploy
  shell(pnpm run build)

after-deploy
  shell(pnpm install --prod --frozen-lockfile)
  pm2-start name=APIGateway
    command(pnpm run start:gateway)

# Include compiled services
include packages/gateway/dist
include packages/auth/dist
include packages/users/dist
include packages/shared/dist

# Include package files
include package.json
include pnpm-lock.yaml
include pnpm-workspace.yaml
include packages/*/package.json

# Exclude all source code
exclude packages/*/src
exclude packages/*/node_modules

# Exclude monorepo dev files
exclude node_modules
exclude .git
exclude **/*.test.ts
exclude **/*.spec.ts
exclude **/tsconfig.json
exclude .DS_Store
exclude *.log

# Ignore server-side data
ignore data
ignore logs
```

### Example 4: Static Website

```
deploy-settings
  project-name=marketing-site
  dest-url=http://web-server:4715/api
  update-in-place
  web-static-dir=dist

before-deploy
  shell(npm run build)

# Only include the built static files
include dist

# No after-deploy needed for static sites
```

### Example 5: Application with Database Migrations

```
deploy-settings
  project-name=app-with-migrations
  dest-url=http://localhost:4715/api
  update-in-place

before-deploy
  shell(npm run build)

after-deploy
  shell(npm ci && npm run migrate:up)
  pm2-start name=AppWithDB
    command(npm start)

include dist
include migrations
include package.json
include package-lock.json

exclude node_modules
exclude src
exclude .git
exclude *.test.js

# Ignore the SQLite database file
ignore data/app.db
```

### Example 6: Multi-Stage Build Process

```
deploy-settings
  project-name=complex-build
  dest-url=http://staging:4715/api
  update-in-place
  web-static-dir=frontend/build

before-deploy
  shell(npm run lint && npm run test && npm run build:frontend && npm run build:backend)

after-deploy
  shell(npm ci --production)
  pm2-start name=ComplexAPI
    command(node backend/dist/index.js)

include frontend/build
include backend/dist
include package.json
include package-lock.json

exclude frontend/src
exclude frontend/node_modules
exclude backend/src
exclude node_modules
exclude coverage
exclude .git
exclude **/*.test.js
exclude **/*.spec.ts

ignore logs
ignore uploads
```

## Best Practices

### 1. Start Simple

Begin with a minimal configuration and add complexity as needed:

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4715/api

include dist
exclude node_modules
```

### 2. Use Preview Before Deploying

Always preview what will be deployed:

```bash
npx goobernetes preview-deploy deploy.goob
```

This shows exactly which files will be included.

### 3. Match Your .gitignore

Most files you exclude from git should also be excluded from deployments:

```
exclude node_modules
exclude .git
exclude coverage
exclude .DS_Store
exclude *.log
```

### 4. Build Before Deploy

Always build on the client side, not the server:

```
before-deploy
  shell(npm run build)

include dist
exclude src
```

This keeps your deployment packages small and avoids installing dev dependencies on the server.

### 5. Use update-in-place for Stable Paths

If your application relies on a consistent deployment path, use `update-in-place`:

```
deploy-settings
  update-in-place
```

### 6. Leverage ignore for Server Data

Use `ignore` for data that should persist across deployments:

```
ignore data
ignore uploads
ignore logs
ignore .env.production
```

### 7. Keep Secrets Out of Version Control

Never commit `.goob` files with sensitive data. Use environment variables instead:

```bash
export GOOBERNETES_API_KEY=your-secret-key
```

### 8. Name PM2 Processes Clearly

Use descriptive names that indicate the service and environment:

```
pm2-start name=ProductionAPI
pm2-start name=StagingWebService
pm2-start name=DevAuthService
```

### 9. Chain Related Commands

When you need multiple shell commands in sequence:

```
after-deploy
  shell(npm ci && npm run migrate && npm run seed)
```

### 10. Document Your Config

Add a comment block at the top of your `.goob` file (not currently supported, but good practice to plan for):

```
# Production deployment configuration
# Builds: Next.js frontend + Express API
# Serves: Static files from web/out
# Runs: API server via PM2 on assigned port
```

### 11. Test in Stages

1. Test with `preview-deploy` first
2. Deploy to a staging environment
3. Verify the deployment
4. Deploy to production

### 12. Monitor Your Deployments

After deploying with PM2, check the process status:

```bash
pm2 list
pm2 logs MyAPI
pm2 monit
```

## Troubleshooting

### Files Not Being Deployed

**Check:**
1. Are the files included? Use `preview-deploy` to verify
2. Are they excluded by a pattern?
3. Are they blocked by security rules?

**Solution:** Adjust your `include` and `exclude` rules.

### Before-Deploy Command Fails

**Check:**
1. Is the command correct?
2. Are dependencies installed?
3. Is the working directory correct?

**Solution:** Test the command manually in your terminal first.

### PM2 Process Not Starting

**Check:**
1. Is PM2 installed on the server?
2. Is the command correct?
3. Are there any logs in `pm2 logs`?

**Solution:** SSH to the server and debug with PM2 directly:

```bash
pm2 logs ProcessName
pm2 describe ProcessName
```

### Sensitive Files Being Blocked

**Check:** Is the file actually needed in deployment?

**Solution:** Usually, you don't need the file. Use environment variables or server-side secrets instead.

## Advanced Topics

### Environment Variables

The Goobernetes server automatically provides:
- `PORT` - Assigned port for your service (when using PM2)

Access in your Node.js app:
```javascript
const port = process.env.PORT || 3000;
```

### Working with Multiple Environments

Create separate `.goob` files for each environment:

```
deploy.production.goob
deploy.staging.goob
deploy.development.goob
```

Deploy with:
```bash
npx goobernetes deploy deploy.production.goob
```

### Override Destination URL

You can override the destination URL at deploy time:

```bash
npx goobernetes deploy deploy.goob --override-dest http://other-server:4715/api
```

This is useful for testing or deploying to different environments with the same config file.

## Summary

A well-crafted `.goob` configuration should:
- Clearly specify what to deploy with `include` rules
- Exclude unnecessary files with `exclude` rules
- Protect server data with `ignore` rules
- Build on the client with `before-deploy` hooks
- Manage processes with `after-deploy` and PM2
- Keep secrets secure and out of deployments

Start simple, iterate, and use `preview-deploy` liberally to ensure you're deploying exactly what you intend.
