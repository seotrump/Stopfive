const fs = require('fs');
const lines = fs.readFileSync('C:/Users/User/.gemini/antigravity/brain/f242612b-5561-4ff7-9969-e9571ffa3f94/.system_generated/logs/transcript.jsonl', 'utf8').split('\n');
const matches = lines.filter(l => l.includes("adminTab === 'scheduled' ? ("));
if (matches.length > 0) {
  const obj = JSON.parse(matches[0]);
  let text = '';
  if (obj.args) text = JSON.stringify(obj.args, null, 2);
  else if (obj.tool_calls) text = JSON.stringify(obj.tool_calls, null, 2);
  else text = obj.content || '';
  fs.writeFileSync('extracted_ui.txt', text);
  console.log('Extracted');
} else {
  console.log('Not found');
}
