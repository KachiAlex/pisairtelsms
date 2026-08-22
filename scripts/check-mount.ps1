$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "head -20 /opt/pisairtel-sms/nginx/nginx.conf; echo '---SEP---'; docker exec pisairtel-nginx head -20 /etc/nginx/conf.d/default.conf; echo '---SEP---'; diff <(cat /opt/pisairtel-sms/nginx/nginx.conf) <(docker exec pisairtel-nginx cat /etc/nginx/conf.d/default.conf) 2>&1 | head -20"
Write-Output $result
