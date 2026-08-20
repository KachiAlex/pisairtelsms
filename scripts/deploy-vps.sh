#!/bin/bash
# =============================================================================
# Pisairtel SMS — VPS Deployment Script
# SSHs into the VPS, installs Docker, builds and runs the containers
# =============================================================================
set -euo pipefail

echo "=========================================="
echo "  Pisairtel SMS — VPS Deployment"
echo "  Target: 162.35.104.28"
echo "=========================================="

# Configuration
VPS_IP="162.35.104.28"
VPS_USER="root"
VPS_PASSWORD="2Gcu*d8Q"
PROJECT_DIR="/opt/pisairtel-sms"
REPO_URL="https://github.com/KachiAlex/scholarx.git"
DB_PASSWORD="PisairtelSMS2024!"
JWT_SECRET="pisairtel-sms-jwt-secret-key-2024-very-secure-32chars"

echo ""
echo "Step 1: Installing sshpass (if needed)..."
if ! command -v sshpass &>/dev/null; then
  echo "  sshpass not found — install it to use this script with password auth."
  echo "  Alternatively, set up SSH key auth to the VPS."
  exit 1
fi

export SSHPASS="$VPS_PASSWORD"

echo ""
echo "Step 2: Connecting to VPS and setting up environment..."
sshpass -e ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" bash <<'REMOTE_SETUP'
set -euo pipefail

echo "  [VPS] Checking OS..."
if [ -f /etc/os-release ]; then
  . /etc/os-release
  echo "  [VPS] OS: $NAME $VERSION"
fi

echo "  [VPS] Checking for Docker..."
if ! command -v docker &>/dev/null; then
  echo "  [VPS] Docker not found. Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "  [VPS] Docker installed."
else
  echo "  [VPS] Docker already installed: $(docker --version)"
fi

echo "  [VPS] Checking for docker-compose..."
if ! docker compose version &>/dev/null 2>&1; then
  echo "  [VPS] Docker Compose plugin not found. Installing..."
  apt-get update -qq && apt-get install -y -qq docker-compose-plugin
  echo "  [VPS] Docker Compose installed."
else
  echo "  [VPS] Docker Compose available: $(docker compose version)"
fi

echo "  [VPS] Setting up project directory..."
mkdir -p /opt/pisairtel-sms

echo "  [VPS] Cloning/updating repository..."
if [ -d /opt/pisairtel-sms/.git ]; then
  cd /opt/pisairtel-sms
  git pull origin main
else
  git clone https://github.com/KachiAlex/scholarx.git /opt/pisairtel-sms
  cd /opt/pisairtel-sms
fi

echo "  [VPS] Creating .env file..."
cat > /opt/pisairtel-sms/.env <<EOF
POSTGRES_PASSWORD=PisairtelSMS2024!
JWT_SECRET=pisairtel-sms-jwt-secret-key-2024-very-secure-32chars
APP_URL=http://162.35.104.28
NEON_DATABASE_URL=
EOF

echo "  [VPS] Stopping existing containers (if any)..."
docker compose -f /opt/pisairtel-sms/docker-compose.yml down 2>/dev/null || true

echo "  [VPS] Building and starting containers..."
docker compose -f /opt/pisairtel-sms/docker-compose.yml up -d --build

echo "  [VPS] Waiting for containers to start..."
sleep 10

echo "  [VPS] Container status:"
docker compose -f /opt/pisairtel-sms/docker-compose.yml ps

echo "  [VPS] Running database migrations..."
# Wait for postgres to be ready
for i in $(seq 1 30); do
  if docker exec pisairtel-postgres pg_isready -U pisairtel -d pisairtel_sms 2>/dev/null; then
    echo "  [VPS] PostgreSQL is ready!"
    break
  fi
  echo "  [VPS] Waiting for PostgreSQL... (attempt $i/30)"
  sleep 2
done

# Run schema migrations
docker exec pisairtel-sms npx tsx scripts/run-consolidated-migration.mjs 2>&1 || true

echo "  [VPS] Deployment complete!"
echo "  [VPS] App should be accessible at http://162.35.104.28"

REMOTE_SETUP

echo ""
echo "Step 3: Verifying deployment..."
sleep 5
sshpass -e ssh -o StrictHostKeyChecking=no "${VPS_USER}@${VPS_IP}" bash <<'VERIFY'
set -euo pipefail
echo "  [VPS] Checking container health..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep pisairtel || true
echo ""
echo "  [VPS] Testing HTTP response..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:80/ || true
curl -s -o /dev/null -w "API Status: %{http_code}\n" http://localhost:80/api/tenant/system-health || true
VERIFY

echo ""
echo "=========================================="
echo "  ✅ Deployment Complete!"
echo "  URL: http://162.35.104.28"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Run the database migration script to copy data from Neon:"
echo "     NEON_DATABASE_URL='your-neon-url' bash scripts/migrate-neon-to-vps.sh"
echo "  2. Update your domain DNS to point to 162.35.104.28"
echo "  3. Set up SSL with certbot if needed"
echo ""
