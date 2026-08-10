// 更聪明的方法：用 esbuild 的 transform API 来获取精确错误位置
const esbuild = require('esbuild');
const fs = require('fs');

const code = fs.readFileSync('src/worker.js', 'utf8');

// 用 transform 而不是 bundle，这样能看到原始行号
esbuild.transform(code, {
  loader: 'js',
  format: 'esm',
  target: 'es2022'
}).then(result => {
  console.log('✅ transform 通过');
}).catch(err => {
  console.log(`❌ 错误: ${err.message}`);
  if (err.location) {
    console.log(`  文件: ${err.location.file}`);
    console.log(`  行: ${err.location.line}, 列: ${err.location.column}`);
    console.log(`  文本: ${err.location.text}`);
    // 显示上下文
    const lines = code.split('\n');
    const lineNum = err.location.line;
    for (let i = Math.max(0, lineNum - 3); i < Math.min(lines.length, lineNum + 2); i++) {
      console.log(`  ${i+1}: ${lines[i].substring(0, 120)}`);
    }
  }
});
