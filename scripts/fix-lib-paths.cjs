const fs = require('fs');
const path = require('path');
const dir = path.resolve('api/_lib');
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith('.ts')) continue;
  const fp = path.join(dir, f);
  let c = fs.readFileSync(fp, 'utf8');
  const orig = c;
  c = c.replace(/from\s+['"]\/(sql|http-types)\.js['"]/g, "from './$1.js'");
  if (c !== orig) {
    fs.writeFileSync(fp, c, 'utf8');
    console.log('Fixed:', f);
  }
}
