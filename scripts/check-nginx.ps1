$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker exec pisairtel-nginx cat /etc/nginx/nginx.conf 2>&1 | head -20; echo '---SEP---'; docker exec pisairtel-nginx ls -la /etc/nginx/conf.d/ 2>&1; echo '---SEP---'; docker inspect pisairtel-nginx --format='{{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}' 2>&1"
Write-Output $result
