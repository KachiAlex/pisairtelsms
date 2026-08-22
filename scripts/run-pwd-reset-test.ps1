$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/test-pwd-reset.sh root@162.35.104.28:/tmp/test-pwd-reset.sh
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "chmod +x /tmp/test-pwd-reset.sh && bash /tmp/test-pwd-reset.sh 2>&1"
Write-Output $out
