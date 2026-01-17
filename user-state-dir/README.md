# @facetlayer/user-state-dir

Find or auto-create a state directory for an application following XDG standards.

## Installation

```bash
npm install @facetlayer/user-state-dir
```

## Usage

```typescript
import { getStateDirectory, getOrCreateStateDirectory } from '@facetlayer/user-state-dir'

// Get the path (without creating the directory)
const stateDir = getStateDirectory('my-app')
// => ~/.local/state/my-app

// Get the path and create the directory if it doesn't exist
const stateDir = getOrCreateStateDirectory('my-app')
// => ~/.local/state/my-app (directory is guaranteed to exist)
```

## Directory Resolution

The state directory is resolved in the following priority order:

1. `{APPNAME}_STATE_DIR` environment variable (e.g., `MY_APP_STATE_DIR` for app name `my-app`)
2. `$XDG_STATE_HOME/{appName}` if `XDG_STATE_HOME` is set
3. `~/.local/state/{appName}` (XDG default)

## API

### `getStateDirectory(appName: string): string`

Returns the path to the state directory for the given application name. The directory may not exist yet.

### `getOrCreateStateDirectory(appName: string): string`

Returns the path to the state directory for the given application name, creating it recursively if it doesn't exist.

## License

MIT
