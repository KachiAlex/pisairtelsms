$env:SSHPASS = '2Gcu*d8Q'
$out = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "curl -s http://localhost:3000/api/admin/stats -H 'Authorization: Bearer INVALID' 2>&1"
Write-Output $out
