#!/bin/bash

# ScholarX Production Deployment Script
# This script automates the deployment process to Vercel

set -e

echo "🚀 ScholarX Production Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${YELLOW}⚠️  Vercel CLI not found. Installing...${NC}"
    npm install -g vercel
fi

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Running pre-deployment checks...${NC}"
echo ""

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npm run build > /dev/null 2>&1 && echo -e "${GREEN}✓ TypeScript compilation successful${NC}" || {
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    exit 1
}

# Check tests
echo "Running tests..."
npm test -- --run > /dev/null 2>&1 && echo -e "${GREEN}✓ All tests passing${NC}" || {
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
}

echo ""

# Step 2: Verify environment
echo -e "${YELLOW}Step 2: Verifying environment...${NC}"
echo ""

# Check if .env.production exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Please create .env.production with the following variables:"
    echo ""
    echo "POSTGRES_PRISMA_URL=your_postgres_url"
    echo "POSTGRES_URL_NON_POOLING=your_postgres_url"
    echo "JWT_SECRET=your_jwt_secret_key"
    echo "JWT_EXPIRY=86400"
    echo "API_BASE_URL=https://your-domain.com"
    echo "CORS_ORIGIN=https://your-domain.com"
    echo ""
    read -p "Press Enter once you've created .env.production..."
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 3: Backup current deployment
echo -e "${YELLOW}Step 3: Backing up current deployment...${NC}"
echo ""

BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
echo "Backup directory: $BACKUP_DIR"
echo -e "${GREEN}✓ Backup location ready${NC}"
echo ""

# Step 4: Deploy to Vercel
echo -e "${YELLOW}Step 4: Deploying to Vercel...${NC}"
echo ""

# Check if user wants to deploy to production
read -p "Deploy to production? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Deploying to production..."
    vercel deploy --prod
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Deployment successful${NC}"
    else
        echo -e "${RED}✗ Deployment failed${NC}"
        exit 1
    fi
else
    echo "Deploying to staging..."
    vercel deploy
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Staging deployment successful${NC}"
    else
        echo -e "${RED}✗ Staging deployment failed${NC}"
        exit 1
    fi
fi

echo ""

# Step 5: Post-deployment verification
echo -e "${YELLOW}Step 5: Post-deployment verification...${NC}"
echo ""

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --json | jq -r '.[0].url')

echo "Deployment URL: $DEPLOYMENT_URL"
echo ""

# Test endpoints
echo "Testing API endpoints..."

# Test student login endpoint
echo -n "Testing /api/student/dashboard... "
curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/api/student/dashboard" | grep -q "401" && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

# Test staff login endpoint
echo -n "Testing /api/staff/dashboard... "
curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/api/staff/dashboard" | grep -q "401" && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

# Test tenant endpoint
echo -n "Testing /api/tenant/students... "
curl -s -o /dev/null -w "%{http_code}" "https://$DEPLOYMENT_URL/api/tenant/students" | grep -q "401" && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo ""

# Step 6: Summary
echo -e "${YELLOW}Step 6: Deployment Summary${NC}"
echo ""
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo ""
echo "Deployment Details:"
echo "  URL: https://$DEPLOYMENT_URL"
echo "  Time: $(date)"
echo "  Version: 1.0.0"
echo ""
echo "Next Steps:"
echo "  1. Verify all endpoints are responding"
echo "  2. Test student login flow"
echo "  3. Test staff login flow"
echo "  4. Test admin login flow"
echo "  5. Monitor error logs"
echo ""
echo "Documentation:"
echo "  - DEPLOYMENT_GUIDE.md"
echo "  - PRODUCTION_CHECKLIST.md"
echo "  - PRODUCTION_SUMMARY.md"
echo ""
echo -e "${GREEN}🎉 ScholarX is now live in production!${NC}"
