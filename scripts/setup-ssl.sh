#!/bin/bash
set -e

echo "=== Installing certbot ==="
apt-get update -qq
apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -5

echo "=== Checking certbot ==="
which certbot
certbot --version

echo "=== Stopping nginx temporarily for certbot standalone ==="
docker stop pisairtel-nginx

echo "=== Getting SSL certificate ==="
certbot certonly --standalone -d pisairtelsms.com -d www.pisairtelsms.com --non-interactive --agree-tos --email admin@pisairtelsms.com 2>&1

echo "=== Copying certs to nginx volume ==="
mkdir -p /opt/pisairtel-sms/nginx/ssl
cp /etc/letsencrypt/live/pisairtelsms.com/fullchain.pem /opt/pisairtel-sms/nginx/ssl/
cp /etc/letsencrypt/live/pisairtelsms.com/privkey.pem /opt/pisairtel-sms/nginx/ssl/
chmod 644 /opt/pisairtel-sms/nginx/ssl/*.pem

echo "=== Starting nginx ==="
docker start pisairtel-nginx

echo "=== Done ==="
ls -la /opt/pisairtel-sms/nginx/ssl/
