#!/bin/bash
cd /var/www/pisairtel-sms
set -a
source .env
set +a
node --import tsx scripts/run-consolidated-migration.mjs
