$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/debug-login.sh root@162.35.104.28:/tmp/debug-login.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/debug-login.sh 2>&1"
Write-Output $result
