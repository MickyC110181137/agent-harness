#!/usr/bin/env node
// 檢查 repo 內所有 markdown 的內部連結是否解析得到。
// 無第三方依賴。外部連結（http/https）與純錨點不檢查。

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const IGNORED_DIRS = new Set(['.git', 'node_modules']);
const root = path.resolve(process.argv[2] || '.');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (IGNORED_DIRS.has(entry)) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith('.md')) out.push(full);
  }
  return out;
}

const broken = [];
let checked = 0;

for (const file of walk(root)) {
  const dir = path.dirname(file);
  const text = readFileSync(file, 'utf8');
  for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].trim();
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const relPath = target.split('#')[0];
    if (!relPath) continue;
    checked += 1;
    if (!existsSync(path.join(dir, relPath))) {
      const from = path.relative(root, file).split(path.sep).join('/');
      broken.push(`${from} -> ${target}`);
    }
  }
}

if (broken.length) {
  for (const line of broken) process.stderr.write(`link.missing: ${line}\n`);
  process.stderr.write(`\n${broken.length} 條連結解析不到，檢查未通過。\n`);
  process.exit(1);
}

console.log(`連結檢查通過：${checked} 條內部連結全部解析得到。`);
