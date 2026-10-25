// Browser checks for the voice controls (voice-controls and voice-placement, #77). Compose: one Voices group, shown with
// the Live build on or off: the narrator row (Narrator voice, Narrator style, Narrated growth) disabled with the reason
// when it cannot apply, the narrator style in the song's trial; the voice instrument of the open song (Add a voice
// instrument, presets and controls that rewrite the track, the same controls in the track's panel kept in sync, Undo,
// New phrases); "In the next song" for a new song by an artist (on, off, presets; Obsessive gives one line repeated);
// no voice instrument button in the toolbar. Radio: one Voices group with the narrator (Custom profile only, disabled
// with the reason otherwise) and the voice instrument (presets, Custom, options in the recipe, a steering command on
// the song on air, recorded in the session). Italian labels. Screenshots of each part when a folder is given.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voices.cjs [shots-dir]   (dev server on PORT, default 5173)
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
  try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const shot = async (sel, name, pad = 12) => {
    if (!shots) return;
    const box = await page.evaluate(([sel, pad]) => { const el = document.querySelector(sel); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: Math.min(innerWidth - Math.max(0, r.left - pad), r.width + 2 * pad), height: Math.min(r.height + 2 * pad, 2400) }; }, [sel, pad]);
    if (box) await page.screenshot({ path: path.join(shots, name), clip: box });
  };
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  // stored new-song options from voice-controls are read as before (same key and shape)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-artist-voice', JSON.stringify({ preset: 'present', phrases: '2-3', kind: 'mixed', ways: null, presence: 'always' })); });
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  const compose = async () => { await page.click('[data-tab="componi"]'); await sleep(300); };
  const open = async id => { await compose(); await page.selectOption('#track-pick', id); await sleep(1200); };
  const trials = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-song-trials') || '{}'));
  const voices = () => page.evaluate(() => {
    const g = document.querySelector('#live-voices'), a = document.querySelector('#live-narrator'), st = document.querySelector('#live-narrator-style'), b = document.querySelector('#live-narrated');
    return { shown: !!g && !g.closest('[hidden]') && g.offsetParent !== null, label: g.querySelector('.lbl').textContent, inGroup: [a, st, b].every(x => x && x.closest('#live-voices') === g),
      order: [a, st, b].map(x => [...g.querySelectorAll('button, select')].indexOf(x)).join(), narrator: a.getAttribute('aria-pressed'), narratorOff: a.disabled, narratorTip: a.title, style: st.value, styleOff: st.disabled, styleTip: st.title,
      options: [...st.options].map(o => `${o.value}:${o.textContent}`), narrated: b.textContent, narratedTip: b.title, narratedOff: b.disabled, narratedShown: !b.hidden,
      vinst: !!g.querySelector('#live-vinst'), next: !!g.querySelector('#live-vinst-next') };
  });
  check(await page.evaluate(() => !document.querySelector('#tr-artist-voice') && !document.querySelector('.arr-top .vinst')), 'Compose toolbar: no voice instrument button next to New song from artist');

  // Compose, Live build off: the group shows, the narrator controls are disabled and say why
  await open('luci-rosse');
  let v = await voices();
  check(v.shown && v.label === 'Voices' && v.inGroup && v.vinst && v.next, 'Live build off: the Voices group shows, with the narrator, the song\'s voice instrument and the next song', JSON.stringify(v));
  check(v.narratorOff && v.styleOff && v.narratedOff && /Live build/.test(v.narratorTip) && /Live build/.test(v.styleTip) && /Live build/.test(v.narratedTip), 'Live build off: Narrator voice, style and Narrated growth disabled, the tooltip says the song does not build live', `${v.narratorTip} | ${v.narratedTip}`);
  await shot('#live-voices', 'compose-voci-live-spento.png');
  // the Live build in blocks: Narrated growth needs Crescendo
  await page.click('#live-toggle'); await sleep(400);
  await page.click('#live-profile [data-profile="classic"]'); await sleep(1500);
  v = await voices();
  check(!v.narratorOff && !v.styleOff && v.narratedOff && v.narratedShown && /crescendo/i.test(v.narratedTip), 'In blocks: the narrator works, Narrated growth disabled (needs Crescendo)', v.narratedTip);
  await page.click('#live-profile [data-profile="crescendo"]'); await sleep(1500);
  v = await voices();
  check(v.order === '0,1,2' && v.options.join() === 'auto:automatic,explain:explaining,poetic:poetic' && v.style === 'auto' && !v.styleOff, 'Crescendo: Narrator voice, Narrator style, Narrated growth in order; automatic by default', v.options.join());
  check(v.narrated === 'Narrated growth' && /denser/.test(v.narratedTip) && !v.narratedOff, 'Narrated growth enabled, with its hint', v.narratedTip);
  await page.selectOption('#live-narrator-style', 'poetic'); await sleep(1500);
  let tr = await trials();
  check((await voices()).style === 'poetic' && tr['luci-rosse'] && tr['luci-rosse'].options.narratorStyle === 'poetic', 'Narrator style poetic: part of the song\'s trial', JSON.stringify(tr['luci-rosse']));
  await page.click('#live-narrator'); await sleep(1200);
  v = await voices();
  check(v.narrator === 'false' && v.narratedOff && v.styleOff && /Narrator voice on/.test(v.narratedTip), 'Narrator voice off: Narrated growth and Narrator style disabled, with the hint', JSON.stringify(v));
  await page.click('#live-narrator'); await sleep(1200);
  await page.selectOption('#live-narrator-style', 'auto'); await sleep(1200);
  await page.click('#cfg-reset'); await sleep(1200);

  // the voice instrument of the open song: add one, then the controls rewrite the track
  const song = () => page.evaluate(() => { const T = globalThis.codingMiskPatterns.compose().T, w = T.tracks.find(x => x.type === 'spoken'); let at = 0; const secs = T.sections.map(s => { const o = { start: at, bars: s.bars }; at += s.bars; return o; }); return w ? { id: w.id, clips: w.clips.map(c => ({ start: c.start ?? 0, bars: c.bars, pattern: c.pattern })), patterns: Object.keys(w.patterns), texts: Object.values(w.patterns).map(p => JSON.stringify(p.text)), ways: Object.values(w.patterns).map(p => p.way), options: w.voiceOptions || null, secs } : null; });
  const panel = sel => page.evaluate(sel => { const b = document.querySelector(sel); if (!b) return null; return { preset: (b.querySelector('[data-vinst-preset][aria-pressed="true"]') || {}).dataset?.vinstPreset || 'custom', phrases: (b.querySelector('[data-vinst="phrases"]') || {}).value, kind: (b.querySelector('[data-vinst="kind"]') || {}).value, ways: [...b.querySelectorAll('[data-vinst-way][aria-pressed="true"]')].map(x => x.dataset.vinstWay).join(), presence: !!b.querySelector('[data-vinst="presence"]'), redraw: !!b.querySelector('[data-vinst-redraw]') }; }, sel);
  check(!(await song()) && await page.isVisible('#live-vinst [data-vinst-add]'), 'a song without a voice instrument: the group offers Add a voice instrument');
  await page.click('#live-vinst [data-vinst-add]'); await sleep(1500);
  let s = await song(), g = await panel('#live-vinst .vinst');
  check(s && s.clips.length >= 1 && g && g.phrases === '1' && g.kind === 'different' && !g.presence && g.redraw, 'Add: a voice instrument track with one phrase; the group shows its controls (no presence, New phrases)', JSON.stringify({ s, g }));
  await page.selectOption('#live-vinst [data-vinst="phrases"]', '4-5'); await sleep(1500);
  s = await song();
  const quiet = s && s.clips.every(c => c.bars <= 8) && new Set(s.clips.map(c => c.start)).size === s.clips.length;
  check(s && s.options && s.options.phrases === '4-5' && s.clips.length >= 2 && s.clips.length <= 5 && new Set(s.clips.map(c => c.pattern)).size === s.clips.length && quiet, `4 to 5 different: ${s ? s.clips.length : 0} different phrases, one per quiet part, the options on the track`, JSON.stringify(s && s.clips));
  // the track's panel: the same controls, in sync
  await page.evaluate(id => { const i = globalThis.codingMiskPatterns.compose().T.tracks.findIndex(x => x.id === id); document.querySelector(`#live-vinst [data-vinst-open]`).click(); return i; }, s.id); await sleep(800);
  let p = await panel('#track-panel .tp-vinst .vinst');
  check(p && p.phrases === '4-5' && p.kind === 'different' && !p.presence, 'Open the track: its panel has the same controls with the same values', JSON.stringify(p));
  await shot('#track-panel .tp-host', 'traccia-voce-strumento.png');
  await page.click('#track-panel .tp-vinst [data-vinst-preset="obsessive"]'); await sleep(1500);
  s = await song(); g = await panel('#live-vinst .vinst'); p = await panel('#track-panel .tp-vinst .vinst');
  check(s.patterns.length === 1 && s.clips.length >= 2 && s.clips.every(c => c.pattern === 'A') && s.ways.every(w => ['refrain', 'chop'].includes(w)) && g.preset === 'obsessive' && p.preset === 'obsessive', 'Obsessive in the track panel: one line repeated (refrain or chop); the group shows Obsessive too', JSON.stringify({ s: s.clips, g, p }));
  const before = JSON.stringify((await song()).texts);
  await page.click('#track-panel .tp-vinst [data-vinst-redraw]'); await sleep(1500);
  s = await song();
  check(s.options.draw === 1 && JSON.stringify(s.texts) !== before, 'New phrases: other lines with the same controls', `${before} -> ${JSON.stringify(s.texts)}`);
  const beforeUndo = JSON.stringify(s.clips);
  await page.selectOption('#track-panel .tp-vinst [data-vinst="phrases"]', '2-3'); await sleep(1200);
  await page.click('.toast .toast-act'); await sleep(1200);
  s = await song();
  check(JSON.stringify(s.clips) === beforeUndo && s.options.phrases === '6-8', 'Undo in the message: the track as it was', JSON.stringify(s.options));
  await page.click('#live-vinst [data-vinst-preset="present"]'); await sleep(1500);
  await shot('#live-voices', 'compose-gruppo-voci.png');

  // In the next song: the stored options of voice-controls, then on + Obsessive for a new song by an artist
  const nextOpen = async () => { if (!(await page.evaluate(() => document.querySelector('#live-vinst-next').open))) { await page.click('#live-vinst-next > summary'); await sleep(300); } };
  const pop = () => page.evaluate(() => { const b = document.querySelector('#live-vinst-next-body'); return { presence: b.querySelector('[data-vinst="presence"]').value, presences: [...b.querySelectorAll('[data-vinst="presence"] option')].map(o => o.value).join(), preset: (b.querySelector('[data-vinst-preset][aria-pressed="true"]') || {}).dataset?.vinstPreset || 'custom', phrases: b.querySelector('[data-vinst="phrases"]').value, kind: b.querySelector('[data-vinst="kind"]').value, ways: [...b.querySelectorAll('[data-vinst-way][aria-pressed="true"]')].map(x => x.dataset.vinstWay).join(), now: document.querySelector('#live-vinst-next-now').textContent }; });
  await nextOpen();
  let n = await pop();
  check(n.presence === 'always' && n.presences === 'style,always,never' && n.preset === 'present' && n.phrases === '2-3' && /Present/.test(n.now), 'In the next song: the options stored before this change are read as they were', JSON.stringify(n));
  await page.click('#live-vinst-next-body [data-vinst-preset="obsessive"]'); await sleep(300);
  n = await pop();
  check(n.preset === 'obsessive' && n.phrases === '6-8' && n.kind === 'repeated' && n.ways === 'refrain,chop', 'In the next song: Obsessive sets its controls', JSON.stringify(n));
  await shot('#live-vinst-next', 'compose-prossimo-brano.png');
  const artist = await page.evaluate(() => [...document.querySelectorAll('#tr-artist option')].map(o => o.value).find(Boolean));
  await page.selectOption('#tr-artist', artist); await sleep(300); await page.selectOption('#tr-artist', artist); await sleep(2500);
  s = await song();
  check(s && s.patterns.join() === 'A' && s.clips.length >= 1 && s.clips.every(c => c.pattern === 'A'), `a new song by ${artist} with Obsessive: one line, ${s ? s.clips.length : 0} times`, JSON.stringify(s && s.clips));
  g = await panel('#live-vinst .vinst');
  check(g && g.kind === 'repeated', 'the generated song opens with its voice instrument in the group (read from its clips)', JSON.stringify(g));
  await nextOpen();
  await page.selectOption('#live-vinst-next-body [data-vinst="presence"]', 'never'); await sleep(300);
  check(await page.evaluate(() => [...document.querySelectorAll('#live-vinst-next-body [data-vinst-preset], #live-vinst-next-body [data-vinst="phrases"]')].every(x => x.disabled)), 'In the next song off: the phrase controls are disabled');
  await page.selectOption('#tr-artist', artist); await sleep(300); await page.selectOption('#tr-artist', artist); await sleep(2500);
  check(!(await song()), 'off: the new song has no voice instrument');
  await nextOpen();
  await page.selectOption('#live-vinst-next-body [data-vinst="presence"]', 'style'); await page.click('#live-vinst-next-body [data-vinst-preset="style"]'); await sleep(300);

  // the radio: one Voices group, the narrator (Custom only) and the voice instrument
  await page.click('[data-tab="radio"]'); await sleep(800);
  const rg = () => page.evaluate(() => { const g = document.querySelector('#radio-voices'); if (!g) return null; const a = g.querySelector('[data-custom-chip="narrator"]'), st = g.querySelector('[data-custom="narratorStyle"]'), b = g.querySelector('[data-custom-chip="narrated"]'), vi = g.querySelector('#radio-voice'); return { label: g.querySelector(':scope > .lbl').textContent, together: !!(a && st && b && vi), narratorOff: a.disabled, tip: a.title, style: st.value, styleOff: st.disabled, narratedOff: b.disabled, hint: (g.querySelector('#radio-voices-hint') || {}).textContent || '', inCustom: !!document.querySelector('#custom-voices'), saved: (JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').custom || {}).controls || {} }; });
  let r = await rg();
  check(r && r.label === 'Voices' && r.together && r.narratorOff && r.styleOff && /Custom/.test(r.tip) && /next song/.test(r.hint) && /quiet part/.test(r.hint), 'radio: one Voices group with the narrator and the voice instrument; another profile: narrator disabled, says why', JSON.stringify(r));
  const rv = () => page.evaluate(() => { const b = document.querySelector('#radio-voice'); return { presence: b.querySelector('[data-vinst="presence"]').value, presences: [...b.querySelectorAll('[data-vinst="presence"] option')].map(o => o.value).join(), preset: (b.querySelector('[data-vinst-preset][aria-pressed="true"]') || {}).dataset?.vinstPreset || 'custom', phrases: b.querySelector('[data-vinst="phrases"]').value, kind: b.querySelector('[data-vinst="kind"]').value, ways: [...b.querySelectorAll('[data-vinst-way][aria-pressed="true"]')].map(x => x.dataset.vinstWay).join(), options: globalThis.codingMiskRadio.options.voice || null }; });
  let x = await rv();
  check(x.preset === 'style' && x.presence === 'style' && x.presences === 'never,style,often' && !x.options, 'radio voice instrument: As the style, nothing in the options', JSON.stringify(x));
  for (const [id, want] of [['discreet', { phrases: '1', kind: 'different', ways: 'opening,refrain,chop,passage', presence: 'style' }], ['present', { phrases: '2-3', kind: 'mixed', ways: '', presence: 'often' }], ['obsessive', { phrases: '6-8', kind: 'repeated', ways: 'refrain,chop', presence: 'often' }]]) {
    await page.click(`#radio-voice [data-vinst-preset="${id}"]`); await sleep(400);
    x = await rv();
    check(x.preset === id && x.phrases === want.phrases && x.kind === want.kind && x.ways === want.ways && x.presence === want.presence && x.options && x.options.phrases === want.phrases, `radio preset ${id}: its controls, in the options`, JSON.stringify(x));
  }
  await page.selectOption('#radio-voice [data-vinst="phrases"]', '4-5'); await page.selectOption('#radio-voice [data-vinst="kind"]', 'different'); await sleep(400);
  x = await rv();
  check(x.preset === 'custom' && x.options.phrases === '4-5' && x.options.kind === 'different', 'a control changed: Custom, in the options', JSON.stringify(x.options));
  // Custom profile: the narrator controls work in the group; the Custom section has no Voices row of its own
  await page.selectOption('#radio-profile', 'custom'); await sleep(600);
  r = await rg();
  check(!r.narratorOff && !r.styleOff && !r.inCustom, 'radio Custom: the narrator controls work in the Voices group, not repeated in the Custom section', JSON.stringify(r));
  await page.selectOption('#radio-voices [data-custom="narratorStyle"]', 'poetic'); await sleep(500);
  r = await rg();
  check(r.style === 'poetic' && r.saved.narratorStyle === 'poetic', 'radio Custom: Narrator style poetic kept for the next songs', JSON.stringify(r.saved));
  await page.click('#radio-voices [data-custom-chip="narrator"]'); await sleep(500);
  r = await rg();
  check(r.narratedOff && r.styleOff, 'radio Custom: narrator off, Narrated growth and Narrator style disabled', JSON.stringify(r));
  await page.click('#radio-voices [data-custom-chip="narrator"]'); await sleep(300);
  await shot('#radio-voices', 'radio-gruppo-voci.png');
  // on air: a voice instrument change also steers the song on air from its next quiet part, recorded in the session
  await page.click('#radio-start'); await sleep(5000);
  const air = () => page.evaluate(() => { const R = globalThis.codingMiskRadio.state; return R ? { steering: (R.recipe.steering || []).filter(c => c.kind === 'voice'), voice: R.recipe.options.voice || null } : null; });
  await page.click('#radio-voice [data-vinst-preset="present"]'); await sleep(2500);
  const a = await air();
  const toastText = await page.evaluate(() => (document.querySelector('.toast') || {}).textContent || '');
  check(a && a.voice && a.voice.phrases === '4-5' && (a.steering.length === 1 ? a.steering[0].voice.phrases === '2-3' : /next song/.test(toastText)), 'on air: the recipe keeps the session options; the change is a recorded steering command on the song on air (or says why not)', JSON.stringify({ a, toastText }));
  await shot('#radio-voices', 'radio-gruppo-voci-in-onda.png');
  await page.click('#radio-start'); await sleep(800);
  await page.click('#radio-voice [data-vinst-preset="style"]'); await sleep(400);
  await page.selectOption('#radio-voices [data-custom="narratorStyle"]', 'auto'); await sleep(300);

  // Italian
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'it'));
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  await open('luci-rosse');
  v = await voices();
  check(v.label === 'Voci' && v.narrated === 'Crescita raccontata' && v.options.join() === 'auto:automatico,explain:spiega,poetic:poetico' && (!v.narratorOff || /In divenire/.test(v.narratorTip)), 'Italian: Voci, Stile del narratore, Crescita raccontata, the reason in Italian', JSON.stringify(v));
  await page.click('[data-tab="radio"]'); await sleep(800);
  const it = await page.evaluate(() => ({ label: document.querySelector('#radio-voices > .lbl').textContent, vi: document.querySelector('#radio-voice > .lbl').textContent, presets: [...document.querySelectorAll('#radio-voice [data-vinst-preset]')].map(x => x.textContent).join(), knob: document.querySelector('label[for="radio-talk"]').textContent }));
  check(it.label === 'Voci' && it.vi === 'Voce strumento' && it.presets === 'Come lo stile,Discreto,Presente,Ossessivo' && it.knob === 'Narratore', 'Italian: Voci, Voce strumento and its presets; the Voice knob is now Narratore', JSON.stringify(it));
  await shot('#radio-voices', 'radio-gruppo-voci-it.png');

  check(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
