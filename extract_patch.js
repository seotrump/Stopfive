const fs = require('fs');
const patch16 = fs.readFileSync('corrupted_patch.diff', 'utf16le');
const lines = patch16.split('\n');
const startIdx = lines.findIndex(l => l.includes("adminTab === 'scheduled'"));
const block = lines.slice(Math.max(0, startIdx - 5), startIdx + 150).join('\n');
fs.writeFileSync('extracted_ui_from_patch.txt', block, 'utf8');
console.log('Done');
