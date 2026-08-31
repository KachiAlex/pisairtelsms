$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cd /opt/pisairtel-sms && git checkout -- . && git pull origin main 2>&1; echo '---SEP---'; docker compose up -d --build app 2>&1 | tail -5; echo '---SEP---'; sleep 10; docker ps --format '{{.Names}} {{.Status}}' 2>&1 | grep pisairtel; echo '---SEP---'; curl -s http://localhost:3000/api/admin/stats -H 'Authorization: Bearer INVALID' 2>&1 | head -c 100"
Write-Output $result
