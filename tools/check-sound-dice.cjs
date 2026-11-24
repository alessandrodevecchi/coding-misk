// Browser checks for the sound dice of Compose (random-sound-params, #94; app/sound-dice): a new sound for a bass with
// the toast and the number, other tracks unchanged, the level kept, the same number giving the same sound, a locked
// Filter keeping the cutoff while the Sound group draws as without the lock, Undo giving back a hand edit, the drum dice
// with Kit locked (tones in the safe ranges), a hook keeping its Delay device and gain, locks after a reload, Italian
// labels, the dice while the song plays (no evaluation error, still playing), and the row at 400 px in neon, hardware and
// light. The sound history (D10): a lit chip per sound, a chip restoring its sound with a hand edit, the number field
// applying by itself (after a second, or on Enter), «New sound» taking the highest number plus one, Undo of a chip
// click, the chips after a reload and the cap of 12. Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-sound-dice.cjs [shots-dir]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.env.PORT || 5173;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv.slice(2).find(a => !a.startsWith('--'));
if (shots) fs.mkdirSync(shots, { recursive: true });
const shot = (page, name) => (shots ? page.screenshot({ path: path.join(shots, name) }) : null);
const SAFE = { kick: { decay: [0.15, 0.8], tune: [-3, 2], drive: [0, 0.6], cutoff: [1500, 20000] }, snare: { decay: [0.08, 0.5], tune: [-2, 3], drive: [0, 0.8], cutoff: [2500, 20000] }, hats: { decay: [0.03, 0.3], tune: [-2, 4], drive: [0, 0.3], cutoff: [5000, 20000] } };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(`http://localhost:${PORT}/`);
  await page.evaluate(() => localStorage.clear());
  const draft = () => page.evaluate(() => globalThis.codingMiskPatterns.compose());
  const st = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, code: e.code }; });
  const open = async (song, lang = 'en') => {
    await page.evaluate(([l]) => { localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-arr-mode', JSON.stringify('sections')); }, [lang]);
    await page.reload(); await sleep(4000);
    await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]');
    await page.locator('#track-pick').selectOption(song); await sleep(1500);
    await page.click('#track-panel [data-view="one"]').catch(() => {}); await sleep(200);
  };
  const pick = async type => {
    const D = await draft(), ti = D.T.tracks.findIndex(x => x.type === type);
    await page.click(`[data-cell="${ti}:0"]`); await sleep(400);
    return ti;
  };
  const R = ti => `#track-panel [data-ptrk="${ti}"]`;
  const roll = async ti => { await page.click(`${R(ti)} #p${ti}_pt-dice`); await sleep(350); };
  const toastText = () => page.$eval('.toast', x => x.firstChild ? x.firstChild.textContent.trim() : '').catch(() => '');
  const num = ti => page.$eval(`#p${ti}_pt-dnum`, x => +x.value);
  // the field applies by itself: typing waits about a second; with enter, Enter applies at once
  const setNum = async (ti, v, enter = false) => { await page.fill(`#p${ti}_pt-dnum`, String(v)); if (enter) await page.press(`#p${ti}_pt-dnum`, 'Enter'); await sleep(enter ? 400 : 1400); };
  const chips = ti => page.$$eval(`${R(ti)} [data-droll]`, xs => xs.map(x => `${x.textContent.trim()}${x.getAttribute('aria-pressed') === 'true' ? '*' : ''}`).join(' '));
  const chip = async (ti, n) => { await page.click(`${R(ti)} [data-droll="${n}"]`); await sleep(350); };
  const lock = async (ti, g) => { await page.click(`${R(ti)} [data-dlock="${g}"]`); await sleep(100); };
  const track = async ti => (await draft()).T.tracks[ti];
  const undo = async () => { await page.click('.toast .toast-act'); await sleep(350); };

  // ---------- a bass in a song with style tags (cavo-scoperto: dark-cyberpunk) ----------
  await open('cavo-scoperto');
  let ti = await pick('bass');
  const before = await draft(), b0 = before.T.tracks[ti];
  check(await page.$(`${R(ti)} .tp-dice`) !== null, 'the dice row is in the bass panel');
  await roll(ti);
  const after = await draft(), b1 = after.T.tracks[ti];
  check(await toastText() === 'New sound #1', 'the toast says New sound #1', await toastText());
  check(await num(ti) === 1, 'the number shows 1');
  check(await chips(ti) === '#1*', 'a lit chip #1 appears', await chips(ti));
  check(JSON.stringify(b1.settings) !== JSON.stringify(b0.settings), 'the bass sound changed', JSON.stringify(b1.settings).slice(0, 160));
  check((b1.settings.gain ?? null) === (b0.settings.gain ?? null), 'the level stays');
  check(JSON.stringify(b1.patterns) === JSON.stringify(b0.patterns) && JSON.stringify(b1.clips) === JSON.stringify(b0.clips), 'patterns and clips stay');
  check(after.T.tracks.every((x, i) => i === ti || JSON.stringify(x) === JSON.stringify(before.T.tracks[i])), 'no other track changed');
  const r1 = b1.settings;
  await roll(ti); const r2 = (await track(ti)).settings; await roll(ti); const r3 = (await track(ti)).settings;
  check(await toastText() === 'New sound #3', 'three presses: New sound #3', await toastText());
  check(await chips(ti) === '#1 #2 #3*', 'three chips, #3 lit', await chips(ti));
  // Undo gives back roll 2 and drops chip 3; the next press is 3 again, with the same sound
  await undo();
  check(JSON.stringify((await track(ti)).settings) === JSON.stringify(r2) && await chips(ti) === '#1 #2*', 'Undo gives back the sound before the last press and its chip goes', await chips(ti));
  await roll(ti);
  check(await toastText() === 'New sound #3' && JSON.stringify((await track(ti)).settings) === JSON.stringify(r3), 'the next press is #3 again, with the same sound');
  // a chip gives back its sound; Undo of a chip click; New sound after going back takes the highest plus one
  await chip(ti, 1);
  check(JSON.stringify((await track(ti)).settings) === JSON.stringify(r1) && await chips(ti) === '#1* #2 #3' && await num(ti) === 1, 'chip #1 gives back sound #1 and is lit', await chips(ti));
  check(await toastText() === 'Sound #1', 'the toast says Sound #1', await toastText());
  await undo();
  check(JSON.stringify((await track(ti)).settings) === JSON.stringify(r3) && await chips(ti) === '#1 #2 #3*', 'Undo of a chip click gives back #3', await chips(ti));
  // the field applies by itself: 2 has a chip (restored after about a second), 7 is new (rolled on Enter)
  await setNum(ti, 2);
  check(JSON.stringify((await track(ti)).settings) === JSON.stringify(r2) && await chips(ti) === '#1 #2* #3', 'typing 2 gives back sound #2 with no press', await chips(ti));
  await setNum(ti, 7, true);
  check(await chips(ti) === '#1 #2 #3 #7*' && await toastText() === 'New sound #7', 'typing 7 and Enter rolls #7 and adds its chip', await chips(ti));
  await roll(ti);
  check(await toastText() === 'New sound #8', 'New sound after 7 is #8', await toastText());
  await undo();
  check(await chips(ti) === '#1 #2 #3 #7*', 'Undo drops #8', await chips(ti));
  // Filter locked: the cutoff stays, the Sound group draws what it draws without the lock (11 rolled free, undone,
  // then rolled again with the lock)
  await setNum(ti, 11, true); const free = (await track(ti)); await undo();
  const keepCut = (await track(ti)).settings.cutoff;
  await lock(ti, 'filter'); await setNum(ti, 11, true);
  const locked = await track(ti);
  check(locked.settings.cutoff === keepCut && locked.settings.wave === free.settings.wave && JSON.stringify(locked.rack || []) === JSON.stringify(free.rack || []), 'Filter locked: the cutoff stays, the wave and FM as without the lock', `${keepCut} ${locked.settings.wave}/${free.settings.wave}`);
  await lock(ti, 'filter');
  // a hand edit, a roll, Undo: the hand edit comes back
  await page.evaluate(([i]) => { const el = document.querySelector(`#track-panel [data-ptrk="${i}"] input[data-set="cutoff"]`); if (el) { el.value = '0.3'; el.dispatchEvent(new Event('input', { bubbles: true })); } }, [ti]);
  await sleep(200);
  const hand = (await track(ti)).settings;
  await roll(ti); await undo();
  check(JSON.stringify((await track(ti)).settings) === JSON.stringify(hand), 'Undo gives back the hand-edited settings', String(hand.cutoff));
  // a hand edit on a sound is kept in its chip when the track leaves it
  const litN = +(await chips(ti)).split(' ').find(x => x.endsWith('*')).slice(1, -1);
  await roll(ti); await chip(ti, litN);
  check((await track(ti)).settings.cutoff === hand.cutoff, 'leaving a sound keeps its hand edit in its chip', `#${litN} ${(await track(ti)).settings.cutoff}/${hand.cutoff}`);

  // ---------- a hook with its own Delay device and gain ----------
  ti = await pick('hook');
  const h0 = await track(ti);
  await roll(ti);
  const h1 = await track(ti);
  const delays = x => (x.rack || []).filter(d => d.device === 'delay' || d.device === 'reverb').map(d => JSON.stringify(d)).join();
  check(delays(h1) === delays(h0) && h1.settings.gain === h0.settings.gain, 'a hook keeps its Delay and Reverb devices and its gain', delays(h1));
  check(Array.isArray(h1.settings.vary) ? h1.settings.vary.every(v => ['lpf', 'crush', 'pan'].includes(v.on)) : true, 'the hook varies only the style\'s targets (dark-cyberpunk: lpf, crush, pan)', JSON.stringify(h1.settings.vary));

  // ---------- drums with Kit locked ----------
  ti = await pick('drums');
  const d0 = await track(ti);
  await lock(ti, 'kit'); await roll(ti);
  const d1 = await track(ti), tone = d1.settings.tone || {};
  const inSafe = Object.entries(tone).every(([g, v]) => SAFE[g] && Object.entries(v).every(([k, x]) => x >= SAFE[g][k][0] && x <= SAFE[g][k][1]));
  check((d1.settings.kit ?? null) === (d0.settings.kit ?? null), 'Kit locked: the kit stays', d1.settings.kit);
  check(await chips(ti) === '#1*', 'the drum track has its own history', await chips(ti));
  check(['kick', 'snare', 'hats'].every(g => tone[g]) && inSafe, 'the drum tone holds kick, snare and hats inside the safe ranges', JSON.stringify(tone));
  // locks after a reload
  await page.reload(); await sleep(4000);
  await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await sleep(800);
  await page.locator('#track-pick').selectOption('cavo-scoperto'); await sleep(1200);
  await page.click('#track-panel [data-view="one"]').catch(() => {});
  ti = await pick('drums');
  check(await page.$eval(`${R(ti)} [data-dlock="kit"]`, b => b.getAttribute('aria-pressed')) === 'true', 'Kit is still locked after a reload');
  check(await chips(ti) === '#1*', 'the chips are still there after a reload', await chips(ti));
  // the cap: 13 sounds on the hook keep the last 12
  const hk = await pick('hook');
  for (let i = 0; i < 12; i++) await roll(hk);
  const hc = (await chips(hk)).split(' ');
  check(hc.length === 12 && hc[0] === '#2' && hc[11] === '#13*', '13 sounds keep chips #2 to #13', hc.join(' '));

  // ---------- while the song plays ----------
  await page.click('#play').catch(() => {}); await sleep(3500);
  ti = await pick('bass');
  const s0 = await st();
  await roll(ti); await sleep(3000);
  const s1 = await st();
  check(s0.started && s1.started && !s1.err, 'the dice while playing: the song keeps playing, no evaluation error', s1.err);
  const sNow = (await track(ti)).settings;
  check(!sNow.vary || sNow.vary.some(v => s1.code.includes(`.rib(${v.seed}, ${v.cycles})`)), 'the variation reaches the code', JSON.stringify(sNow.vary));
  await page.click('#play').catch(() => {}); await sleep(500);
  await shot(page, 'dice-neon-1400.png');

  // ---------- Italian (a clean browser: the history above is saved with the song draft) ----------
  await page.evaluate(() => localStorage.clear());
  await open('cavo-scoperto', 'it');
  ti = await pick('bass');
  await roll(ti);
  check(await toastText() === 'Nuovo suono #1', 'Italian toast: Nuovo suono #1', await toastText());
  const lchips = await page.$$eval(`${R(ti)} [data-dlock]`, xs => xs.map(x => x.textContent));
  check(lchips.join() === 'Suono,Filtro,Effetti,Variazione', 'Italian lock chips', lchips.join());
  check(await chips(ti) === '#1*' && await page.$eval(`${R(ti)} .tp-dhist .lbl`, x => x.textContent) === 'Suoni', 'Italian history row: Suoni, #1 lit', await chips(ti));
  ti = await pick('drums');
  const dchips = await page.$$eval(`${R(ti)} [data-dlock]`, xs => xs.map(x => x.textContent));
  check(dchips.join() === 'Kit,Cassa,Rullante e clap,Piatti,Variazione', 'Italian drum lock chips', dchips.join());

  // ---------- 400 px in the three themes ----------
  for (const ui of ['neon', 'hw', 'light']) {
    await page.evaluate(u => localStorage.setItem('coding-misk-ui', JSON.stringify(u)), ui);
    await page.setViewportSize({ width: 400, height: 900 });
    await open('cavo-scoperto', 'en');
    ti = await pick('bass');
    const box = await page.$eval(`${R(ti)} .tp-dice`, el => { const r = el.getBoundingClientRect(); const kids = [...el.querySelectorAll('button, input')].map(x => x.getBoundingClientRect()); return { right: Math.max(r.right, ...kids.map(k => k.right)), sw: document.documentElement.scrollWidth, w: innerWidth }; });
    check(box.right <= box.w + 1 && box.sw <= box.w + 1, `400 px ${ui}: the dice row fits`, JSON.stringify(box));
    await page.$eval(`${R(ti)} .tp-dice`, el => el.scrollIntoView({ block: 'center' }));
    await shot(page, `dice-${ui}-400.png`);
  }
  await page.evaluate(() => localStorage.setItem('coding-misk-ui', JSON.stringify('neon')));

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall sound dice checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
