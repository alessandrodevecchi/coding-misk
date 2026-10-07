// Saves or checks peak levels per instrument for every scene of every built-in track (dev server on :5173).
// Usage: PLAYWRIGHT_CORE=... node tools/snapshot-levels.cjs write | check [track-id …]
// Snapshot: tests/snapshots/levels.json. A level differs when it moves by more than TOL (absolute).
// Two runs on unchanged code agree within TOL for every instrument except fx.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'tests', 'snapshots', 'levels.json');
const TOL = 0.12, FLOOR = 0.03;
// crash and riser (fx) depend on where the short measuring window falls in the scene: recorded, not compared
const SKIP = new Set(['fx']);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const [mode, ...only] = process.argv.slice(2);
if (!['write', 'check'].includes(mode)) { console.error('usage: node tools/snapshot-levels.cjs write | check [track-id …]'); process.exit(2); }

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto('http://localhost:5173/'); await sleep(5000);
  // generated endless songs (songs/endless/, git-ignored) change with every run: no snapshots
  const ids = only.length ? only : (await page.$$eval('#track-pick option', os => os.map(o => o.value).filter(Boolean))).filter(id => !id.startsWith('endless-'));
  const old = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : {};
  const out = mode === 'write' && only.length ? { ...old } : {};
  let failed = 0;
  for (const id of ids) {
    if (!(await page.$(`#track-pick option[value="${id}"]`))) continue;
    await page.locator('#track-pick').selectOption(id); await page.click('#play'); await sleep(1500);
    const n = await page.locator('.arr-scene-btn').count();
    const scenes = [];
    for (let i = 0; i < n; i++) {
      await page.click(`[data-scene-i="${i}"]`); await sleep(1200);
      scenes.push(await page.evaluate(async () => {
        const ed = document.querySelector('strudel-editor').editor, mx = {};
        for (let k = 0; k < 40; k++) {
          for (const a of Object.keys(window.analysers)) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); }
          await new Promise(r => setTimeout(r, 50));
        }
        const lv = {};
        for (const [a, v] of Object.entries(mx)) lv[a] = Math.round(v * 100) / 100;
        return { name: document.getElementById('sc-name').value, err: String(ed.repl.state.evalError || ''), lv };
      }));
    }
    await page.click('#stop'); await sleep(300);
    const lv = scenes.map(s => Object.fromEntries(Object.entries(s.lv).filter(([, v]) => v >= FLOOR)));
    const errs = scenes.filter(s => s.err).map(s => `${s.name}: ${s.err}`);
    if (mode === 'write') { out[id] = scenes.map((s, i) => ({ name: s.name, levels: lv[i] })); console.log(`${id}: ${n} scenes${errs.length ? ' ERRORS ' + errs.join('; ') : ''}`); continue; }
    const ref = old[id];
    const diffs = [...errs.map(e => `error ${e}`)];
    if (!ref) diffs.push('no snapshot');
    else if (ref.length !== n) diffs.push(`scenes ${ref.length} -> ${n}`);
    else ref.forEach((r, i) => {
      for (const a of new Set([...Object.keys(r.levels), ...Object.keys(lv[i])])) {
        if (SKIP.has(a)) continue;
        const x = r.levels[a] || 0, y = lv[i][a] || 0;
        if (Math.abs(x - y) > TOL) diffs.push(`${r.name} ${a} ${x.toFixed(2)} -> ${y.toFixed(2)}`);
      }
    });
    console.log(diffs.length ? `DIFF  ${id}\n  ${diffs.join('\n  ')}` : `ok    ${id}`);
    if (diffs.length) failed++;
  }
  await browser.close();
  if (mode === 'write') { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(out, null, 1) + '\n'); console.log(`wrote ${FILE}`); }
  else console.log(failed ? `${failed} track(s) differ` : 'all levels match');
  process.exit(failed ? 1 : 0);
})();
