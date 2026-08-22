$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker exec pisairtel-nginx nginx -t 2>&1; echo '---SEP---'; docker exec pisairtel-nginx nginx -s reload 2>&1; echo '---SEP---'; curl -sI https://localhost/robots.txt -k 2>&1 | head -15; echo '---SEP---'; curl -sI https://localhost/ -k 2>&1 | grep -i 'strict-transport\|x-frame\|x-content\|referrer\|permissions\|x-xss'"
Write-Output $result
