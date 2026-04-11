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
  shell(command)

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
  dest-url=http://production-server:4800
```

### Optional Settings

#### update-in-place

When set, deployments update the same directory instead of creating new timestamped directories. This is useful for applications that need a stable deployment path.

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4800
  update-in-place
```

**Without `update-in-place`:** Deployments are stored in timestamped directories like `my-app-20250125-143022`

**With `update-in-place`:** All deployments update the directory `my-app`

#### web-static-dir

Records which directory within your deployment contains static files to be served via HTTP. This metadata is stored in the deployment database and can be used by external tools (e.g. nginx, a reverse proxy) to configure static file serving.

```
deploy-settings
  project-name=my-web-app
  dest-url=http://localhost:4800
  web-static-dir=public
```

**Example use case:** A Next.js app that builds to `web/out`:

```
deploy-settings
  project-name=nextjs-app
  dest-url=http://localhost:4800
  web-static-dir=web/out
```

> **Note:** Goobernetes stores this setting but does not serve static files itself. Use `@facetlayer/goob-static-web-server` to serve files from the configured directory, or configure your own web server (e.g. nginx).

#### ignore-security-scan

Allowlists specific files or directories to bypass the automatic security checks. This is useful when you have files that match a blocked pattern but are legitimate deployment files (e.g. a `config.json` that contains no secrets).

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4800
  ignore-security-scan(config.json)
  ignore-security-scan(data/generated-secrets)
```

You can use multiple `ignore-security-scan` entries. Each entry matches either an exact file path or a directory prefix (all files under that directory are allowed).

### Complete Deploy Settings Example

```
deploy-settings
  project-name=production-api
  dest-url=http://api.example.com:4800
  update-in-place
  web-static-dir=public/dist
  ignore-security-scan(config.json)
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
  dest-url=http://localhost:4800
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

#### Multiple Shell Commands

You can run multiple shell commands in sequence:

```
after-deploy
  shell(npm ci)
  shell(npm run migrate)
  shell(npm start)
```

Each command runs sequentially. If any command fails (non-zero exit code), the deployment is aborted.

#### Candle Restart

The `candle-restart` directive restarts a [Candle](https://www.npmjs.com/package/@facetlayer/candle) service after deployment. This is the recommended way to restart long-running processes managed by Candle.

```
after-deploy
  candle-restart(my-api)
```

You can combine it with shell commands:

```
after-deploy
  shell(npm install --production)
  candle-restart(my-api)
```

Note: `candle-restart(name)` runs `candle restart <name>` in the deployment directory, which requires a `.candle.json` file there. For per-project Candle configuration, prefer the `candle-config` setting described below.

### Candle Config

The `candle-config` setting in `deploy-settings` enables per-project Candle integration. Use it when your project ships its own Candle config file and you want goobernetes to install it and restart every service it defines on each deploy.

```
deploy-settings
  project-name=my-app
  dest-url=http://production-server:4800
  update-in-place
  candle-config=candle.json

include candle.json
include src
include package.json
```

The value is a path relative to the deployment directory, pointing at a file that's part of the deploy (make sure it's covered by an `include` rule). After the `after-deploy` hooks run, goobernetes will:

1. Copy `<candle-config>` to `.candle.json` in the deployment directory (overwriting any existing one).
2. Run `candle restart` from the deployment directory — which restarts every currently-running service defined in that config.
3. Run `candle check-start` from the deployment directory — which starts any services that weren't already running.

This replaces the pattern of a shared system-wide `.candle.json` and per-service `candle-restart(name)` entries. Each project owns its own `candle.json`, and `candle` always runs from the project's own deployment directory, so working-directory problems from before go away.

If the `candle-config` file is missing from the deployed tree, activation fails with an error — confirm it's listed in your `include` rules.

### Complete Lifecycle Example

```
deploy-settings
  project-name=fullstack-app
  dest-url=http://localhost:4800
  update-in-place
  web-static-dir=web/out

before-deploy
  shell(pnpm build)

after-deploy
  shell(pnpm install --prod)
  shell(pnpm start)

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
- `secrets.json`
- `credentials.json`
- `database.env`
- `.npmrc`, `.yarnrc`

**Basename patterns:**
- Any file with `secret` in the filename (e.g. `my-secret.json`)
- Any file with `credential` in the filename (e.g. `credential-store.yaml`)
- Any file with `password` in the filename (e.g. `passwords.txt`)

> **Note:** These keyword patterns only match the filename, not directory names. Files like
> `forgot-password/page.js` or `reset-password/index.html` are allowed because the keyword
> appears in the directory path, not the filename itself.

**Version control:**
- `.git` directory contents
- `.gitignore` (should be excluded, not blocked)

### If You Need to Deploy Blocked Files

If you legitimately need to deploy a file that matches these patterns, you can use the
`ignore-security-scan` option in your deploy-settings block to allowlist specific files
or directories:

```
deploy-settings
  project-name=my-app
  dest-url=http://localhost:4800
  ignore-security-scan(config.json)
  ignore-security-scan(data/secrets)
```

Each `ignore-security-scan` entry matches either an exact file path or a directory prefix.
For example, `ignore-security-scan(data/secrets)` will allow all files under `data/secrets/`.

Other options:
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
  dest-url=http://production:4800
  update-in-place

before-deploy
  shell(npm run build)

after-deploy
  shell(node dist/server.js)

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
  dest-url=http://localhost:4800
  update-in-place
  web-static-dir=web/out

before-deploy
  shell(cd web && npm run build && cd .. && npm run build:api)

after-deploy
  shell(npm run start:api)

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
  dest-url=http://production:4800
  update-in-place

before-deploy
  shell(pnpm run build)

after-deploy
  shell(pnpm install --prod --frozen-lockfile)
  shell(pnpm run start:gateway)

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
  dest-url=http://web-server:4800
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
  dest-url=http://localhost:4800
  update-in-place

before-deploy
  shell(npm run build)

after-deploy
  shell(npm ci)
  shell(npm run migrate:up)
  shell(npm start)

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
  dest-url=http://staging:4800
  update-in-place
  web-static-dir=frontend/build

before-deploy
  shell(npm run lint && npm run test && npm run build:frontend && npm run build:backend)

after-deploy
  shell(npm ci --production)
  shell(node backend/dist/index.js)

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
  dest-url=http://localhost:4800

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

### 8. Use Multiple Shell Commands

When you need multiple commands in sequence, use separate `shell()` directives:

```
after-deploy
  shell(npm ci)
  shell(npm run migrate)
  shell(npm run seed)
```

### 9. Document Your Config

Add comments to your `.goob` file to explain the deployment setup:

```
# Production deployment configuration
# Builds: Next.js frontend + Express API
# Serves: Static files from web/out
# Runs: API server via after-deploy shell command
```

### 11. Test in Stages

1. Test with `preview-deploy` first
2. Deploy to a staging environment
3. Verify the deployment
4. Deploy to production

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

### Sensitive Files Being Blocked

**Check:** Is the file actually needed in deployment?

**Solution:** If the file is a false positive (e.g. a web route like `forgot-password/page.js`), note that keyword patterns only match filenames, not directory names, so most route-based false positives are already handled. If a specific file is still blocked, use `ignore-security-scan` in your deploy-settings:

```
deploy-settings
  ignore-security-scan(path/to/allowed-file)
```

If you don't actually need the file, use environment variables or server-side secrets instead.

## Advanced Topics

### Environment Variables

Your app is responsible for its own environment variables and port. You can use a tool like [port-assignment](https://www.npmjs.com/package/@facetlayer/port-assignment) to claim a port, or manage environment via a `.env` file on the server. Use `ignore` in your `.goob` config to preserve the server-side `.env` file across deployments:

```
ignore .env
```

This way you can configure settings per-environment without them being overwritten on each deploy.

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
npx goobernetes deploy deploy.goob --override-dest http://other-server:4800
```

This is useful for testing or deploying to different environments with the same config file.

## Summary

A well-crafted `.goob` configuration should:
- Clearly specify what to deploy with `include` rules
- Exclude unnecessary files with `exclude` rules
- Protect server data with `ignore` rules
- Build on the client with `before-deploy` hooks
- Run post-deploy commands with `after-deploy` hooks
- Keep secrets secure and out of deployments

Start simple, iterate, and use `preview-deploy` liberally to ensure you're deploying exactly what you intend.
