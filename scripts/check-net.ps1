$env:SSHPASS = '2Gcu*d8Q'
$result = sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "docker network inspect pisairtel-sms_pisairtel-net --format='{{range .Containers}}{{.Name}}:{{.IPv4Address}} {{end}}' 2>&1; echo '---SEP---'; docker exec pisairtel-nginx nslookup app 2>&1 || docker exec pisairtel-nginx getent hosts app 2>&1; echo '---SEP---'; docker exec pisairtel-nginx cat /etc/nginx/conf.d/default.conf 2>&1 | grep -A2 'proxy_pass'"
Write-Output $result
