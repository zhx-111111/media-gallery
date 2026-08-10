const fs = require('fs');
const src = fs.readFileSync('src/worker.js', 'utf8');
let i = 0, count = 0, maxLen = 0, maxPos = 0, largeTemplates = [];
while (i < src.length) {
  if (src[i] === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\' && j+1 < src.length) j++;
      j++;
    }
    const len = j - i - 1;
    if (len > 2000) largeTemplates.push({pos: i, len, preview: src.substring(i, Math.min(i+60, src.length))});
    if (len > maxLen) { maxLen = len; maxPos = i; }
    count++;
    i = (j < src.length) ? j + 1 : src.length;
  } else {
    i++;
  }
}
console.log('Total template literals:', count);
console.log('Max length:', maxLen);
console.log('Templates > 2000 chars:', largeTemplates.length);
largeTemplates.forEach((t, idx) => {
  console.log(`\n#${idx+1} at ${t.pos}, len=${t.len}`);
  console.log(t.preview);
});
