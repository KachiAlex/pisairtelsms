$env:SSHPASS = '2Gcu*d8Q'
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 'docker ps --format "{{.Names}}: {{.Status}}"'
Write-Output $out
