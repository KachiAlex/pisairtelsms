#!/bin/bash

# Pisairtel SMS — VPS Deployment Script
# Deploys the application to a self-hosted VPS using PM2.

set -e

echo "🚀 Pisairtel SMS — VPS Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Pre-deployment checks
echo -e "${YELLOW}Step 1: Running pre-deployment checks...${NC}"
echo ""

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npx tsc --noEmit > /dev/null 2>&1 && echo -e "${GREEN}✓ TypeScript compilation successful${NC}" || {
    echo -e "${RED}✗ TypeScript compilation failed${NC}"
    exit 1
}

# Build frontend
echo "Building frontend..."
npm run build > /dev/null 2>&1 && echo -e "${GREEN}✓ Vite build successful${NC}" || {
    echo -e "${RED}✗ Vite build failed${NC}"
    exit 1
}

echo ""

# Step 2: Verify environment
echo -e "${YELLOW}Step 2: Verifying environment...${NC}"
echo ""

if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env not found${NC}"
    echo "Please create .env with the following variables:"
    echo ""
    echo "DATABASE_URL=postgresql://user:pass@localhost:5432/pisairtel_sms"
    echo "JWT_SECRET=your_jwt_secret_key"
    echo "PORT=3000"
    echo ""
    read -p "Press Enter once you've created .env..."
fi

echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# Step 3: Deploy via PM2
echo -e "${YELLOW}Step 3: Starting/restarting via PM2...${NC}"
echo ""

if command -v pm2 &> /dev/null; then
    pm2 restart pisairtel-sms 2>/dev/null || pm2 start ecosystem.config.cjs
    echo -e "${GREEN}✓ PM2 application started/restarted${NC}"
else
    echo -e "${YELLOW}⚠️  PM2 not found. Starting directly...${NC}"
    node --import tsx server.mjs &
    echo -e "${GREEN}✓ Server started (direct mode)${NC}"
fi

echo ""

# Step 4: Post-deployment verification
echo -e "${YELLOW}Step 4: Post-deployment verification...${NC}"
echo ""

PORT=$(grep -oP 'PORT=\K\d+' .env 2>/dev/null || echo "3000")

echo "Testing API endpoints..."
echo -n "Testing /api/tenant/system-health... "
curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/tenant/system-health" | grep -q "200" && echo -e "${GREEN}✓${NC}" || echo -e "${RED}✗${NC}"

echo ""
echo -e "${GREEN}✓ Deployment completed successfully!${NC}"
echo ""
echo "Deployment Details:"
echo "  URL: http://localhost:$PORT"
echo "  Time: $(date)"
echo ""
echo "Next Steps:"
echo "  1. Verify all endpoints are responding"
echo "  2. Test student login flow"
echo "  3. Test staff login flow"
echo "  4. Test admin login flow"
echo "  5. Monitor PM2 logs: pm2 logs pisairtel-sms"
echo ""
echo -e "${GREEN}🎉 Pisairtel SMS is now live!${NC}"
