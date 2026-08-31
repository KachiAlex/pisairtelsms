# Run CBT flow test on VPS via docker exec
$VPS = "162.35.104.28"
$SSH_PASS = "2Gcu*d8Q"

Write-Host "Copying test script to VPS..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no scripts/test-cbt-flow.sh "root@${VPS}:/root/test-cbt-flow.sh"

Write-Host "Running test inside docker container..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Yellow
sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no "root@${VPS}" "docker cp /root/test-cbt-flow.sh pisairtel-sms:/tmp/test-cbt-flow.sh && docker exec pisairtel-sms sh -c 'chmod +x /tmp/test-cbt-flow.sh && bash /tmp/test-cbt-flow.sh 2>&1'"
Write-Host "==========================================" -ForegroundColor Yellow
