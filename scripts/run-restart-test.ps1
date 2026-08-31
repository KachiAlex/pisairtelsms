$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/restart-and-test.sh root@162.35.104.28:/tmp/restart-and-test.sh
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-email.sh root@162.35.104.28:/tmp/test-email.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/restart-and-test.sh 2>&1"
Write-Output $result
