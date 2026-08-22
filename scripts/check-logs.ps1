$env:SSHPASS = '2Gcu*d8Q'
$r = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker logs pisairtel-sms 2>&1 | tail -30"
Write-Host $r
