# Directory Resolution

The library follows [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) for determining where to store the database.

## Resolution Order

When you call `getUserdataDatabase({ appName: 'my-app', ... })`, the directory is determined in this order:

### 1. Application-Specific Environment Variable

First, the library checks for `{APPNAME}_STATE_DIR`:

```bash
# For appName: 'my-app', checks MY_APP_STATE_DIR
export MY_APP_STATE_DIR=/custom/path
# Database: /custom/path/db.sqlite

# For appName: 'my-awesome-tool', checks MY_AWESOME_TOOL_STATE_DIR
export MY_AWESOME_TOOL_STATE_DIR=/another/path
# Database: /another/path/db.sqlite
```

The environment variable name is derived from the `appName`:
- Convert to uppercase
- Replace hyphens with underscores
- Append `_STATE_DIR`

### 2. XDG State Home

If no app-specific variable is set, uses `$XDG_STATE_HOME`:

```bash
export XDG_STATE_HOME=/custom/state
# Database: /custom/state/my-app/db.sqlite
```

### 3. Default Location

Falls back to the XDG default:

```bash
# Database: ~/.local/state/my-app/db.sqlite
```

## Examples

### Default Behavior

```typescript
import { getUserdataDatabase, getStateDirectory } from '@facetlayer/userdata-db'

// No environment variables set
const dir = getStateDirectory('my-cli')
// Returns: /home/user/.local/state/my-cli

const db = getUserdataDatabase({
  appName: 'my-cli',
  schema: { name: 'db', statements: [] }
})
// Database at: /home/user/.local/state/my-cli/db.sqlite
```

### Custom Directory via Environment Variable

```bash
export MY_CLI_STATE_DIR=/tmp/my-cli-dev
```

```typescript
const dir = getStateDirectory('my-cli')
// Returns: /tmp/my-cli-dev

const db = getUserdataDatabase({
  appName: 'my-cli',
  schema: { name: 'db', statements: [] }
})
// Database at: /tmp/my-cli-dev/db.sqlite
```

### Using XDG State Home

```bash
export XDG_STATE_HOME=/custom/state
```

```typescript
const dir = getStateDirectory('my-cli')
// Returns: /custom/state/my-cli

const db = getUserdataDatabase({
  appName: 'my-cli',
  schema: { name: 'db', statements: [] }
})
// Database at: /custom/state/my-cli/db.sqlite
```

## Use Cases

### Development/Testing

Override the directory for development or testing:

```bash
# In your test setup
export MY_APP_STATE_DIR=/tmp/my-app-test

# Or in CI
export MY_APP_STATE_DIR=${{ runner.temp }}/my-app
```

### Multiple Environments

Run multiple instances with separate databases:

```bash
# Production instance
MY_APP_STATE_DIR=/var/lib/my-app-prod node server.js

# Staging instance
MY_APP_STATE_DIR=/var/lib/my-app-staging node server.js
```

### Portable Installation

Store data alongside the application:

```bash
MY_APP_STATE_DIR=./data node app.js
# Database at: ./data/db.sqlite
```

## Platform Notes

### macOS

The default `~/.local/state` directory doesn't exist by default on macOS, but the library creates it automatically.

### Windows

The library uses the same path format. On Windows, `~` expands to `C:\Users\{username}`, so:

```
C:\Users\{username}\.local\state\my-app\db.sqlite
```

### Linux

Follows XDG standards natively. Many Linux distributions set `XDG_STATE_HOME` automatically.
