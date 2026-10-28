// Browser checks for the radio (#22): tab, controls, determinism against the director, song changes,
// options from the next song, display options on air from the next edit, exclusive playback, history, save, open in
// Compose, replay.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-radio.cjs [--long minutes]   (dev server on PORT, default 5173)
// --long plays the radio for that many minutes with three styles and chaos 1, reporting every song change.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const PORT = process.env.PORT || 5173;
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

  await page.goto(`http://localhost:${PORT}/`); await sleep(5000);
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
  // the bar counter of the player bar (pattern-preview): the bars of the song on air, in place of "bar n of total"
  { const e = await ed(), rs = (await R()).state, it = rs.stream[rs.onAir], txt = await page.innerText('#pb-bar'), pos = await page.innerText('#pb-pos'), m = /^bar (\d+) \/ (\d+)$/.exec(txt);
    check(m && +m[2] === it.bars && Math.abs(+m[1] - (Math.floor(e.cyc - it.start) + 1)) <= 1 && !/ of /.test(pos), 'the player bar counts the bars of the song on air', `${txt} · ${pos}`); }

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
  // (the spoken line is in the code shown only around its bar: live typing removes it on the way to the next step, about
  // a bar after a comment on bar 0, while the sound is unchanged; so the code is read every 0.2 s from the start)
  {
    const voiceBank = () => page.evaluate(() => (document.querySelector('strudel-editor').editor.code.match(/s\("(say_[a-z_]+)"\)/) || [])[1] || '');
    const banks = {};
    for (const style of ['industrial', 'country']) {
      await page.click('#radio-start'); await sleep(500);
      await pick([style]); await page.fill('#radio-seed', `voice-${style}`); await page.click('#radio-start');
      for (let k = 0; k < 100 && !banks[style]; k++) { banks[style] = await voiceBank(); if (!banks[style]) await sleep(200); }
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

  // the radio's Durata (new-song-panel phase 8): kept, sent to the director only when set, the song on air lasts it as
  // heard; a free growth in the Custom profile turns it off with its line; As the style sends nothing
  {
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]');
    if ((await R()).on) await page.click('#radio-start');
    await page.click('[data-song-length="medium"]'); await sleep(300);
    const o = (await R()).options, kept = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio')).length);
    check(kept === 'medium' && o.length === 'medium' && o.lengthHeard === true && /next songs/.test(await page.innerText('#radio-length-line')), 'Durata Media: kept, sent to the director, its line', JSON.stringify({ kept, length: o.length }));
    await page.selectOption('#radio-profile', 'switch'); await sleep(300);
    await pick(['synthwave']); await page.fill('#radio-seed', 'durata'); await page.click('#radio-start'); await sleep(6000);
    const d = await R(), it = d.state.stream[0], pos = await page.innerText('#pb-pos'), m = /\/\s*(\d+):(\d\d)/.exec(pos), sec = m ? +m[1] * 60 + +m[2] : NaN;
    check(d.state.recipe.options.length === 'medium' && it.grown && sec >= 180 - 40 && sec <= 240 + 40, 'a Live coder song on air with Media lasts 3 to 4 minutes, give or take a phrase', `${pos}, grown ${it.grown}`);
    await page.click('#radio-start'); await sleep(500);
    await page.selectOption('#radio-profile', 'custom'); await sleep(300);
    if ((await page.getAttribute('#custom-toggle', 'aria-expanded')) !== 'true') { await page.click('#custom-toggle'); await sleep(200); }
    const planned = await page.evaluate(() => { const s = document.querySelector('#radio-custom [data-custom="duration"]'); return s ? s.value : null; });
    await page.selectOption('#radio-custom [data-custom="duration"]', 'free'); await sleep(300);
    const o2 = (await R()).options;
    check(planned === 'planned' && !o2.length && await page.isVisible('#radio-target-off') && (await page.getAttribute('[data-song-length="style"]', 'aria-pressed')) === 'true', 'the Custom free growth turns the Durata off, with its line', JSON.stringify({ planned, length: o2.length }));
    await page.selectOption('#radio-profile', 'artist'); await sleep(300);
  }

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
    // (the Live coder shows only the title as comments, radio-profiles 9.2: the song in the panel is the one its first
    // line names; a song shown in Classic has its track names, "// ========== 3 bass ==========")
    const heads = (c, n) => c.split('\n').filter(l => l.startsWith(`// ========== ${n} `)).length;
    const names = (c, title) => c.split('\n')[0].startsWith('// coding-misk') && c.split('\n')[0].includes(title);
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
    // (growth marker 2 since commands on grown songs are waypoints, radio-profiles stage 5; 3 since they come in the
    // normal chooser's order)
    check(r.state.recipe.growth === 3 && r.state.recipe.options.profile === 'switch', 'the recipe records the growth marker and the profile');
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
    check(!e.err && names(c1, s0.title) && !c1.includes(s1.title) && !c1.includes('// ==> ') && !/^\/\/ ========== /m.test(c1), 'during the transition the panel holds only the song on air, with only its title as comments', `${c1.split('\n')[0]} ${e.err.slice(0, 80)}`);
    check(ob.some(o => o >= 20) && ob.some(o => o < 20), 'the incoming song plays hidden on its own orbits', `orbits ${ob.join(',')}`);
    const on1 = await waitFor(async () => (await R()).state.onAir === 1, 60000);
    await sleep(1500);
    e = await ed(); const c2 = await code();
    check(on1 && !e.err && names(c2, s1.title) && !c2.includes(s0.title) && /^\s*[_S]?\$:/m.test(c2), 'the next song appears whole when it goes on air', c2.split('\n')[0]);
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
    // reused-lines D5, D6: the growth shape settings of Settings, Advanced recorded with a new session; the first song
    // grows at once with the default search, the next one with the default search and then, when in time, the wider one
    await page.evaluate(() => { localStorage.setItem('coding-misk-shape-all', 'true'); localStorage.setItem('coding-misk-shape-keep', '"best"'); });
    await page.selectOption('#radio-profile', 'switch'); await sleep(200);
    await page.fill('#radio-seed', 'coder'); await page.click('#radio-start');
    await waitFor(async () => (await R()).on, 20000); await sleep(2000);
    r = await R();
    const ss0 = r.state.recipe.options.shapeSearch;
    check(ss0 && ss0.all === true && ss0.keep === 'best' && !('cap' in ss0) && ss0.played && ss0.played[0] === 'default', 'the shape settings are recorded in the session, the first song with its default growth', JSON.stringify(ss0));
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(r.state.stream[0].bars * 0.45));
    const ready = await waitFor(async () => { const st = (await R()).state; const p = st.recipe.options.shapeSearch.played || {}; return st.stream.length > 1 && !st.stream[1].growing && p[1] === 'wide'; }, 60000);
    r = await R(); e = await ed();
    check(ready && !e.err, 'the next song takes its wider growth when it is ready in time', JSON.stringify(r.state.recipe.options.shapeSearch));
    await page.click('#radio-start'); await sleep(300);
    await page.evaluate(() => { localStorage.removeItem('coding-misk-shape-all'); localStorage.removeItem('coding-misk-shape-keep'); });
    await page.selectOption('#radio-profile', 'custom'); await sleep(200);
    // radio-profiles 9.1: a display option changed during a Live coder song reaches it at its next code edit, and the
    // sound does not change; a replay shows the code with the display options set when it starts
    {
      const tracksIn = c => /^\/\/ ========== /m.test(c);
      if (await page.getAttribute('#custom-toggle', 'aria-expanded') !== 'true') await page.click('#custom-toggle');
      await page.click('[data-custom-base="switch"]'); await sleep(100);
      await page.selectOption('[data-custom="comments"]', 'essential'); await sleep(100);
      await page.fill('#radio-seed', 'display'); await page.click('#radio-start');
      await waitFor(async () => (await R()).on, 20000);
      r = await R();
      const d0 = r.state.stream[0];
      await page.evaluate(b => globalThis.codingMiskRadio.seek(b), Math.floor(d0.bars * 0.3)); await sleep(2000);
      const before = await code();
      check(d0.grown && d0.profile === 'switch' && tracksIn(before), 'display: a Live coder song on air with track names', before.split('\n').slice(0, 4).join(' / '));
      await page.selectOption('[data-custom="comments"]', 'none');
      const t0 = (await ed()).cyc;
      const gone = await waitFor(async () => !tracksIn(await code()), 120000);
      e = await ed(); r = await R();
      check(gone && r.state.onAir === 0 && !e.err, 'display: comments none, the track names leave the code at the next edit of the same song', `from bar ${t0.toFixed(1)} to ${e.cyc.toFixed(1)}, on air ${r.state.onAir} ${e.err.slice(0, 80)}`);
      // the same events with and without the track names: the window's code at the next steps of the song on air,
      // evaluated with each display (the radio paused meanwhile)
      await page.click('#radio-pause'); await sleep(300);
      await page.evaluate(() => { globalThis.__dispNone = globalThis.codingMiskRadio.airPlayable; });
      await page.selectOption('[data-custom="comments"]', 'essential'); await sleep(100);
      const same = await page.evaluate(async from => {
        const { useFns } = await import('/src/song/writer.js'), { buildSteps } = await import('/src/song/build.js');
        const e = document.querySelector('strudel-editor').editor, A = globalThis.__dispNone, B = globalThis.codingMiskRadio.airPlayable;
        const haps = async (P, b) => { globalThis.miskBuses = P.buses; useFns(P.fns); const shown = P.codeAt(b); await e.repl.evaluate(P.run ? P.run(shown, b) : shown, false); if (e.repl.state.evalError) throw new Error(String(e.repl.state.evalError)); return { shown, ev: e.repl.scheduler.pattern.queryArc(b, b + 1).filter(h => h.hasOnset()).map(h => JSON.stringify([+h.whole.begin.valueOf().toFixed(4), +h.duration.valueOf().toFixed(4), Object.fromEntries(Object.entries(h.value).filter(([, v]) => typeof v !== 'function').sort())])).sort().join('\n') }; };
        const bars = [...new Set(buildSteps(A.build).map(s => s.at))].filter(b => b >= from).slice(0, 4), out = [];
        try {
          for (const b of bars) { const a = await haps(A, b), c = await haps(B, b); out.push({ b, same: a.ev === c.ev && a.ev.length > 0, heads: [/^\/\/ ========== /m.test(a.shown), /^\/\/ ========== /m.test(c.shown)] }); }
        } catch (x) { return { err: x.message, out }; }
        e.repl.stop();
        return { out };
      }, Math.floor(t0));
      check(!same.err && same.out.length >= 2 && same.out.every(x => x.same && !x.heads[0] && x.heads[1]), 'display: the same events with and without the track names', JSON.stringify(same));
      await page.click('#radio-pause'); await sleep(1500);
      check(!(await ed()).err, 'display: the radio plays on after the check');
      // replay with the console's comments set to none: no track names from the start, the same song
      await page.selectOption('[data-custom="comments"]', 'none'); await sleep(100);
      const rc = r.state.recipe;
      await page.click('#radio-start'); await sleep(300);
      await page.evaluate(x => globalThis.codingMiskRadio.start({ recipe: x }), rc); await sleep(5000);
      r = await R(); const cr = await code();
      check(r.state.stream[0].id === d0.id && r.state.stream[0].bars === d0.bars && !tracksIn(cr) && !(await ed()).err, 'display: a replay shows the display options set when it starts', cr.split('\n').slice(0, 3).join(' / '));
    }
    await page.click('#radio-start'); await sleep(300);
    await page.selectOption('#radio-profile', 'artist'); await sleep(200);
  }

  // radio-profiles 6.1 (D2): Continue in radio of a song playing as Live coder in Compose. Song 0 keeps its profile and
  // the Compose controls, grows as there (same code on screen), and a replay grows it the same
  {
    const edc = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { code: e.code || '', err: String(e.repl.state.evalError || ''), cyc: e.repl.scheduler.now() }; });
    // (the code lines with their strings and numbers left out: the typing may be a little further in one of them)
    const lines = c => c.split('\n').filter(l => l.startsWith('$:')).map(l => l.replace(/"[^"]*"?/g, '""').replace(/[\d.]+/g, '0'));
    await page.click('[data-tab="brani"]'); await sleep(500);
    await page.fill('#sv-q', 'Prima luce'); await sleep(600);
    await page.click('#songs [data-song-id="switch-prima-luce"] [data-act="open"]'); await sleep(1500);
    await page.click('#play'); await sleep(6000);
    const a = await edc();
    await page.click('#tr-radio'); await sleep(3000);
    r = await R(); const b = await edc();
    const s0 = r.state && r.state.stream[0], L = r.state && r.state.recipe.lead;
    check(s0 && s0.profile === 'switch' && s0.grown && L && L.profile === 'switch' && L.controls && L.controls.build === 'crescendo', 'Continue in radio: song 0 keeps Live coder and the Compose controls', JSON.stringify(s0 && { profile: s0.profile, grown: s0.grown, lead: L && L.profile }));
    check(!a.err && !b.err && lines(a.code).length > 0 && lines(a.code).join('\n') === lines(b.code).join('\n'), 'Continue in radio: the same code on screen, no evaluation error', `${lines(a.code).length} lines in Compose, ${lines(b.code).length} in the radio ${b.err.slice(0, 80)}`);
    const recipe = r.state.recipe;
    await page.click('#radio-start'); await sleep(300);
    await page.evaluate(rc => globalThis.codingMiskRadio.start({ recipe: rc }), recipe); await sleep(4000);
    r = await R();
    check(r.state.stream[0].grown && r.state.stream[0].bars === s0.bars && JSON.stringify(r.state.stream[0].shape) === JSON.stringify(s0.shape), 'Continue in radio: a replay grows song 0 the same');
    await page.click('#radio-start'); await sleep(300);
    await page.click('[data-tab="radio"]'); await sleep(200);
  }

  // Next changes (after-tests-oct28 1.3, 2.4): a Live coder song with the narrator and the voice track. Every row has a
  // label or a voice, none reads "undefined"; V:N and V:T rows; a V:T row of its own where no step falls
  {
    await page.evaluate(() => { const el = document.querySelector('#radio-voice [data-vinst="presence"]'); if (el) { el.value = 'always'; el.dispatchEvent(new Event('change', { bubbles: true })); } }); await sleep(200);
    const rows = () => page.$$eval('#radio-now .radio-next li', xs => xs.filter(x => !x.classList.contains('muted')).map(x => ({ at: +x.dataset.at, text: x.innerText, step: !!x.querySelector('.nx-step'), n: x.querySelectorAll('.vtag-n').length, t: x.querySelectorAll('.vtag-t').length, tip: [...x.querySelectorAll('.vtag')].map(v => v.title).join() })));
    // (a Live coder song, then a Classic one: its steps are sparser, so a voice-track line can fall where no step does)
    const seen = { rows: 0, bad: [], n: 0, t: 0, alone: 0, tips: new Set() };
    let it = null, e = null;
    // (dark-cyberpunk in Classic: its first song speaks its voice-track lines away from the steps)
    for (const [profile, style] of [['switch', 'pure-trance'], ['classic', 'dark-cyberpunk']]) {
    await pick([style]);
    await page.selectOption('#radio-profile', profile); await sleep(200);
    await page.fill('#radio-seed', 'next-changes'); await page.click('#radio-start');
    for (let k = 0; k < 120; k++) { const q = await R(); if (q.state && (profile === 'classic' || q.state.stream[q.state.onAir].grown)) break; await sleep(500); }
    const q = (await R()).state, cur = q.stream[q.onAir];
    if (profile === 'switch') it = cur;
    for (let b = 0; b < cur.bars - 2; b += 3) {
      await page.evaluate(x => globalThis.codingMiskRadio.seek(x), b); await sleep(350);
      for (const r of await rows()) {
        seen.rows++;
        if (/undefined/.test(r.text) || (!r.step && !r.n && !r.t)) seen.bad.push(`${r.at}: ${r.text}`);
        if (r.n) seen.n++;
        if (r.t) { seen.t++; if (!r.step) seen.alone++; }
        if (r.tip) r.tip.split(',').forEach(x => seen.tips.add(x));
      }
    }
    e = await ed();
    if (e.err) break;
    await page.click('#radio-start'); await sleep(300);
    }
    check(it.profile === 'switch' && it.grown && seen.rows > 20 && !seen.bad.length, 'Next changes: every row of a Live coder song has a label or a voice, no "undefined"', `${seen.rows} rows ${seen.bad.slice(0, 3).join(' | ')}`);
    check(seen.n > 0 && seen.t > 0 && seen.alone > 0, 'Next changes: V:N and V:T rows, and a V:T row where no step falls', `V:N ${seen.n}, V:T ${seen.t}, alone ${seen.alone}`);
    check(seen.tips.has('Voice: narrator') && seen.tips.has('Voice: track'), 'Next changes: the tags name the voice in their tooltip', [...seen.tips].join(', '));
    check(!e.err, 'Next changes: no evaluation error while seeking', e.err.slice(0, 100));
    await page.selectOption('#radio-profile', 'classic').catch(() => {}); await sleep(200);
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
