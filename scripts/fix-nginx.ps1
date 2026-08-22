$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cd /opt/pisairtel-sms && docker compose up -d --force-recreate nginx 2>&1; echo '---SEP---'; sleep 3; docker exec pisairtel-nginx head -10 /etc/nginx/conf.d/default.conf; echo '---SEP---'; docker exec pisairtel-nginx nginx -t 2>&1; echo '---SEP---'; curl -sI https://localhost/ -k 2>&1 | grep -i 'strict-transport\|x-frame\|x-content-type\|referrer\|permissions\|x-xss'; echo '---SEP---'; curl -s https://localhost/ -k 2>&1 | grep -o '<title>[^<]*</title>'"
Write-Output $result
