#!/bin/bash
set -e

echo "=== Pisairtel SMS - VPS One-Time Setup ==="
echo ""

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
  echo "[1/6] Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
else
  echo "[1/6] Node.js already installed: $(node -v)"
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
  echo "[2/6] Installing pnpm..."
  npm install -g pnpm@10
else
  echo "[2/6] pnpm already installed: $(pnpm -v)"
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
  echo "[3/6] Installing PM2..."
  npm install -g pm2
else
  echo "[3/6] PM2 already installed: $(pm2 -v)"
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
  echo "[4/6] Installing Nginx..."
  apt-get update
  apt-get install -y nginx
else
  echo "[4/6] Nginx already installed: $(nginx -v 2>&1)"
fi

# Create app directory
echo "[5/6] Creating app directory..."
mkdir -p /var/www/pisairtel-sms
mkdir -p /var/log/pisairtel-sms

# Configure Nginx
echo "[6/6] Configuring Nginx..."
cat > /etc/nginx/sites-available/pisairtel-sms << 'NGINX_EOF'
server {
    listen 8082;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINX_EOF

ln -sf /etc/nginx/sites-available/pisairtel-sms /etc/nginx/sites-enabled/pisairtel-sms
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx

# Setup PM2 startup
pm2 startup systemd -u root --hp /root << 'STARTUP_EOF'
y
STARTUP_EOF

echo ""
echo "=== VPS Setup Complete! ==="
echo ""
echo "Next steps:"
echo "  1. Create .env file:  nano /var/www/pisairtel-sms/.env"
echo "  2. Run deploy from your local machine:  node server/deploy.mjs"
echo ""
