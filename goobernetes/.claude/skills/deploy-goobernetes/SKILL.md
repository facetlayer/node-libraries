---
name: deploy-goobernetes
description: Deploy goobernetes to the do2 server. Use when the user wants to publish, deploy, or update goobernetes on the do2 server.
---

# Deploy Goobernetes to do2

Follow these steps to deploy the latest goobernetes code to the `do2` server.

All commands should be run from the `goobernetes` directory.

## Step 1: Verify the code is ready

1. Run `pnpm build` to make sure the project compiles cleanly.
2. Run `pnpm test` to make sure all tests pass.
3. If either fails, stop and fix the issue before deploying.

## Step 2: Publish to NPM

1. Run `npm-status status` from the goobernetes directory to check if there are unpublished changes.
2. If there are changes to publish:
   - Confirm the version in `package.json` is correct (bump if needed, but only if the user asks).
   - Run `pnpm publish --access public` to publish to NPM under `@facetlayer/goobernetes`.

## Step 3: Update on do2

SSH into the do2 server and update the installed package:

```bash
ssh do2 'npm install -g @facetlayer/goobernetes@latest'
```

## Step 4: Restart the server

Restart the goobernetes service on do2 using candle:

```bash
ssh do2 'candle restart goobernetes'
```

## Step 5: Verify

Confirm the service came back up:

```bash
ssh do2 'candle status goobernetes'
```

Report the result to the user.
