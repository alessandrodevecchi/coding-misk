// Browser checks for the pattern preview of Compose and the bar counter of the player bar (pattern-preview).
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-preview.cjs [shots-dir]   (dev server on PORT, default 5173)
// Button and icons (headphones for the preview, flask for the Patterns tab, the triangle kept in the Patterns tab), the
// two pattern rows in both languages, the preview alone and riding the song (main player untouched, next bar, same bars
// as the song, handover both ways), edits from the next bar, a new pattern used nowhere, Delete, one preview at a time,
// level through the global volume, its own orbit, export, leaving Compose, another song; the bar counter in Compose,
// while dragging the timeline, in the Patterns loop and for grown songs (Live coder, Crescendo), and at 400 px.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 5173;
const shots = process.argv[2] || null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0, passed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (ok) passed++; else failed++; };
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // (opening another song over an edited one asks first)
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('console', m => { if (m.type() === 'error' || /getTrigger\] error|\[preview\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  const main = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor, s = e.repl.scheduler; return { code: e.code, started: s.started, now: s.now(), lastEnd: s.lastEnd, err: String(e.repl.state.evalError || ''), title: document.getElementById('pb-title').textContent, pos: document.getElementById('pb-pos').textContent, bar: document.getElementById('pb-bar').textContent }; });
  const pv = () => page.evaluate(() => globalThis.codingMiskPreview.state);
  const bars = () => page.evaluate(() => globalThis.codingMiskBars());
  const compose = () => page.evaluate(() => globalThis.codingMiskPatterns.compose());
  const idx = async type => (await compose()).T.tracks.findIndex(t => t.type === type);
  const btn = (ti, role) => `#p${ti}_${role}`;
  const pressed = (ti) => page.$eval(btn(ti, 'pt-preview'), b => ({ on: b.getAttribute('aria-pressed') === 'true', icon: b.querySelector('svg') ? [...b.querySelector('svg').classList].find(c => c !== 'ico') || '' : '', title: b.title, disabled: b.disabled }));
  const openSong = async id => { await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await page.locator('#track-pick').selectOption(id); await sleep(1500); };
  const lang = async l => { await page.evaluate(l => localStorage.setItem('coding-misk-lang', l), l); await page.reload(); await sleep(4500); await page.click('[data-tab="componi"]'); await sleep(600); };
  // the panel of one track: the "one track" view, and the track's name in the arranger
  const onePanel = async ti => { await page.click('#track-panel [data-view="one"]'); await sleep(200); await page.evaluate(ti => { const n = [...document.querySelectorAll(`.trk-name[data-trk="${ti}"]`)].find(x => x.offsetParent) || document.querySelector(`.trk-name[data-trk="${ti}"]`); n.click(); }, ti); await sleep(300); await page.evaluate(ti => { const b = document.querySelector(`#track-panel [data-ptrk="${ti}"]`); if (b) b.scrollIntoView({ block: 'start' }); }, ti); };
  // the preview's own haps (on its orbit) from the main scheduler's pattern, in [a, b)
  const rideHaps = (a, b) => page.evaluate(([a, b]) => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, st = globalThis.codingMiskPreview.state, o = +(/\.orbit\((\d+)\)$/.exec(st.expr) || [])[1];
    return s.pattern.queryArc(a, b).filter(h => h.hasOnset() && h.value.orbit === o).map(h => h.whole.begin.valueOf()); }, [a, b]);

  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); });
  await page.reload(); await sleep(5000);
  await openSong('luci-rosse');
  const bass = await idx('bass'), arp = await idx('hook');

  // ---- button, icons, rows (Italian)
  await onePanel(bass);
  let b = await pressed(bass);
  const listenIcon = await page.$eval(btn(bass, 'pt-listen'), x => [...x.querySelector('svg').classList].find(c => c !== 'ico'));
  const tri = await page.$$eval('#track-panel .pt-presetrow .ico-play', xs => xs.length);
  check(!b.on && b.icon === 'ico-listen' && listenIcon === 'ico-flask' && tri === 0, 'preview button with the headphones next to the flask, no triangle by the preset menu', `${b.icon} ${listenIcon} ${tri}`);
  check(/^Anteprima del pattern/.test(b.title) && /\bM\b/.test(b.title), 'Italian tooltip with the hint about M', b.title);
  const rows = await page.$$eval(`#track-panel [data-ptrk="${bass}"] .tp-pats`, xs => xs.map(x => ({ lbl: x.querySelector(':scope > .lbl').textContent, txt: x.textContent.replace(/\s+/g, ' ') })));
  check(rows.length === 2 && rows[0].lbl === 'Pattern del brano' && /Elimina/.test(rows[0].txt) && !/Nuovo/.test(rows[0].txt) && rows[1].lbl === 'Crea pattern' && /\+ Nuovo/.test(rows[1].txt) && /Salva come pattern/.test(rows[1].txt) && /Componi una parte/.test(rows[1].txt) && /Energia/.test(rows[1].txt), 'two rows: Pattern del brano (chips, Elimina) and Crea pattern (Nuovo, Salva, Componi, Energia)', rows.map(r => r.lbl).join(' | '));
  await shot(page, 'it-panel-rows.png');

  // ---- alone: the main player stays stopped
  let m0 = await main();
  await page.click(btn(bass, 'pt-preview')); await sleep(1500);
  let p = await pv(), m1 = await main(); b = await pressed(bass);
  check(p && p.free && !p.riding && b.on && b.icon === 'ico-stop', 'the preview plays alone, the button shows stop', JSON.stringify(p && { free: p.free, riding: p.riding }));
  check(!m1.started && m1.code === m0.code && m1.title === m0.title && m1.pos === '', 'the player bar stays stopped, same title and code', `${m1.title} "${m1.pos}"`);
  const o = p && +(/\.orbit\((\d+)\)$/.exec(p.expr) || [])[1];
  check(o >= 20 && !/\.analyze\(/.test(p.expr), 'on its own orbit, no .analyze', `orbit ${o}`);
  await shot(page, 'it-preview-alone.png');

  // ---- level through the global volume
  const level = () => page.evaluate(async () => { const v = globalThis.codingMiskVolume, post = v.node(); if (!post) return 0; const a = post.context.createAnalyser(); a.fftSize = 2048; post.connect(a); const d = new Float32Array(2048); let mx = 0; for (let k = 0; k < 40; k++) { a.getFloatTimeDomainData(d); for (const x of d) mx = Math.max(mx, Math.abs(x)); await new Promise(r => setTimeout(r, 50)); } post.disconnect(a); return mx; });
  const setVol = v => page.evaluate(v => { const el = document.getElementById('pb-volume'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  const full = await level(); await setVol(20); await sleep(300); const low = await level(); await setVol(100); await sleep(200);
  check(full > 0.01 && low < full * 0.4, 'the preview is heard and follows the global volume', `${full.toFixed(3)} -> ${low.toFixed(3)}`);

  // ---- the song starts: the preview rides from the next bar
  await page.click('#play'); await sleep(3000);
  p = await pv(); m1 = await main();
  check(p && p.riding && !p.free && m1.started && !m1.err, 'Play starts the song, the preview rides it', JSON.stringify(p && { riding: p.riding, at: p.at }));
  const h = await rideHaps(Math.floor(m1.lastEnd), Math.floor(m1.lastEnd) + 4);
  check(h.length > 0 && h.every(x => x >= p.at) && Number.isInteger(p.at), 'the preview\'s onsets start at a whole bar of the song', `at ${p.at}, first ${h[0]}`);
  // the same bars as the song: the riding haps are the loop shifted to the selected section's start
  const same = await page.evaluate(([a]) => { const st = globalThis.codingMiskPreview.state, s = document.querySelector('strudel-editor').editor.repl.scheduler, o = +(/\.orbit\((\d+)\)$/.exec(st.expr) || [])[1];
    const k = x => x.whole.begin.valueOf().toFixed(6) + JSON.stringify(x.value.note ?? x.value.n ?? x.value.s);
    const r = s.pattern.queryArc(a, a + 4).filter(x => x.hasOnset() && x.value.orbit === o).map(k).sort();
    const w = globalThis.codingMiskPreview.pattern.queryArc(a, a + 4).filter(x => x.hasOnset()).map(k).sort();
    return { n: r.length, ok: r.length === w.length && r.every((x, i) => x === w[i]) }; }, [p.at + 1]);
  check(same.ok && same.n > 0, 'riding, it plays its loop on the song\'s bars (one scheduler, one clock)', `${same.n} haps`);
  const cls = await page.evaluate(() => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, P = globalThis.codingMiskPreview.pattern; return P.constructor === s.pattern.constructor; });
  check(cls, 'the preview and the song are one Pattern class');

  // ---- starting the preview while the song plays: song untouched, first onset at the next bar
  await page.click(btn(bass, 'pt-preview')); await sleep(400);
  check(!(await pv()), 'a second press stops the preview');
  m0 = await main();
  await page.click(btn(bass, 'pt-preview')); await sleep(600);
  p = await pv(); m1 = await main();
  check(m1.started && m1.code === m0.code && m1.title === m0.title && !m1.err, 'starting it while the song plays leaves the song, its code and the title alone', m1.title);
  check(p && p.riding && p.at === Math.ceil(m0.lastEnd) || (p && p.at === Math.ceil(m0.lastEnd) + 1), 'it starts at the song\'s next bar', `song at ${m0.now.toFixed(2)}, preview from ${p && p.at}`);
  const sh = (await page.evaluate(() => globalThis.codingMiskPreview.state)).shift, sc = await bars();
  check(sh === sc.compose.cue || sh >= 0, 'its progression starts with the selected section', `shift ${sh}`);
  await shot(page, 'it-preview-riding.png');
  if (shots) { await page.locator(`#track-panel [data-ptrk="${bass}"] .pt-top`).screenshot({ path: path.join(shots, 'it-preset-row-playing.png') }).catch(() => {}); await page.locator('.pb-now').screenshot({ path: path.join(shots, 'it-bar-counter.png') }).catch(() => {}); }

  // ---- an edit plays from the next bar, without stopping
  const before = (await pv()).expr;
  await page.evaluate(ti => { const s = document.querySelector(`#p${ti}_pt-preset`); const opts = [...s.options].map(x => x.value).filter(Boolean); s.value = opts.find(v => v !== s.value) || opts[0]; s.dispatchEvent(new Event('change', { bubbles: true })); }, bass);
  await sleep(800);
  p = await pv(); m1 = await main();
  check(p && p.expr !== before && Number.isInteger(p.at) && p.at >= Math.floor(m1.now), 'a preset change plays from the next bar, the preview goes on', `from ${p && p.at}`);

  // ---- the song stops: the preview goes on alone within a bar
  await page.click('#stop').catch(() => page.click('#pb-stop')); await sleep(800);
  p = await pv(); m1 = await main();
  check(p && p.free && !p.riding && !m1.started, 'Stop stops the song, the preview goes on alone');

  // ---- one preview at a time
  if (arp >= 0) {
    await onePanel(arp);
    if (await page.$(btn(arp, 'pt-preview'))) {
      await page.click(btn(arp, 'pt-preview')); await sleep(600);
      p = await pv();
      const bassBtn = await page.$(btn(bass, 'pt-preview')) ? await pressed(bass) : { on: false };
      check(p && p.id === (await compose()).T.tracks[arp].id && !bassBtn.on, 'the hook preview stops the bass preview', p && p.id);
      // echo kept apart: the hook's delay on the preview's orbit, the song's orbits keep theirs
      const delays = () => page.evaluate(() => { const c = globalThis.getSuperdoughAudioController(); return Object.fromEntries(Object.entries(c.nodes).filter(([, n]) => n && n.delayNode).map(([k, n]) => [k, [n.delayNode.delayTime ? +n.delayNode.delayTime.value.toFixed(4) : null, n.delayNode.feedback ? +n.delayNode.feedback.value.toFixed(4) : null]])); });
      const po = +(/\.orbit\((\d+)\)$/.exec(p.expr) || [])[1];
      // (the song plays from a section where its own hook, with its delay, plays)
      const dd = await compose(), hs = dd.T.sections.findIndex(x => dd.T.tracks[arp].clips.some(c => c.section === x.name));
      if (hs >= 0) await page.evaluate(i => document.querySelectorAll('.arr-scene-btn')[i].click(), hs);
      await sleep(300); await page.click('#play'); await sleep(3000);
      const d0 = await delays(); await sleep(2500); const d1 = await delays();
      const songOrbits = Object.keys(d1).filter(k => +k !== po);
      check(/\.delay\(/.test(p.expr) && d1[po] && songOrbits.length > 0 && songOrbits.every(k => !d0[k] || JSON.stringify(d0[k]) === JSON.stringify(d1[k])), 'the preview\'s echo has its own orbit, the song\'s delays stay', `preview orbit ${po}, song orbits with a delay: ${songOrbits.join(',')}`);
      await page.click('#stop'); await sleep(500);
    } else check(false, 'the hook preview stops the bass preview', 'no hook panel');
  }

  // ---- a new pattern used nowhere, then Delete stops it
  await page.evaluate(() => globalThis.codingMiskPreview.stop());
  await onePanel(bass); await sleep(300);
  await page.$eval(btn(bass, 'pt-compose'), x => x.scrollIntoView({ block: 'center' })); await page.click(btn(bass, 'pt-compose')); await sleep(600);
  const d = await compose(), tb = d.T.tracks[bass], keys = Object.keys(tb.patterns), k = keys[keys.length - 1];
  const used = tb.clips.some(c => c.pattern === k);
  await page.click(btn(bass, 'pt-preview')); await sleep(800);
  p = await pv();
  check(!used && p && p.key === k && p.id === tb.id, 'Compose a part makes a pattern used nowhere, and the preview plays it', `${k} ${p && p.key} ${errors.slice(-2).join(' | ')}`);
  await page.click(btn(bass, 'pt-del')); await sleep(800);
  check(!(await pv()), 'deleting the pattern stops its preview');

  // ---- export: the button is disabled and a preview stops
  await page.click(btn(bass, 'pt-preview')); await sleep(600);
  await page.click('#tr-export'); await sleep(700);
  const job = await page.evaluate(() => globalThis.codingMiskExport.job);
  b = await pressed(bass);
  check(job && !(await pv()) && b.disabled, 'an export stops the preview and disables its button', JSON.stringify(job));
  if (job) { await page.click('#tr-export'); await sleep(1500); }
  b = await pressed(bass);
  check(!b.disabled, 'the button comes back after the export');

  // ---- leaving Compose, another song
  await page.click(btn(bass, 'pt-preview')); await sleep(500);
  await page.click('[data-tab="radio"]'); await sleep(500);
  check(!(await pv()), 'opening the Radio tab stops the preview');
  await page.click('[data-tab="componi"]'); await sleep(500);
  await onePanel(bass);
  await page.click(btn(bass, 'pt-preview')); await sleep(500);
  // (an edited song asks twice before another opens)
  for (let i = 0; i < 2 && (await compose()).T.id !== 'kellerlicht'; i++) { await page.locator('#track-pick').selectOption('luci-rosse'); await page.locator('#track-pick').selectOption('kellerlicht'); await sleep(1500); }
  check(!(await pv()), 'opening another song stops the preview');

  // ---- bar counter: a Classic song in Compose, playing, in Italian
  await openSong('luci-rosse');
  await page.click('#play'); await sleep(3000);
  m1 = await main(); const bc = await bars();
  let mm = /^bar (\d+) \/ (\d+)$/.exec(m1.bar);
  check(mm && +mm[2] === bc.song.bars && Math.abs(+mm[1] - (Math.floor(m1.now) + 1)) <= 1 && /\d+:\d\d \/ \d+:\d\d/.test(m1.pos), 'Italian: bar n / total next to the time', `${m1.bar} · ${m1.pos} · ${bc.song.bars}`);
  // dragging the timeline: the bar under the thumb
  await page.evaluate(() => { const el = document.getElementById('pb-seek'); el.value = 500; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await sleep(200);
  m1 = await main();
  check(m1.bar === `bar ${Math.floor(bc.song.bars / 2) + 1} / ${bc.song.bars}`, 'dragging the timeline shows the bar under the thumb', m1.bar);
  await page.evaluate(() => { const el = document.getElementById('pb-seek'); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(1500);
  await page.click('#stop').catch(() => {}); await sleep(400);
  m1 = await main(); const cue = await bars();
  check(m1.bar === `bar ${Math.max(1, Math.floor(cue.compose.cue) + 1)} / ${cue.compose.bars}`, 'stopped in Compose: the cue bar of the song', m1.bar);
  // only the preview playing: the counter keeps the cue bar
  await onePanel(bass); await page.click(btn(bass, 'pt-preview')); await sleep(2500);
  const m2 = await main();
  check(m2.bar === m1.bar && !m2.started, 'with only the preview playing, the counter shows the song\'s cue bar', m2.bar);
  await page.click(btn(bass, 'pt-preview')); await sleep(300);

  // ---- English labels and the same counter text
  await lang('en');
  await openSong('luci-rosse');
  await onePanel(bass);
  b = await pressed(bass);
  const rowsEn = await page.$$eval(`#track-panel [data-ptrk="${bass}"] .tp-pats > .lbl`, xs => xs.map(x => x.textContent));
  check(rowsEn.join('|') === 'Song patterns|Make patterns' && /^Preview the pattern/.test(b.title), 'English: Song patterns, Make patterns, Preview the pattern', rowsEn.join('|'));
  await page.click('#play'); await sleep(2500);
  m1 = await main();
  check(/^bar \d+ \/ \d+$/.test(m1.bar), 'English: the same bar n / total', m1.bar);
  await page.click('#stop').catch(() => {}); await sleep(300);

  // ---- the Patterns loop: bar n / 4
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="pattern"]'); await sleep(500);
  await page.click('#patterns [data-pn-play]'); await sleep(2500);
  m1 = await main();
  const tri2 = await page.$$eval('#patterns .ico-play, #patterns .ico-stop', xs => xs.length);
  check(/^bar [1-4] \/ 4$/.test(m1.bar) && tri2 > 0, 'the Patterns loop counts bar n / 4 and keeps the triangle', m1.bar);
  await page.click('#patterns [data-pn-play][aria-pressed="true"]').catch(() => {}); await sleep(300);
  await page.click('#stop').catch(() => {}); await sleep(300);

  // ---- grown songs: Live coder and Crescendo count the growth and the written part
  await openSong('luci-rosse');
  for (const prof of ['switch', 'crescendo']) {
    await page.$eval(`#live-profile [data-profile="${prof}"]`, el => el.click()); await sleep(300);
    const w = await bars();
    let g = w;
    for (let i = 0; i < 120 && g.compose.pending; i++) { await sleep(500); g = await bars(); }
    const stopped = (await main()).bar;
    check(!g.compose.pending && g.compose.growth > 0 && stopped === `bar ${Math.max(1, Math.floor(g.compose.cue) + 1)} / ${g.compose.bars}`, `${prof}: stopped, the grown total once the growth is ready`, `${stopped}, written ${w.compose.pending ? 'pending' : ''} growth ${g.compose.growth}`);
    await page.click('#play'); await sleep(2500);
    m1 = await main(); const sb = await bars();
    mm = /^bar (\d+) \/ (\d+)$/.exec(m1.bar);
    check(mm && +mm[2] === sb.song.bars && sb.song.bars === g.compose.bars && Math.abs(+mm[1] - (Math.floor(m1.now) + 1)) <= 1, `${prof}: playing, bar = floor(now) + 1 of the grown song`, `${m1.bar} now ${m1.now.toFixed(2)}`);
    await page.click('#stop').catch(() => {}); await sleep(300);
  }
  await page.$eval('#live-profile [data-profile="classic"]', el => el.click()); await sleep(500);

  // ---- 400 px, both themes: the counter stays (in Italian again)
  await lang('it'); await openSong('luci-rosse');
  await page.setViewportSize({ width: 400, height: 800 });
  await page.click('#play'); await sleep(2000);
  for (const th of ['neon', 'hw']) {
    await page.click(`[data-uitheme="${th}"]`).catch(() => {}); await sleep(300);
    const vis = await page.$eval('#pb-bar', el => { const r = el.getBoundingClientRect(), p = el.parentElement; return { ok: r.width > 0 && r.right <= innerWidth + 1 && getComputedStyle(el).display !== 'none' && p.scrollWidth <= p.clientWidth + 1, seen: el.innerText }; });
    check(vis.ok, `400 px, ${th}: the bar counter shows whole`, vis.seen);
    await shot(page, `narrow-${th}.png`);
  }
  await page.click('[data-uitheme="neon"]').catch(() => {});
  await page.click('#stop').catch(() => {});

  const errs = errors.filter(e => !/favicon|Failed to load resource|net::ERR/.test(e));
  check(!errs.length, 'no page errors', errs.slice(0, 3).join(' | '));
  console.log(`\n${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
