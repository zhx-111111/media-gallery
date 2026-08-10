// Find ALL template literals and their exact positions
const fs = require('fs');
const src = fs.readFileSync('src/worker.js', 'utf8');
const lines = src.split('\n');

let i = 0, idx = 0;
while (i < src.length) {
  if (src[i] === '`') {
    let j = i + 1;
    while (j < src.length && src[j] !== '`') {
      if (src[j] === '\\' && j+1 < src.length) j++;
      j++;
    }
    const len = j - i - 1;
    const startLine = src.substring(0, i).split('\n').length;
    const endLine = src.substring(0, j).split('\n').length;
    if (len > 500) {
      console.log(`Template #${++idx}: line ${startLine}-${endLine}, length=${len}, preview="${src.substring(i+1, i+81).replace(/\n/g,'\\n')}"`);
    }
    i = (j < src.length) ? j + 1 : src.length;
  } else {
    i++;
  }
}
