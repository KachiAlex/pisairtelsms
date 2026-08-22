# Check server logs for results error
$VPS = "162.35.104.28"
$SSH_PASS = "2Gcu*d8Q"

sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no scripts/test-cbt-flow.sh "root@${VPS}:/root/test-cbt-flow.sh"
sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no "root@${VPS}" "docker cp /root/test-cbt-flow.sh pisairtel-sms:/tmp/test-cbt-flow.sh && docker exec pisairtel-sms bash /tmp/test-cbt-flow.sh > /root/cbt-result.txt 2>&1; docker logs pisairtel-sms --tail 30 > /root/cbt-logs.txt 2>&1"
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no "root@${VPS}:/root/cbt-logs.txt" cbt-logs.txt

Write-Host "===== SERVER LOGS =====" -ForegroundColor Yellow
Get-Content cbt-logs.txt | Select-String -Pattern "error|Error|results|fetch" -CaseSensitive:$false
Write-Host "===== FULL LOGS =====" -ForegroundColor Yellow
Get-Content cbt-logs.txt
