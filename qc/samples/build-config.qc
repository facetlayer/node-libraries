# Build Configuration
# Example build system configuration using QC syntax

# Project metadata
project
    name="my-typescript-app"
    version="2.1.0"
    description="A sample TypeScript application"
    author="Development Team"

# Source configuration  
source
    root=src
    entry-point="index.ts"
    tsconfig="tsconfig.json"
    exclude=__tests__

# Build tools
tools
    typescript version="5.2.0"
    webpack version="5.88.0"
    eslint config=".eslintrc.json"
    prettier config=".prettierrc"

# Development server
dev-server
    port=3000
    hot-reload=true
    open-browser=true
    proxy="/api:http://localhost:8080"

# Build targets
build target="production"
    output-dir=dist
    minify=true
    source-maps=false
    tree-shake=true
    
build target="development"
    output-dir=dist-dev
    minify=false
    source-maps=true
    watch=true

# Asset processing
assets
    images optimize=true formats="webp,png,jpg"
    fonts subset=true formats="woff2,woff"
    css autoprefix=true minimize=true

# Code quality checks
quality
    lint strict=true fix=false
    type-check strict=true
    test coverage-threshold=80
    security-scan enabled=true

# Dependencies
dependencies
    production-only=false
    check-updates=true
    audit-fix=true

# Environment variables
env development
    NODE_ENV=development
    DEBUG=true
    API_URL="http://localhost:8080"

env production  
    NODE_ENV=production
    DEBUG=false
    API_URL="https://api.example.com"

# Build steps pipeline
pipeline
    clean output-directories=true
    install dependencies=true frozen-lockfile=true
    lint fix=false fail-on-error=true
    test coverage=true junit-output=true
    type-check strict=true
    build target=production
    package format=zip include-source-maps=false

# Docker build configuration
docker
    base-image="node:18-alpine"
    working-dir="/app"
    expose-port=3000
    health-check="/health"

# Publishing
publish
    registry="npm"
    access="public"
    tag="latest"
    
# Deployment hooks
hooks
    pre-build "echo 'Starting build...'"
    post-build "echo 'Build completed!'"
    pre-test "docker-compose up -d test-db"
    post-test "docker-compose down"