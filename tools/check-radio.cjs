// Browser checks for the radio (#22): tab, controls, determinism against the director, song changes,
// options from the next song, exclusive playback, history, save, open in Compose, replay.
// Usage: PLAYWRIGHT_CORE=... node tools/check-radio.cjs [--long minutes]   (dev server on :5173)
// --long plays the radio for that many minutes with three styles and chaos 1, reporting every song change.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), long = args.includes('--long') ? +args[args.indexOf('--long') + 1] : 0;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

(async () => {
  const { createSession } = await import('../src/endless/director.js');
  const { loadStyles } = await import('./styles-dir.mjs');
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const R = () => page.evaluate(() => { const r = globalThis.codingMiskRadio; return { on: r.on, paused: r.paused, state: r.state, history: r.history.map(h => ({ title: h.title, n: h.n })), options: r.options }; });
  const ed = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now() }; });
  const levels = () => page.evaluate(async () => { const mx = {}; for (let k = 0; k < 30; k++) { for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); } await new Promise(r => setTimeout(r, 50)); } return Object.entries(mx).filter(([, v]) => v > .02).map(([a, v]) => `${a}=${v.toFixed(2)}`).join(' '); });
  const pick = async ids => {
    for (const id of ids) if (await page.getAttribute(`[data-style="${id}"]`, 'aria-pressed') !== 'true') await page.click(`[data-style="${id}"]`);
    for (const id of await page.$$eval('#tab-radio [data-style][aria-pressed="true"]', xs => xs.map(x => x.dataset.style))) if (!ids.includes(id)) await page.click(`[data-style="${id}"]`);
  };
  const setRange = (k, v) => page.evaluate(([k, v]) => { const el = document.getElementById(`radio-${k}`); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, [k, v]);

  await page.goto('http://localhost:5173/'); await sleep(5000);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);

  // tab and controls
  check(await page.locator('#tab-radio [data-style]').count() === loadStyles().length, 'radio tab shows every style');
  check(!(await ed()).started, 'nothing plays before start');
  check(await page.locator('#stagewrap').isVisible() && (await page.locator('#looks option').count()) > 1, 'stage on top with every visual');
  await pick(['jazz']);
  await page.click('[data-style="jazz"]'); await sleep(200);
  check(await page.getAttribute('[data-style="jazz"]', 'aria-pressed') === 'true', 'the last style cannot be unselected');
  await pick(['synthwave', 'country']); await setRange('chaos', 0.7);
  await page.reload(); await sleep(5000); await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  const o = (await R()).options;
  check(o.styles.join() === 'country,synthwave' || o.styles.join() === 'synthwave,country', 'controls kept after reload', JSON.stringify(o));
  check(o.chaos === 0.7, 'chaos kept after reload');

  // determinism: same songs as the director with seed aurora
  await pick(['berlin-techno']); await setRange('chaos', 0.3);
  await page.fill('#radio-seed', 'aurora');
  await page.click('#radio-start'); await sleep(6000);
  let r = await R();
  const ses = createSession(loadStyles(), 'aurora'), base = { styles: ['berlin-techno'], chaos: 0.3, energy: 0.6, complexity: 0.5 };
  const want1 = ses.next(base).song;
  check(r.on && r.state.seed === 'aurora' && r.state.stream[0].id === want1.id && r.state.stream[0].title === want1.title, 'first song equals the command line', `${r.state.stream[0].title} vs ${want1.title}`);
  const card = await page.innerText('#radio-now');
  check(card.includes(want1.title) && card.includes(`${want1.sections[0].bpm} BPM`), 'now playing card shows the song on air');
  check(!(await ed()).err, 'no evaluation error at start');

  // pause and resume from the same bar
  await sleep(2000);
  const onAirBefore = (await R()).state.onAir;
  await page.click('#radio-pause'); await sleep(300);
  const pausedAt = (await R()).state.paused;
  await sleep(2500);
  check(!(await ed()).started && typeof pausedAt === 'number', 'pause stops the sound and keeps the bar', `bar ${pausedAt}`);
  await page.click('#radio-pause'); await sleep(1500);
  const after = await ed(), rs = await R();
  check(after.started && rs.state.onAir === onAirBefore && after.cyc >= pausedAt && after.cyc < pausedAt + 1.5 && !after.err, 'resume goes on from the same bar of the same song', `paused ${pausedAt.toFixed(2)}, now ${after.cyc.toFixed(2)}`);
  // tooltips on every control
  const noTip = await page.$$eval('#tab-radio button, #tab-radio input', xs => xs.filter(x => !x.title && !x.closest('[title]')).map(x => x.id || x.dataset.style || x.className));
  check(!noTip.length, 'every radio control has a tooltip', noTip.join(', '));

  // options from the next song: raise energy now, then skip
  await setRange('energy', 0.9);
  const before = (await R()).state.stream[0];
  await page.click('#radio-skip'); await sleep(5000);
  r = await R();
  const want2 = ses.next({ ...base, energy: 0.9 }).song;
  check(r.state.stream[0].id === before.id && r.state.stream[0].title === before.title, 'the song on air was not changed by the control');
  check(r.state.onAir === 1 && r.state.stream[1].title === want2.title, 'skip: next song made with the new energy', `${r.state.stream[1] && r.state.stream[1].title} vs ${want2.title}`);
  check(r.state.recipe.changes.some(c => c.song === 1 && c.options.energy === 0.9), 'the change is recorded in the session recipe');
  const e1 = await ed();
  check(!e1.err && e1.cyc >= r.state.stream[1].start, 'the next song plays after skip, no evaluation error', `bar ${e1.cyc.toFixed(1)}, start ${r.state.stream[1].start}`);
  await sleep(6000);
  check((await levels()).length > 0, 'sound after skip', await levels());

  // a vary and a swap on air (radio-variation 3.3): the song plays them at their bar, no evaluation error, below clipping
  {
    const steered = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s.song.build.filter(x => x.by && x.pattern).map(x => ({ at: x.at, to: x.pattern.to })); });
    // the middle of the song, where more parts play; the first part each button accepts
    { const it = (await R()).state; await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(it.stream[it.onAir].bars / 2)); await sleep(800); }
    // (on two different parts: a swap of the varied part at the same bar would replace the vary)
    const done = {};
    for (const kind of ['vary', 'swap']) for (const type of ['lead', 'bass', 'arp', 'pad']) {
      if (Object.values(done).includes(type)) continue;
      await page.click(`#radio-steer [data-vary-part="${type}"]`); await sleep(150);
      if (await page.$eval(`#radio-steer [data-cmd="${kind}"]`, b => b.disabled)) continue;
      await page.click(`#radio-steer [data-cmd="${kind}"]`); await sleep(300);
      done[kind] = type;
      break;
    }
    const st = await steered(), last = Math.max(0, ...st.map(x => x.at));
    check(done.vary && st.some(x => /^V\d+$/.test(x.to)) && (!done.swap || st.some(x => /^S\d+$/.test(x.to))), 'a vary and a swap are queued on the song on air', `${JSON.stringify(done)} ${JSON.stringify(st)}`);
    const start = (await R()).state.stream[(await R()).state.onAir].start;
    for (let k = 0; k < 120 && (await ed()).cyc < start + last + 1.5; k++) await sleep(250);
    const e = await ed(), lv = await levels();
    const top = Math.max(0, ...lv.split(' ').filter(Boolean).map(x => +x.split('=')[1]));
    check(!e.err && e.cyc >= start + last + 1, 'the varied and swapped parts play without evaluation errors', `bar ${(e.cyc - start).toFixed(1)}, last step ${last} ${e.err.slice(0, 100)}`);
    check(lv.length > 0 && top < 1, 'sound below clipping after the vary and swap', lv);
  }

  // the voice of each song comes from its voice style, with its own speaker
  {
    const voiceBank = () => page.evaluate(() => (document.querySelector('strudel-editor').editor.code.match(/s\("(say_[a-z_]+)"\)/) || [])[1] || '');
    const banks = {};
    for (const style of ['industrial', 'country']) {
      await page.click('#radio-start'); await sleep(500);
      await pick([style]); await page.fill('#radio-seed', `voice-${style}`); await page.click('#radio-start');
      for (let k = 0; k < 20 && !banks[style]; k++) { await sleep(1000); banks[style] = await voiceBank(); }
    }
    check(banks.industrial && banks.country && banks.industrial !== banks.country, 'two styles speak with different speakers', JSON.stringify(banks));
    await page.click('#radio-start'); await sleep(500);
    await pick(['berlin-techno']); await page.fill('#radio-seed', 'aurora'); await page.click('#radio-start'); await sleep(5000);
    for (let i = 0; i < 1; i++) { await page.click('#radio-skip'); await sleep(3000); }
  }

  // three song changes in a row
  const startAir = (await R()).state.onAir;
  for (let i = 0; i < 3; i++) { await page.click('#radio-skip'); await sleep(4000); }
  r = await R(); const e2 = await ed();
  check(r.state.onAir === startAir + 3 && !e2.err, 'three more song changes without errors', `on air ${r.state.onAir}`);
  check(r.history.length >= 5 && r.history[0].title === r.state.stream[r.state.onAir].title, 'history lists the songs heard, newest first');

  // replay gives the same songs
  const titles = r.state.stream.slice(0, 3).map(x => x.title);
  await page.click('#radio-replay'); await sleep(5000);
  await page.click('#radio-skip'); await sleep(3000); await page.click('#radio-skip'); await sleep(3000);
  r = await R();
  check(r.state.stream.slice(0, 3).map(x => x.title).join('|') === titles.join('|'), 'replay plays the same songs with the recorded change', `${r.state.stream.slice(0, 3).map(x => x.title).join('|')} vs ${titles.join('|')}`);

  // save and open in Compose
  const libBefore = await page.evaluate(() => (JSON.parse(localStorage.getItem('coding-misk-library') || '{"tracks":[]}').tracks || []).length);
  await page.click('#radio-save'); await sleep(300);
  const libAfter = await page.evaluate(() => (JSON.parse(localStorage.getItem('coding-misk-library') || '{"tracks":[]}').tracks || []).length);
  check(libAfter === libBefore + 1, 'save adds the song to the library');
  const saved = await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('coding-misk-library')).tracks; return l[l.length - 1]; });
  check(saved.origin === 'endless' && saved.tags && saved.tags.styles.length > 0, 'a saved song keeps its generated label and style tags', JSON.stringify(saved.tags));
  const onAir = r.state.stream[r.state.onAir];
  await page.click('#radio-open'); await sleep(1500);
  r = await R();
  const name = await page.inputValue('#sc-name'), title = await page.inputValue('#track-title');
  check(!r.on && title === onAir.title && await page.isVisible('#tab-componi'), 'open in Compose stops the radio and opens the song', `${title} · ${name}`);
  await page.click('#play'); await sleep(5000);
  check(!(await ed()).err && (await ed()).started, 'the opened song plays in Compose');

  // exclusive playback
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await page.click('#radio-start'); await sleep(4000);
  check((await R()).on, 'radio on again');
  await page.click('#play'); await sleep(1000);
  check((await R()).paused && (await R()).on, 'the header pause pauses the radio');
  await page.click('#play'); await sleep(2000);
  check(!(await R()).paused && (await ed()).started, 'the header play resumes the radio');
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await page.click('[data-song-card="0"] [data-act="play"]'); await sleep(2500);
  check(!(await R()).on && (await ed()).started, 'Compose playback stops the radio');
  await page.click('#stop'); await sleep(500);

  // by hand the song on air is held past its end; resume starts the next song on the next bar
  {
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]');
    if ((await R()).on) await page.click('#radio-start');
    await pick(['lo-fi']); await page.fill('#radio-seed', 'hand'); await page.click('#radio-start'); await sleep(4000);
    await page.click('#edhost .cm-line >> nth=0'); await page.keyboard.press('End'); await page.keyboard.type(' mine'); await sleep(300);
    let h = await R();
    const cur = h.state.stream[0], end = cur.start + cur.bars;
    check(await page.isVisible('#hand-tag'), 'radio: typing takes over');
    for (let k = 0; k < 400 && (await ed()).cyc < end + 1.5; k++) await sleep(1000);
    h = await R();
    check(h.state.onAir === 0 && (await ed()).started, 'radio: by hand the song on air is held past its end', `bar ${(await ed()).cyc.toFixed(1)}, end ${end}`);
    // option off: the song on air ended meanwhile, so the next one starts
    if ((await page.getAttribute('#hand-from', 'aria-pressed')) === 'true') await page.click('#hand-from');
    await page.click('#hand-resume'); await sleep(4000);
    h = await R(); const e = await ed();
    check(h.state.onAir === 1 && !(await page.isVisible('#hand-tag')) && !e.err && e.cyc >= h.state.stream[1].start, 'radio: resume after the end starts the next song', `on air ${h.state.onAir}, start ${h.state.stream[1] && h.state.stream[1].start}`);
    await page.click('#radio-start'); await sleep(500);
  }

  // radio-profiles stage 4: a Live coder session. The song on air grows in its own view, the next one plays hidden on
  // its own orbits and appears whole when it goes on air; a replay grows the same songs; a recipe saved before the
  // growth marker plays in blocks; the Custom profile shows its own code
  {
    const code = () => page.evaluate(() => document.querySelector('strudel-editor').editor.code || '');
    const heads = (c, n) => c.split('\n').filter(l => l.startsWith(`// ========== ${n} `)).length;
    // the orbits of the events about to play (the hidden song's are 20 and up)
    const orbitsAhead = () => page.evaluate(() => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, c = s.now(); return [...new Set(s.pattern.queryArc(c, c + 2).filter(h => h.hasOnset()).map(h => h.value.orbit))].sort((a, b) => a - b); });
    const waitFor = async (fn, ms = 30000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await fn()) return true; await sleep(300); } return false; };
    await pick(['berlin-techno']); await setRange('chaos', 0.3);
    await page.selectOption('#radio-transition', 'mix'); await page.selectOption('#radio-profile', 'switch'); await page.selectOption('#radio-incoming', 'profile');
    await page.fill('#radio-seed', 'coder'); await page.click('#radio-start');
    await waitFor(async () => (await R()).on, 20000); await sleep(3000);
    r = await R();
    const s0 = r.state.stream[0];
    check(s0.profile === 'switch' && s0.grown && s0.shape && s0.show === 'air', 'Live coder session: the first song grows as Live coder', JSON.stringify({ profile: s0.profile, grown: s0.grown, shape: s0.shape }));
    check(r.state.recipe.growth === 1 && r.state.recipe.options.profile === 'switch', 'the recipe records the growth marker and the profile');
    const pl = await page.innerText('.radio-profile-now');
    check(/^Live coder · .+ · .+ · .+$/.test(pl.trim()), 'now playing shows the profile and the growth shape', pl);
    let e = await ed();
    check(!e.err && e.started, 'Live coder on air: no evaluation error', e.err.slice(0, 120));
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(s0.bars * 0.45));
    const prepared = await waitFor(async () => { const st = (await R()).state; return st.stream.length > 1 && !st.stream[1].growing; }, 60000);
    r = await R();
    const s1 = r.state.stream[1];
    check(prepared && s1.grown && s1.show === 'hidden', 'the next Live coder song grows away from the page and is hidden', JSON.stringify(s1 && { grown: s1.grown, show: s1.show, growing: s1.growing }));
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), s1.start - s0.start + 2); await sleep(2500);
    e = await ed(); const c1 = await code(), ob = await orbitsAhead();
    check(!e.err && heads(c1, 1) > 0 && heads(c1, 2) === 0, 'during the transition the panel holds only the song on air', `song 1 lines ${heads(c1, 1)}, song 2 lines ${heads(c1, 2)}, ${e.err.slice(0, 80)}`);
    check(ob.some(o => o >= 20) && ob.some(o => o < 20), 'the incoming song plays hidden on its own orbits', `orbits ${ob.join(',')}`);
    const on1 = await waitFor(async () => (await R()).state.onAir === 1, 60000);
    await sleep(1500);
    e = await ed(); const c2 = await code();
    check(on1 && !e.err && heads(c2, 2) > 0 && heads(c2, 1) === 0, 'the next song appears whole when it goes on air', `song 1 lines ${heads(c2, 1)}, song 2 lines ${heads(c2, 2)}`);
    // the incoming song in the panel: the visible option
    await page.selectOption('#radio-incoming', 'visible');
    r = await R();
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(r.state.stream[1].bars * 0.45));
    await waitFor(async () => { const st = (await R()).state; return st.stream.length > 2 && !st.stream[2].growing; }, 60000);
    r = await R();
    const s2 = r.state.stream[2];
    if (s2) {
      await page.evaluate(b => globalThis.codingMiskRadio.seek(b), s2.start - r.state.stream[1].start + 2); await sleep(2500);
      e = await ed(); const c3 = await code();
      check(!e.err && c3.includes('// ==> ') && heads(c3, 3) > 0, 'with the incoming song visible both songs are in the panel', `${e.err.slice(0, 80)}`);
    } else check(false, 'a third song prepared');
    await page.selectOption('#radio-incoming', 'profile');
    // replay: the same songs grow the same
    const recipe = r.state.recipe;
    await page.click('#radio-start'); await sleep(300);
    await page.evaluate(rc => globalThis.codingMiskRadio.start({ recipe: rc }), recipe); await sleep(5000);
    r = await R();
    check(r.state.stream[0].id === s0.id && r.state.stream[0].grown && JSON.stringify(r.state.stream[0].shape) === JSON.stringify(s0.shape) && r.state.stream[0].bars === s0.bars, 'replay grows the same first song');
    // a recipe saved before the growth marker: every song in blocks, as heard
    const old = { ...recipe }; delete old.growth;
    await page.click('#radio-start'); await sleep(300);
    await page.evaluate(rc => globalThis.codingMiskRadio.start({ recipe: rc }), old); await sleep(4000);
    r = await R(); e = await ed();
    check(r.state.stream[0].id === s0.id && !r.state.stream[0].grown && r.state.stream[0].profile === 'classic' && !e.err, 'a recipe without the growth marker replays in blocks');
    await page.click('#radio-start'); await sleep(300);
    // the Custom profile: no comments, functions at the mixer
    await page.selectOption('#radio-profile', 'custom'); await sleep(200);
    if (await page.getAttribute('#custom-toggle', 'aria-expanded') !== 'true') await page.click('#custom-toggle');
    await page.click('[data-custom-base="switch"]'); await sleep(100);
    await page.selectOption('[data-custom="comments"]', 'none'); await sleep(100);
    await page.selectOption('[data-custom="functions"]', 'mixer'); await sleep(100);
    const sum = await page.innerText('.custom-summary');
    await page.click('#custom-toggle'); await sleep(100);
    check(await page.getAttribute('#custom-toggle', 'aria-expanded') === 'false' && await page.isHidden('#custom-body') && (await page.innerText('.custom-summary')).length > 10, 'the Custom section folds to a summary', sum);
    await page.fill('#radio-seed', 'coder'); await page.click('#radio-start'); await sleep(6000);
    r = await R(); e = await ed(); const c4 = await code();
    check(r.state.recipe.options.custom && r.state.stream[0].grown && /Custom|Personalizzato/.test(await page.innerText('.radio-profile-now')) && !e.err, 'Custom profile: the songs grow with its controls, saved in the recipe');
    check(!c4.includes('// ========== ') && !/\.orbit\(/.test(c4), 'Custom profile: no comments and the buses in the hidden mixer');
    await page.click('#radio-start'); await sleep(300);
    await page.selectOption('#radio-profile', 'artist'); await sleep(200);
  }

  // history limit
  await page.evaluate(() => { const h = Array.from({ length: 50 }, (_, i) => ({ title: `old ${i}`, styles: ['jazz'], seed: 'x', n: i, at: new Date().toISOString(), song: null })); localStorage.setItem('coding-misk-radio-history', JSON.stringify(h)); });
  await page.reload(); await sleep(5000); await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await page.click('#radio-start'); await sleep(4000);
  r = await R();
  check(r.history.length === 50 && r.history[49].title === 'old 48', 'history keeps 50 songs and drops the oldest');
  await page.click('#radio-start'); await sleep(300);

  if (long) {
    await pick(['synthwave', 'jazz', 'country']); await setRange('chaos', 1); await setRange('energy', 0.6);
    await page.fill('#radio-seed', 'long'); await page.click('#radio-start');
    const t0 = Date.now(); let last = -1, changes = 0;
    while (Date.now() - t0 < long * 60000) {
      await sleep(2000);
      r = await R(); const e = await ed();
      if (e.err) { check(false, 'long run: evaluation error', e.err); break; }
      if (r.state.onAir !== last) {
        if (last >= 0) { changes++; await sleep(3000); console.log(`      song ${r.state.onAir + 1} "${r.state.stream[r.state.onAir].title}" from bar ${r.state.stream[r.state.onAir].start}: ${await levels()}`); }
        last = r.state.onAir;
      }
    }
    check(changes >= 1, `long run: ${changes} song changes in ${long} minutes without errors`);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
