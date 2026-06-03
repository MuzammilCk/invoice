import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');
serverTs = serverTs.replace(/\\\$\{/g, '${');
serverTs = serverTs.replace(/\\`/g, '`');
fs.writeFileSync('server.ts', serverTs);

console.log("Fixes applied successfully to server.ts.");
