# Basic QC Syntax Examples
# This file demonstrates the fundamental syntax elements of Query Config format

# Simple tags (no values)
start
initialize
setup

# Tags with string values
name="John Doe"
title="Software Engineer"
description="A sample configuration file"

# Tags with numeric values
port=8080
timeout=30
max-connections=100

# Tags with boolean-like values
enabled=true
debug=false
production=true

# Tags with unquoted values (URLs, simple identifiers)
url=http://localhost:3000
environment=development
protocol=https

# Multiple tags in one query
server host=localhost port=8080 ssl=true

# Tags with special characters in values
database-url="postgresql://user:pass@localhost:5432/mydb"
secret-key="abc123!@#$%^&*()"

# Comments can be anywhere
log level=info # This sets the log level
# Full line comments are ignored

# URLs and file paths
include src/config.json
include package.json
exclude node_modules
source-map-file=dist/app.js.map