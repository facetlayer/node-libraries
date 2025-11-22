# Advanced QC Features
# Demonstrates special syntax features like parameters and advanced patterns

# Parameter usage (if supported by parser)
# config env=$ENVIRONMENT
# database url=$DATABASE_URL

# Multi-word values with quotes
message text="Hello, World! This is a long message with spaces."
error-message="Error: Could not connect to the database server at localhost:5432"

# Special characters in values
regex-pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
json-config='{"host": "localhost", "port": 5432, "ssl": true}'

# File paths with various formats
config-file="./configs/app.json"
log-file="/var/log/app.log"
temp-dir="/tmp/app-cache"
windows-path="C:\\Program Files\\MyApp\\config.ini"

# URLs with query parameters
api-endpoint="https://api.example.com/v1/users?limit=50&offset=0"

# Boolean representations
feature-enabled=true
debug-mode=false
ssl-required=1
maintenance-mode=0

# Arrays/lists (represented as multiple queries)
include-path src/components
include-path src/utils  
include-path src/services

exclude-pattern "*.test.ts"
exclude-pattern "*.spec.ts"
exclude-pattern node_modules

# Version numbers and semantic versions
version=2.1.3
api-version="v1.2"
compatibility=">=14.0.0"

# Network and system configuration
bind-address="0.0.0.0"
listen-port=8080
max-connections=1000
timeout-seconds=30

# Conditional-like syntax
if environment=production(
    log-level=warn
    debug=false
    ssl=required
)

if environment=development(
    log-level=debug
    debug=true
    ssl=optional
)

# Complex data structures
cache-config(
    type=redis
    host="cache.example.com" 
    port=6379
    password="secret"
    ttl=3600
    max-memory="512mb"
)

# Security configuration
security(
    cors(
        origins="https://app.example.com,https://admin.example.com"
        methods="GET,POST,PUT,DELETE"
        credentials=true
    )
    jwt(
        secret="your-256-bit-secret"
        expiry="24h"
        algorithm="HS256"
    )
    rate-limiting(
        window="15m"
        max-requests=100
        by-ip=true
    )
)

# Internationalization
i18n(
    default-locale=en-US
    supported-locales="en-US,es-ES,fr-FR,de-DE"
    fallback=true
    load-path="./locales/{{lng}}/{{ns}}.json"
)

# Feature flags
feature-flags(
    new-dashboard=true
    experimental-api=false
    beta-features=true
    maintenance-mode=false
)
