# Run CBT flow test on the VPS
$VPS = "162.35.104.28"
$SSH_PASS = "2Gcu*d8Q"

Write-Host "Copying test script to VPS..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no scripts/test-cbt-flow.sh "root@${VPS}:/root/test-cbt-flow.sh"

Write-Host ""
Write-Host "Running CBT flow test on VPS..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Yellow
sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no "root@${VPS}" "chmod +x /root/test-cbt-flow.sh && bash /root/test-cbt-flow.sh"
Write-Host "==========================================" -ForegroundColor Yellow
