$env:SSHPASS = '2Gcu*d8Q'
$output = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cd /opt/pisairtel-sms && git checkout -- . && git pull origin main 2>&1; echo '===BUILD==='; docker compose up -d --build --force-recreate app 2>&1; echo '===STATUS==='; sleep 15; docker ps --format '{{.Names}} {{.Status}}' 2>&1 | Select-String pisairtel"
Write-Output $output
