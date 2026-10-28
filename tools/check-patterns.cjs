// Browser checks for the Patterns tab (pattern-library, #72): the tab and its groups, play and stop, a key change that
// keeps the loop going, the beat, styles that use a pattern, New and Save, Save as pattern from Compose, rename and
// delete after a reload, Add to song, and the three links (Compose listen button, Sounds, Styles). Screenshots of the
// tab, a pattern playing, Save as pattern in Compose, the hardware theme and a phone. The follow-ups
// (pattern-followups): a guitar riff from New, new parts kept after a reload, Discard and Discard all with their
// confirmation strip, the style chips of a saved pattern, riff or chords in Compose on a guitar track.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-patterns.cjs [shots-dir] [--row]   (dev server on PORT, default 5173;
// --row runs only the pattern row of Compose, after-tests-oct28 D9)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv.slice(2).find(a => !a.startsWith('--'));
const rowOnly = process.argv.includes('--row');
if (shots) fs.mkdirSync(shots, { recursive: true });
const shot = (page, name) => (shots ? page.screenshot({ path: path.join(shots, name) }) : null);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  const st = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor; return { code: e.code, err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now() }; });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-patterns') || '[]'));
  const draft = () => page.evaluate(() => globalThis.codingMiskPatterns.compose());
  const lab = async tab => { await page.click('[data-mode="lab"]'); await page.click(`[data-tab="${tab}"]`); await sleep(400); };
  const kind = async k => { await page.click(`#patterns [data-pn-kind="${k}"]`); await sleep(250); };
  const sel = async uid => { await page.click(`#patterns [data-pn-sel="${uid}"]`); await sleep(300); };
  const selected = () => page.$eval('#patterns .pn-detail h3', el => el.textContent).catch(() => '');


  // ---------- the one pattern row of Compose (after-tests-oct28 D9, pp1 #84) ----------
  async function patternRow() {
    page.on('dialog', d => d.accept().catch(() => {}));
    const open = async (lang, mode) => {
      await page.evaluate(([l, m]) => { localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-arr-mode', JSON.stringify(m)); }, [lang, mode]);
      await page.reload(); await sleep(4000);
      await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(1500);
    };
    await page.setViewportSize({ width: 1400, height: 1000 });
    // (from a clean page: the steps before leave a draft and a phone width)
    await page.evaluate(() => localStorage.clear());
    await open('en', 'sections');
    const D = await draft(), ti = D.T.tracks.findIndex(x => x.type === 'bass'), sj = D.T.sections.findIndex(x => x.name === 'Scontro');
    await page.click('#track-panel [data-view="one"]').catch(() => {}); await sleep(200);
    await page.click(`[data-cell="${ti}:${sj}"]`); await sleep(500);
    const R = `#track-panel [data-ptrk="${ti}"]`, chip = k => `${R} .pat-chip[data-edit-pat="${k}"]`, id = r => `#p${ti}_${r}`;
    const marks = () => page.$$eval(`${R} .pat-chip`, xs => Object.fromEntries(xs.map(x => [x.dataset.editPat, { song: x.classList.contains('in-song'), used: x.classList.contains('used'), pv: x.classList.contains('pv'), edit: x.getAttribute('aria-pressed') === 'true' }])));
    const plays = async name => { const d = await draft(), tr = d.T.tracks[ti], c = tr.clips.find(x => x.section === name); return c ? c.pattern : null; };
    const row = () => page.$eval(`${R} .tp-pats-song`, x => ({ lbl: x.querySelector(':scope > .lbl').textContent, hint: x.querySelector('.pat-hint').textContent, txt: [...x.querySelectorAll('.chips > button')].map(b => (b.querySelector('.pat-k') || b).textContent).join(' ') + ' | ' + x.textContent.replace(/\s+/g, ' '), status: x.querySelector('.pat-status').textContent }));
    const make = () => page.$eval(`${R} .tp-pats-make`, x => ({ lbl: x.querySelector(':scope > .lbl').textContent, txt: x.textContent.replace(/\s+/g, ' ') }));
    let r = await row(), m = await marks();
    check(r.lbl === 'Patterns in this song' && r.hint === 'Edit and listen to the patterns in this song' && /^Nothing A B C \+ New Delete \|/.test(r.txt) && (await page.$$eval(`${R} .tp-pats`, xs => xs.length)) === 2, 'one row "Patterns in this song" with Nothing, A, B, C, + New and Delete', r.txt.slice(0, 120));
    const mk = await make();
    check(mk.lbl === 'Make' && /Save as pattern/.test(mk.txt) && /Compose a part/.test(mk.txt) && /Energy/.test(mk.txt), 'the Make row below it', mk.txt.slice(0, 120));
    check(m.B.song && m.B.edit && m.A.used && m.C.used && !m.A.song && !m.C.song, 'Scontro plays B: the IN THE SONG badge on B, hollow circles on A and C, B edited', JSON.stringify(m));
    const del = await page.$eval(id('pt-del'), b => ({ dis: b.disabled, tip: b.title }));
    check(del.dis && /used/.test(del.tip) && /Scontro/.test(del.tip), 'Delete is disabled on B, used in the song, with the reason', del.tip);
    // a chip chooses what to edit only
    await page.click(chip('C')); await sleep(300);
    m = await marks();
    check(m.C.edit && m.B.song && (await plays('Scontro')) === 'B', 'choosing C edits C; Scontro still plays B');
    // Try on a copy of B
    await page.click(chip('B')); await sleep(300);
    await page.click(id('pat-copy')); await sleep(400);
    m = await marks();
    check(m.D && m.D.edit && !m.D.song && !m.D.used && (await plays('Scontro')) === 'B' && JSON.stringify((await draft()).T.tracks[ti].patterns.D) === JSON.stringify((await draft()).T.tracks[ti].patterns.B), 'Try on a copy: D is a copy of B with no mark, edited; the song still plays B', JSON.stringify(m.D));
    r = await row();
    check(/only in the preview/.test(r.status) && await page.isVisible(id('pat-use')) && await page.isVisible(id('pat-replace')), 'the status line offers Use D in «Scontro» and Replace B with D', r.status);
    await page.click(id('pt-preview')); await sleep(1200);
    m = await marks();
    check(m.D.pv && !m.B.pv, 'the headphones on D in preview');
    if (shots) { await page.$eval(`${R} .tp-pats-song`, x => x.scrollIntoView({ block: 'center' })); await shot(page, 'pattern-row-copy-preview.png'); }
    await page.click(id('pt-preview')); await sleep(300);
    // Use D in Scontro, then Undo
    await page.click(id('pat-use')); await sleep(400);
    m = await marks();
    check((await plays('Scontro')) === 'D' && m.D.song && !m.B.song, 'Use D in «Scontro»: Scontro plays D, the badge moves to D', JSON.stringify(m));
    const undo = await page.$('.toast .toast-act');
    check(!!undo && /Undo/.test(await undo.textContent()), 'the notice offers Undo');
    await undo.click(); await sleep(400);
    check((await plays('Scontro')) === 'B', 'Undo: Scontro plays B again');
    // Replace B with D: every clip of B plays D, B stays with no mark
    const usesB = (await draft()).T.tracks[ti].clips.filter(c => c.pattern === 'B').length;
    await page.click(id('pat-replace')); await sleep(400);
    const after = (await draft()).T.tracks[ti];
    m = await marks();
    check(usesB > 0 && !after.clips.some(c => c.pattern === 'B') && after.clips.filter(c => c.pattern === 'D').length === usesB && after.patterns.B && !m.B.song && !m.B.used && m.D.song, 'Replace B with D: the sections of B play D, B stays in the row with no mark');
    // Restore: choose A, change three steps, Restore brings it back
    await page.click(chip('A')); await sleep(300);
    const a0 = JSON.stringify((await draft()).T.tracks[ti].patterns.A);
    for (const i of [0, 3, 6]) { await page.click(`${R} [data-ps="${i}"]`); await sleep(150); }
    const a1 = JSON.stringify((await draft()).T.tracks[ti].patterns.A);
    check(a1 !== a0 && await page.isVisible(id('pat-restore')), 'three steps change A; the status line offers Restore A');
    await page.click(id('pat-restore')); await sleep(400);
    check(JSON.stringify((await draft()).T.tracks[ti].patterns.A) === a0 && !(await page.isVisible(id('pat-restore'))), 'Restore A: A as it was when editing started');
    // Delete only a pattern used nowhere
    await page.click(id('pt-new')); await sleep(300);
    const fresh = (await marks());
    const k = Object.keys(fresh).find(x => fresh[x].edit);
    check(k === 'E' && !(await page.$eval(id('pt-del'), b => b.disabled)), 'a new pattern E, used nowhere: Delete is enabled', k);
    await page.click(id('pt-del')); await sleep(300);
    check(!(await draft()).T.tracks[ti].patterns.E, 'Delete removes E');
    // Free timeline: no clip chosen, then a clip
    await page.click('[data-arr-mode="timeline"]'); await sleep(500);
    await page.evaluate(ti => { const n = document.querySelector(`.trk-name[data-trk="${ti}"]`); if (n) n.click(); }, ti); await sleep(400);
    m = await marks(); r = await row();
    check(!Object.values(m).some(x => x.song) && Object.values(m).some(x => x.used) && /Click a clip in the timeline/.test(r.txt), 'Free timeline with no clip: no badge, the row says how to choose one, circles where patterns are used', r.status);
    if (shots) { await page.$eval(`${R} .tp-pats-song`, x => x.scrollIntoView({ block: 'center' })); await shot(page, 'pattern-row-no-clip.png'); }
    const ck = (await draft()).T.tracks[ti].clips.findIndex(c => c.pattern === 'C');
    await page.click(`[data-clip="${ti}:${ck}"]`); await sleep(500);
    m = await marks();
    check(m.C && m.C.song, 'a clip chosen in the timeline: the badge on its pattern', JSON.stringify(m));
    // Italian
    await open('it', 'sections');
    await page.click('#track-panel [data-view="one"]').catch(() => {}); await sleep(200);
    await page.click(`[data-cell="${ti}:${sj}"]`); await sleep(500);
    r = await row();
    const mi = await make();
    check(r.lbl === 'Pattern disponibili nel brano' && r.hint === 'Modifica e ascolta i pattern inclusi in questo brano' && /^Niente A B C D \+ Nuovo Elimina \|/.test(r.txt) && /NEL BRANO/.test(r.txt) && mi.lbl === 'Crea' && /Salva come pattern/.test(mi.txt) && /Componi una parte/.test(mi.txt) && /Energia/.test(mi.txt), 'Italian: "Pattern disponibili nel brano", its hint, NEL BRANO, the Crea row', `${r.lbl} | ${mi.lbl}`);
    if (shots) { await page.$eval(`${R} .tp-pats-song`, x => x.scrollIntoView({ block: 'center' })); await shot(page, 'pattern-row-it.png'); }
    await page.evaluate(() => { localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-arr-mode', JSON.stringify('timeline')); });
  }
  if (rowOnly) {
    await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
    await page.evaluate(() => localStorage.clear());
    await patternRow();
    check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
    await browser.close();
    console.log(failed ? `${failed} failed` : 'all passed');
    process.exit(failed ? 1 : 0);
  }
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', JSON.stringify('en')); });
  await page.reload(); await sleep(3500);

  // the tab, after Sounds, grouped by kind
  await page.click('[data-mode="lab"]'); await sleep(200);
  const tabs = await page.$$eval('.tabs .tab', xs => xs.filter(x => !x.hidden).map(x => x.dataset.tab).join());
  check(tabs === 'artisti,stili,generi,suoni,pattern,guida,lezioni,riferimenti', 'Patterns right after Sounds', tabs);
  await lab('pattern');
  const groups = await page.$$eval('#patterns .pn-group h4', xs => xs.map(x => x.textContent).join());
  check(groups === 'Melodies,Basslines,Arpeggios,Chords,Grooves,Riffs', 'built-in patterns grouped by kind', groups);
  const canvases = await page.$$eval('#patterns canvas.pn-pv', xs => xs.length);
  check(canvases >= 20, 'every card has a preview', `${canvases}`);
  await shot(page, 'patterns-tab.png');

  // groove grid: one row per drum sound
  await kind('grooves'); await sel('b:grooves/breakbeat');
  check(/Breakbeat/.test(await selected()), 'the groove breakbeat opens');

  // play rolling in A at 128, then D: from the next bar, without a gap
  await kind('basslines'); await sel('b:basslines/rolling');
  const bpm0 = await page.$eval('#pn-bpm', el => el.value), key0 = await page.$eval('#pn-key', el => el.value);
  check(bpm0 === '128' && key0 === 'A', 'rolling starts in A at 128 BPM', `${key0} ${bpm0}`);
  await page.click('#patterns [data-pn-toggle]'); await sleep(3000);
  let s = await st();
  check(s.started && !s.err && /\/\/ Loop · 4 bars · 128 BPM · A /.test(s.code), 'rolling plays in a loop', s.err || s.code.split('\n').find(l => l.includes('section1 =')));
  await shot(page, 'pattern-playing.png');
  const before = s.cyc;
  await page.selectOption('#pn-key', 'D'); await sleep(4200);
  s = await st();
  check(s.started && !s.err && / · D · /.test(s.code) && s.cyc > before + 1.5, 'key D from the next bar, the loop goes on', `${before.toFixed(2)} → ${s.cyc.toFixed(2)} ${s.err}`);
  check(await page.$eval('#src', el => el.textContent) === 'Pattern: Rolling', 'the code panel says a pattern plays');
  // styles that use rolling, and a link to one
  const styles = await page.$$eval('#patterns [data-pn-open-style]', xs => xs.map(x => x.dataset.pnOpenStyle));
  check(styles.includes('trance') && styles.includes('pure-trance') && styles.length >= 4, 'rolling lists the styles that use it', styles.join(','));

  // the beat under a melody, quieter than it
  await kind('melodies'); await sel('b:melodies/neon');
  await page.click('#patterns [data-pn-toggle]'); await sleep(300);
  await page.check('#patterns [data-pn-cfg="beat"]'); await sleep(4200);
  s = await st();
  check(s.started && !s.err && /beat · drums/.test(s.code) && /Neon/.test(s.code), 'neon plays over the simple beat', s.err);
  await page.click('#patterns [data-pn-toggle]'); await sleep(400);
  check(!(await st()).started, 'stop');

  // a style opens in the Styles tab
  await kind('basslines'); await sel('b:basslines/rolling');
  await page.click('#patterns [data-pn-open-style="trance"]'); await sleep(400);
  check(await page.isVisible('#tab-stili') && /Trance/.test(await page.innerText('#tab-stili .lib-sheet')), 'a style of rolling opens in the Styles tab');

  // Styles → Patterns: a preset named in the sheet
  await page.click('#tab-stili [data-pattern-link="basslines|rolling"]'); await sleep(500);
  check(await page.isVisible('#tab-pattern') && /Rolling/.test(await selected()), 'a preset in a style card opens the pattern');

  // New: a generated arpeggio, playing, then saved with its seed and why
  await kind('arpeggios'); await sel('b:arpeggios/su');
  await page.fill('#patterns [data-pn-num]', '7'); await page.dispatchEvent('#patterns [data-pn-num]', 'input');
  await page.click('#patterns [data-pn-new]'); await sleep(3200);
  s = await st();
  const fresh = await page.$$eval('#patterns .pn-fresh [data-pn-card]', xs => xs.length);
  check(fresh === 1 && /Arpeggios #7/.test(await selected()) && s.started && !s.err, 'New composes an arpeggio and plays it', s.err);
  await page.click('#patterns [data-pn-save]'); await sleep(400);
  let mine = await saved();
  check(mine.length === 1 && mine[0].source === 'generated' && mine[0].kind === 'arpeggios' && mine[0].seed === 'pattern:arpeggios:7' && mine[0].why.length > 0, 'a saved generated pattern keeps seed and why', JSON.stringify(mine[0] || {}).slice(0, 120));
  await page.click('#patterns [data-pn-toggle]'); await sleep(300);

  // Compose: the listen button next to a preset menu
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(600);
  const host = await page.$('#track-panel [data-ptrk] [id$="_pt-preset"]');
  const ti = await host.evaluate(el => +el.closest('[data-ptrk]').dataset.ptrk);
  const d = await draft(), tr = d.T.tracks[ti], sec = d.T.sections[d.sel || 0];
  // the pattern row (after-tests-oct28 D9): the song's patterns with + New and Delete, then the Make row; the button
  // that opens the Patterns tab shows the flask
  const rows = await page.$$eval(`#track-panel [data-ptrk="${ti}"] .tp-pats`, xs => xs.map(x => ({ lbl: x.querySelector(':scope > .lbl').textContent, ids: [...x.querySelectorAll('[id]')].map(e => e.id.replace(/^p\d+_/, '')) })));
  const flask = await page.$eval(`#p${ti}_pt-listen svg`, el => el.classList.contains('ico-flask'));
  check(rows.length === 2 && rows[0].lbl === 'Patterns in this song' && ['pt-new', 'pt-del'].every(k => rows[0].ids.includes(k)) && rows[1].lbl === 'Make' && ['pt-savepat', 'pt-compose'].every(k => rows[1].ids.includes(k)) && flask, 'Patterns in this song (chips, New, Delete) and Make (Save as pattern, Compose a part); the flask opens the tab', rows.map(r => `${r.lbl}: ${r.ids.join(',')}`).join(' | '));
  await page.click(`#p${ti}_pt-listen`); await sleep(600);
  const cfg = await page.evaluate(() => ({ key: (document.querySelector('#pn-key') || {}).value, bpm: document.querySelector('#pn-bpm').value, sound: document.querySelector('#pn-sound').value }));
  const pat = tr.patterns[(tr.clips.find(c => c.section === sec.name) || { pattern: 'A' }).pattern] || {};
  check(await page.isVisible('#tab-pattern') && (await page.$eval('[data-mode="lab"]', el => el.getAttribute('aria-pressed'))) === 'true', 'the listen button opens the Patterns tab in the Groove Lab');
  check(cfg.key === (sec.key || 'A') && +cfg.bpm === Math.round(sec.bpm || 138) && (!tr.settings.wave || cfg.sound === tr.settings.wave), 'with the track\'s sound, the section\'s key and tempo', `${JSON.stringify(cfg)} ${sec.key} ${sec.bpm} ${tr.settings.wave} ${pat.preset || 'idea'}`);

  // Save as pattern in Compose
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(500);
  await page.$eval(`#p${ti}_pt-savepat`, el => el.scrollIntoView({ block: 'center' }));
  await page.click(`#p${ti}_pt-savepat`); await sleep(300);
  await shot(page, 'compose-save-as-pattern.png');
  mine = await saved();
  const fromCompose = mine.find(p => p.source === 'compose');
  check(!!fromCompose && fromCompose.type === tr.type && fromCompose.context.key === (sec.key || 'A') && fromCompose.context.bpm === sec.bpm && fromCompose.sound === (tr.settings.wave ?? fromCompose.sound), 'Save as pattern keeps the type, sound, key and tempo', JSON.stringify(fromCompose || {}).slice(0, 160));
  await page.click('.toast .toast-act'); await sleep(500);
  check(await page.isVisible('#tab-pattern') && (await selected()) === fromCompose.name, 'the toast opens the saved pattern');
  await page.click('#patterns [data-pn-toggle]'); await sleep(3000);
  s = await st();
  check(s.started && !s.err && s.code.includes(`setcpm(${sec.bpm}/4)`), 'the saved pattern plays with the track\'s tempo', s.err);
  await page.click('#patterns [data-pn-toggle]'); await sleep(300);

  // rename and delete, after a reload
  await page.fill('#patterns [data-pn-name]', 'My line');
  await page.click('#patterns [data-pn-rename]'); await sleep(300);
  await page.reload(); await sleep(3500);
  await lab('pattern'); await page.click('#patterns [data-pn-src="mine"]'); await sleep(300);
  const names = await page.$$eval('#patterns .pn-cbody b', xs => xs.map(x => x.textContent));
  check(names.includes('My line'), 'the new name stays after a reload', names.join(','));
  const uid = `u:${fromCompose.id}`;
  await sel(uid);
  await page.click('#patterns [data-pn-del]'); await sleep(200);
  check((await saved()).some(p => p.id === fromCompose.id), 'one press does not delete');
  await page.click('#patterns [data-pn-del]'); await sleep(300);
  await page.reload(); await sleep(3500);
  check(!(await saved()).some(p => p.id === fromCompose.id) && (await saved()).length === 1, 'a second press deletes, gone after a reload');
  const builtinDel = await (async () => { await lab('pattern'); await kind('melodies'); await sel('b:melodies/neon'); return page.$$eval('#patterns [data-pn-del], #patterns [data-pn-rename]', xs => xs.length); })();
  check(builtinDel === 0, 'built-in patterns cannot be renamed or deleted');

  // Add to song: a new pattern letter, the others unchanged
  const d0 = await draft(), hook0 = d0.T.tracks.find(x => x.type === 'hook');
  await page.click('#patterns [data-pn-add]'); await sleep(500);
  const d1 = await draft(), hook1 = d1.T.tracks.find(x => x.type === 'hook');
  if (hook0) {
    const keys0 = Object.keys(hook0.patterns), keys1 = Object.keys(hook1.patterns), added = keys1.find(k => !keys0.includes(k));
    check(keys1.length === keys0.length + 1 && hook1.patterns[added].preset === 'neon' && keys0.every(k => JSON.stringify(hook0.patterns[k]) === JSON.stringify(hook1.patterns[k])), 'Add to song: a new letter on the hook track, the other patterns unchanged', `${keys0} → ${keys1}`);
  } else check(!!hook1 && hook1.patterns.A.preset === 'neon', 'Add to song: a new hook track with the pattern');
  check(d1.dirty === true, 'the song is marked changed, not saved');

  // ---------- pattern-followups (#72) ----------
  const drafts = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-pattern-drafts') || '[]'));
  // New on riffs: guitar riff by default, from the guitar generator, on a distorted guitar
  await lab('pattern'); await kind('riffs'); await sel('b:riffs/thrash');
  // riff cards and the detail name the instrument; search finds it
  const cardLine = uid => page.$eval(`#patterns [data-pn-sel="${uid}"] small`, el => el.textContent).catch(() => '');
  const dLine = await page.$eval('#patterns .pn-dhead .lbl', el => el.textContent).catch(() => '');
  check(await cardLine('b:riffs/thrash') === 'Riffs · guitar · built-in' && dLine === 'Riffs · guitar · built-in', 'a guitar riff says guitar on its card and in the detail', `${await cardLine('b:riffs/thrash')} | ${dLine}`);
  const search = async q => { await page.fill('#patterns .pn-search', q); await page.dispatchEvent('#patterns .pn-search', 'input'); await sleep(400); };
  await search('bass');
  const bassLines = await page.$$eval('#patterns .pn-cbody small', xs => xs.map(x => x.textContent));
  check(bassLines.length > 0 && bassLines.every(l => l === 'Riffs · bass · built-in') && await cardLine('b:riffs/spirale') === 'Riffs · bass · built-in', 'search "bass" among riffs finds the bass riffs', `${bassLines.length}: ${[...new Set(bassLines)]}`);
  await search('');
  const riffAs = await page.$$eval('#patterns [data-pn-riff]', xs => xs.map(x => `${x.dataset.pnRiff}:${x.getAttribute('aria-pressed')}`).join());
  check(riffAs === 'guitar:true,bass:false', 'New on riffs offers guitar riff (chosen) and bass riff', riffAs);
  await page.click('#patterns [data-pn-new]'); await sleep(3200);
  s = await st();
  let dr = await drafts();
  check(dr.length === 1 && dr[0].type === 'guitar' && dr[0].sound === 'distorted' && dr[0].why.includes('power chord riff') && s.started && !s.err && /guitar/.test(s.code) && /Guitar riff #1/.test(await selected()), 'New composes a guitar riff and plays it on a distorted guitar', `${JSON.stringify(dr[0] && dr[0].why)} ${s.err}`);
  await shot(page, 'pattern-guitar-riff.png');
  await page.click('#patterns [data-pn-riff="bass"]'); await sleep(200);
  await page.click('#patterns [data-pn-new]'); await sleep(1500);
  dr = await drafts();
  check(dr.length === 2 && dr[0].type === 'bass' && dr[0].seed.startsWith('pattern:riffs:') && /Bass riff/.test(await selected()), 'bass riff: a bassline with the riff rules', dr[0] && dr[0].seed);
  await page.click('#patterns [data-pn-toggle]'); await sleep(300);
  // two basslines, then a reload: every new part is still under "New, not saved"
  await kind('basslines'); await sel('b:basslines/rolling');
  await page.click('#patterns [data-pn-new]'); await sleep(800);
  await page.click('#patterns [data-pn-new]'); await sleep(800);
  await page.click('#patterns [data-pn-toggle]'); await sleep(300);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(400);
  await page.reload(); await sleep(3500);
  await lab('pattern');
  const kept = await page.$$eval('#patterns .pn-fresh .pn-cbody b', xs => xs.map(x => x.textContent));
  check(kept.length === 4 && kept.filter(x => /Basslines/.test(x)).length === 2 && kept.some(x => /Guitar riff/.test(x)), 'new parts stay after a tab change and a reload', kept.join(','));
  await shot(page, 'pattern-new-kept.png');
  // Discard on a selected new card: a confirmation strip, Cancel keeps it, the second time it goes
  const firstNew = await page.$eval('#patterns .pn-fresh [data-pn-card]', el => el.dataset.pnCard);
  await sel(firstNew);
  await page.click('#patterns [data-pn-discard]'); await sleep(200);
  check(await page.isVisible('#patterns .sv-confirm[data-confirm="pn-discard"]'), 'Discard asks in a strip');
  await shot(page, 'pattern-discard-confirm.png');
  await page.click('#patterns .sv-confirm [data-confirm-cancel]'); await sleep(200);
  check((await drafts()).length === 4, 'Cancel keeps the part');
  await page.click('#patterns [data-pn-discard]'); await sleep(200);
  await page.click('#patterns .sv-confirm [data-confirm-ok]'); await sleep(300);
  check((await drafts()).length === 3 && (await page.$$eval('#patterns .pn-fresh [data-pn-card]', xs => xs.length)) === 3, 'Discard drops the selected new part');
  // style chips on a new part of New and on a saved pattern
  await sel(await page.$eval('#patterns .pn-fresh [data-pn-card]', el => el.dataset.pnCard));
  await page.click('#patterns [data-pn-save]'); await sleep(400);
  const savedNow = (await saved()).slice(-1)[0];
  check(await page.isVisible('#patterns .pn-styles-edit .pn-every'), 'a saved pattern with no style shows every style', JSON.stringify(savedNow.styles));
  await page.selectOption('#patterns [data-pn-style-add]', 'drum-and-bass'); await sleep(300);
  await page.selectOption('#patterns [data-pn-style-add]', 'melodic-metal'); await sleep(300);
  let styled = (await saved()).find(p => p.id === savedNow.id);
  const chips = await page.$$eval('#patterns .pn-styles-edit [data-pn-style-rm]', xs => xs.map(x => x.dataset.pnStyleRm).join());
  check(JSON.stringify(styled.styles) === '["drum-and-bass","melodic-metal"]' && chips === 'drum-and-bass,melodic-metal', 'Add a style: chips and the saved styles', `${styled.styles} / ${chips}`);
  await shot(page, 'pattern-styles-edit.png');
  await page.click('#patterns [data-pn-style-rm="melodic-metal"]'); await sleep(300);
  styled = (await saved()).find(p => p.id === savedNow.id);
  const pool = await page.evaluate(id => (globalThis.codingMiskRadio.options.userPatterns || []).find(p => p.id === id), savedNow.id);
  check(JSON.stringify(styled.styles) === '["drum-and-bass"]' && pool && JSON.stringify(pool.styles) === '["drum-and-bass"]', 'the cross removes a style; the radio reads the new styles', `${styled.styles} / ${pool && pool.styles}`);
  // Discard all on the strip's header
  await page.click('#patterns [data-pn-discard-all]'); await sleep(200);
  check(await page.isVisible('#patterns .sv-confirm[data-confirm="pn-discard-all"]'), 'Discard all asks in a strip');
  await page.click('#patterns .sv-confirm [data-confirm-ok]'); await sleep(300);
  check(!(await drafts()).length && !(await page.$('#patterns .pn-fresh')), 'Discard all drops every new part');
  // Compose on a guitar track: riff (default) or chords
  await kind('riffs'); await sel('b:riffs/thrash');
  await page.click('#patterns [data-pn-add]'); await sleep(500);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(600);
  const gi = await page.evaluate(() => globalThis.codingMiskPatterns.compose().T.tracks.findIndex(x => x.type === 'guitar'));
  const host2 = await page.$(`#track-panel [data-ptrk="${gi}"]`);
  if (host2) {
    const gsel = `#p${gi}_pt-cguitar`;
    check(await page.$eval(gsel, el => el.value) === 'riff', 'Compose on a guitar track offers riff (chosen) or chords');
    await page.$eval(gsel, el => el.scrollIntoView({ block: 'center' }));
    await shot(page, 'compose-guitar-riff-or-chords.png');
    const pats = async () => (await draft()).T.tracks[gi].patterns;
    const k0 = Object.keys(await pats());
    await page.click(`#p${gi}_pt-compose`); await sleep(500);
    let p1 = await pats(), nk = Object.keys(p1).find(k => !k0.includes(k));
    check(!!nk && p1[nk].idea && p1[nk].idea.per === 'slot' && /[1-9]/.test(p1[nk].idea.add || ''), 'Compose a part on guitar with riff: a riff', JSON.stringify(nk && p1[nk]));
    await page.selectOption(gsel, 'chords'); await sleep(200);
    const k1 = Object.keys(p1);
    await page.click(`#p${gi}_pt-compose`); await sleep(500);
    p1 = await pats(); nk = Object.keys(p1).find(k => !k1.includes(k));
    check(!!nk && p1[nk].idea && !p1[nk].idea.add && (await page.$eval(gsel, el => el.value)) === 'chords', 'with chords: power chords, and the choice stays', JSON.stringify(nk && p1[nk]));
  } else check(false, 'a guitar track in Compose after Add to song');

  // Sounds → Patterns: the electric piano on a chords pattern
  await lab('suoni');
  await page.fill('#sounds .sb-search', 'epiano'); await page.dispatchEvent('#sounds .sb-search', 'input'); await sleep(600);
  const item = await page.$('#sounds [data-sb-item*="epiano"]');
  if (item) {
    await item.click(); await sleep(600);
    await page.click('#sounds [data-sb-trypat]'); await sleep(600);
    const sound = await page.$eval('#pn-sound', el => el.value), head = await page.$eval('#patterns .pn-detail .lbl', el => el.textContent);
    check(await page.isVisible('#tab-pattern') && /epiano/.test(sound) && /Chords/i.test(head), 'Try on a pattern: a chords pattern with the electric piano', `${sound} ${head}`);
    await page.click('#patterns [data-pn-toggle]'); await sleep(2500);
    s = await st(); check(s.started && !s.err, 'the electric piano plays the pattern', s.err);
    await page.click('#patterns [data-pn-toggle]'); await sleep(300);
  } else check(false, 'an electric piano in the Sounds tab');

  // the radio reads the saved patterns (the director draws them where they fit)
  const ro = await page.evaluate(() => globalThis.codingMiskRadio.options.userPatterns || []);
  const left = await saved();
  check(ro.length === left.length && ro.every(p => p.type && p.pattern && p.styles.length), 'the radio reads the saved patterns', `${ro.length} of ${left.length}`);

  // hardware theme and phone
  await page.click('[data-uitheme="hw"]'); await sleep(400);
  await lab('pattern'); await kind('grooves'); await sel('b:grooves/breakbeat');
  await page.$eval('#patterns .pn-detail', el => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'patterns-hw.png');
  await page.click('[data-uitheme="neon"]'); await sleep(300);
  await page.setViewportSize({ width: 390, height: 900 }); await sleep(500);
  await lab('pattern'); await kind('melodies'); await sel('b:melodies/neon');
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  check(sw <= 392, 'phone: no horizontal scroll', `${sw}px`);
  await page.$eval('#patterns', el => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'patterns-phone.png');
  await page.$eval('#patterns .pn-cards', el => el.scrollIntoView({ block: 'start' }));
  await shot(page, 'patterns-phone-cards.png');

  await patternRow();
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
