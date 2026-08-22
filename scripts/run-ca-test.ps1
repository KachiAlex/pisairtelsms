# Run CA flow test on VPS
$VPS = "162.35.104.28"
$SSH_PASS = "2Gcu*d8Q"

Write-Host "Copying CA test script to VPS..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no scripts/test-ca-flow.sh "root@${VPS}:/root/test-ca-flow.sh"

Write-Host "Running test..." -ForegroundColor Cyan
sshpass -p $SSH_PASS ssh -o StrictHostKeyChecking=no "root@${VPS}" "docker cp /root/test-ca-flow.sh pisairtel-sms:/tmp/test-ca-flow.sh && docker exec pisairtel-sms bash /tmp/test-ca-flow.sh > /root/ca-result.txt 2>&1"

Write-Host "Downloading results..." -ForegroundColor Cyan
sshpass -p $SSH_PASS scp -o StrictHostKeyChecking=no "root@${VPS}:/root/ca-result.txt" ca-result.txt

Write-Host ""
Write-Host "===== TEST RESULTS =====" -ForegroundColor Yellow
Get-Content ca-result.txt
