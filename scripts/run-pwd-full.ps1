$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-pwd-full.sh root@162.35.104.28:/tmp/tpf2.sh
$r = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/tpf2.sh 2>&1"
Write-Host $r
