$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker exec pisairtel-nginx cat /etc/nginx/conf.d/default.conf 2>&1 | head -10; echo '---SEP---'; curl -sI https://localhost/ -k 2>&1 | head -20; echo '---SEP---'; curl -s http://localhost:3000/ 2>&1 | grep -o '<title>[^<]*</title>'"
Write-Output $result
