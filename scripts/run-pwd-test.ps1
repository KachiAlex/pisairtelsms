$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-pwd-flow.sh root@162.35.104.28:/tmp/tpf.sh
$r = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "bash /tmp/tpf.sh 2>&1"
Write-Host $r
