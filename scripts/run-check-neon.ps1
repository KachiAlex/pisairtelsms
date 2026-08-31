$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/check-neon-refs.sh root@162.35.104.28:/tmp/check-neon-refs.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/check-neon-refs.sh 2>&1"
Write-Output $result
