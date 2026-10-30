// THROWAWAY: mockup pictures of the "Code over" layout and the two widgets, drawn by overlay.js over the real app.
// usage: PLAYWRIGHT_CORE=… node shots.cjs <outdir> [wide|tall|all]
const L = require('./lib.cjs');
const fs = require('fs');
const OUT = process.argv[2], WHICH = process.argv[3] || 'all';
fs.mkdirSync(OUT, { recursive: true });
const P = f => `${OUT}/${f}`;

async function setup(page, s) {
  if (s.ui) await L.ui(page, s.ui);
  if (s.song) { await L.song(page, s.song); await L.play(page); await L.sleep(1500); await L.seek(page, s.seek || 450); await L.sleep(8000); }
  if (s.look) await L.look(page, s.look);
  if (s.render) await L.render(page, s.render);
  await L.set(page, s.cov || {});
  await L.sleep(s.wait || 2500);
}
async function crop(page, file, box, padX = 18, padY = 18) {
  if (!box) { console.log('no box for', file); return; }
  const [x, y, w, h] = box;
  await page.screenshot({ path: P(file), clip: { x: Math.max(0, x - padX), y: Math.max(0, y - padY), width: w + 2 * padX, height: h + 2 * padY } });
}
async function waitEdit(page, ms = 25000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await page.evaluate(() => window.__cov.editing() && !!window.__cov.boxes().edit)) return true; await L.sleep(60); }
  return false;
}
async function editShot(page, file) {
  if (!(await waitEdit(page))) { console.log('no edit for', file); return; }
  const b = await page.evaluate(() => window.__cov.boxes().edit);
  const vw = page.viewportSize().width;
  await page.screenshot({ path: P(file), clip: { x: 0, y: Math.max(0, b[1] - b[3] * 2.5), width: Math.round(vw * (vw > 1500 ? 0.66 : 1)), height: b[3] * 6 } });
}

async function wide() {
  const { browser, page, errors } = await L.open({ width: 1920, height: 1080 });
  await L.overlay(page, { theme: 'neon', area: 'left' });
  const box = k => page.evaluate(k => window.__cov.boxes()[k], k);
  await setup(page, { ui: 'neon', song: 'kellerlicht', look: 'palco', render: 'normal', cov: { theme: 'neon' } });
  await page.screenshot({ path: P('layout-16x9-neon-palco.png') });
  await editShot(page, 'edit-line-neon.png');
  await crop(page, 'outline-box.png', await box('chroma') && [60, 180, 1100, 520], 0, 0);
  await L.set(page, { outline: 'fill' }); await L.sleep(800);
  await crop(page, 'outline-fill.png', [60, 180, 1100, 520], 0, 0);
  await L.set(page, { outline: 'box' });
  // widget variants (kellerlicht, neon)
  const variants = [
    ['grid', 'widget-grid-16-blocks.png', { grid: { steps: 16, style: 'blocks', names: 'short', bars: 1 } }],
    ['grid', 'widget-grid-16-text.png', { grid: { style: 'text' } }],
    ['grid', 'widget-grid-8-names.png', { grid: { steps: 8, style: 'blocks', names: 'long' } }],
    ['grid', 'widget-grid-32-two-bars.png', { grid: { steps: 16, bars: 2, names: 'short', size: 0.8 } }],
    ['chroma', 'widget-chroma-default.png', { grid: { bars: 1, size: 1 }, chroma: {} }],
    ['chroma', 'widget-chroma-blocks-ramp.png', { chroma: { ramp: ' ░▒▓█' } }],
    ['chroma', 'widget-chroma-24-low-window.png', { chroma: { ramp: ' .:-=+*#%@', cols: 24, order: 'low', norm: 'window', decay: 0.6 } }],
    ['chroma', 'widget-chroma-no-labels.png', { chroma: { cols: 40, order: 'high', norm: 'column', decay: 0.25, labels: false, chord: false } }],
  ];
  for (const [k, f, o] of variants) { await L.set(page, o); await L.sleep(1800); await crop(page, f, await box(k)); }
  await L.set(page, { chroma: { labels: true, chord: true } });
  for (const [r, f, o] of [['led', 'render-led-16x9.png', {}], ['bit', 'render-1bit-16x9.png', {}], ['ascii', 'render-ascii-16x9.png', { grid: { style: 'text' } }], ['terminal', 'render-terminal-16x9.png', { grid: { style: 'text' } }]]) {
    await setup(page, { render: r, cov: o }); await page.screenshot({ path: P(f) });
  }
  await setup(page, { render: 'normal', cov: { grid: { style: 'blocks' } } });
  await setup(page, { ui: 'hw', song: 'settimo-cielo', look: 'tramonto', render: 'normal', cov: { theme: 'hw' } });
  await page.screenshot({ path: P('layout-16x9-hw-tramonto.png') });
  await editShot(page, 'edit-line-hw.png');
  await crop(page, 'widget-grid-hw.png', await box('grid'));
  await crop(page, 'widget-chroma-hw.png', await box('chroma'));
  await setup(page, { cov: { caption: '« la chitarra entra adesso »' } });
  await page.screenshot({ path: P('captions-16x9.png') });
  await setup(page, { ui: 'light', song: 'pioggia-sul-vetro', look: 'montagne', render: 'normal', cov: { theme: 'light', caption: '' } });
  await page.screenshot({ path: P('layout-16x9-light-montagne.png') });
  await editShot(page, 'edit-line-light.png');
  await crop(page, 'widget-grid-light.png', await box('grid'));
  await crop(page, 'widget-chroma-light.png', await box('chroma'));
  console.log('wide errors', errors.slice(0, 5));
  await browser.close();
}
async function tall() {
  const { browser, page, errors } = await L.open({ width: 1080, height: 1920 });
  await L.overlay(page, { theme: 'neon', area: 'full' });
  await setup(page, { ui: 'neon', song: 'kellerlicht', look: 'pixel', render: 'normal', cov: { theme: 'neon' } });
  await page.screenshot({ path: P('layout-9x16-neon-pixel.png') });
  await setup(page, { cov: { caption: '« basso e cassa, insieme »' } });
  await page.screenshot({ path: P('captions-9x16.png') });
  await setup(page, { render: 'terminal', cov: { caption: '', grid: { style: 'text' } } });
  await page.screenshot({ path: P('layout-9x16-neon-terminal.png') });
  await setup(page, { ui: 'hw', song: 'settimo-cielo', look: 'spazio', render: 'normal', cov: { theme: 'hw', grid: { style: 'blocks' } } });
  await page.screenshot({ path: P('layout-9x16-hw-spazio.png') });
  await setup(page, { ui: 'light', song: 'pioggia-sul-vetro', look: 'edgerunners', render: 'normal', cov: { theme: 'light' } });
  await page.screenshot({ path: P('layout-9x16-light-edgerunners.png') });
  console.log('tall errors', errors.slice(0, 5));
  await browser.close();
}
(async () => {
  if (WHICH !== 'tall') await wide();
  if (WHICH !== 'wide') await tall();
})().catch(e => { console.error(e); process.exit(1); });
