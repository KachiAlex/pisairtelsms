$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/debug-pg2.sh root@162.35.104.28:/tmp/debug-pg2.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/debug-pg2.sh 2>&1"
Write-Output $result
