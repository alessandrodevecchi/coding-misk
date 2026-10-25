// Browser checks for the voice controls (voice-controls, #77): the Voices group in Compose (Narrator voice, Narrator
// style, Narrated growth), part of the song's trial, Narrated growth and the style disabled with the narrator off; the
// same group in the radio Custom section; the voice instrument in the radio (presets, Custom when a control changes,
// the options in the session recipe) and for a new song by an artist (on, off, presets; Obsessive gives one line
// repeated); the Italian labels. Screenshots of each part when a folder is given.
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
    const box = await page.evaluate(([sel, pad]) => { const el = document.querySelector(sel); if (!el) return null; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: Math.min(innerWidth - Math.max(0, r.left - pad), r.width + 2 * pad), height: r.height + 2 * pad }; }, [sel, pad]);
    if (box) await page.screenshot({ path: path.join(shots, name), clip: box });
  };
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); });
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  const compose = async () => { await page.click('[data-tab="componi"]'); await sleep(300); };
  const open = async id => { await compose(); await page.selectOption('#track-pick', id); await sleep(1200); };
  const trials = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-song-trials') || '{}'));
  const voices = () => page.evaluate(() => {
    const g = document.querySelector('#live-voices'), a = document.querySelector('#live-narrator'), st = document.querySelector('#live-narrator-style'), b = document.querySelector('#live-narrated');
    return { shown: !!g && !g.closest('[hidden]') && g.offsetParent !== null, label: g.querySelector('.lbl').textContent, inGroup: [a, st, b].every(x => x && x.closest('#live-voices') === g),
      order: [a, st, b].map(x => [...g.querySelectorAll('button, select')].indexOf(x)).join(), narrator: a.getAttribute('aria-pressed'), style: st.value, styleOff: st.disabled,
      options: [...st.options].map(o => `${o.value}:${o.textContent}`), narrated: b.textContent, narratedTip: b.title, narratedOff: b.disabled, narratedShown: !b.hidden };
  });

  // Compose: the Voices group on luci-rosse with Crescendo
  await open('luci-rosse');
  await page.click('#live-toggle'); await sleep(400);
  await page.click('#live-profile [data-profile="crescendo"]'); await sleep(1500);
  let v = await voices();
  check(v.shown && v.label === 'Voices' && v.inGroup && v.order === '0,1,2', 'Compose: the Voices group holds Narrator voice, Narrator style and Narrated growth, in this order', JSON.stringify(v));
  check(v.options.join() === 'auto:automatic,explain:explaining,poetic:poetic' && v.style === 'auto' && !v.styleOff, 'Narrator style: automatic, explaining, poetic; automatic by default', v.options.join());
  check(v.narrated === 'Narrated growth' && /denser/.test(v.narratedTip) && /each one|every one/.test(v.narratedTip) && v.narratedShown && !v.narratedOff, 'Fully narrated is now Narrated growth, with its hint', v.narratedTip);
  await page.selectOption('#live-narrator-style', 'poetic'); await sleep(1500);
  let tr = await trials();
  v = await voices();
  check(v.style === 'poetic' && tr['luci-rosse'] && tr['luci-rosse'].options.narratorStyle === 'poetic' && !(await page.isHidden('#live-custom')), 'Narrator style poetic: part of the song\'s trial, the profile is custom', JSON.stringify(tr['luci-rosse']));
  await shot('#live-voices', 'compose-voci-poetico.png');
  // what the narrator says while luci-rosse grows: short images in poetic, explanations in automatic (needs the samples)
  const spoken = async ms => { await page.click('#play'); const seen = new Set(); for (let t = 0; t < ms; t += 250) { const x = await page.evaluate(() => [...(document.querySelector('strudel-editor').editor.code || '').matchAll(/\/\/ "([^"]+)", spoken on bar/g)].map(m => m[1])); x.forEach(y => seen.add(y)); await sleep(250); } await page.click('#stop'); await sleep(500); return [...seen]; };
  const images = await page.evaluate(async () => { const m = await import('/src/song/vocabulary.js'); return Object.values(m.POETIC).flat().map(x => x.en); });
  const hasSay = await page.evaluate(async () => { try { const m = await (await fetch('/samples/strudel.json')).json(); return Object.keys(m).some(k => /^say_/.test(k)); } catch (e) { return false; } });
  if (hasSay) {
    let heard = await spoken(16000);
    check(heard.length >= 1 && heard.every(x => images.includes(x)), 'poetic on luci-rosse: the narrator speaks short images', JSON.stringify(heard));
    await page.selectOption('#live-narrator-style', 'auto'); await sleep(1500);
    heard = await spoken(16000);
    check(heard.length >= 1 && !heard.some(x => images.includes(x)), 'automatic on luci-rosse: the narrator explains, as the song says', JSON.stringify(heard));
    await page.selectOption('#live-narrator-style', 'poetic'); await sleep(1500);
  } else console.log('      (no spoken samples on this machine: npm run voices; the narrator is not played)');
  await page.click('#live-narrator'); await sleep(1200);
  v = await voices();
  check(v.narrator === 'false' && v.narratedOff && v.styleOff && /Narrator voice on/.test(v.narratedTip), 'Narrator voice off: Narrated growth and Narrator style disabled, with the hint', JSON.stringify(v));
  await shot('#live-voices', 'compose-voci-narratore-spento.png');
  await page.click('#live-narrator'); await sleep(1200);
  await page.selectOption('#live-narrator-style', 'auto'); await sleep(1200);
  tr = await trials();
  check(!('narratorStyle' in ((tr['luci-rosse'] || {}).options || {})), 'automatic again: the style leaves the trial', JSON.stringify(tr['luci-rosse']));
  // the Live build off: the group hides with the other live build controls
  await page.click('#cfg-reset'); await sleep(1200);
  check(!(await voices()).shown, 'Live build off: the Voices group is hidden');
  await shot('#live-style-wrap', 'compose-pannello-live-off.png');

  // a new song by an artist: the voice instrument menu next to the artist picker
  await compose();
  await page.click('#tr-artist-voice > summary'); await sleep(300);
  const pop = () => page.evaluate(() => { const b = document.querySelector('#tr-artist-voice-body'); return { open: document.querySelector('#tr-artist-voice').open, presence: b.querySelector('[data-vinst="presence"]').value, presences: [...b.querySelectorAll('[data-vinst="presence"] option')].map(o => o.value).join(), preset: (b.querySelector('[data-vinst-preset][aria-pressed="true"]') || {}).dataset?.vinstPreset || 'custom', custom: !!b.querySelector('[data-vinst-custom]'), phrases: b.querySelector('[data-vinst="phrases"]').value, kind: b.querySelector('[data-vinst="kind"]').value, ways: [...b.querySelectorAll('[data-vinst-way][aria-pressed="true"]')].map(x => x.dataset.vinstWay).join(), now: document.querySelector('#tr-artist-voice-now').textContent }; });
  let p = await pop();
  check(p.open && p.presence === 'style' && p.presences === 'style,always,never' && p.preset === 'style' && p.phrases === '1' && p.kind === 'different' && p.ways === '', 'new song from artist: the menu opens on As the style (as the style, on, off)', JSON.stringify(p));
  await page.selectOption('#tr-artist-voice-body [data-vinst="presence"]', 'always'); await sleep(300);
  await page.click('#tr-artist-voice-body [data-vinst-preset="obsessive"]'); await sleep(300);
  p = await pop();
  check(p.presence === 'always' && p.preset === 'obsessive' && p.phrases === '6-8' && p.kind === 'repeated' && p.ways === 'refrain,chop' && /Obsessive/.test(p.now), 'on + Obsessive: 6 to 8, repeated, refrain and chop; the button says so', JSON.stringify(p));
  await shot('#tr-artist-voice-body', 'nuovo-brano-artista-ossessivo.png');
  await page.selectOption('#tr-artist-voice-body [data-vinst="phrases"]', '4-5'); await sleep(300);
  p = await pop();
  check(p.preset === 'custom' && p.custom && p.phrases === '4-5', 'a control changed: Custom', JSON.stringify(p));
  await page.click('#tr-artist-voice-body [data-vinst-preset="obsessive"]'); await sleep(300);
  // Obsessive: the new song speaks one line, repeated in the quiet parts
  const artist = await page.evaluate(() => [...document.querySelectorAll('#tr-artist option')].map(o => o.value).find(Boolean));
  await page.click('#tr-artist-voice > summary'); await sleep(200);
  await page.selectOption('#tr-artist', artist); await sleep(2500);
  const song = await page.evaluate(() => { const T = globalThis.codingMiskPatterns.compose().T, w = (T.tracks || []).find(t => t.type === 'spoken'); return w ? { patterns: Object.keys(w.patterns), clips: w.clips.map(c => c.pattern), ways: Object.values(w.patterns).map(x => x.way) } : null; });
  check(song && song.patterns.join() === 'A' && song.clips.length >= 1 && song.clips.every(c => c === 'A') && song.ways.every(w => ['refrain', 'chop'].includes(w)), `a new song by ${artist} with Obsessive: one line, ${song ? song.clips.length : 0} times`, JSON.stringify(song));
  await page.click('#tr-artist-voice > summary'); await sleep(300);
  await page.selectOption('#tr-artist-voice-body [data-vinst="presence"]', 'never'); await sleep(300);
  check(await page.evaluate(() => [...document.querySelectorAll('#tr-artist-voice-body [data-vinst-preset], #tr-artist-voice-body [data-vinst="phrases"]')].every(x => x.disabled)), 'off: the phrase controls are disabled');
  await page.click('#tr-artist-voice > summary'); await sleep(200);
  // (the song before is unsaved: the second pick confirms)
  await page.selectOption('#tr-artist', artist); await sleep(300); await page.selectOption('#tr-artist', artist); await sleep(2500);
  check(await page.evaluate(() => !globalThis.codingMiskPatterns.compose().T.tracks.some(t => t.type === 'spoken')), 'off: the new song has no voice instrument');
  // on, 4 to 5 different phrases: each phrase that starts a section is heard there (fx analyser, the narrator off so
  // only the voice instrument speaks); needs the spoken samples (npm run voices)
  const hasSamples = await page.evaluate(async () => { try { const m = await (await fetch('/samples/strudel.json')).json(); return Object.keys(m).some(k => /^say_/.test(k)); } catch (e) { return false; } });
  if (!hasSamples) console.log('      (no spoken samples on this machine: npm run voices; the phrases are not played)');
  else {
    await page.click('#tr-artist-voice > summary'); await sleep(300);
    await page.selectOption('#tr-artist-voice-body [data-vinst="presence"]', 'always'); await sleep(200);
    await page.selectOption('#tr-artist-voice-body [data-vinst="phrases"]', '4-5'); await page.selectOption('#tr-artist-voice-body [data-vinst="kind"]', 'different'); await sleep(200);
    await page.click('#tr-artist-voice > summary'); await sleep(200);
    await page.selectOption('#tr-artist', artist); await sleep(300); await page.selectOption('#tr-artist', artist); await sleep(3000);
    const four = await page.evaluate(() => { const T = globalThis.codingMiskPatterns.compose().T, w = T.tracks.find(t => t.type === 'spoken'); let at = 0; const secs = T.sections.map((s, i) => { const o = { i, name: s.name, start: at, bars: s.bars, bpm: s.bpm }; at += s.bars; return o; }); return w ? { clips: w.clips.map(c => ({ ...c, start: c.start ?? secs.find(s => s.name === c.section).start })), patterns: Object.keys(w.patterns), secs } : null; });
    check(four && four.clips.length >= 2 && new Set(four.clips.map(c => c.pattern)).size === four.clips.length, `on, 4 to 5 different: ${four ? four.clips.length : 0} different phrases`, JSON.stringify(four && four.clips));
    if (four) {
      await page.click('#live-narrator'); await sleep(1500);
      await page.click('#play'); await sleep(2000);
      if (!(await page.isChecked('#sc-loop'))) await page.click('#sc-loop');
      // (not bar 1: a song that grows plays its growth there first, and the line waits for the written part, #76)
      const tried = four.clips.map(c => ({ c, s: four.secs.find(x => x.start === c.start) })).filter(x => x.s && x.c.start > 0).slice(0, 3);
      for (const { c, s } of tried) {
        for (let k = 0; k < 6; k++) { try { await page.click(`[data-scene-i="${s.i}"]`, { timeout: 2000 }); break; } catch (e) { await sleep(500); } }
        await sleep(300);
        const r = await page.evaluate(async ms => { const ed = document.querySelector('strudel-editor').editor; let fx = 0; for (let t = 0; t < ms; t += 50) { if (window.analysers && window.analysers.fx) { const d = getAnalyzerData('time', 'fx'); for (const v of d) fx = Math.max(fx, Math.abs(v)); } await new Promise(r => setTimeout(r, 50)); } return { err: String(ed.repl.state.evalError || ''), fx, say: (ed.code.match(/^.*say_.*$/gm) || []).map(l => l.slice(0, 120)), note: (ed.code.match(/^\/\/ ".*$/gm) || []).join(' | ') }; }, Math.min(14, c.bars * 4 * 60 / (s.bpm || 120)) * 1000);
        if (r.fx <= 0.02) console.log('      ', JSON.stringify(await page.evaluate(k => { const w = globalThis.codingMiskPatterns.compose().T.tracks.find(t => t.type === 'spoken'); return { pat: w.patterns[k], speaker: w.settings.speaker }; }, c.pattern)), r.note, r.say.join(' || '));
        check(!r.err && r.fx > 0.02, `phrase ${c.pattern} in ${s.name} (bar ${c.start + 1}) is heard, no evaluation error`, `fx peak ${r.fx.toFixed(2)}${r.err ? `, ${r.err}` : ''}`);
      }
      if (!tried.length) console.log('      (no phrase starts a section in this song: nothing played)');
      await page.click('#stop'); await sleep(500);
      if (shots) { await page.locator('#arranger').screenshot({ path: path.join(shots, 'nuovo-brano-4-5-frasi.png') }).catch(() => {}); }
    }
  }

  // the radio: the voice instrument with its presets, in the recipe
  await page.click('[data-tab="radio"]'); await sleep(800);
  const rv = () => page.evaluate(() => { const b = document.querySelector('#radio-voice'); return b && { shown: b.offsetParent !== null, label: b.querySelector(':scope > .lbl').textContent, presence: b.querySelector('[data-vinst="presence"]').value, presences: [...b.querySelectorAll('[data-vinst="presence"] option')].map(o => o.value).join(), preset: (b.querySelector('[data-vinst-preset][aria-pressed="true"]') || {}).dataset?.vinstPreset || 'custom', custom: !!b.querySelector('[data-vinst-custom]'), phrases: b.querySelector('[data-vinst="phrases"]').value, kind: b.querySelector('[data-vinst="kind"]').value, ways: [...b.querySelectorAll('[data-vinst-way][aria-pressed="true"]')].map(x => x.dataset.vinstWay).join(), styleWays: !!b.querySelector('[data-vinst-style-ways]'), options: globalThis.codingMiskRadio.options.voice || null }; });
  let r = await rv();
  check(r && r.shown && r.label === 'Voice instrument' && r.preset === 'style' && r.presence === 'style' && r.presences === 'never,style,often' && r.styleWays && !r.options, 'radio: Voice instrument on As the style, nothing in the options', JSON.stringify(r));
  await shot('#radio-voice', 'radio-voce-come-stile.png');
  for (const [id, want] of [['discreet', { phrases: '1', kind: 'different', ways: 'opening,refrain,chop,passage', presence: 'style' }], ['present', { phrases: '2-3', kind: 'mixed', ways: '', presence: 'often' }], ['obsessive', { phrases: '6-8', kind: 'repeated', ways: 'refrain,chop', presence: 'often' }]]) {
    await page.click(`#radio-voice [data-vinst-preset="${id}"]`); await sleep(400);
    r = await rv();
    check(r.preset === id && r.phrases === want.phrases && r.kind === want.kind && r.ways === want.ways && r.presence === want.presence && r.options && r.options.phrases === want.phrases, `radio preset ${id}: its controls, in the options`, JSON.stringify(r));
  }
  await shot('#radio-voice', 'radio-voce-ossessivo.png');
  await page.click('#radio-voice [data-vinst-way="passage"]'); await sleep(400);
  r = await rv();
  check(r.preset === 'custom' && r.custom && r.ways === 'refrain,chop,passage', 'a way added: Custom', JSON.stringify(r));
  await page.selectOption('#radio-voice [data-vinst="phrases"]', '4-5'); await page.selectOption('#radio-voice [data-vinst="kind"]', 'different'); await sleep(400);
  r = await rv();
  check(r.preset === 'custom' && r.options.phrases === '4-5' && r.options.kind === 'different', '4 to 5 different phrases, in the options', JSON.stringify(r.options));
  await shot('#radio-voice', 'radio-voce-personalizzato.png');
  // the options travel in the session recipe
  await page.click('#radio-start'); await sleep(4000);
  const rec = await page.evaluate(() => globalThis.codingMiskRadio.state && globalThis.codingMiskRadio.state.recipe.options.voice);
  check(rec && rec.phrases === '4-5' && rec.kind === 'different' && rec.ways.join() === 'refrain,chop,passage', 'the session recipe carries the voice options', JSON.stringify(rec));
  await page.click('#radio-start'); await sleep(800);
  await page.click('#radio-voice [data-vinst-preset="style"]'); await sleep(400);
  r = await rv();
  check(r.preset === 'style' && !r.options, 'As the style again: nothing in the options', JSON.stringify(r));

  // the radio Custom section: the same Voices group
  await page.selectOption('#radio-profile', 'custom'); await sleep(600);
  if (await page.isHidden('#custom-body')) { await page.click('#custom-toggle'); await sleep(300); }
  const cv = () => page.evaluate(() => { const g = document.querySelector('#custom-voices'); if (!g) return null; const a = g.querySelector('[data-custom-chip="narrator"]'), st = g.querySelector('[data-custom="narratorStyle"]'), b = g.querySelector('[data-custom-chip="narrated"]'); return { label: g.querySelector(':scope > .lbl').textContent, all: !!(a && st && b), style: st && st.value, styleOff: st && st.disabled, narrated: b && b.textContent, narratedOff: b && b.disabled, saved: (JSON.parse(localStorage.getItem('coding-misk-radio') || '{}').custom || {}).controls || {} }; });
  let c = await cv();
  check(c && c.label === 'Voices' && c.all && c.style === 'auto' && c.narrated === 'Narrated growth', 'radio Custom: the Voices group with the three controls', JSON.stringify(c));
  await page.selectOption('#custom-voices [data-custom="narratorStyle"]', 'poetic'); await sleep(500);
  c = await cv();
  check(c.style === 'poetic' && c.saved.narratorStyle === 'poetic', 'radio Custom: Narrator style poetic kept for the next songs', JSON.stringify(c.saved));
  await shot('#custom-voices', 'radio-personalizzato-voci.png');
  await page.click('#custom-voices [data-custom-chip="narrator"]'); await sleep(500);
  c = await cv();
  check(c.narratedOff && c.styleOff, 'radio Custom: narrator off, Narrated growth and Narrator style disabled', JSON.stringify(c));
  await page.click('#custom-voices [data-custom-chip="narrator"]'); await sleep(300);

  // Italian
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'it'));
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  await open('luci-rosse');
  await page.click('#live-toggle'); await sleep(400);
  await page.click('#live-profile [data-profile="crescendo"]'); await sleep(1500);
  v = await voices();
  check(v.label === 'Voci' && v.narrated === 'Crescita raccontata' && v.options.join() === 'auto:automatico,explain:spiega,poetic:poetico', 'Italian: Voci, Stile del narratore, Crescita raccontata', JSON.stringify(v));
  await shot('#live-voices', 'compose-voci-it.png');
  await page.click('[data-tab="radio"]'); await sleep(800);
  await page.click('#radio-voice [data-vinst-preset="present"]'); await sleep(400);
  const it = await page.evaluate(() => ({ label: document.querySelector('#radio-voice > .lbl').textContent, presets: [...document.querySelectorAll('#radio-voice [data-vinst-preset]')].map(x => x.textContent).join() }));
  check(it.label === 'Voce strumento' && it.presets === 'Come lo stile,Discreto,Presente,Ossessivo', 'Italian: Voce strumento and its presets', JSON.stringify(it));
  await shot('#radio-voice', 'radio-voce-presente-it.png');
  await page.click('#radio-voice [data-vinst-preset="style"]'); await sleep(300);

  check(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
