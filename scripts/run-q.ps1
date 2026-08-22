$env:SSHPASS = '2Gcu*d8Q'
sshpass -e scp -o StrictHostKeyChecking=no scripts/quick-compare.sh root@162.35.104.28:/tmp/q.sh
sshpass -e ssh -o StrictHostKeyChecking=no root@162.35.104.28 "timeout 45 bash /tmp/q.sh > /tmp/q.out 2>&1; cat /tmp/q.out"
