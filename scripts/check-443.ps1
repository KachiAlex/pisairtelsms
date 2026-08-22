$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "ss -tlnp | grep ':443' 2>&1; echo '---SEP---'; ss -tlnp | grep ':80' 2>&1; echo '---SEP---'; docker ps --format '{{.Names}} {{.Ports}}' 2>&1 | grep -i 'nginx\|443\|80'; echo '---SEP---'; curl -sI https://localhost/ -k --resolve localhost:443:127.0.0.1 2>&1 | head -5; echo '---SEP---'; curl -s https://localhost/ -k 2>&1 | grep -o '<title>[^<]*</title>'"
Write-Output $result
