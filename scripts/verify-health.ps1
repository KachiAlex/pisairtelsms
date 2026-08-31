$env:SSHPASS = '2Gcu*d8Q'
Start-Sleep -Seconds 10
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker ps -a"
Write-Output $out
