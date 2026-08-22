$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-email.sh root@162.35.104.28:/tmp/test-email.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/test-email.sh 2>&1"
Write-Output $result
