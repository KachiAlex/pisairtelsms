$env:SSHPASS = '2Gcu*d8Q'
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker logs pisairtel-sms --tail 30 2>&1"
Write-Output $out
