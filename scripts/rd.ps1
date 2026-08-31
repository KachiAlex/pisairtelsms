$env:SSHPASS = '2Gcu*d8Q'
$r = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "cat /tmp/dcmp.out 2>&1"
Write-Host $r
