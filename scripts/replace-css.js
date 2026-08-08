const fs = require('fs');
const path = require('path');

const workerPath = path.join(__dirname, '..', 'src', 'worker.js');
const designPath = path.join(__dirname, '..', 'src', 'design-system.js');

let worker = fs.readFileSync(workerPath, 'utf8');
const design = fs.readFileSync(designPath, 'utf8');

// Extract the DESIGN_TOKENS and BASE_CSS from design-system.js
const tokensMatch = design.match(/const DESIGN_TOKENS=`([\s\S]*?)`;/);
const baseCssMatch = design.match(/const BASE_CSS=`([\s\S]*?)`;\s*\n/);

if (!tokensMatch || !baseCssMatch) {
  console.error('Failed to extract from design-system.js');
  process.exit(1);
}

const newTokens = tokensMatch[1];
const newBaseCss = baseCssMatch[1];

// Find and replace the DESIGN_TOKENS in worker.js
// The old one starts with `const DESIGN_TOKENS=`:root{` and ends at the closing `};`
const oldTokensStart = worker.indexOf('const DESIGN_TOKENS=`:root{');
if (oldTokensStart === -1) {
  console.error('Cannot find old DESIGN_TOKENS in worker.js');
  process.exit(1);
}

// Find the end of DESIGN_TOKENS (the `};` followed by newline)
let tokensEnd = worker.indexOf('`;\n', oldTokensStart) + 3;
if (tokensEnd === 2) { // not found with \n
  tokensEnd = worker.indexOf('`;', oldTokensStart) + 2;
}

// Find the BASE_CSS start
const baseCssStart = worker.indexOf('const BASE_CSS=`', tokensEnd);
if (baseCssStart === -1) {
  console.error('Cannot find old BASE_CSS in worker.js');
  process.exit(1);
}

// Find end of BASE_CSS — it ends with `;\n\n/* ── 5.1`
// We need to find the closing backtick
let baseCssEnd = worker.indexOf('`;\n\n/* ── 5.1', baseCssStart);
if (baseCssEnd === -1) {
  // Try alternative: find the end before the hero section
  baseCssEnd = worker.indexOf('`;\n\n/* ── Hero', baseCssStart);
}
if (baseCssEnd === -1) {
  // Last resort: find the pattern that ends BASE_CSS
  const idx = worker.indexOf('/* ✗ 纯黑', baseCssStart);
  if (idx !== -1) {
    baseCssEnd = worker.lastIndexOf('`', idx) + 1;
  }
}
if (baseCssEnd === -1) {
  console.error('Cannot find end of BASE_CSS');
  // Let's try to find it by looking for the next function/section
  const nextSection = worker.indexOf('\n\n// ===================== 前台', baseCssStart);
  if (nextSection !== -1) {
    baseCssEnd = worker.lastIndexOf('`', nextSection) + 1;
  } else {
    process.exit(1);
  }
}

// Build replacement
const replacement = `const DESIGN_TOKENS=\`${newTokens}\`;\n\nconst BASE_CSS=\`${newBaseCss}\`;\n`;

// Reconstruct worker
const newWorker = worker.substring(0, oldTokensStart) + replacement + worker.substring(baseCssEnd);

fs.writeFileSync(workerPath, newWorker);
console.log('✅ Successfully replaced CSS in worker.js');
console.log(`   Old file: ${worker.length} chars`);
console.log(`   New file: ${newWorker.length} chars`);
