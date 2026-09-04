#!/bin/bash
JS=$(curl -s https://pisairtelsms.com/ | grep -oE 'assets/index[^"]+\.js' | head -1)
echo "Bundle: $JS"
curl -s "https://pisairtelsms.com/$JS" | grep -o 'color:#fff' | wc -l
