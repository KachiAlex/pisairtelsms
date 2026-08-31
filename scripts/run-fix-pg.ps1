$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/fix-pg-password.sh root@162.35.104.28:/tmp/fix-pg-password.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/fix-pg-password.sh 2>&1"
Write-Output $result
