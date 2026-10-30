// Browser check of the light app theme (light-theme): every tab and the main panels in LIGHT, at desktop and phone
// width, with a contrast probe of every visible text against its computed background, a search for dark patches
// (dark-only fixed colours left in the light page) and for dark canvases outside the stage. With --theme neon or hw it
// takes the same pictures in that theme; with --compare <dir> it compares them pixel by pixel with an earlier run
// (neon and hardware must stay as they were).
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-light-theme.cjs [shots-dir] [--theme light|neon|hw]
//        [--lang it|en] [--static] [--compare <dir>] [--only scene,scene] [--widths 1300,400]   (dev server on PORT)
// --static: only the scenes without playback (the pictures are then deterministic, for --compare).
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const shots = args[0] && !args[0].startsWith('--') ? args[0] : null;
const theme = opt('--theme', 'light'), lang = opt('--lang', 'it'), compare = opt('--compare', null), only = opt('--only', null);
const widths = opt('--widths', '1300,400').split(',').map(Number), still = args.includes('--static');
if (shots) fs.mkdirSync(shots, { recursive: true });
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// parts that imitate a device keep a dark inner screen in light (design D3): not dark patches
const DEVICE = ['.stagewrap', '.comp-lcd', '.sb-scr', '.sb-rim', '.sb-well', '.sb-door', '.sb-dark', '.soul-sock', '.soul-tab',
  '.video-prev', '.vid-preview', '.fm-prev', '.sb-pad', '.knob', '.onair-bar.on', '.pb-onair.on', '.rec-btn', '.sb-modal', '.sb-photo',
  '.sb-art', '.vswitch .vs-lamp', '.onair.on', '.soul-display', '.sd-shell'];

// the probe, in the page: { bad: [...], dark: [...], canvases: [...], skipped }
function probe(DEVICE) {
  const parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const over = (top, bot) => ({ r: top.r * top.a + bot.r * (1 - top.a), g: top.g * top.a + bot.g * (1 - top.a), b: top.b * top.a + bot.b * (1 - top.a), a: 1 });
  const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const device = el => DEVICE.some(s => el.closest(s));
  const visible = el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]'); };
  // the background under an element: the colours of its ancestors composited, or null when an image or gradient is in the way
  const bgOf = el => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none' && !/^url/.test(cs.backgroundImage)) return null;
      const c = parse(cs.backgroundColor);
      if (c && c.a > 0) { layers.push(c); if (c.a >= 1) break; }
    }
    let out = { r: 255, g: 255, b: 255, a: 1 };
    if (!layers.length || layers[layers.length - 1].a < 1) out = parse(getComputedStyle(document.body).backgroundColor) || out;
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  };
  const opacityOf = el => { let o = 1; for (let e = el; e; e = e.parentElement) o *= +getComputedStyle(e).opacity; return o; };
  const label = el => { let s = el.tagName.toLowerCase(); if (el.id) s += `#${el.id}`; else if (el.className && typeof el.className === 'string') s += `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`; const p = el.parentElement && el.parentElement.closest('[id]'); return p ? `${p.id} ${s}` : s; };
  const bad = [], dark = [], canvases = [];
  let skipped = 0, seen = 0;
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || el.closest('svg') || el.closest('#edhost') || el.closest('option')) continue;
    const cs = getComputedStyle(el);
    // a dark patch: an opaque dark fill outside the stage and the device screens
    const c = parse(cs.backgroundColor);
    const r = el.getBoundingClientRect();
    // (lines such as the playhead are not patches)
    if (c && c.a > 0.5 && !device(el) && r.width * r.height > 300 && Math.min(r.width, r.height) >= 6) {
      const b = bgOf(el);
      if (b && lum(b) < 0.03) dark.push({ el: label(el), bg: cs.backgroundColor, size: `${Math.round(r.width)}x${Math.round(r.height)}` });
    }
    if (el.tagName === 'CANVAS' && !device(el) && el.id !== 'stage' && r.width * r.height > 2000) {
      try {
        const ctx = el.getContext('2d'); const d = ctx && ctx.getImageData(0, 0, el.width, el.height).data;
        if (d) { let s = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 97) { if (d[i + 3] < 128) continue; s += lum({ r: d[i], g: d[i + 1], b: d[i + 2] }); n++; } if (n && s / n < 0.08 && n > 20) canvases.push({ el: label(el), mean: +(s / n).toFixed(3) }); }
      } catch (e) { /* webgl or tainted */ }
    }
    // text: an element with its own text
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own) continue;
    if (el.closest(':disabled, [aria-disabled="true"], .disabled')) continue;
    if (cs.color === 'rgba(0, 0, 0, 0)' || cs.webkitTextFillColor === 'rgba(0, 0, 0, 0)' || /transparent/.test(cs.webkitTextFillColor)) { skipped++; continue; }
    const bg = bgOf(el);
    if (!bg) { skipped++; continue; }
    seen++;
    const fg = parse(cs.color); if (!fg) continue;
    const op = opacityOf(el); if (op < 0.15) continue;   // faded out (a comment between two steps)
    fg.a *= op;
    const rt = ratio(over(fg, bg), bg), size = parseFloat(cs.fontSize), large = size >= 24 || (size >= 18.6 && +cs.fontWeight >= 700);
    const need = large ? 3 : 4.5;
    if (rt < need) bad.push({ el: label(el), text: el.textContent.trim().slice(0, 30), ratio: +rt.toFixed(2), need, fg: cs.color, bg: `rgb(${Math.round(bg.r)},${Math.round(bg.g)},${Math.round(bg.b)})` });
  }
  return { bad, dark, canvases, skipped, seen };
}

// compare two PNG files in the page: the count of pixels that differ
async function diff(page, a, b) {
  const A = fs.readFileSync(a).toString('base64'), B = fs.readFileSync(b).toString('base64');
  return page.evaluate(async ([A, B]) => {
    const load = s => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = `data:image/png;base64,${s}`; });
    const [x, y] = await Promise.all([load(A), load(B)]);
    if (x.width !== y.width || x.height !== y.height) return { size: `${x.width}x${x.height} vs ${y.width}x${y.height}`, n: -1 };
    const px = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
    const p = px(x), q = px(y); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let k = 0; k < p.length; k += 4) if (Math.abs(p[k] - q[k]) + Math.abs(p[k + 1] - q[k + 1]) + Math.abs(p[k + 2] - q[k + 2]) > 24) {
      n++; const i = k / 4, X = i % x.width, Y = Math.floor(i / x.width); x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
    return { n, box: n ? `${x0},${y0} to ${x1},${y1}` : '' };
  }, [A, B]);
}

const SCENES = [
  { id: 'componi', tab: 'componi' },
  { id: 'componi-nuovo', tab: 'componi', go: async p => { await p.click('#tr-new'); await sleep(400); } },
  { id: 'componi-traccia', tab: 'componi', go: async p => { await p.click('#arr-grid [data-trk="0"]'); await sleep(500); } },
  { id: 'brani', tab: 'brani' },
  { id: 'playlist', tab: 'playlist' },
  { id: 'radio', tab: 'radio' },
  { id: 'artisti', tab: 'artisti' },
  { id: 'stili', tab: 'stili' },
  { id: 'generi', tab: 'generi' },
  { id: 'suoni', tab: 'suoni' },
  { id: 'voci', tab: 'voci', go: async p => { await p.$eval('[data-vt-sub="mine"]', el => el.click()); await sleep(300); await p.$eval('[data-ph-new]', el => el.click()); await sleep(300); } },
  { id: 'voci-vocabolari', tab: 'voci', go: async p => { await p.$eval('[data-vt-sub="vocab"]', el => el.click()); await sleep(400); } },
  { id: 'voci-voci', tab: 'voci', go: async p => { await p.$eval('[data-vt-sub="voices"]', el => el.click()); await sleep(2500); } },
  { id: 'voci-campioni', tab: 'voci', go: async p => { await p.$eval('[data-vt-sub="samples"]', el => el.click()); await sleep(2500); } },
  { id: 'pattern', tab: 'pattern' },
  { id: 'guida', tab: 'guida' },
  { id: 'lezioni', tab: 'lezioni' },
  { id: 'riferimenti', tab: 'riferimenti' },
  { id: 'impostazioni', settings: true },
  { id: 'componi-suona', tab: 'componi', play: true, go: async p => { await p.click('#play'); await sleep(6000); } },
  { id: 'radio-in-onda', tab: 'radio', play: true, go: async p => { await p.fill('#radio-seed', 'light-check'); await p.click('#radio-start'); await sleep(6000); } },
];
const LAB = new Set(['artisti', 'stili', 'generi', 'suoni', 'voci', 'pattern', 'guida', 'lezioni', 'riferimenti']);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const totals = { bad: 0, dark: 0, canvases: 0 };
  for (const width of widths) {
    const phone = width < 600;
    const ctx = await browser.newContext({ viewport: { width, height: phone ? 860 : 1000 }, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const scenes = SCENES.filter(s => (!still || !s.play) && (!only || only.split(',').includes(s.id)));
    for (const s of scenes) {
      await page.goto(`http://localhost:${PORT}/`); await sleep(1200);
      await page.evaluate(([ui, lang]) => { localStorage.clear(); localStorage.setItem('coding-misk-ui', JSON.stringify(ui)); localStorage.setItem('coding-misk-lang', lang); }, [theme, lang]);
      await page.reload(); await sleep(3500);
      if (s.settings) await page.click('#open-settings');
      else { await page.click(`[data-mode="${LAB.has(s.tab) ? 'lab' : 'ascolta'}"]`); await page.click(`[data-tab="${s.tab}"]`); }
      await sleep(600);
      if (s.go) await s.go(page);
      await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.querySelectorAll('.toast').forEach(t => { t.hidden = true; }); window.scrollTo(0, 0); });
      await sleep(300);
      const ui = await page.evaluate(() => document.documentElement.dataset.ui);
      if (ui !== theme) check(false, `${s.id} @${width}: theme ${theme}`, ui);
      const tag = `${s.id}-${phone ? 'telefono' : 'desktop'}`;
      if (shots) {
        // the stage, the readouts and the top bar (its theme buttons changed with light-theme)
        const mask = [page.locator('#stage'), page.locator('.bar'), page.locator('#readout'), page.locator('#pbar')];
        await page.screenshot({ path: path.join(shots, `${tag}.png`), fullPage: !s.play, animations: 'disabled', caret: 'hide', mask: still ? mask : [] });
        // Settings gained the light theme rows (their card grows): not compared
        if (compare && !s.settings && fs.existsSync(path.join(compare, `${tag}.png`))) {
          const d = await diff(page, path.join(shots, `${tag}.png`), path.join(compare, `${tag}.png`));
          check(d.n >= 0 && d.n <= 300, `${tag}: same as before (up to 300 pixels of noise)`, d.size || `${d.n} pixels differ${d.box ? ` in ${d.box}` : ''}`);
        }
      }
      if (theme === 'light') {
        const r = await page.evaluate(probe, DEVICE);
        totals.bad += r.bad.length; totals.dark += r.dark.length; totals.canvases += r.canvases.length;
        check(!r.bad.length, `${tag}: text contrast (${r.seen} texts, ${r.skipped} over images)`, r.bad.slice(0, 8).map(b => `${b.el} "${b.text}" ${b.ratio}<${b.need} ${b.fg} on ${b.bg}`).join('; '));
        check(!r.dark.length, `${tag}: no dark patches`, r.dark.slice(0, 8).map(d => `${d.el} ${d.bg} ${d.size}`).join('; '));
        check(!r.canvases.length, `${tag}: no dark canvases outside the stage`, r.canvases.map(c => `${c.el} ${c.mean}`).join('; '));
        // the text over the stage stays light on the dark stage
        const hud = await page.evaluate(() => { const el = document.getElementById('looks'); const c = getComputedStyle(el).color; return c; });
        check(/^rgb\((2[0-9]{2}), (2[0-9]{2}), (2[0-9]{2})\)/.test(hud), `${tag}: look menu light on the stage`, hud);
      }
      if (s.play) await page.evaluate(() => { const r = globalThis.codingMiskRadio; if (r && r.on) document.getElementById('radio-start').click(); const st = document.getElementById('stop'); if (st) st.click(); });
    }
    check(!errors.length, `no page errors @${width}`, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  if (theme === 'light') console.log(`totals: ${totals.bad} low contrast texts, ${totals.dark} dark patches, ${totals.canvases} dark canvases`);
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
