import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// 2026-11-28 本人「古い版に変えられる必要なし」。根のアプリから /v1/ /v2/ /v3/ などへ移る道を作らない。
test('根のアプリに古い版への道が無い', () => {
  const root = new URL('../', import.meta.url);
  const files = fs.readdirSync(root).filter(f => /\.(html|js|mjs|css)$/.test(f));
  assert.ok(files.includes('index.html') && files.includes('app.js'));
  for (const f of files) {
    const s = fs.readFileSync(new URL(f, root), 'utf8');
    assert.doesNotMatch(s, /(["'`(\/]|^)v\d+\//m, `${f} に古い版の住所がある`);
    assert.doesNotMatch(s, /前の版|古い版/, `${f} に古い版の案内がある`);
  }
});
