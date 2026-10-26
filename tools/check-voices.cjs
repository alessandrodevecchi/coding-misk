// Browser checks for the voice controls (voice-controls, voice-placement and voice-full-controls, #77, #82).
// Compose: the Voices group with a block per voice, each with its switch (the narrator on, the voice track's mute); the
// folded Sound parts write the voice track's settings (one value with the track panel, a style picker that follows hand
// edits, a Narrator track added on the first edit with Undo, looking adds nothing), disabled with the reason; the phrase
// list of the voice track (sorted rows, text and bars edited in place with Undo, Fill with, + Add line, the bin, the
// last row) with heard bars in Crescendo (a typed bar stored as written, a bar in the growth refused); the narrator's
// lines (read-only in Crescendo, editable for written steps); Where; In the next song. Radio: the Voices group for the
// next songs (two blocks, switches, How often without Mai and with Sempre, a saved Mai and an old Custom profile with
// the narrator off, presets that keep Sempre, the Sound parts, Fill with, no on-air button). Italian labels.
// Screenshots of each part when a folder is given.
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
    const box = await page.evaluate(([sel, pad]) => { const el = document.querySelector(sel); if (!el) return null; el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); const r = el.getBoundingClientRect(); return { x: Math.max(0, r.left - pad), y: Math.max(0, r.top - pad), width: Math.min(innerWidth - Math.max(0, r.left - pad), r.width + 2 * pad), height: Math.min(r.height + 2 * pad, innerHeight - Math.max(0, r.top - pad) - 60) }; }, [sel, pad]);
    if (box) await page.screenshot({ path: path.join(shots, name), clip: box });
  };
  const toastText = () => page.evaluate(() => [...document.querySelectorAll('.toast')].filter(x => !x.hidden).map(x => x.textContent).join(' | '));
  const undo = async () => { await page.click('.toast .toast-act'); await sleep(1000); };
  const openParts = sel => page.evaluate(sel => { for (const d of document.querySelectorAll(`${sel} details`)) d.open = true; }, sel);
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  // stored new-song options from voice-controls are read as before (same key and shape)
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-artist-voice', JSON.stringify({ preset: 'present', phrases: '2-3', kind: 'mixed', ways: null, presence: 'always' })); });
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  const compose = async () => { await page.click('[data-tab="componi"]'); await sleep(300); };
  // (a song with changes asks to press twice before another one opens)
  const open = async id => { await compose(); for (let k = 0; k < 3; k++) { await page.selectOption('#track-pick', id); await sleep(1200); if ((await page.evaluate(() => globalThis.codingMiskPatterns.compose().T.id)) === id) break; } };
  const T = () => page.evaluate(() => globalThis.codingMiskPatterns.compose());
  const live = async profile => { if ((await page.getAttribute('#live-toggle', 'aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(400); } await page.click(`#live-profile [data-profile="${profile}"]`); await sleep(1800); };
  const voices = () => page.evaluate(() => {
    const g = document.querySelector('#live-voices'), a = document.querySelector('#live-narrator'), st = document.querySelector('#live-narrator-style'), b = document.querySelector('#live-narrated'), ps = document.querySelector('[data-vsound="narrator:pitch"]');
    return { shown: !!g && g.offsetParent !== null, label: g.querySelector('.lbl').textContent, sub: document.querySelector('#live-narrator-sub').textContent, switchTxt: a.textContent.trim(), narrator: a.getAttribute('aria-pressed'), narratorOff: a.disabled, narratorTip: a.title,
      style: st.value, styleOff: st.disabled, styleTip: st.title, options: [...st.options].map(o => `${o.value}:${o.textContent}`), narrated: b.textContent, narratedTip: b.title, narratedOff: b.disabled,
      greyed: document.querySelector('#live-narrator-row').classList.contains('off'), soundOff: !!ps && ps.disabled, soundTip: ps ? ps.closest('.ctrl').title : '', vinst: !!g.querySelector('#live-vinst'), next: !!g.querySelector('#live-vinst-next') };
  });

  // ---------- Compose: the narrator block ----------
  await open('luci-rosse');
  let v = await voices();
  check(v.shown && v.label === 'Voices' && v.sub === 'Voice: narrator' && v.switchTxt === 'On' && v.vinst && v.next, 'Live build off: the Voices group shows the Voice: narrator block with its On switch, the voice track and the next song', JSON.stringify(v));
  check(v.narratorOff && v.styleOff && v.narratedOff && v.soundOff && /Live build/.test(v.narratorTip) && /Live build/.test(v.soundTip), 'Live build off: the switch, the style, Narrated growth and the Sound controls are disabled, the tooltip says the song does not build live', `${v.narratorTip} | ${v.soundTip}`);
  await shot('#live-voices', 'compose-voci-live-spento.png');
  await live('classic');
  v = await voices();
  check(!v.narratorOff && !v.styleOff && !v.soundOff && v.narratedOff && /crescendo/i.test(v.narratedTip), 'In blocks: the narrator and its Sound work, Narrated growth disabled (needs Crescendo)', v.narratedTip);
  await live('crescendo');
  v = await voices();
  check(v.options.join() === 'auto:automatic,explain:explaining,poetic:poetic' && v.style === 'auto' && !v.styleOff && !v.narratedOff, 'Crescendo: Narrator style (automatic by default) and Narrated growth enabled', v.options.join());
  await page.click('#live-narrator'); await sleep(1200);
  v = await voices();
  check(v.narrator === 'false' && v.switchTxt === 'Off' && v.greyed && v.narratedOff && v.styleOff && v.soundOff && /Switch Voice: narrator on/.test(v.soundTip), 'narrator switched off: the block greyed, Narrated growth, style and Sound disabled with the hint', JSON.stringify(v));
  await page.click('#live-narrator'); await sleep(1200);
  check((await voices()).narrator === 'true' && !(await voices()).greyed, 'narrator switched on again');
  await page.click('#cfg-reset'); await sleep(1200);

  // one value per control: the narrator's Sound and its track (luci-rosse has no narrator track)
  await live('classic');
  const n0 = (await T()).T.tracks.length;
  await page.evaluate(() => { const d = document.querySelector('#live-narrator-parts details.vs-part'); d.open = true; }); await sleep(300);
  await page.evaluate(() => { const d = document.querySelector('#live-narrator-parts details.vs-part'); d.open = false; }); await sleep(300);
  let c = await T();
  check(c.T.tracks.length === n0 && !c.T.tracks.some(t => t.type === 'voice'), 'opening and closing Sound adds no track to the song');
  await page.evaluate(() => { const d = document.querySelector('#live-narrator-parts details.vs-part'); d.open = true; }); await sleep(200);
  check(await page.$eval('[data-vsound="narrator:pitch"]', i => +i.value === 1 && +i.min === 0.5 && +i.max === 2 && +i.step === 0.05), 'Sound shows the default narrator sound, with the ranges of the track panel');
  await page.selectOption('[data-vsound-style="narrator"]', 'deep'); await sleep(1000);
  c = await T();
  let nar = c.T.tracks.find(t => t.type === 'voice');
  check(nar && nar.name === 'Narrator' && nar.settings.pitch === 0.55 && nar.settings.tempo === 0.75 && nar.settings.cutoff === 6000 && /Narrator/.test(await toastText()), 'first edit: the voice style Deep adds a Narrator track with the Deep settings, the toast offers Undo', JSON.stringify(nar && nar.settings));
  await shot('#live-voices', 'compose-voci-suono.png');
  await undo();
  c = await T();
  check(!c.T.tracks.some(t => t.type === 'voice'), 'Undo takes the Narrator track away again');
  await page.selectOption('[data-vsound-style="narrator"]', 'radio'); await sleep(1000);
  c = await T(); nar = c.T.tracks.find(t => t.type === 'voice');
  const ti = c.T.tracks.indexOf(c.T.tracks.find(t => t.type === 'voice'));
  // group to panel, panel to group
  await page.click(`#arr-grid [data-trk="${ti}"]`); await sleep(600);
  const panelVal = k => page.evaluate(([ti, k]) => { const i = document.querySelector(`#track-panel [data-ptrk="${ti}"] [data-set="${k}"]`); return i ? +i.value : null; }, [ti, k]);
  await page.$eval('[data-vsound="narrator:pitch"]', i => { i.value = 0.8; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(600);
  check((await panelVal('pitch')) === 0.8 && (await T()).T.tracks[ti].settings.pitch === 0.8, 'group to panel: pitch 0.8 in the Voices group shows at once in the narrator panel', String(await panelVal('pitch')));
  await page.$eval(`#track-panel [data-ptrk="${ti}"] [data-set="room"]`, i => { i.value = 0.5; i.dispatchEvent(new Event('input', { bubbles: true })); }); await sleep(600);
  const gs = await page.evaluate(() => ({ room: +document.querySelector('[data-vsound="narrator:room"]').value, style: document.querySelector('[data-vsound-style="narrator"]').value }));
  const ps = await page.evaluate(ti => (document.querySelector(`#track-panel [data-ptrk="${ti}"] [data-vstyle]`) || {}).value, ti);
  check(gs.room === 0.5 && gs.style === 'custom' && ps === 'custom', 'panel to group: the reverb moved in the panel shows in the group, and both style pickers say Custom', JSON.stringify({ gs, ps }));
  await page.selectOption(`#track-panel [data-ptrk="${ti}"] [data-set="speaker"]`, 'reed'); await sleep(600);
  check(await page.$eval('[data-vsound="narrator:speaker"]', s => s.value) === 'reed', 'panel to group: the speaker Reed picked in the panel shows in the group');
  await page.click('#cfg-reset').catch(() => {}); await sleep(600);

  // ---------- Compose: the voice track ----------
  await open('luci-rosse');
  await live('classic');
  const song = () => page.evaluate(() => { const T = globalThis.codingMiskPatterns.compose().T, w = T.tracks.find(x => x.type === 'spoken'); return w ? { id: w.id, mute: !!w.mute, clips: w.clips.map(c => ({ start: c.start ?? 0, bars: c.bars, pattern: c.pattern })), patterns: Object.keys(w.patterns), texts: Object.values(w.patterns).map(p => JSON.stringify(p.text)), options: w.voiceOptions || null, settings: w.settings } : null; });
  check(!(await song()) && await page.isVisible('#live-vinst [data-vinst-add]') && (await page.textContent('#live-vinst [data-vinst-add]')) === 'Add Voice: track', 'a song without a voice track: the group offers Add Voice: track');
  await page.click('#live-vinst [data-vinst-add]'); await sleep(1500);
  let s = await song();
  check(s && s.clips.length >= 1 && await page.isVisible('#live-vinst [data-vinst-switch]'), 'Add: a voice track with one phrase, the block shows its switch', JSON.stringify(s && s.clips));
  await openParts('#live-vinst'); await sleep(200);
  await page.selectOption('#live-vinst [data-vinst="phrases"]', '4-5'); await sleep(1500);
  s = await song();
  check(s && s.options && s.options.phrases === '4-5' && s.clips.length >= 2 && new Set(s.clips.map(c => c.start)).size === s.clips.length, `4 to 5 phrases: ${s ? s.clips.length : 0}, one per part`, JSON.stringify(s && s.clips));
  // the switch: the track's mute, values kept, the block greyed
  const settings0 = JSON.stringify(s.settings), clips0 = JSON.stringify(s.clips);
  await page.click('#live-vinst [data-vinst-switch]'); await sleep(1000);
  s = await song();
  const blk = await page.evaluate(() => ({ off: document.querySelector('#live-vinst').classList.contains('off'), timeline: (document.querySelector(`#arr-grid [data-mute="${globalThis.codingMiskPatterns.compose().T.tracks.findIndex(x => x.type === 'spoken')}"]`) || {}).getAttribute?.('aria-pressed'), fill: (document.querySelector('#live-vinst [data-pl-fill]') || {}).disabled }));
  check(s.mute && blk.off && blk.timeline === 'true' && blk.fill && JSON.stringify(s.settings) === settings0 && JSON.stringify(s.clips) === clips0, 'Voice: track off: the track muted in the timeline, the block greyed, phrases and sound kept', JSON.stringify(blk));
  if (shots) await shot('#live-vinst', 'compose-voce-traccia-spenta.png');
  await undo();
  s = await song();
  check(!s.mute && !(await page.evaluate(() => document.querySelector('#live-vinst').classList.contains('off'))), 'Undo: the voice track on again, as before');
  // the phrase list
  await openParts('#live-vinst'); await sleep(200);
  const rows = () => page.evaluate(() => [...document.querySelectorAll('#live-vinst .pl-row:not(.pl-cols)')].map(r => ({ raw: +r.dataset.plRow, start: +r.querySelector('[data-pl-start]').value, bars: +r.querySelector('[data-pl-bars]').value, text: r.querySelector('[data-pl-text]').value, said: r.querySelector('.pl-said').textContent, src: r.querySelector('.pl-src').textContent, sample: r.querySelector('.pl-sample').textContent })));
  let rs = await rows();
  check(rs.length === s.clips.length && rs.every((r, i) => !i || rs[i - 1].start <= r.start), 'the phrase list: one row per clip, sorted by bar', rs.map(r => r.start).join());
  const panelRows = await page.evaluate(() => { const ti = globalThis.codingMiskPatterns.compose().T.tracks.findIndex(x => x.type === 'spoken'); document.querySelector(`#arr-grid [data-trk="${ti}"]`).click(); return null; }).then(() => sleep(600)).then(() => page.evaluate(() => [...document.querySelectorAll('#track-panel .pl-row:not(.pl-cols) [data-pl-start]')].map(i => +i.value)));
  check(JSON.stringify(panelRows) === JSON.stringify(rs.map(r => r.start)), 'the same list in the track panel', JSON.stringify(panelRows));
  // Fill with
  await page.selectOption('#live-vinst [data-pl-fill]', 'night'); await sleep(1200);
  let rf = await rows();
  check(rf.length === rs.length && rf.every((r, i) => r.start === rs[i].start) && new Set(rf.map(r => r.text)).size === rf.length && rf.every(r => /night/.test(r.src)) && await page.$eval('#live-vinst [data-pl-fill]', x => x.value) === 'night', 'Fill with Night: every row an unused Night entry, bars kept, the select shows Night', JSON.stringify(rf.map(r => r.text)));
  if (shots) { await page.evaluate(() => document.querySelector('#live-vinst .pl').scrollIntoView({ block: 'center' })); await shot('#live-vinst .vb-phrases', 'compose-frasi-riempi.png'); }
  // edit a text in place
  const r1 = rf[1];
  await page.fill(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'the signal is late'); await page.press(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'Enter'); await sleep(1200);
  rf = await rows();
  const e1 = rf.find(r => r.raw === r1.raw);
  check(e1 && e1.text === 'the signal is late' && /written here/.test(e1.src) && await page.$eval('#live-vinst [data-pl-fill]', x => x.value) === 'mixed', 'a text edited in place: written here, the select says mixed', JSON.stringify(e1));
  await page.fill(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen'); await page.press(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'Enter'); await sleep(800);
  check(/at most 12/.test(await toastText()) && (await rows()).find(r => r.raw === r1.raw).text === 'the signal is late', 'a 15-word line is refused, the limit is 12 words', await toastText());
  await page.fill(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'another line'); await page.press(`#live-vinst [data-pl-row="${r1.raw}"] [data-pl-text]`, 'Enter'); await sleep(1000);
  await undo();
  check((await rows()).find(r => r.raw === r1.raw).text === 'the signal is late', 'Undo brings the old line back');
  // a bar moved in place
  const last = rf[rf.length - 1];
  await page.fill(`#live-vinst [data-pl-row="${last.raw}"] [data-pl-start]`, String(last.start + 2)); await page.press(`#live-vinst [data-pl-row="${last.raw}"] [data-pl-start]`, 'Enter'); await sleep(1000);
  s = await song();
  check(s.clips.some(c => c.start === last.start + 1), 'a bar edited in place moves the clip (the timeline shows it)', JSON.stringify(s.clips));
  // remove, the last row, add
  const n1 = (await rows()).length;
  await page.click(`#live-vinst .pl-row:not(.pl-cols) [data-pl-del]`); await sleep(1000);
  check((await rows()).length === n1 - 1, 'the bin removes a row (clip and line)');
  await undo();
  check((await rows()).length === n1, 'Undo brings the row back');
  for (let k = 0; k < n1; k++) { await page.click('#live-vinst .pl-row:not(.pl-cols) [data-pl-del]'); await sleep(700); }
  s = await song();
  check(s && !s.clips.length && /\+ Add line/.test(await page.textContent('#live-vinst .pl-empty')), 'the last row removed: the track stays, empty, with a hint', JSON.stringify(s && s.clips));
  await page.click('#live-vinst [data-pl-add]'); await sleep(1200);
  rs = await rows();
  const focused = await page.evaluate(() => !!document.activeElement && document.activeElement.matches('#live-vinst [data-pl-text]') && document.activeElement.value === '');
  check(rs.length === 1 && focused, '+ Add line: a row in a free part, its text cell empty and focused', JSON.stringify(rs));
  await page.keyboard.type('a line of my own'); await page.keyboard.press('Enter'); await sleep(1000);
  rs = await rows();
  check(rs[0].text === 'a line of my own' && /written here/.test(rs[0].src), 'the new row says the line typed in it', JSON.stringify(rs[0]));
  await page.selectOption('#live-vinst [data-pl-fill]', 'calm'); await sleep(1000);
  await page.click('#live-vinst [data-pl-add]'); await sleep(1200);
  rs = await rows();
  check(rs.length === 2 && rs.every(r => /calm/.test(r.src)), 'Fill with Calm, then + Add line: the next unused Calm entry', JSON.stringify(rs.map(r => r.text)));
  // Where: the busy parts on
  await page.click('#live-vinst [data-vinst-where="busy"]'); await sleep(1200);
  s = await song();
  check(s.options && JSON.stringify(s.options.where) === '["quiet","busy"]', 'Where: busy parts on, kept on the track', JSON.stringify(s.options));
  if (shots) { await openParts('#live-vinst'); await shot('#live-vinst', 'compose-voci-frasi.png'); }

  // heard bars in Crescendo (example-voices), the narrator lines
  await open('example-voices');
  await live('crescendo'); await sleep(1500);
  await openParts('#live-voices'); await sleep(300);
  rs = await rows();
  const G = await page.evaluate(() => { const h = document.querySelector('#live-vinst .pl-head .hint'); const m = h && h.textContent.match(/bar (\d+)/); return m ? +m[1] - 1 : 0; });
  check(G > 0 && rs.every(r => r.said.includes(`written ${r.start - G}`)), `Crescendo: rows show the bar heard and the written one (the written song starts at bar ${G + 1})`, rs.map(r => `${r.start} ${r.said}`).join(' | '));
  const r0 = rs[1];
  await page.fill(`#live-vinst [data-pl-row="${r0.raw}"] [data-pl-start]`, String(r0.start + 8)); await page.press(`#live-vinst [data-pl-row="${r0.raw}"] [data-pl-start]`, 'Enter'); await sleep(2500);
  s = await song();
  check(s.clips.some(c => c.start === r0.start + 8 - 1 - G), 'a heard bar typed in Crescendo is stored as written', JSON.stringify(s.clips));
  await openParts('#live-voices'); await sleep(200);
  const r2 = (await rows())[0];
  await page.fill(`#live-vinst [data-pl-row="${r2.raw}"] [data-pl-start]`, '3'); await page.press(`#live-vinst [data-pl-row="${r2.raw}"] [data-pl-start]`, 'Enter'); await sleep(800);
  check(new RegExp(`bar ${G + 1}`).test(await toastText()), 'a bar inside the growth is refused with the first bar that works', await toastText());
  const nl = await page.evaluate(() => ({ rows: document.querySelectorAll('#live-narrator-parts .nl-row').length, inputs: document.querySelectorAll('#live-narrator-parts [data-nl-text]').length, hint: (document.querySelector('#live-narrator-parts .vb-nlines .hint') || {}).textContent }));
  check(nl.rows > 0 && nl.inputs === 0 && /read-only/.test(nl.hint), 'Crescendo: the narrator lines show, read-only, with the reason', JSON.stringify(nl));
  if (shots) await shot('#live-voices', 'compose-voci-crescendo.png');
  await page.click('#cfg-reset').catch(() => {}); await sleep(800);
  await open('primo-segnale'); await sleep(800);
  await page.evaluate(() => { const b = document.querySelector('#live-profile [data-profile="classic"]'); if (b && b.offsetParent && b.getAttribute('aria-checked') !== 'true') b.click(); }); await sleep(1500);
  await openParts('#live-narrator-parts'); await sleep(200);
  const own = await page.evaluate(() => ({ n: document.querySelectorAll('#live-narrator-parts [data-nl-text]').length, hint: (document.querySelector('#live-narrator-parts .vb-nlines .hint') || {}).textContent, live: document.querySelector('#live-toggle').getAttribute('aria-pressed') }));
  check(own.n > 0, 'a song with its own written steps: the narrator lines are editable', JSON.stringify(own));

  // In the next song: the stored options of voice-controls
  await open('luci-rosse');
  const nextOpen = async () => { if (!(await page.evaluate(() => document.querySelector('#live-vinst-next').open))) { await page.click('#live-vinst-next > summary'); await sleep(300); } };
  await nextOpen();
  const n = await page.evaluate(() => { const b = document.querySelector('#live-vinst-next-body'); return { presence: b.querySelector('[data-vinst="presence"]').value, presences: [...b.querySelectorAll('[data-vinst="presence"] option')].map(o => o.value).join(), phrases: b.querySelector('[data-vinst="phrases"]').value, where: !!b.querySelector('[data-vinst-where]') }; });
  check(n.presence === 'always' && n.presences === 'style,always,never' && n.phrases === '2-3' && n.where, 'In the next song: the options stored before are read as they were, with Where', JSON.stringify(n));

  // ---------- radio ----------
  await page.click('[data-tab="radio"]'); await sleep(800);
  const rg = () => page.evaluate(() => {
    const g = document.querySelector('#radio-voices'); if (!g) return null;
    const sw = k => g.querySelector(`[data-rvoice-switch="${k}"]`), pres = g.querySelector('[data-vinst="presence"]');
    return { blocks: [...g.querySelectorAll('.voice-block .voices-sub')].map(x => x.textContent).join(), nar: sw('narrator').getAttribute('aria-pressed'), track: sw('track').getAttribute('aria-pressed'), narGrey: g.querySelector('#radio-narrator').classList.contains('off'), trackGrey: g.querySelector('#radio-voice').classList.contains('off'),
      presence: pres.value, presences: [...pres.options].map(o => o.value).join(), presenceOff: pres.disabled, preset: g.querySelector('[data-vinst="preset"]').value, talk: +document.querySelector('#radio-talk').value, knobIn: !!g.querySelector('#radio-narrator #radio-talk'),
      styleOff: g.querySelector('[data-custom="narratorStyle"]').disabled, hint: (g.querySelector('#radio-voices-hint') || {}).textContent || '', onAir: !!g.querySelector('[data-vinst-onair]'), folds: [...g.querySelectorAll('details')].map(d => d.open).join(),
      saved: JSON.parse(localStorage.getItem('coding-misk-radio') || '{}') };
  });
  let r = await rg();
  check(r && r.blocks === 'Voice: narrator,Voice: track' && r.nar === 'true' && r.track === 'true' && r.knobIn && !r.onAir && /Console/.test(r.hint) && !/true/.test(r.folds), 'radio: two blocks with their switches on, the knob in the narrator block, folded parts closed, one hint, no on-air button', JSON.stringify(r));
  check(r.presences === 'style,often,always' && r.styleOff, 'radio How often: As the style says, Often, Always (no Never); Narrator style stays Custom-only', r.presences);
  await page.selectOption('#radio-voice [data-vinst="presence"]', 'always'); await sleep(400);
  await page.selectOption('#radio-voice [data-vinst="preset"]', 'discreet'); await sleep(400);
  r = await rg();
  check(r.presence === 'always' && r.preset === 'discreet' && r.saved.voice.presence === 'always', 'a preset keeps Sempre', JSON.stringify(r.saved.voice));
  await page.reload(); await sleep(3000); await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(800);
  r = await rg();
  check(r.presence === 'always', 'Sempre after a reload', r.presence);
  // switches: values kept
  await page.evaluate(() => { const i = document.querySelector('#radio-talk'); i.value = '0.7'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }); await sleep(300);
  await page.click('[data-rvoice-switch="narrator"]'); await sleep(400);
  await page.click('[data-rvoice-switch="track"]'); await sleep(400);
  r = await rg();
  check(r.nar === 'false' && r.narGrey && r.talk === 0.7 && r.track === 'false' && r.trackGrey && r.presence === 'always' && r.presenceOff && r.saved.voices.narrator === false && r.saved.voices.track === false, 'switches off: blocks greyed, the knob at 0.7 and How often Always kept', JSON.stringify({ talk: r.talk, presence: r.presence, voices: r.saved.voices }));
  if (shots) { await openParts('#radio-voices'); await shot('#radio-voices', 'radio-voci-spente.png'); }
  await page.click('[data-rvoice-switch="narrator"]'); await sleep(400);
  await page.click('[data-rvoice-switch="track"]'); await sleep(400);
  r = await rg();
  check(r.nar === 'true' && r.track === 'true' && r.talk === 0.7 && r.presence === 'always', 'switches on again: the same values');
  // the Sound part for the next songs, Fill with
  await openParts('#radio-voices'); await sleep(200);
  await page.selectOption('#radio-voices [data-vsound-style="narrator"]', 'distant'); await sleep(400);
  await page.selectOption('#radio-voices [data-vinst="vocab"]', 'night'); await sleep(400);
  r = await rg();
  check(r.saved.narratorSound && r.saved.narratorSound.style === 'distant' && r.saved.voice.vocab === 'night', 'radio: Distant for the narrator and Night for the voice track, kept for the next songs', JSON.stringify({ s: r.saved.narratorSound, v: r.saved.voice.vocab }));
  if (shots) { await openParts('#radio-voices'); await shot('#radio-voices', 'radio-voci-aperto.png'); }
  // on air: a change waits for the next song, no command
  await page.click('#radio-start'); await sleep(5000);
  const opts0 = await page.evaluate(() => (globalThis.codingMiskRadio.state.recipe.steering || []).length);
  await page.selectOption('#radio-voice [data-vinst="preset"]', 'present'); await sleep(600);
  const air = await page.evaluate(() => ({ steering: (globalThis.codingMiskRadio.state.recipe.steering || []).length }));
  check(air.steering === opts0 && /next song/.test(await toastText()), 'on air: a voice change applies from the next song, no command on the song on air', await toastText());
  await page.click('#radio-start'); await sleep(800);
  // a saved Mai, an old Custom profile with the narrator off
  await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'); localStorage.setItem('coding-misk-radio', JSON.stringify({ ...o, voice: { presence: 'never', phrases: '2-3' }, voices: undefined, profile: 'custom', custom: { base: 'switch', controls: { narrator: false } } })); });
  await page.reload(); await sleep(3000); await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(800);
  r = await rg();
  check(r.presence === 'style' && r.track === 'false' && r.nar === 'false' && !(r.saved.custom && r.saved.custom.controls && 'narrator' in r.saved.custom.controls), 'a saved Never reads as the voice track switch off with As the style; an old Custom profile with the narrator off as the narrator switch off', JSON.stringify({ presence: r.presence, track: r.track, nar: r.nar }));
  await page.click('[data-rvoice-switch="narrator"]'); await sleep(300); await page.click('[data-rvoice-switch="track"]'); await sleep(300);
  await page.selectOption('#radio-profile', 'artist'); await sleep(400);

  // ---------- Italian ----------
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'it'));
  await page.reload(); await sleep(3000);
  await page.click('[data-mode="ascolta"]');
  await open('kellerlicht');
  await live('crescendo');
  v = await voices();
  check(v.label === 'Voci' && v.sub === 'Voce: narratore' && v.switchTxt === 'Accesa' && v.narrated === 'Crescita raccontata', 'Italian Compose: Voci, Voce: narratore with Accesa, Crescita raccontata', JSON.stringify(v));
  const addTxt = await page.evaluate(() => { const b = document.querySelector('#live-vinst [data-vinst-add]'); return b ? b.textContent : ''; });
  check(addTxt === 'Aggiungi Voce: traccia', 'Italian: Aggiungi Voce: traccia', addTxt);
  await page.evaluate(() => localStorage.setItem('coding-misk-voice-folds', JSON.stringify({ 'compose-narrator-sound': true, 'compose-narrator-lines': true })));
  await page.selectOption('#track-pick', 'example-voices'); await sleep(1500);
  await openParts('#live-vinst'); await sleep(300);
  if (shots) {
    await shot('#live-voices', 'compose-voci-it.png');
    await page.evaluate(() => document.querySelector('#live-vinst .pl').scrollIntoView({ block: 'center' }));
    await shot('#live-vinst', 'compose-voce-traccia-frasi-it.png');
  }
  const tt = await page.evaluate(() => [...document.querySelectorAll('#tk-type option')].map(o => o.textContent.trim()).filter(x => /Voce/.test(x)).join(','));
  check(/Voce: narratore/.test(tt) && /Voce: traccia/.test(tt), 'Italian track types: Voce: narratore and Voce: traccia', tt);
  await page.click('[data-tab="radio"]'); await sleep(800);
  const it = await page.evaluate(() => ({ blocks: [...document.querySelectorAll('#radio-voices .voices-sub')].map(x => x.textContent).join(), sw: document.querySelector('[data-rvoice-switch="narrator"]').textContent.trim(), knob: document.querySelector('label[for="radio-talk"]').textContent, presences: [...document.querySelectorAll('#radio-voice [data-vinst="presence"] option')].map(o => o.textContent).join(), hint: document.querySelector('#radio-voices-hint').textContent }));
  check(it.blocks === 'Voce: narratore,Voce: traccia' && it.sw === 'Accesa' && it.knob === 'Voce: narratore' && it.presences === 'come dice lo stile,spesso,sempre' && /Console/.test(it.hint), 'Italian radio: Voce: narratore and Voce: traccia, Accesa, the knob Voce: narratore, How often without mai and with sempre', JSON.stringify(it));
  await page.evaluate(() => localStorage.setItem('coding-misk-voice-folds', JSON.stringify({ 'radio-spoken-phrases': true, 'radio-spoken-sound': true })));
  await page.selectOption('#radio-voice [data-vinst="presence"]', 'always'); await sleep(500);
  if (shots) await shot('#radio-voices', 'radio-voci-sempre-it.png');
  await page.click('#radio-start'); await sleep(4000);
  const con = await page.evaluate(() => ({ rows: [...document.querySelectorAll('#radio-steer .sv-row > .lbl')].map(x => x.textContent).join(), group: (document.querySelector('#radio-steer .steer-voice > .lbl') || {}).textContent }));
  check(con.group === 'Voce' && con.rows === 'Voce: narratore,Voce: traccia,Aggiungi frase', 'Italian console: the Voce group with Voce: narratore, Voce: traccia and Aggiungi frase', JSON.stringify(con));
  if (shots) { await page.evaluate(() => document.querySelector('#radio-steer .steer-voice').scrollIntoView({ block: 'center' })); await shot('#radio-steer .steer-voice', 'console-voce-it.png'); }
  await page.click('#radio-start'); await sleep(800);
  await page.selectOption('#radio-voice [data-vinst="presence"]', 'style'); await sleep(300);

  check(!errors.length, 'no page errors', errors.join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
