// The radio console's track card in the browser (console-track-card, #82): a Classic radio song on air, the saved
// patterns panel under the Mixer and hidden, no Instrument in the Sound group, a card opened from a Mixer name (one at a
// time, Escape), a new sound waiting with its Queue row and its dashed chip, entering at the phrase start (lit, the
// track's settings changed), the Original chip back, Undo of a waiting sound, a new pattern (listen in the preview, use,
// save into the library), a saved pattern from the library in place of the track's, a locked track's name off, the I
// key, Italian, 400 px without horizontal scroll, no evaluation error.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-track-card.cjs [shots-dir] [--profile classic|switch|crescendo]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const until = async (fn, ms = 8000, step = 60) => { const t = Date.now(); for (;;) { let v = null; try { v = await fn(); } catch (e) {} if (v || Date.now() - t > ms) return v; await sleep(step); } };
const shots = process.argv.slice(2).find(a => !a.startsWith('--') && !['classic', 'switch', 'crescendo'].includes(a));
const pi = process.argv.indexOf('--profile'), profile = pi > 0 ? process.argv[pi + 1] : 'classic';
if (shots) fs.mkdirSync(shots, { recursive: true });
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: false }); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const base = `http://localhost:${process.env.PORT || 5173}/`;
  await page.goto(base); await sleep(2500);
  // a bassline and a melody in the library (the bass card lists the bassline only)
  await page.evaluate(profile => {
    localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en');
    localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile }));
    const ctx = { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' };
    localStorage.setItem('coding-misk-patterns', JSON.stringify([
      { id: 'p-bass1', name: 'Low walker', kind: 'basslines', type: 'bass', pattern: { idea: { degrees: '0 ~ 0 7 ~ 0 5 ~', octave: 2 } }, sound: 'sawtooth', settings: {}, context: ctx, styles: ['any'], source: 'mine', created: '2026-11-20' },
      { id: 'p-mel1', name: 'Glass line', kind: 'melodies', type: 'hook', pattern: { idea: { degrees: '0 2 4 2' } }, sound: 'triangle', settings: {}, context: ctx, styles: ['any'], source: 'mine', created: '2026-11-20' },
    ]));
  }, profile);
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', 'card-check');
  await page.click('#radio-start');
  const up = await until(() => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return !!(s && s.plan && document.querySelector('#radio-steer .steer-mixer')); }), 30000);
  check(up, 'the radio is on air with its console', errors.slice(0, 2).join(' | '));
  await sleep(1500);
  const rel = () => page.evaluate(() => { const r = globalThis.codingMiskRadio.state, it = r.stream[r.onAir]; return document.querySelector('strudel-editor').editor.repl.scheduler.now() - it.start; });
  const err = () => page.evaluate(() => String(document.querySelector('strudel-editor').editor.repl.state.evalError || ''));
  const steer = () => page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s && { commands: s.commands, song: s.song, plan: { phrase: s.plan.phrase } }; });
  const settled = () => until(() => page.evaluate(() => (globalThis.codingMiskRadio.pendingAdds || []).length === 0), 60000, 60);
  // a grown song (Live coder, Crescendo) types a change over the bars after its boundary: the first bar within four
  // phrases where the track's state passes the test, or null
  const grown = profile !== 'classic';
  const reaches = (song, id, from, ph, test) => page.evaluate(async ({ song, id, from, span, test }) => { const { stateAt } = await import('/src/song/build.js'); const f = new Function('t', `return (${test})(t)`); for (let b = from; b < from + span; b++) { const t = stateAt(song, b).song.tracks.find(x => x.id === id); if (t && f(t)) return b; } return null; }, { song, id, from, span: grown ? 4 * ph : 1, test });
  const trackAt = (song, id, bar) => page.evaluate(async ({ song, id, bar }) => { const { stateAt } = await import('/src/song/build.js'); return stateAt(song, bar).song.tracks.find(t => t.id === id); }, { song, id, bar });

  // ---------- the console's order ----------
  const order = await page.evaluate(() => {
    const box = document.querySelector('#radio-steer'), kids = [...box.children];
    return { sp: kids.findIndex(x => x.matches('.sp-slot, .sp') || x.querySelector('.sp')), mixer: kids.findIndex(x => x.matches('.steer-mixer')), hidden: !!box.querySelector('.sp.hidden'), instrument: !!box.querySelector('[data-cmd="instrument"]'), note: !!box.querySelector('[data-mix-inst]') };
  });
  check(order.sp > order.mixer && order.mixer >= 0, 'the saved patterns panel follows the Mixer', JSON.stringify(order));
  check(order.hidden, 'the saved patterns panel is hidden by default');
  check(!order.instrument && !order.note, 'no Instrument key in the Sound group or the Mixer');
  await shot(page, '01-console');

  // ---------- open a card ----------
  const pickTrack = () => page.evaluate(() => {
    const names = [...document.querySelectorAll('#radio-steer [data-card]')].filter(b => !b.disabled).map(b => b.dataset.card);
    const s = globalThis.codingMiskRadio.steering, type = id => (s.song.tracks.find(t => t.id === id) || {}).type;
    return names.find(id => ['bass', 'arp', 'hook', 'pad'].includes(type(id))) || null;
  });
  // (a melodic track when one plays within 40 s, else the first one)
  let id = await until(pickTrack, 40000, 500) || await page.evaluate(() => { const b = [...document.querySelectorAll('#radio-steer [data-card]')].find(x => !x.disabled); return b && b.dataset.card; });
  check(!!id, 'a melodic track in the Mixer', id);
  if (!id) { await browser.close(); process.exit(1); }
  const other = await page.evaluate(id => [...document.querySelectorAll('#radio-steer [data-card]')].map(b => b.dataset.card).find(x => x !== id), id);
  await page.click(`#radio-steer [data-card="${id}"]`); await sleep(200);
  check(await page.evaluate(id => !!document.querySelector(`#radio-steer .track-card[data-card-track="${id}"]`) && document.querySelector(`#radio-steer [data-card="${id}"]`).getAttribute('aria-expanded') === 'true', id), 'the name opens the track card under its row');
  if (other) {
    await page.click(`#radio-steer [data-card="${other}"]`); await sleep(200);
    check(await page.evaluate(([a, b]) => document.querySelectorAll('#radio-steer .track-card').length === 1 && !!document.querySelector(`#radio-steer .track-card[data-card-track="${b}"]`), [id, other]), 'one card at a time');
    await page.keyboard.press('Escape'); await sleep(200);
    check(await page.evaluate(() => !document.querySelector('#radio-steer .track-card')), 'Escape closes the card');
    await page.click(`#radio-steer [data-card="${id}"]`); await sleep(200);
  }
  check(await page.evaluate(() => !document.querySelector('#radio-steer .track-card [data-card-pv]') && !!document.querySelector('#radio-steer .track-card [data-card-roll]')), 'the card shows the Sound and Pattern rows, no Movement row');
  await shot(page, '02-card-open');

  // ---------- a new sound ----------
  await settled();
  const before = await steer(), r0 = await rel();
  await page.click(`#radio-steer [data-card-roll="${id}"]`); await sleep(400);
  const waiting = await page.evaluate(() => { const q = document.querySelector('#radio-steer .steer-queue').innerText, c = document.querySelector('#radio-steer .tc-chip[data-wait]'); return { q, chip: c && c.innerText }; });
  check(/sound #1/.test(waiting.q), 'the new sound waits in the Queue', waiting.q.replace(/\n/g, ' | '));
  check(!!waiting.chip && /#1/.test(waiting.chip) && /coming/.test(waiting.chip), 'its chip is dashed and says coming', waiting.chip);
  await shot(page, '03-sound-coming');
  await settled();
  const s1 = await steer(), cmd = s1.commands.filter(c => c.kind === 'sound' && c.track === id).pop();
  check(!!cmd && cmd.n === 1 && cmd.at % s1.plan.phrase === 0 && cmd.at > r0, 'it entered as a sound command on a phrase start', cmd && `bar ${cmd.at}`);
  if (cmd) {
    await until(async () => (await rel()) > cmd.at + 0.5, 60000, 250);
    const was = await trackAt(before.song, id, cmd.at);
    // (grown: the sound itself, wave, kit, guitar type or sample: the growth types toward the state where its moves arrive,
    // and a later move of the director on the same knob, a filter or a drive, wins there, as after Vary)
    const keys = Object.keys(cmd.set).filter(k => JSON.stringify(cmd.set[k]) !== JSON.stringify((was.settings || {})[k]) && (!grown || ['wave', 'kit', 'type', 'sample'].includes(k)));
    const hit = await reaches(s1.song, id, cmd.at, s1.plan.phrase, `t => ${JSON.stringify(keys)}.every(k => JSON.stringify(t.settings[k]) === JSON.stringify(${JSON.stringify(cmd.set)}[k]))`);
    const miss = [];
    if (hit === null) for (const k of keys) if ((await reaches(s1.song, id, cmd.at, s1.plan.phrase, `t => JSON.stringify(t.settings[${JSON.stringify(k)}]) === ${JSON.stringify(JSON.stringify(cmd.set[k]))}`)) === null) miss.push(`${k} ${JSON.stringify(cmd.set[k])}, heard ${JSON.stringify(((await trackAt(s1.song, id, cmd.at + 4 * s1.plan.phrase - 1)) || { settings: {} }).settings[k])}`);
    check((keys.length > 0 || grown) && hit !== null, grown ? 'the track reaches the new sound within four phrases' : 'the track plays the new sound from that bar', `${keys.join(', ')}${hit !== null ? ` on bar ${hit}` : ''}${miss.length ? `; missing ${miss.join('; ')}` : ''}`);
    await sleep(600);
    check(await page.evaluate(() => { const c = document.querySelector('#radio-steer .tc-chip[aria-pressed="true"]'); return c && /#1/.test(c.innerText) && /on air/.test(c.innerText); }), 'chip #1 is lit, on air');
    check(!(await err()), 'no evaluation error after the new sound', await err());
    await shot(page, '04-sound-on-air');
    // back to the original
    await page.click('#radio-steer .tc-chip[data-card-chip="0"]'); await sleep(300);
    check(/original sound/.test(await page.innerText('#radio-steer .steer-queue')), 'the Original chip queues the original sound');
    await settled();
    const s2 = await steer(), c2 = s2.commands.filter(c => c.kind === 'sound' && c.track === id).pop();
    check(c2 && c2.n === 0 && c2.at > cmd.at, 'the original sound goes on the next phrase start', c2 && `bar ${c2.at}`);
    if (c2) {
      // (the original: the track's sound at the first roll's bar, before it; the director may move it later, as always)
      const back = await trackAt(s2.song, id, c2.at), orig = await trackAt(before.song, id, cmd.at);
      const keys = ['wave', 'kit', 'type', 'cutoff', 'drive'].filter(k => (orig.settings || {})[k] !== undefined);
      const backAt = await reaches(s2.song, id, c2.at, s2.plan.phrase, `t => ${JSON.stringify(Object.keys(c2.set).filter(k => !grown || ['wave', 'kit', 'type', 'sample'].includes(k)))}.every(k => JSON.stringify(t.settings[k]) === JSON.stringify(${JSON.stringify(c2.set)}[k]))`);
      check(keys.every(k => JSON.stringify(c2.set[k]) === JSON.stringify(orig.settings[k])) && backAt !== null, 'the original sound back on the track', `${keys.join(', ')}${backAt !== null ? ` on bar ${backAt}` : ''}`);
    }
    // Undo of a waiting sound
    await page.click(`#radio-steer [data-card-roll="${id}"]`); await sleep(300);
    check(await page.evaluate(() => !!document.querySelector('#radio-steer .tc-chip[data-wait]')), 'sound #2 waits');
    await page.click(`#radio-steer [data-card-undo="${id}"]`); await sleep(300);
    const q2 = await page.innerText('#radio-steer .steer-queue');
    check(!/sound #2/.test(q2) && await page.evaluate(() => !document.querySelector('#radio-steer .tc-chip[data-card-chip="2"][data-wait]')), 'Undo takes the waiting sound back', q2.replace(/\n/g, ' | '));
  }

  // ---------- a new pattern ----------
  await page.click(`#radio-steer [data-card-newpat="${id}"]`); await sleep(300);
  check(await page.evaluate(() => !!document.querySelector('#radio-steer .tc-cand canvas[data-card-pv]')), 'New pattern shows its drawing and number');
  await page.click(`#radio-steer [data-card-listen="${id}"]`); await sleep(500);
  const pv = await page.evaluate(() => { const p = globalThis.codingMiskRadioPreview; return { on: !!(p && p.state), pressed: document.querySelector('#radio-steer [data-card-listen]').getAttribute('aria-pressed') }; });
  check(pv.on && pv.pressed === 'true', 'Listen plays the pattern in the preview', JSON.stringify(pv));
  const notOnAir = await page.evaluate(() => !globalThis.codingMiskRadio.steering.commands.some(c => c.kind === 'pattern' && c.mode === 'replace'));
  check(notOnAir, 'listening puts nothing on air');
  await shot(page, '05-pattern-listen');
  await page.click(`#radio-steer [data-card-listen="${id}"]`); await sleep(300);
  await page.click(`#radio-steer [data-card-save="${id}"]`); await sleep(300);
  const lib = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-patterns') || '[]').map(p => p.name));
  check(lib.length === 3, 'Save adds the pattern to the library', lib.join(' · '));
  await page.click(`#radio-steer [data-card-use="${id}"]`); await sleep(300);
  check(/pattern/.test(await page.innerText('#radio-steer .steer-queue')), 'Use queues the pattern');
  await settled();
  const s3 = await steer(), use = s3.commands.filter(c => c.kind === 'pattern' && c.target === id).pop();
  if (use) {
    // (Classic: the pattern step on the bar; grown: the line rewritten with the pattern's notes or rows within four phrases)
    const want = JSON.stringify(use.item.pattern.idea || use.item.pattern.rows || use.item.pattern);
    const at = await reaches(s3.song, id, use.at, s3.plan.phrase, `t => { const c = t.clips.find(c => c.start <= ${use.at} && c.start + c.bars > ${use.at}) || t.clips[0], p = t.patterns[c.pattern] || {}; return JSON.stringify(p) === ${JSON.stringify(JSON.stringify(use.item.pattern))} || JSON.stringify(p.idea) === ${JSON.stringify(want)} || JSON.stringify(p.rows) === ${JSON.stringify(want)} || Object.values(t.patterns).some(x => JSON.stringify(x) === ${JSON.stringify(JSON.stringify(use.item.pattern))}); }`);
    check(at !== null, 'the new pattern plays on the track from its bar', `bar ${use.at}${at !== null ? `, heard on ${at}` : ''}`);
  } else check(false, 'Use entered as a pattern replace');

  // ---------- from the library ----------
  const opts = await page.evaluate(id => [...document.querySelectorAll(`#radio-steer [data-card-lib="${id}"] option`)].map(o => o.textContent), id);
  const ty = await page.evaluate(id => globalThis.codingMiskRadio.steering.song.tracks.find(t => t.id === id).type, id);
  check(opts.length >= 1 && !opts.includes('Glass line') === (ty !== 'hook'), 'the library lists the patterns of the track\'s instrument', `${ty}: ${opts.join(' · ')}`);
  if (await page.evaluate(id => !document.querySelector(`#radio-steer [data-card-libuse="${id}"]`).disabled, id)) {
    await page.click(`#radio-steer [data-card-libuse="${id}"]`); await sleep(300); await settled();
    const s4 = await steer(), rep = s4.commands.filter(c => c.kind === 'pattern' && c.target === id).pop();
    check(rep && rep !== use && rep.item && opts.includes(rep.item.name), 'Replace puts the saved pattern on the track', rep && rep.item.name);
  }

  // ---------- lock, I key ----------
  await page.click(`#radio-steer [data-mix-lock="${id}"]`); await settled(); await sleep(800);
  check(await page.evaluate(id => { const b = document.querySelector(`#radio-steer [data-card="${id}"]`); return b && b.disabled && /locked/.test(b.title) && !document.querySelector('#radio-steer .track-card'); }, id), 'a locked track\'s name is off and its card closed');
  await page.click(`#radio-steer [data-mix-lock="${id}"]`); await settled(); await sleep(800);
  await page.keyboard.press('i'); await sleep(300);
  check(await page.evaluate(() => !!document.querySelector('#radio-steer .track-card')), 'I opens the lead track\'s card');
  await page.keyboard.press('i'); await sleep(300);
  check(/sound #/.test(await page.innerText('#radio-steer .steer-queue')), 'I again rolls a new sound');
  await settled();

  // ---------- P, Italian, 400 px ----------
  await page.keyboard.press('p'); await sleep(300);
  check(await page.evaluate(() => !document.querySelector('#radio-steer .sp.hidden')), 'P shows the saved patterns panel');
  await shot(page, '06-saved-below-mixer');
  await page.evaluate(() => { localStorage.setItem('coding-misk-lang', 'it'); });
  await page.evaluate(() => { const b = document.querySelector('[data-lang="it"]') || document.querySelector('#lang-it'); if (b) b.click(); });
  await sleep(500);
  for (const lang of ['it', 'en']) {
    await page.evaluate(l => { const set = globalThis.codingMiskSetLang; if (set) set(l); }, lang);
    await sleep(400);
  }
  await page.setViewportSize({ width: 400, height: 900 }); await sleep(600);
  const first = await page.evaluate(() => { const b = [...document.querySelectorAll('#radio-steer [data-card]')].find(x => !x.disabled); return b && b.dataset.card; });
  if (first && !(await page.evaluate(() => !!document.querySelector('#radio-steer .track-card')))) { await page.click(`#radio-steer [data-card="${first}"]`); await sleep(300); }
  const card = await page.$('#radio-steer .track-card');
  if (card) await card.scrollIntoViewIfNeeded();
  const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: innerWidth, card: (document.querySelector('#radio-steer .track-card') || {}).scrollWidth, cw: (document.querySelector('#radio-steer .track-card') || {}).clientWidth }));
  check(wide.doc <= wide.win && (!wide.card || wide.card <= wide.cw + 1), 'no horizontal scroll at 400 px', JSON.stringify(wide));
  if (shots && card) await card.screenshot({ path: path.join(shots, '07-card-400.png') });
  check(!(await err()), 'no evaluation error', await err());
  check(!errors.length, 'no page error', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'ok    track card in the browser');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
