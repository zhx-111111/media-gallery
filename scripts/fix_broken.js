// 修复 worker.js 中拆分脚本造成的语法损坏
const fs = require('fs');
const path = '/data/workspace/media-gallery/src/worker.js';
let src = fs.readFileSync(path, 'utf8');

// ─── 修复 1：第 631 行附近的孤立 `, ` 和断行 ───
// 第 630 行是 `const start=(page-1)*ps;`
// 第 631 行是 ``, `  （垃圾）
// 第 632 行是 `    `  const slice=...`
// 这些 `  ` 和 `, ` 是模板字符串拆分的残留，需要删掉

// 把第 631-632 行的垃圾替换为干净代码
src = src.replace(
  /const start=\(page-1\)\*ps;\n`\n    `  const slice=/,
  `const start=(page-1)*ps;\n  const slice=`
);

// ─── 修复 2：navExtra 那行的 ].join('') 垃圾 ───
// 原来：try{...navExtra+=`\n  ].join('')<a class="nav-a"...
// 改成：try{...navExtra+=`<a class="nav-a"...

src = src.replace(
  /navExtra\+=`\n  \]\.join\(''\)<a class="nav-a"/,
  `navExtra+=\`<a class="nav-a"`
);

// ─── 修复 3：第 1020 行附近 renderAdmin 的 return 损坏 ───
// 查找 `].join('');\n</script></body></html>` 模式
// 在 renderAdmin 中，最后的 return 应该是 return `...大模板...`;
// 但被拆坏了

// 找到 renderAdmin 函数里最后的内联脚本区域
// 在文件末尾附近：</script></body></html>`; 后面可能还有垃圾

// 检查文件末尾
const lines = src.split('\n');
console.log('总行数:', lines.length);
console.log('最后 5 行:');
lines.slice(-5).forEach((l, i) => console.log(`${lines.length - 5 + i}: ${l}`));

// 更通用的修复：找所有 `].join('');` 后紧跟 HTML 标签的情况
// 这说明数组拼接语法和模板字符串混在了一起
src = src.replace(
  /\]\.join\(''\);(\s*<\/script>)/g,
  `$1`
);

// 也修复 `].join('')` 后紧跟 HTML 内容的情况（在模板字符串内部）
// 这种情况说明拆分时把模板内容写到了数组拼接外面
src = src.replace(
  /\]\.join\(''\)(\s*)(<div|<span|<button|<a |<section|<main|<footer|<nav |<article|<iframe)/g,
  `$1$2`
);

const outPath = path.replace('.js', '.fixed.js');
fs.writeFileSync(outPath, src);
console.log('\n临时文件已写入:', outPath);

// 验证语法
try {
  require('child_process').execSync('node --check ' + outPath, { stdio: 'pipe' });
  console.log('✅ 语法检查通过');
  fs.renameSync(outPath, path);
  console.log('✅ 已覆盖原文件');
} catch (e) {
  console.log('❌ 语法仍有错误:');
  console.log(e.stdout?.toString() || e.message);
  // 保留文件供调试
}
