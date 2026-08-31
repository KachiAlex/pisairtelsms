$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/compare-neon-vps.sh root@162.35.104.28:/tmp/compare-neon-vps.sh
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/compare-neon-vps.sh 2>&1"
Write-Output $result
