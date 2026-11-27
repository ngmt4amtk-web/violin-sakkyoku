import { chromium } from '/Users/ngmt4a.mtk/Projects/violin-sakkyoku-test/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const url = process.argv[2];
if (!url) throw new Error('使い方: node tests/e2e_v3.mjs http://localhost:8000/');
const shots = '/Users/ngmt4a.mtk/.hermes/worker-tasks/claude-tasks/20261127-2257-2a2f/work/v3shots4';
await fs.mkdir(shots, {recursive:true});
const browser = await chromium.launch({channel:'chrome', headless:true});
const errors = [];
async function newPage(seed = {}) {
  const context = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:1});
  await context.addInitScript(data => { if (!sessionStorage.getItem('e2e-seeded')) { localStorage.clear(); for (const [k,v] of Object.entries(data)) localStorage.setItem(k, JSON.stringify(v)); sessionStorage.setItem('e2e-seeded','1'); } }, seed);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.stack || String(error)));
  await page.goto(url, {waitUntil:'networkidle'});
  return {page, context};
}
async function check(page, name) {
  const dimensions = await page.evaluate(() => ({width:document.documentElement.scrollWidth, viewport:innerWidth}));
  assert.ok(dimensions.width <= 390, `${name}: 横幅 ${dimensions.width}px`);
  await page.screenshot({path:`${shots}/${name}.png`, fullPage:true});
}
const clickText = (page, text) => page.getByRole('button', {name:text, exact:false}).first().click();
const next = page => clickText(page, 'つぎへ');
try {
  {
    const {page,context} = await newPage();
    await check(page,'start');
    await clickText(page,'はじめる');
    await check(page,'key');
    await clickText(page,'ニ長調');
    await next(page);
    await check(page,'accomp');
    await next(page);
    await check(page,'melody');
    // Place one note per string in consecutive beats, using the accessible cell labels.
    for (const [i, string] of ['G','D','A','E'].entries()) {
      const cells = page.locator('.grid-cell');
      const candidates = await cells.evaluateAll((els,s) => els.map((el,index) => ({index,label:el.getAttribute('aria-label')||''})).filter(x => new RegExp(`(?:^|[^A-Za-z])${s}(?:線|[^A-Za-z]|$)`).test(x.label)), string);
      assert.ok(candidates.length, `${string}線のセルにアクセス可能な名前がありません`);
      const pick = candidates.find(x => new RegExp(`${i+1}拍`).test(x.label)) || candidates[i];
      assert.ok(pick, `${string}線の拍がありません`);
      await cells.nth(pick.index).click();
    }
    const placed = await page.evaluate(() => JSON.parse(localStorage.getItem('violin-sakkyoku-v3')).melody.filter(x=>x && typeof x==='object'));
    assert.deepEqual(new Set(placed.map(x=>x.string)), new Set(['G','D','A','E']));
    await page.locator('#steps button').nth(0).click();
    await clickText(page,'ニ長調');
    await clickText(page,'ニ長調');
    assert.deepEqual((await page.evaluate(()=>JSON.parse(localStorage.getItem('violin-sakkyoku-v3')))).melody.filter(x=>x&&typeof x==='object'),placed,'同じ調では残る');
    await clickText(page,'ハ長調');
    assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('violin-sakkyoku-v3')))).melody.every(x=>x===null),'違う調で消える');
    await page.locator('#steps button').nth(2).click();
    await page.locator('#undo').click();
    const undone=await page.evaluate(()=>JSON.parse(localStorage.getItem('violin-sakkyoku-v3')));
    assert.equal(undone.keyId,'D');
    assert.deepEqual(undone.melody.filter(x=>x&&typeof x==='object'),placed,'調とメロディを戻す');
    await page.locator('#play-editor').click();
    await page.waitForTimeout(300);
    await page.locator('#play-editor').click();
    await next(page);
    await check(page,'done');
    const signature = await page.locator('#score .key-signature').count();
    assert.equal(signature,4,'2段の各段に♯が2個');
    const colors = await page.locator('#score .finger').evaluateAll(els=>els.map(el=>el.style.fill.toLowerCase()));
    for (const color of ['rgb(31, 95, 209)','rgb(238, 138, 0)','rgb(204, 16, 48)','rgb(19, 138, 58)']) assert.ok(colors.includes(color),`楽譜に ${color} がありません: ${colors}`);
    await page.reload({waitUntil:'networkidle'});
    const restored = await page.evaluate(() => JSON.parse(localStorage.getItem('violin-sakkyoku-v3')).melody.filter(x=>x && typeof x==='object'));
    assert.deepEqual(restored, placed, '再読み込み後の音');
    await context.close();
  }
  {
    const {page,context} = await newPage();
    await clickText(page,'指の形からえらぶ');
    await clickText(page,'はじめる');
    await check(page,'finger-string');
    await next(page); await check(page,'finger-shape');
    await next(page); await check(page,'finger-accomp');
    await next(page); await check(page,'finger-melody');
    await page.locator('.grid-cell').first().click();
    await next(page); await check(page,'finger-done');
    assert.ok(await page.locator('#score .finger').count()>0,'指の道の楽譜');
    await context.close();
  }
  {
    const {page,context} = await newPage();
    await clickText(page,'はじめる');
    await next(page); await next(page);
    await clickText(page,'休み');
    await page.locator('.grid-cell').first().click();
    assert.equal(await page.locator('.grid-cell.rest-column').count(), await page.locator('.grid-label').count(), '休みの列を表示する');
    assert.equal(await page.locator('.grid-cell.rest-column').first().innerText(), '🌙');
    await next(page);
    assert.ok(await page.locator('#score .rest').count()>0, '楽譜に休符');
    await page.locator('#steps button').nth(2).click();
    await page.locator('.grid-cell.rest-column').first().click();
    assert.equal(await page.locator('.grid-cell.rest-column').count(), 0, 'もう一度押すと休みが消える');
    await page.locator('.grid-cell').first().click();
    await clickText(page,'休み');
    await page.locator('.grid-cell.rest-column').last().click();
    assert.equal(await page.locator('.grid-cell.rest-column').count(), 0, '音モードで休みを音に替える');
    await context.close();
  }
  {
    const old = {string:'D', shapes:{G:[2,4,5,7],D:[2,4,5,7],A:[2,4,5,7],E:[2,4,5,7]}, bars:4, melody:[{string:'D',finger:1},...Array(15).fill(null)], page:3};
    const {page,context} = await newPage({'violin-sakkyoku-v1':old});
    assert.ok(await page.locator('#strings button.selected').innerText().then(s => s.includes('D')), '旧データの D 線');
    await next(page);
    const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('violin-sakkyoku-v3')));
    assert.equal(migrated.route,'finger');
    assert.deepEqual(migrated.melody[0],old.melody[0]);
    await check(page,'finger-migrated');
    await context.close();
  }
  {
    const {page,context} = await newPage();
    await clickText(page,'はじめる'); await next(page); await next(page);
    await page.locator('.grid-cell').first().click();
    const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('violin-sakkyoku-v3')));
    const keyMelody=(await read()).melody;
    await page.locator('#steps button').first().click(); await clickText(page,'もどる');
    await clickText(page,'指の形からえらぶ'); await clickText(page,'はじめる');
    await next(page); await next(page); await next(page);
    await page.locator('.grid-cell').nth(1).click();
    const fingerMelody=(await read()).melody;
    await page.locator('#steps button').first().click(); await clickText(page,'もどる');
    await clickText(page,'調からえらぶ');
    assert.deepEqual((await read()).melody,keyMelody,'調の曲を復元');
    await page.reload({waitUntil:'networkidle'});
    await clickText(page,'指の形からえらぶ');
    assert.deepEqual((await read()).melody,fingerMelody,'再読み込み後に指の曲を復元');
    await clickText(page,'調からえらぶ');
    assert.deepEqual((await read()).melody,keyMelody,'往復後も調の曲が残る');
    await context.close();
  }
  assert.deepEqual(errors, [], `JavaScript errors: ${errors.join('\n')}`);
  console.log(`v3 E2E passed; screenshots: ${shots}`);
} finally { await browser.close(); }
