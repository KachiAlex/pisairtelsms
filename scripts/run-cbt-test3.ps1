# Run CBT flow test on VPS and capture output to file
$VPS = "162.35.104.28"
$SSH_PASS = "2Gcu*d8Q"

Write-Host "Copying test script to VPS..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no scripts/test-cbt-flow.sh "root@${VPS}:/root/test-cbt-flow.sh"

Write-Host "Running test..." -ForegroundColor Cyan
sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no "root@${VPS}" "docker cp /root/test-cbt-flow.sh pisairtel-sms:/tmp/test-cbt-flow.sh 2>/dev/null && docker exec pisairtel-sms bash /tmp/test-cbt-flow.sh > /root/cbt-result.txt 2>&1; echo DONE"

Write-Host "Downloading results..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no "root@${VPS}:/root/cbt-result.txt" cbt-result.txt

Write-Host ""
Write-Host "===== TEST RESULTS =====" -ForegroundColor Yellow
Get-Content cbt-result.txt
Write-Host "========================" -ForegroundColor Yellow
