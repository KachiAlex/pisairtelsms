$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/debug-login2.sh root@162.35.104.28:/tmp/debug-login2.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/debug-login2.sh 2>&1"
Write-Output $result
