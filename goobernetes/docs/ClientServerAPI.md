# Goobernetes Client-Server API

## Protocol

- **Transport:** JSON-RPC 2.0 over HTTP POST
- **Endpoint:** `POST /json-rpc`
- **Authentication:** `x-api-key` header (can be disabled server-side)
- **Body limit:** 50MB (`bodyParser.json({ limit: '50mb' })` in `src/server/main.ts`)
- **Client warning:** Logged if request body > 512KB (`src/client/rpc-client.ts:46`)

## Types

```typescript
interface FileEntry {
    relPath: string;  // e.g. "src/index.ts"
    sha: string;      // SHA hash of file contents
}
```

Defined in `src/shared/rpc-types.ts`.

## Methods

### createDeployment

Creates a new deployment record on the server and sets up the deploy directory.

**Request:**
```typescript
{
    projectName: string;
    sourceFileManifest: FileEntry[];  // Full manifest, or empty for batched flow
    sourceFileConfig: string;         // Config file text
}
```

**Response:**
```typescript
{
    t: 'deployment_created';
    deployName: string;  // e.g. "my-app-42"
}
```

**Server actions:** Creates DB record, stores manifest as JSON, creates deploy directory. If manifest is non-empty, sets up empty subdirectories immediately. If empty, directories are created when `finalizeManifest` is called.

### addManifestFiles

Appends a batch of file entries to a deployment's manifest. Used for large deploys where sending the full manifest in `createDeployment` would exceed request size limits.

**Request:**
```typescript
{
    deployName: string;
    files: FileEntry[];  // Batch of manifest entries (recommended: ~500 per call)
}
```

**Response:** void (204)

### finalizeManifest

Signals that all manifest batches have been sent. Server sets up the deployment directory structure based on the complete manifest.

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:** void (204)

### getNeededFiles

Returns the list of files that need to be uploaded (files that don't exist on server or have a different SHA).

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:**
```typescript
FileEntry[]  // Files the server needs uploaded
```

### uploadOneFile

Uploads a single small file (used when base64 content < 80KB).

**Request:**
```typescript
{
    deployName: string;
    relPath: string;
    contentBase64: string;
}
```

**Response:** void (204)

### startMultiPartUpload

Begins a multi-part upload for a large file (>= 80KB base64). Currently a no-op on the server.

**Request:**
```typescript
{
    deployName: string;
    relPath: string;
}
```

**Response:** void (204)

### uploadFilePart

Uploads one chunk of a multi-part file. Chunks are ~40KB each.

**Request:**
```typescript
{
    deployName: string;
    relPath: string;
    chunkStartsAt: number;  // Byte offset in original file
    chunkBase64: string;
}
```

**Response:** void (204)

### finishMultiPartUpload

Assembles all uploaded chunks into the final file on disk.

**Request:**
```typescript
{
    deployName: string;
    relPath: string;
}
```

**Response:** void (204)

**Server actions:** Loads chunks sorted by offset, concatenates them, writes to disk, deletes chunk records and needed-file record.

### finishUploads

Signals that all file uploads are complete. Server deletes leftover files not in the manifest.

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:** void (204)

### verifyDeployment

Verifies all manifest files exist on disk with correct SHA hashes.

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:**
```typescript
{
    status: 'success' | 'error';
    error?: string;
}
```

### activateDeployment

Marks a deployment as active and runs after-deploy commands.

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:** Stream (executes after-deploy shell commands and candle-restart commands).

### previewDeployment

Shows what would change without creating a deployment. Compares against the active deployment.

**Request:**
```typescript
{
    projectName: string;
    sourceFileManifest: FileEntry[];  // Full manifest of all files
    sourceFileConfig: string;
}
```

**Response:**
```typescript
{
    filesToUpload: FileEntry[];   // New or changed files
    filesToDelete: string[];      // Paths to remove
}
```

### previewByDeployName

Like `previewDeployment`, but uses the manifest from an existing deployment record instead of requiring the manifest inline. Used with the batched manifest flow for large projects.

**Request:**
```typescript
{
    deployName: string;
}
```

**Response:**
```typescript
{
    filesToUpload: FileEntry[];
    filesToDelete: string[];
}
```

### downloadFile

Downloads a file from the active deployment.

**Request:**
```typescript
{
    projectName: string;
    relPath: string;
}
```

**Response:**
```typescript
{
    contentBase64: string;
    relPath: string;
}
```

## Deployment Flow

### Small deploys (< 500 files)

1. Client resolves source files and computes SHA manifest
2. `createDeployment` — send full manifest, get deployName
3. `getNeededFiles` — server returns files that need uploading
4. Upload each needed file (50 concurrent, using single or multi-part upload)
5. `finishUploads` — server cleans up leftover files
6. `verifyDeployment` — server checks all files present with correct hashes
7. `activateDeployment` — server runs post-deploy commands, marks active

### Large deploys (500+ files, batched manifest)

1. Client resolves source files and computes SHA manifest
2. `createDeployment` — send empty manifest, get deployName
3. `addManifestFiles` — send manifest in batches of ~500 entries (repeated)
4. `finalizeManifest` — signal manifest is complete, server sets up directories
5. `getNeededFiles` — server returns files that need uploading
6. Upload each needed file (50 concurrent, using single or multi-part upload)
7. `finishUploads` — server cleans up leftover files
8. `verifyDeployment` — server checks all files present with correct hashes
9. `activateDeployment` — server runs post-deploy commands, marks active

## Size Thresholds

| Parameter | Value | File |
|-----------|-------|------|
| Single-file base64 threshold | 80KB | `src/client/deploy.ts:12` |
| Multi-part chunk size | ~40KB | `src/client/deploy.ts:38` |
| Express body JSON limit | 50MB | `src/server/main.ts:24` |
| Client large-request warning | 512KB | `src/client/rpc-client.ts:46` |
| Upload concurrency | 50 parallel | `src/client/deploy.ts:108` |
| Manifest batch size | 500 entries | `src/client/deploy.ts:13` |
