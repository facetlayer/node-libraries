# QC Syntax Examples

This directory contains sample files demonstrating various features of the Query Config (QC) syntax.

## Files

### `basic-syntax.qc`
Demonstrates fundamental QC syntax elements:
- Simple tags without values
- Tags with string, numeric, and boolean values
- Quoted vs unquoted values
- Comments
- Multiple tags in queries
- URLs and file paths

### `deployment.qc`
Example deployment configuration showing:
- Multi-line query formatting
- Environment and infrastructure settings
- Docker and database configuration
- Security and monitoring settings
- File inclusion/exclusion patterns

### `user-preferences.qc`
Personal configuration example featuring:
- User profile settings
- Application preferences
- Theme and appearance options
- Privacy and accessibility settings
- Multiple application configurations

### `nested-queries.qc`
Advanced syntax with nested structures:
- Complex filtering with nested conditions
- Nested configuration sections
- Permission systems
- Build pipelines with multiple steps
- API endpoint configurations
- Monitoring with nested alerts

### `build-config.qc`
Build system configuration example:
- Project metadata
- Build tools and targets
- Asset processing
- Environment variables
- Build pipeline steps
- Docker and publishing configuration

### `advanced-features.qc`
Showcases special syntax features:
- Special characters in values
- Various boolean representations
- File paths and URLs
- JSON and regex patterns
- Conditional-like syntax
- Complex data structures

## Testing

You can parse and analyze any of these files using the `qc-check-file` command:

```bash
./bin/qc-check-file samples/basic-syntax.qc
./bin/qc-check-file samples/deployment.qc
./bin/qc-check-file samples/nested-queries.qc
```

This will show you how the QC parser interprets each file, including:
- Number of queries parsed
- Original query string representation  
- Structure breakdown showing tags, values, and types
- Nested query information

## Syntax Features Demonstrated

- **Simple tags**: `start`, `initialize`
- **Key-value pairs**: `name="John"`, `port=8080`
- **Multiple tags per query**: `server host=localhost port=8080`
- **Nested queries**: `get users where(active=true)`
- **Comments**: `# This is a comment`
- **Quoted strings**: `"strings with spaces"`
- **Unquoted values**: `localhost`, `http://example.com`
- **Numbers**: `8080`, `3.14`
- **Booleans**: `true`, `false`
- **File paths**: `src/config.json`
- **URLs**: `https://api.example.com`

## Use Cases

These examples show how QC syntax can be used for:
- Application configuration
- Deployment settings
- User preferences
- Build system configuration
- API definitions
- Database queries
- Infrastructure as code
- Feature flags
- Monitoring setup