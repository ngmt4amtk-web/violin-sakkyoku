import { chromium } from '/Users/ngmt4a.mtk/Projects/violin-sakkyoku-test/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';

// 試し聴きの音どうし・試し聴きと再生が重ならない事と、調を押した直後に選択が変わる事を確かめる。
const url = process.argv[2];
if (!url) throw new Error('使い方: node tests/e2e_overlap.mjs http://localhost:8000/');
const browser = await chromium.launch({channel:'chrome', headless:true});
const errors = [], failures = [];
async function newPage(seed = {}) {
  const context = await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(data => { localStorage.clear(); for (const [k,v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); }, seed);
  await context.addInitScript(() => {
    window.__osc = [];
    const start = OscillatorNode.prototype.start, stop = OscillatorNode.prototype.stop;
    OscillatorNode.prototype.start = function(t) { if (this.type === 'sawtooth') { this.__rec = {f:this.frequency.value, at:this.context.currentTime, start:t ?? 0, stop:Infinity}; window.__osc.push(this.__rec); } return start.apply(this, arguments); };
    OscillatorNode.prototype.stop = function(t) { if (this.__rec) this.__rec.stop = Math.max(t ?? 0, this.context.currentTime); return stop.apply(this, arguments); };
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.stack || String(error)));
  await page.goto(url, {waitUntil:'networkidle'});
  return {page, context};
}
const clickText = (page, text) => page.getByRole('button', {name:text, exact:false}).first().click();
const osc = page => page.evaluate(() => window.__osc.map(x => ({...x})));
const wait = ms => new Promise(r => setTimeout(r, ms));
// before の音が、後の操作で最初に作られた音の時刻 +0.1 秒までに止まるか
async function noOverlap(page, name, action) {
  const before = (await osc(page)).length;
  await action();
  await wait(400);
  const all = await osc(page), old = all.slice(0, before), fresh = all.slice(before);
  if (!fresh.length) { failures.push(`${name}: 後の操作で音が鳴らない`); return; }
  const t = fresh[0].at, late = old.filter(x => Math.min(x.stop, Infinity) > t + 0.1 && x.start + 0.001 < x.stop);
  if (late.length) failures.push(`${name}: 前の音 ${late.length} 個が後の音に重なる（例: ${late[0].f.toFixed(0)}Hz が ${(late[0].stop - t).toFixed(2)} 秒あとまで）`);
}
try {
  {
    const {page, context} = await newPage();
    await clickText(page, 'はじめる');
    await clickText(page, 'ハ長調');
    await wait(300);
    await noOverlap(page, '調を続けて押す', async () => {
      await clickText(page, 'ニ長調');
      const now = await page.evaluate(() => ({selected:document.querySelector('#keys button.selected strong')?.textContent}));
      if (now.selected !== 'ニ長調') failures.push(`調を押した直後の選択が ${now.selected}`);
    });
    await noOverlap(page, '同じ調を押し直す', () => clickText(page, 'ニ長調'));
    await noOverlap(page, '調の音階の途中で伴奏を聴く', async () => { await clickText(page, 'つぎへ'); await clickText(page, '伴奏だけ聴く'); });
    await clickText(page, '伴奏だけ聴く');
    await context.close();
  }
  {
    // 同じ画面で、マスの音の直後に再生を始める（画面を移らないので play() が止める）
    const {page, context} = await newPage({'violin-sakkyoku-v3':{route:'key', keyId:'D', page:3}});
    await page.locator('.grid-cell').nth(5).click();
    await page.locator('.grid-cell').nth(5).click();
    await wait(300);
    await page.evaluate(() => { window.__osc.length = 0; document.querySelectorAll('.grid-cell')[9].click(); setTimeout(() => document.querySelector('#play-editor').click(), 30); });
    await wait(500);
    {
      const all = await osc(page), tap = all[0], rest = all.slice(1);
      if (!tap || !rest.length) failures.push('マスの音の直後に「聴いてみる」: 音が足りない');
      else if (tap.stop > rest[0].at + 0.1) failures.push(`マスの音の直後に「聴いてみる」: マスの音が再生に ${(tap.stop - rest[0].at).toFixed(2)} 秒重なる`);
    }
    await page.locator('#play-editor').click();
    await context.close();
  }
  {
    const {page, context} = await newPage({'violin-sakkyoku-v3':{route:'finger', page:1}});
    await clickText(page, 'この形で');
    await wait(200);
    await noOverlap(page, '「この形で 0〜4」を続けて押す', () => clickText(page, 'この形で'));
    await context.close();
  }
  assert.deepEqual(errors, [], `JavaScript errors: ${errors.join('\n')}`);
  assert.deepEqual(failures, [], failures.join('\n'));
  console.log('重なりの E2E 合格');
} finally { await browser.close(); }
