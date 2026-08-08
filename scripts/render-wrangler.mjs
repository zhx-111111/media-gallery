#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const file = resolve(process.argv[2] || 'wrangler.toml');
let src = readFileSync(file, 'utf8');

src = src.replace(/\$\{(\w+)\}/g, (_, name) => {
  const v = process.env[name];
  if (v === undefined) {
    console.error(`[render-wrangler] 警告：${name} 未设置，保留占位符`);
    return '${' + name + '}';
  }
  return v;
});

writeFileSync(file, src, 'utf8');
console.log('[render-wrangler] 渲染完成：', file);
