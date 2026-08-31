$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/check-vps-db.sh root@162.35.104.28:/tmp/check-vps-db.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/check-vps-db.sh 2>&1"
Write-Output $result
