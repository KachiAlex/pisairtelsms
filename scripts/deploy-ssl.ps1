$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cd /opt/pisairtel-sms && git checkout -- nginx/nginx.conf 2>&1; echo '---SEP---'; git pull origin main 2>&1; echo '---SEP---'; docker compose up -d --force-recreate nginx 2>&1; echo '---SEP---'; sleep 3; docker exec pisairtel-nginx nginx -t 2>&1; echo '---SEP---'; docker ps --format '{{.Names}} {{.Status}}' 2>&1"
Write-Output $result
