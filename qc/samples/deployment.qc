# Deployment Configuration
# Example configuration for deploying applications

# Target environment settings
deploy-settings 
    environment=production
    region=us-west-2
    project-name="my-web-app"
    version="1.2.3"

# Docker configuration
docker 
    image="myapp:latest"
    registry="docker.io/myorg"
    platform=linux/amd64

# Infrastructure settings
infrastructure
    instance-type=t3.medium
    min-instances=2
    max-instances=10
    load-balancer=true

# Database configuration
database
    type=postgresql
    host="db.example.com"
    port=5432
    ssl=required
    backup-retention=7

# Security settings
security
    https=required
    ssl-cert="wildcard.example.com"
    firewall-rules="allow-web,allow-ssh"

# Monitoring and logging
monitoring
    enabled=true
    provider=datadog
    log-level=info
    metrics=true
    alerts=true

# File inclusion for deployment
include deployment/nginx.conf
include deployment/ssl-certs
include src
include package.json
include package-lock.json

# Exclusions
exclude .git
exclude node_modules
exclude .env.local
exclude "*.log"

# Health check configuration  
health-check
    path="/health"
    timeout=30
    interval=60
    retries=3

# Rollback settings
rollback
    enabled=true
    keep-versions=5
    auto-rollback=true