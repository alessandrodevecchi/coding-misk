// Browser checks for the song's own configuration (song-own-settings): a trial on one song leaves the others as
// written (kellerlicht plays its written 4:50 with the Live build off), the trial survives a reload and is marked in
// Compose and on its Songs card, ↺ Original configuration goes back, Save and Save as new write it, ↺ Original song (the
// built-in song as it was) clears it; both ↺ sit side by side in the song actions, disabled when there is nothing to restore.
// The narrator switch (profile-options): "Narrator voice" next to "Fully narrated", part of the trial, Fully narrated
// disabled with its hint while it is off, kept after a reload; the same chip in the radio's Custom section.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-song-config.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
const PORT = process.env.PORT || 5173;
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); });
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  const compose = async () => { await page.click('[data-tab="componi"]'); await sleep(300); };
  const songs = async () => { await page.click('[data-tab="brani"]'); await sleep(500); };
  const open = async id => { await compose(); await page.selectOption('#track-pick', id); await sleep(1200); };
  const trials = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-song-trials') || '{}'));
  const library = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-library') || '{"tracks":[]}'));
  const state = () => page.evaluate(() => ({
    live: document.querySelector('#live-toggle').getAttribute('aria-pressed'),
    profile: (document.querySelector('#live-profile [aria-checked="true"]') || {}).dataset?.profile || null,
    marked: !document.querySelector('#cfg-changed').hidden,
    reset: document.querySelector('#cfg-reset').getAttribute('aria-disabled') !== 'true',
    orig: document.querySelector('#tr-del').getAttribute('aria-disabled') !== 'true',
    total: document.querySelector('#arr-total').textContent,
  }));
  const timeOf = txt => (txt.match(/(\d+:\d\d)/) || [])[1] || '';
  const card = id => page.evaluate(id => { const el = document.querySelector(`#songs [data-song-id="${id}"]`); return el ? { len: el.querySelector('.song-len').textContent, marked: !!el.querySelector('.cfg-changed'), reset: !!el.querySelector('[data-act="cfg-reset"]') } : null; }, id);
  const pick = async id => { await page.click(`#live-profile [data-profile="${id}"]`); await sleep(1500); };

  // a trial on another song never reaches kellerlicht
  await open('luci-rosse');
  await page.click('#live-toggle'); await sleep(400);
  await pick('crescendo');
  let tr = await trials();
  check(Object.keys(tr).join() === 'luci-rosse' && tr['luci-rosse'].profile === 'crescendo', 'a Compose change is a trial on the open song only', JSON.stringify(tr));
  // the narrator switch: on by default, off is part of the trial, Fully narrated disabled with a hint
  const narr = () => page.evaluate(() => { const a = document.querySelector('#live-narrator'), b = document.querySelector('#live-narrated'); return { on: a.getAttribute('aria-pressed'), shown: !a.hidden && a.offsetParent !== null, next: a.nextElementSibling === b, full: b.disabled, tip: b.title, label: a.textContent }; });
  let n = await narr();
  check(n.on === 'true' && n.shown && n.next && !n.full && n.label === 'Narrator voice', 'Narrator voice: on by default, next to Fully narrated, which is enabled', JSON.stringify(n));
  await page.click('#live-narrator'); await sleep(1200);
  n = await narr(); tr = await trials();
  check(n.on === 'false' && n.full && /Narrator voice on/.test(n.tip), 'Narrator voice off: Fully narrated disabled with its hint', JSON.stringify(n));
  check(tr['luci-rosse'] && tr['luci-rosse'].options && tr['luci-rosse'].options.narrator === false, 'the narrator off is part of the trial', JSON.stringify(tr));
  if (shots) { const box = await page.evaluate(() => { const r = document.querySelector('#live-narrator').closest('.ctrl').getBoundingClientRect(); return { x: Math.max(0, r.left - 16), y: Math.max(0, r.top + scrollY - 16), width: Math.min(1440 - Math.max(0, r.left - 16), r.width + 32), height: r.height + 32 }; }); await page.screenshot({ path: path.join(shots, 'narrator-off.png'), fullPage: true, clip: box }); }
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]');
  await open('luci-rosse');
  n = await narr();
  check(n.on === 'false' && n.full, 'after a reload the narrator is still off on luci-rosse', JSON.stringify(n));
  await page.click('#live-narrator'); await sleep(1200);
  n = await narr(); tr = await trials();
  check(n.on === 'true' && !n.full && !('narrator' in ((tr['luci-rosse'] || {}).options || {})), 'Narrator voice on again: Fully narrated enabled, the option leaves the trial', JSON.stringify(tr));
  await open('kellerlicht');
  let s = await state();
  check(s.live === 'false' && !s.marked && timeOf(s.total) === '4:50', 'kellerlicht after a trial on another song: Live build off, written 4:50, not marked', JSON.stringify(s));
  check(await page.evaluate(() => document.querySelector('#live-narrated').hidden || document.querySelector('#live-narrated').getAttribute('aria-pressed') === 'false'), 'kellerlicht has no narrator');
  await songs();
  let c = await card('kellerlicht');
  check(c && timeOf(c.len) === '4:50' && !c.marked, 'kellerlicht card: 4:50, not marked', JSON.stringify(c));
  c = await card('luci-rosse');
  check(c && c.marked && c.reset, 'the card of the tried song shows the mark and ↺', JSON.stringify(c));

  // Live coder on kellerlicht: marked in Compose and on the card, its card length with the trial
  await open('kellerlicht');
  await page.click('#live-toggle'); await sleep(400);
  await pick('switch');
  s = await state();
  check(s.profile === 'switch' && s.marked, 'Live coder tried on kellerlicht: marked in Compose', JSON.stringify(s));
  const tip = await page.getAttribute('#cfg-reset', 'title');
  check(/saved song does not change/.test(tip || ''), 'the ↺ has its tooltip', tip);
  check(await page.evaluate(() => { const a = document.querySelector('#tr-del'), b = document.querySelector('#cfg-reset'); return a.parentElement === b.parentElement && a.parentElement.classList.contains('actions') && a.nextElementSibling === b && !!a.querySelector('svg.ico-reset') && !!b.querySelector('svg.ico-reset') && /Original song/.test(a.textContent) && /Original configuration/.test(b.textContent); }), 'both ↺ side by side in the song actions, same drawn icon: Original song, Original configuration');
  check(s.reset && !s.orig, 'a configuration trial alone: ↺ Original configuration enabled, ↺ Original song disabled', JSON.stringify(s));
  // the song in Compose grows away, then shows its grown length
  for (let i = 0; i < 40 && timeOf((await state()).total) === '4:50'; i++) await sleep(500);
  const composeLen = timeOf((await state()).total);
  if (shots) { const box = await page.evaluate(() => { const a = document.querySelector('#tr-del').closest('.actions').getBoundingClientRect(), b = document.querySelector('.live-profiles').getBoundingClientRect(); return { x: 0, y: Math.max(0, a.top + scrollY - 120), width: 1440, height: b.bottom - a.top + 160 }; }); await page.screenshot({ path: path.join(shots, 'compose-trial.png'), fullPage: true, clip: box }); }
  await songs();
  let len = '';
  for (let i = 0; i < 60; i++) { c = await card('kellerlicht'); len = timeOf(c.len); if (len !== '4:50') break; await sleep(500); }
  check(c.marked && len && len !== '4:50', 'kellerlicht card: marked, length with the trial', c.len);
  check(len === composeLen, 'the card and Compose show the same length', `${len} | ${composeLen}`);
  if (shots) { const el = await page.$('#songs [data-song-id="kellerlicht"]'); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: path.join(shots, 'songs-card-trial.png') }); }

  // the trial survives a reload
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]');
  await open('kellerlicht');
  s = await state();
  check(s.profile === 'switch' && s.marked, 'after a reload kellerlicht still plays as Live coder, marked', JSON.stringify(s));

  // ↺ in Compose goes back to the song's own configuration
  await page.click('#cfg-reset'); await sleep(1200);
  s = await state(); tr = await trials();
  check(s.live === 'false' && !s.marked && timeOf(s.total) === '4:50' && !tr.kellerlicht, '↺ in Compose: kellerlicht as written again, no mark', JSON.stringify(s));
  check(tr['luci-rosse'], 'the other song keeps its trial');
  check(!s.reset && !s.orig && /saved song does not change/.test(await page.getAttribute('#cfg-reset', 'title')) && /Back to the built-in song/.test(await page.getAttribute('#tr-del', 'title')), 'nothing to restore: both ↺ disabled, tooltips still there', JSON.stringify(s));

  // the Live build off (profile-options): the panel keeps the code options under "Code", the profile, build style,
  // typing and narrator controls hide; a code option is a trial and the song keeps its written length
  const panel = () => page.evaluate(() => { const vis = sel => { const el = document.querySelector(sel); return !!el && !el.closest('[hidden]') && el.offsetParent !== null; }; return { legend: document.querySelector('#live-legend').textContent, profiles: vis('#live-profile'), style: vis('#live-style'), comments: vis('#live-comments'), fns: vis('#live-fns'), lanes: vis('#live-f-fnLanes'), title: vis('#live-title'), human: vis('#live-human'), narrator: vis('#live-narrator') }; });
  let pn = await panel();
  check(pn.legend === 'Code' && !pn.profiles && !pn.style && pn.comments && pn.fns && pn.lanes && pn.title && !pn.human && !pn.narrator, 'Live build off: the panel shows the code options only, under "Code"', JSON.stringify(pn));
  await page.selectOption('#live-fns', 'compact'); await sleep(1500);
  s = await state(); tr = await trials();
  check(s.live === 'false' && s.marked && s.reset && !s.orig && timeOf(s.total) === '4:50' && tr.kellerlicht, 'compact functions with the Live build off: a trial, same length, only ↺ Original configuration', JSON.stringify(s));
  if (shots) { const box = await page.evaluate(() => { const r = document.querySelector('#live-style-wrap').getBoundingClientRect(); return { x: Math.max(0, r.left - 16), y: Math.max(0, r.top + scrollY - 16), width: Math.min(1440, r.width + 32), height: r.height + 32 }; }); await page.screenshot({ path: path.join(shots, 'code-options-live-off.png'), fullPage: true, clip: box }); }
  await page.click('#cfg-reset'); await sleep(1200);

  // the narrator off: no phrase over the stage while luci-rosse grows (its trial: Crescendo, the narrator on again)
  const sayFor = async ms => { const seen = new Set(); for (let t = 0; t < ms; t += 250) { const x = await page.evaluate(() => { const el = document.querySelector('#say'); return el.classList.contains('on') ? el.textContent : ''; }); if (x) seen.add(x); await sleep(250); } return [...seen]; };
  await open('luci-rosse');
  await page.click('#play'); let said = await sayFor(14000); await page.click('#stop'); await sleep(500);
  check(said.length > 0, 'narrator on: the phrase shows over the stage', JSON.stringify(said));
  await page.click('#live-narrator'); await sleep(1500);
  await page.click('#play'); said = await sayFor(14000); await page.click('#stop'); await sleep(500);
  check(said.length === 0, 'narrator off: no phrase over the stage', JSON.stringify(said));

  // ↺ on the card
  await songs();
  await page.click('#songs [data-song-id="luci-rosse"] [data-act="cfg-reset"]'); await sleep(600);
  c = await card('luci-rosse'); tr = await trials();
  check(!c.marked && !tr['luci-rosse'], '↺ on the card takes the trial back', JSON.stringify(c));

  // a trial that turns the Live build off is marked next to the switch
  await open('switch-test-breve');
  await page.click('#live-toggle'); await sleep(800);
  s = await state();
  check(s.live === 'false' && s.marked && s.reset && await page.isVisible('#cfg-reset'), 'Live build turned off as a trial: the panel closes, the mark and ↺ stay in the song actions', JSON.stringify(s));
  await page.click('#cfg-reset'); await sleep(800);
  s = await state();
  check(s.live === 'true' && !s.marked, '↺ turns the Live build back on for a song saved with it on', JSON.stringify(s));

  // Save as new with a Live coder trial: the copy plays as Live coder, kellerlicht stays as written
  await open('kellerlicht');
  await page.click('#live-toggle'); await sleep(400);
  await pick('switch');
  await page.click('#tr-saveas'); await sleep(1200);
  let lib = await library(); tr = await trials();
  const copy = lib.tracks.find(x => x.id !== 'kellerlicht' && /Kellerlicht/.test(x.title));
  check(copy && copy.config && copy.config.profile === 'switch' && copy.config.live === true, 'Save as new: the copy has the configuration', JSON.stringify(copy && copy.config));
  check(!lib.tracks.some(x => x.id === 'kellerlicht') && !tr.kellerlicht && !tr[copy && copy.id], 'kellerlicht unchanged, no trial left', JSON.stringify(tr));
  s = await state();
  check(s.profile === 'switch' && !s.marked, 'the copy opens as Live coder, not marked', JSON.stringify(s));
  await open('kellerlicht');
  s = await state();
  check(s.live === 'false' && timeOf(s.total) === '4:50', 'kellerlicht still as written after Save as new', JSON.stringify(s));

  // Save on the owner's song writes the trial as its own configuration
  await open(copy.id);
  await pick('crescendo');
  await page.click('#tr-save'); await sleep(800);
  lib = await library(); tr = await trials();
  const saved = lib.tracks.find(x => x.id === copy.id);
  check(saved.config.profile === 'crescendo' && !tr[copy.id] && !(await state()).marked, 'Save: the trial becomes the song\'s configuration', JSON.stringify(saved.config));

  // a built-in song: Save makes the owner's version with the configuration, Restore original brings it back and clears a trial
  await open('kellerlicht');
  await page.click('#live-toggle'); await sleep(400);
  await pick('crescendo');
  await page.click('#tr-save'); await sleep(800);
  lib = await library();
  const own = lib.tracks.find(x => x.id === 'kellerlicht');
  check(own && own.config && own.config.profile === 'crescendo', 'Save on a built-in song: the owner\'s version with the configuration', JSON.stringify(own && own.config));
  const rtip = await page.getAttribute('#tr-del', 'title');
  check(/Back to the built-in song as it was/.test(rtip || ''), 'Restore original has its tooltip', rtip);
  await pick('switch');
  check((await trials()).kellerlicht, 'a trial on the owner\'s version');
  await page.click('#tr-del'); await sleep(300);
  await page.click('.sv-confirm [data-confirm-ok]'); await sleep(1200);
  lib = await library(); tr = await trials(); s = await state();
  check(!lib.tracks.some(x => x.id === 'kellerlicht') && !tr.kellerlicht && s.live === 'false' && !s.marked && timeOf(s.total) === '4:50', 'Restore original: the built-in song back as written, its trial cleared', JSON.stringify(s));

  // the radio's Custom section: the same chip, Fully narrated disabled while it is off
  await page.click('[data-tab="radio"]'); await sleep(800);
  await page.selectOption('#radio-profile', 'custom'); await sleep(600);
  if (await page.isHidden('#custom-body')) { await page.click('#custom-toggle'); await sleep(300); }
  const rnarr = () => page.evaluate(() => { const a = document.querySelector('[data-custom-chip="narrator"]'), b = document.querySelector('[data-custom-chip="narrated"]'); return a && b ? { on: a.getAttribute('aria-pressed'), next: a.nextElementSibling === b, full: b.disabled, tip: b.title } : null; });
  let rn = await rnarr();
  check(rn && rn.on === 'true' && rn.next && !rn.full, 'radio Custom: Narrator voice on, next to Fully narrated', JSON.stringify(rn));
  await page.click('[data-custom-chip="narrator"]'); await sleep(500);
  rn = await rnarr();
  check(rn && rn.on === 'false' && rn.full && /Narrator voice on/.test(rn.tip), 'radio Custom: Narrator voice off, Fully narrated disabled with its hint', JSON.stringify(rn));
  if (shots) { const el = await page.$('#radio-custom'); if (el) await el.screenshot({ path: path.join(shots, 'radio-custom-narrator-off.png') }); }
  await page.click('[data-custom-chip="narrator"]'); await sleep(300);

  check(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
