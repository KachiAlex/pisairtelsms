$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "ls /etc/letsencrypt/live/pisairtelsms.com/ 2>&1; echo '---SEPARATOR---'; docker ps --format '{{.Names}} {{.Status}}' 2>&1; echo '---SEPARATOR---'; ls /opt/pisairtel-sms/nginx/ssl/ 2>&1"
Write-Output $result
