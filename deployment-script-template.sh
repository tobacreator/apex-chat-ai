#!/bin/bash

# ApexChat AI Platform - Deployment Script Template
# Customize this script with your actual server details and deployment process

set -e  # Exit on any error

# Configuration - UPDATE THESE VALUES
DEPLOYMENT_ENV=${1:-production}  # production or staging
SERVER_HOST="your-server-host.com"
SERVER_USER="deploy"
SERVER_PATH="/var/www/apexchatai"
BACKUP_PATH="/var/backups/apexchatai"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# Pre-deployment checks
log "Starting deployment to $DEPLOYMENT_ENV environment..."

# Check if deployment package exists
if [ ! -d "deployment" ]; then
    error "Deployment package not found. Run the CI workflow first."
    exit 1
fi

# Create backup
log "Creating backup of current deployment..."
ssh $SERVER_USER@$SERVER_HOST "mkdir -p $BACKUP_PATH/$(date +%Y%m%d_%H%M%S)"
ssh $SERVER_USER@$SERVER_HOST "cp -r $SERVER_PATH/* $BACKUP_PATH/$(date +%Y%m%d_%H%M%S)/ 2>/dev/null || true"

# Stop services
log "Stopping services..."
ssh $SERVER_USER@$SERVER_HOST "sudo systemctl stop apexchat-server 2>/dev/null || true"
ssh $SERVER_USER@$SERVER_HOST "sudo systemctl stop nginx 2>/dev/null || true"

# Deploy new code
log "Deploying new code..."

# Upload client build
if [ -d "deployment/client-build" ]; then
    log "Uploading client build..."
    scp -r deployment/client-build/* $SERVER_USER@$SERVER_HOST:$SERVER_PATH/client/
fi

# Upload server build
if [ -d "deployment/server-build" ]; then
    log "Uploading server build..."
    scp -r deployment/server-build/* $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/
fi

# Upload package files
log "Uploading package files..."
scp deployment/client-package.json $SERVER_USER@$SERVER_HOST:$SERVER_PATH/client/package.json
scp deployment/server-package.json $SERVER_USER@$SERVER_HOST:$SERVER_PATH/server/package.json

# Install dependencies
log "Installing dependencies..."
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH/server && npm ci --production"
ssh $SERVER_USER@$SERVER_HOST "cd $SERVER_PATH/client && npm ci --production"

# Set permissions
log "Setting file permissions..."
ssh $SERVER_USER@$SERVER_HOST "chmod -R 755 $SERVER_PATH"
ssh $SERVER_USER@$SERVER_HOST "chown -R $SERVER_USER:$SERVER_USER $SERVER_PATH"

# Start services
log "Starting services..."
ssh $SERVER_USER@$SERVER_HOST "sudo systemctl start apexchat-server"
ssh $SERVER_USER@$SERVER_HOST "sudo systemctl start nginx"

# Health check
log "Running health check..."
sleep 10  # Wait for services to start

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "https://$SERVER_HOST/health" || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    log "✅ Health check passed! Deployment successful."
else
    error "❌ Health check failed (HTTP $HEALTH_CHECK). Rolling back..."
    
    # Rollback
    log "Rolling back to previous version..."
    ssh $SERVER_USER@$SERVER_HOST "sudo systemctl stop apexchat-server"
    ssh $SERVER_USER@$SERVER_HOST "sudo systemctl stop nginx"
    
    LATEST_BACKUP=$(ssh $SERVER_USER@$SERVER_HOST "ls -t $BACKUP_PATH | head -1")
    ssh $SERVER_USER@$SERVER_HOST "cp -r $BACKUP_PATH/$LATEST_BACKUP/* $SERVER_PATH/"
    
    ssh $SERVER_USER@$SERVER_HOST "sudo systemctl start apexchat-server"
    ssh $SERVER_USER@$SERVER_HOST "sudo systemctl start nginx"
    
    error "Rollback completed. Please investigate the deployment issue."
    exit 1
fi

# Post-deployment verification
log "Running post-deployment verification..."

# Check service status
SERVER_STATUS=$(ssh $SERVER_USER@$SERVER_HOST "sudo systemctl is-active apexchat-server")
NGINX_STATUS=$(ssh $SERVER_USER@$SERVER_HOST "sudo systemctl is-active nginx")

if [ "$SERVER_STATUS" = "active" ] && [ "$NGINX_STATUS" = "active" ]; then
    log "✅ All services are running"
else
    warn "⚠️ Some services may not be running properly"
    log "Server status: $SERVER_STATUS"
    log "Nginx status: $NGINX_STATUS"
fi

# Performance check
log "Running performance check..."
RESPONSE_TIME=$(curl -s -w "%{time_total}" -o /dev/null "https://$SERVER_HOST/" | cut -d. -f1)

if [ "$RESPONSE_TIME" -lt 3 ]; then
    log "✅ Performance check passed (${RESPONSE_TIME}s response time)"
else
    warn "⚠️ Response time is ${RESPONSE_TIME}s (target: <3s)"
fi

log "🎉 Deployment to $DEPLOYMENT_ENV completed successfully!"
log "URL: https://$SERVER_HOST"
log "Backup location: $BACKUP_PATH"

# Cleanup old backups (keep last 5)
log "Cleaning up old backups..."
ssh $SERVER_USER@$SERVER_HOST "cd $BACKUP_PATH && ls -t | tail -n +6 | xargs -r rm -rf"

log "Deployment script completed!"
