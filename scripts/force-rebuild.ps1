$env:SSHPASS = '2Gcu*d8Q'
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cd /opt/pisairtel-sms && git checkout -- . && git pull origin main 2>&1 && docker compose build --no-cache app 2>&1 && docker compose up -d --force-recreate app 2>&1 && sleep 15 && docker ps -a 2>&1"
Write-Output $out
