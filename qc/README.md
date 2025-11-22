# @facetlayer/qc

## Overview

(Yet another) config file format.

Notable features are:

- Every line has a 'command'.
- It's possible for a 'command' to appear multiple times. (which makes this format more similar to 
  XML than JSON/YAML/etc).
- The command syntax is easy to type and would work great in a CLI or REPL.

## Quick Start

```typescript
import { toQuery, parseFile } from '@facetlayer/qc'

// Parse a simple query
const query = toQuery("deploy app=myapp env=prod")
console.log(query.command) // "deploy"
console.log(query.getStringValue("app")) // "myapp"
console.log(query.getStringValue("env")) // "prod"

// Parse a file with multiple queries
const queries = parseFile(`
  config host=localhost port=3000
  deploy app=frontend
  # This is a comment
  notify email=admin@example.com
`)
```

## QC Syntax

### Basic Syntax

```
command arg1 arg2=value arg3="quoted value"
```

- **Command**: The first element (required)
- **Tags**: Space-separated attributes with optional values
- **Values**: Can be strings, numbers, or nested structures
- **Comments**: Lines starting with `#` are ignored

### Examples

```qc
# Simple command with arguments
start server port=8080

# String values (quotes optional unless containing spaces)
config name="My App" debug=true timeout=30

# Nested structures using parentheses
deploy app=(
  name=frontend
  version=1.2.3
  env=production
)

# Parameters (for substitution)
connect db host=$DB_HOST port=$DB_PORT

# Optional attributes
backup database? retention=7days
```

## API Reference

### Core Classes

#### Query
Represents a query with a command and tags.

```typescript
class Query {
  command: string
  tags: QueryTag[]

  // Get tag value by attribute name
  getStringValue(attr: string): string
  getNumberValue(attr: string): number
  getStringOptional(attr: string, defaultValue?: string): string | undefined

  // Check for attributes
  hasAttr(attr: string): boolean
  getAttr(attr: string): QueryTag | null

  // Get nested structures
  getNestedQuery(attr: string): Query
  getNestedTagList(attr: string): TagList

  // Parameter substitution
  withInlinedParams(params: Map<string, any>): Query

  // Serialization
  toQueryString(): string
}
```

#### TagList
Represents a list of tags without a command.

```typescript
class TagList {
  tags: QueryTag[]

  // Same methods as Query (except command-related)
  getStringValue(attr: string): string
  hasAttr(attr: string): boolean
  withInlinedParams(params: Map<string, any>): TagList
  toQueryString(): string
}
```

#### QueryTag
Represents an individual tag with an attribute and optional value.

```typescript
class QueryTag {
  attr: string
  value: TagValue
  paramName?: string

  // Type checks
  hasValue(): boolean
  isParameter(): boolean
  isQuery(): boolean
  isTagList(): boolean

  // Value getters
  getStringValue(): string
  getNumberValue(): number
  getQuery(): Query
  getTagList(): TagList

  // Serialization
  toQueryString(): string
}
```

### Parsing Functions

```typescript
// Parse a single query
function toQuery(str: string): Query

// Parse multiple queries from a string/file
function parseFile(content: string): Query[]

// Parse individual tags
function parseQueryTag(str: string): QueryTag
```

## Usage Examples

### Basic Parsing

```typescript
import { toQuery } from '@facetlayer/qc'

const query = toQuery("config host=localhost port=3000 debug=true")

console.log(query.command)                    // "config"
console.log(query.getStringValue("host"))     // "localhost"
console.log(query.getNumberValue("port"))     // 3000
console.log(query.hasAttr("debug"))           // true
```

### Nested Commands with Multiple Tags

QC handles complex nested structures by parsing indented blocks as single queries with multiple tags:

```qc
after-deploy
  pm2-start name=TestPM2App
    command(npm start)
```

This is parsed as **one query** with command `after-deploy` and three tags:
- `pm2-start` (marker tag, no value)  
- `name=TestPM2App` (string value)
- `command(npm start)` (nested value)

```typescript
import { parseFile } from '@facetlayer/qc'

const content = `
after-deploy
  pm2-start name=TestPM2App
    command(npm start)
`;

const parsed = parseFile(content);
const config = parsed[0]; // Single query object

// Check for pm2-start marker
if (config.hasAttr('pm2-start')) {
    const name = config.getStringValue('name');       // "TestPM2App"
    const command = config.getAttr('command').toOriginalString(); // "npm start"
    
    console.log(`PM2 app: ${name} -> ${command}`);
}
```

