$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-admin-api.sh root@162.35.104.28:/tmp/ta.sh
$r = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/ta.sh 2>&1"
Write-Host $r
