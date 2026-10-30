// THROWAWAY PROTOTYPE glue for code-over-visual (mockups and test video only, not app code).
// Opens the app on the dev server (PORT, default 5239), sets song, profile, look, render and theme, injects overlay.js.
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = `http://localhost:${process.env.PORT || 5239}/`;
const OVERLAY = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8');

async function open({ width = 1920, height = 1080, video = null, lang = 'it' } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width, height }, ...(video ? { recordVideo: { dir: video, size: { width, height } } } : {}) });
  await ctx.addInitScript(l => { try { localStorage.setItem('coding-misk-lang', l); } catch (e) {} }, lang);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  await page.goto(URL); await sleep(6000);
  await page.mouse.click(700, 80); await sleep(300);
  return { browser, ctx, page, errors };
}
const ui = (page, t) => page.evaluate(t => document.querySelector(`[data-uitheme="${t}"]`).click(), t);
const look = (page, l) => page.evaluate(l => { const s = document.getElementById('looks'); s.value = l; s.dispatchEvent(new Event('change', { bubbles: true })); }, l);
const render = (page, r) => page.evaluate(r => { const s = document.getElementById('renders'); s.value = r; s.dispatchEvent(new Event('change', { bubbles: true })); }, r);
async function song(page, id, profile = 'switch') {
  await page.evaluate(() => { const b = document.getElementById('play'); if (b.getAttribute('aria-pressed') === 'true') b.click(); });
  await page.locator('#track-pick').selectOption(id); await sleep(1500);
  if (profile) {
    const on = await page.evaluate(() => document.getElementById('live-toggle').getAttribute('aria-pressed'));
    if (on !== 'true') { await page.evaluate(() => document.getElementById('live-toggle').click()); await sleep(1200); }
    await page.evaluate(p => { const b = document.querySelector(`#live-profile [data-profile="${p}"]`); if (b) b.click(); }, profile); await sleep(2500);
  }
}
async function play(page) { await page.evaluate(() => { const b = document.getElementById('play'); if (b.getAttribute('aria-pressed') !== 'true') b.click(); }); }
async function seek(page, v) { await page.evaluate(v => { const s = document.getElementById('pb-seek'); s.value = v; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); }, v); }
async function overlay(page, opts) { await page.evaluate(o => { window.__covOpts = o; }, opts || {}); await page.evaluate(OVERLAY); }
const set = (page, o) => page.evaluate(o => window.__cov.set(o), o);
const title = (page, s) => page.evaluate(s => window.__cov.title(s), s);
const now = page => page.evaluate(() => document.querySelector('strudel-editor').editor.repl.scheduler.now());
module.exports = { open, ui, look, render, song, play, seek, overlay, set, title, now, sleep };
