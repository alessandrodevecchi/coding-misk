// Browser check of the stage captions (spoken-text-on-stage, #82): the cases of the design measured again (the caption
// is the line heard on every spoken bar, the voice track's lines shown, nothing shown that is not heard), the step tag,
// the marks of each voice, the settings card (switch off and on with the choices kept, narrator only, each of the five
// marks, the old behaviour), the "Claude" look (reply block, no page caption, the transcript pane at 16:9 and none at
// 9:16, an invented prompt line never captioned), the hardware theme, 400 px, and a fast video fragment's captions.
// A long line under Code over (the Pixel visual, page stage and full screen, neon and hardware) is drawn whole.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-captions.cjs [shots-dir] [--no-video] [--fit-only]
//   (dev server on PORT, default 5173; with shots-dir: pictures of the lane and the "Claude" look)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`, WAIT = 180000;
const args = process.argv.slice(2), shots = args[0] && !args[0].startsWith('--') && args[0] !== '-' ? args[0] : null, noVideo = args.includes('--no-video'), fitOnly = args.includes('--fit-only');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
if (shots) fs.mkdirSync(shots, { recursive: true });

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { return chromium.launch({ headless: true }); }
}
const compose = page => page.evaluate(() => globalThis.codingMiskPatterns.compose());
const cap = (page, fn, arg) => page.evaluate(([f, a]) => new Function('C', 'a', `return (${f})(C, a)`)(globalThis.codingMiskCaptions, a), [fn.toString(), arg]);
async function openSong(page, id, { profile = 'switch', style = 'auto', narrated = false } = {}) {
  await page.click('[data-tab="componi"]'); await sleep(300);
  for (let k = 0; k < 3; k++) { await page.selectOption('#track-pick', id); await sleep(1200); if ((await compose(page)).T.id === id) break; }
  if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) !== 'true') { await page.click('#live-toggle'); await sleep(600); }
  await page.$eval(`#live-profile [data-profile="${profile}"]`, el => el.click());
  await sleep(400);
  await page.selectOption('#live-narrator-style', style).catch(() => {});
  await sleep(300);
  const nd = await page.$('#live-narrated');
  if (nd && !(await nd.evaluate(el => el.hidden || el.disabled)) && (await nd.evaluate(el => el.getAttribute('aria-pressed') === 'true')) !== narrated) { await nd.click(); await sleep(300); }
  await page.waitForFunction(() => { const b = globalThis.codingMiskBars().compose; return !b.pending; }, null, { timeout: WAIT });
  await sleep(800);
}
async function play(page) {
  if (!(await cap(page, C => C.now() !== null))) { await page.click('#play'); await page.waitForFunction(() => globalThis.codingMiskCaptions.now() !== null, null, { timeout: 30000 }); }
}
async function stop(page) { if (await cap(page, C => C.now() !== null)) { await page.click('#stop').catch(() => {}); await sleep(400); } }
// the lane at a bar: seek there while playing, wait until the bar is reached and a frame drew
async function laneAt(page, bar) {
  await cap(page, (C, b) => C.seek(b), bar);
  await page.waitForFunction(b => { const n = globalThis.codingMiskCaptions.now(); return n !== null && n >= b && n < b + 1.5; }, bar, { timeout: 20000 }).catch(() => {});
  await sleep(350);
  return cap(page, C => C.lane());
}
const { execFileSync } = require('node:child_process');
// a picture of a 9:16 fragment: its video saved, one frame taken with ffmpeg at `at` seconds
async function fragShot(page, downloads, name, opts, at = 3.8) {
  downloads.length = 0;
  await page.evaluate(o => globalThis.codingMiskClips.fragments(o), { source: 'luci-rosse', from: 10, to: 20, quiet: true, files: ['video'], ...opts });
  await sleep(2500);
  const d = downloads.find(x => /\.mp4$/.test(x.suggestedFilename()));
  if (!d || !shots) return false;
  const f = path.join(shots, `${name}.mp4`); await d.saveAs(f);
  try { execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(at), '-i', f, '-frames:v', '1', '-vf', 'scale=540:-1', path.join(shots, `${name}.png`)]); fs.unlinkSync(f); return true; } catch (e) { return false; }
}
const shot = async (page, name, sel = '#stagewrap') => { if (shots) await page.locator(sel).screenshot({ path: path.join(shots, `${name}.png`) }); };

const LONG = 'the tree is still standing where the river used to bend';
// the lane with a long voice line added to the song playing: what the page shows, measured
async function longLane(page) {
  for (let k = 0; k < 3; k++) {
    const at = Math.floor(await cap(page, C => C.now())) + 1;
    await cap(page, (C, a) => C.addLine(a[0], a[1], 6), [LONG, at]);
    await page.waitForFunction(a => globalThis.codingMiskCaptions.now() >= a + 0.5, at, { timeout: 30000 }).catch(() => {});
    await sleep(400);
    const m = await page.evaluate(() => {
      const w = document.querySelector('#stagewrap').getBoundingClientRect(), say = document.querySelector('#say'), b = say.getBoundingClientRect();
      const row = [...say.querySelectorAll('.cap-row')].find(r => r.dataset.kind === 'voice'), t = row && row.querySelector('.cap-txt');
      if (!t) return null;
      const rg = document.createRange(); rg.selectNodeContents(t);
      const lines = [...new Set([...rg.getClientRects()].map(r => Math.round(r.top)))].length;
      const out = [...rg.getClientRects()].some(r => r.left < b.left - 1 || r.right > b.right + 1 || r.top < b.top - 1 || r.bottom > b.bottom + 1);
      return { text: t.textContent, hidden: t.scrollWidth > t.clientWidth + 1 || t.scrollHeight > t.clientHeight + 1, out, lines, fs: parseFloat(getComputedStyle(t).fontSize), base: parseFloat(getComputedStyle(row).fontSize), icon: !!row.querySelector('.cap-ico'),
        box: { x: b.left - w.left, y: b.top - w.top, w: b.width, h: b.height }, stage: { w: w.width, h: w.height } };
    });
    if (m) return m;
  }
  return null;
}
async function fitCase(page, shot) {
  await page.selectOption('#looks', 'pixel'); await sleep(300);
  const coWas = await page.evaluate(() => document.querySelector('#stagewrap').classList.contains('co-on'));
  if (!coWas) { await page.click('#code-over-btn'); await sleep(600); }
  const width = await page.evaluate(() => { try { return (JSON.parse(localStorage.getItem('coding-misk-code-over')) || {}).width || 62; } catch (e) { return 62; } });
  for (const theme of ['neon', 'hw']) {
    await page.click(`[data-uitheme="${theme}"]`); await sleep(300);
    for (const full of [false, true]) {
      const where = `${theme} ${full ? 'full screen' : 'page stage'}`;
      if (full) { await page.evaluate(() => document.querySelector('#stagewrap').requestFullscreen().catch(() => {})); await sleep(700); }
      if (full && !(await page.evaluate(() => !!document.fullscreenElement))) { console.log(`skip  long line ${where}: full screen unavailable`); continue; }
      const m = await longLane(page);
      check(!!m && m.text === `“${LONG}”` && !m.text.includes('…') && !m.hidden, `long line under Code over, ${where}: the whole line drawn, nothing cut`, m ? `${m.text} ${m.hidden ? 'hidden part' : ''} ${m.fs}px` : 'no row');
      check(!!m && !m.out && m.lines >= 1 && m.lines <= 3 && m.icon, `long line, ${where}: inside its box, three lines at most, the icon kept`, m ? `${m.lines} lines` : '');
      check(!!m && m.fs >= Math.min(m.base, Math.max(14, Math.round(m.base * 0.6))), `long line, ${where}: the font not below 60%`, m ? `${m.fs}px of ${m.base}px` : '');
      check(!!m && m.box.x >= m.stage.w * width / 100 - 1 && m.box.x + m.box.w <= m.stage.w + 1 && m.box.y >= 0 && m.box.y + m.box.h <= m.stage.h + 1, `long line, ${where}: the box in the free side of the stage`, m ? JSON.stringify(m.box) : '');
      await shot(page, `long-line-code-over-${theme}-${full ? 'fullscreen' : 'page'}`);
      if (full) { await page.evaluate(() => document.exitFullscreen().catch(() => {})); await sleep(500); }
    }
  }
  await page.click('[data-uitheme="neon"]'); await sleep(300);
  if (!coWas) { await page.click('#code-over-btn'); await sleep(300); }
  await page.selectOption('#looks', 'palco'); await sleep(300);
}

(async () => {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true }), page = await ctx.newPage(), downloads = [];
  page.on('download', d => downloads.push(d));
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => !!globalThis.codingMiskCaptions && !!globalThis.codingMiskBars, null, { timeout: WAIT });
  await sleep(1500);
  // (the design's lines are Italian)
  await page.click('.langs [data-lang="it"]'); await sleep(800);
  await cap(page, C => C.set(S => { Object.assign(S, { on: true, narrator: true, voice: true, typed: true, steps: true, claude: true, stepForm: 'tag', where: 'look', videos: true, marks: {} }); }));
  // --fit-only: the long line under Code over alone
  if (fitOnly) {
    await openSong(page, 'prova-voce-notte', { style: 'explain' }); await play(page);
    await fitCase(page, shot);
    check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
    await browser.close(); console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed'); process.exit(failed ? 1 : 0);
  }

  // ---- luci-rosse, Live coder, explaining: each heard line is the caption, no tag
  await openSong(page, 'luci-rosse', { style: 'explain' });
  await play(page);
  let lines = await cap(page, C => C.lines());
  const nar = lines.filter(x => x.kind === 'narrator');
  check(nar.length === 19, 'luci-rosse explain: 19 narrator captions', `${nar.length}`);
  let sameN = 0, tags = 0;
  for (const x of nar.slice(1, 6)) { const l = await laneAt(page, x.at); if (l.rows.some(r => r.kind === 'narrator' && r.text === x.text)) sameN++; if (l.tag) tags++; }
  check(sameN === 5 && tags === 0, 'explain: the lane shows the heard line, no tag', `${sameN}/5, ${tags} tags`);
  const l0 = await laneAt(page, nar[2].at);
  check(l0.rows[0] && l0.rows[0].icon && l0.rows[0].italic && l0.rows[0].title, 'default mark: the narrator with its icon, in italics, its name on hover', JSON.stringify(l0.rows[0]));
  await shot(page, 'lane-neon-explain');

  // ---- poetic without Narrated growth (poetic-narrator D1): as many narrator captions as the explaining style
  await stop(page);
  await openSong(page, 'luci-rosse', { style: 'poetic', narrated: false });
  await play(page);
  lines = await cap(page, C => C.lines());
  const plainN = lines.filter(x => x.kind === 'narrator');
  check(plainN.length === 19, 'poetic without Narrated growth: 19 narrator captions, as many as explain', `${plainN.length}`);
  // the entry on bar 18: its image on bar 17 with bar 18's step line as its tag, nothing spoken on bar 18
  // (narrator-caption-sync D1, superseding poetic-narrator D6 on the tag)
  const s18p = lines.find(x => x.kind === 'step' && x.at === 17), l17p = await laneAt(page, 16);
  check(!plainN.some(x => x.at === 17) && s18p && l17p.rows.some(r => r.kind === 'narrator') && l17p.tag === s18p.text, 'poetic without Narrated growth, bar 17: the entry image with bar 18\'s step line as its tag, no narrator line on bar 18', JSON.stringify({ l17p, s18: s18p && s18p.text }));

  // ---- poetic with Narrated growth: bar 8 says "la stanza si inclina" with the tag "ritmo più fitto"
  await stop(page);
  await openSong(page, 'luci-rosse', { style: 'poetic', narrated: true });
  await play(page);
  lines = await cap(page, C => C.lines());
  check(lines.filter(x => x.kind === 'narrator').length === 33, 'poetic with Narrated growth: 33 narrator captions', `${lines.filter(x => x.kind === 'narrator').length}`);
  let l8 = await laneAt(page, 7);
  check(l8.rows[0] && l8.rows[0].text === 'la stanza si inclina' && l8.tag === 'ritmo più fitto', 'bar 8: "la stanza si inclina" with the step tag "ritmo più fitto"', JSON.stringify(l8));
  // the entry on bar 18: its step line is the tag under bar 17's image, shown and gone with it (narrator-caption-sync D1)
  const s18 = lines.find(x => x.kind === 'step' && x.at === 17), l17 = await laneAt(page, 16);
  check(l17.rows.some(r => r.text === 'qualcosa di profondo si sveglia'), 'bar 17: the entry image', JSON.stringify(l17.rows));
  check(s18 && l17.tag === s18.text && !lines.some(x => x.kind === 'narrator' && x.at === 17), 'bar 17 (the image of bar 18\'s entry): bar 18\'s step line as its tag, no narrator line on bar 18', JSON.stringify({ l17, s18: s18 && s18.text }));
  await shot(page, 'lane-neon-poetic-16x9');
  // the old behaviour: the step line as the caption
  await cap(page, C => C.set(S => { S.stepForm = 'instead'; }));
  l8 = await laneAt(page, 7);
  check(l8.rows.length === 1 && l8.rows[0].kind === 'step' && l8.rows[0].text === 'ritmo più fitto' && !l8.tag, 'old behaviour: the step line as the caption', JSON.stringify(l8));
  await cap(page, C => C.set(S => { S.stepForm = 'tag'; }));
  // the marks: narrator Nothing (upright, no icon, name on hover), each of the five
  for (const m of ['none', 'style', 'label', 'icon', 'icon+style']) {
    await cap(page, (C, mm) => C.set(S => { S.marks.narrator = mm; }), m);
    const l = await laneAt(page, 7), r = l.rows[0] || {};
    const want = { none: !r.icon && !r.italic && !r.label, style: !r.icon && r.italic && !r.label, label: !r.icon && !r.italic && r.label === 'Narratore', icon: r.icon && !r.italic && !r.label, 'icon+style': r.icon && r.italic && !r.label }[m];
    check(want && !!r.title, `narrator mark "${m}"`, JSON.stringify(r));
    if (m === 'label') await shot(page, 'lane-mark-label');
  }
  // the switch off and on: nothing shows, the choices come back
  await cap(page, C => C.set(S => { S.marks.narrator = 'label'; S.voice = false; }));
  await cap(page, C => C.set(S => { S.on = false; }));
  const off = await laneAt(page, 7);
  check(!off.on, 'switch off: no text on the stage');
  await cap(page, C => C.set(S => { S.on = true; }));
  const back = await cap(page, C => C.settings());
  check(back.marks.narrator === 'label' && back.voice === false, 'switch on again: the choices kept');
  await cap(page, C => C.set(S => { S.marks = {}; S.voice = true; }));
  // hardware theme
  await page.click('[data-uitheme="hw"]'); await sleep(300);
  await laneAt(page, 7); await shot(page, 'lane-hw-poetic');
  await page.click('[data-uitheme="light"]'); await sleep(300);
  await laneAt(page, 7); await shot(page, 'lane-light-poetic');
  await page.click('[data-uitheme="neon"]'); await sleep(300);

  // ---- the "Claude" look: no page caption, the reply block, the transcript pane at 16:9
  await page.selectOption('#looks', 'claude'); await sleep(400);
  const lc = await laneAt(page, 7), ic = await cap(page, C => C.info(C.now()));
  check(!lc.on, 'Claude look: no page caption');
  check(ic.captions && ic.captions.rows.some(r => r.text === 'la stanza si inclina') && ic.prompt === 'ritmo più fitto', 'Claude look: the reply and the step prompt', JSON.stringify({ rows: ic.captions && ic.captions.rows.map(r => r.text), prompt: ic.prompt }));
  await shot(page, 'claude-c1-16x9');
  check(!(await page.$eval('#transcript', el => el.hidden)), 'Claude look: the Trascrizione option beside the render');
  await page.click('#transcript'); await sleep(200);
  await laneAt(page, 40);
  const it = await cap(page, C => C.info(C.now()));
  check(it.captions && it.captions.transcript && it.captions.history.length > 2, 'transcript on: the history behind the pane', `${it.captions && it.captions.history.length}`);
  await shot(page, 'claude-c2-transcript-16x9');
  // invented prompt lines never spoken or captioned
  const said = new Set(lines.filter(x => x.kind !== 'step').map(x => x.text));
  check(![...said].some(x => /^(bring in |drop |keep the groove|fai entrare |togli |tieni il groove)/i.test(x)), 'invented prompt lines are never captioned');
  await page.click('#transcript'); await sleep(200);
  await page.selectOption('#looks', 'palco'); await sleep(300);

  // ---- a fast video fragment (9:16) of the poetic song: each image heard shows as its caption, no step line as a
  // spoken caption, the lower third
  if (!noVideo) {
    await stop(page);
    await page.evaluate(() => { globalThis.codingMiskVideoCaptions = []; });
    const r = await page.evaluate(() => globalThis.codingMiskClips.fragments({ source: 'luci-rosse', from: 10, to: 40, quiet: true }));
    const drawn = await page.evaluate(() => globalThis.codingMiskVideoCaptions);
    const heard = new Set(lines.filter(x => x.kind === 'narrator').map(x => x.text)), steps = new Set(lines.filter(x => x.kind === 'step' && !x.heard).map(x => x.text));
    const texts = [...new Set(drawn.map(x => x.text))];
    check(!r.error && texts.length > 0 && texts.every(x => heard.has(x)) && drawn.every(x => x.tall && x.kind === 'narrator'), 'fragment 9:16: the images heard as captions, in the tall form', `${texts.length} lines: ${texts.slice(0, 4).join(' | ')}${r.error ? ` error ${r.error}` : ''}`);
    check(!texts.some(x => steps.has(x)) && drawn.some(x => x.tag), 'fragment: no step line as a spoken caption, the step tag below', `${drawn.filter(x => x.tag).length} frames with a tag`);
    // In videos too off: none
    await cap(page, C => C.set(S => { S.videos = false; }));
    await page.evaluate(() => { globalThis.codingMiskVideoCaptions = []; });
    await page.evaluate(() => globalThis.codingMiskClips.fragments({ source: 'luci-rosse', from: 10, to: 20, quiet: true }));
    check(!(await page.evaluate(() => globalThis.codingMiskVideoCaptions.length)), 'In videos too off: no caption in the fragment');
    await cap(page, C => C.set(S => { S.videos = true; }));
    await page.evaluate(() => { globalThis.codingMiskVideoCaptions = null; });
    // pictures for the owner: 9:16 in neon and hardware, the "Claude" look in 9:16 (reply block, no transcript pane)
    if (shots) {
      await fragShot(page, downloads, 'fragment-9x16-neon', { look: 'palco', render: 'normal' });
      await page.click('[data-uitheme="hw"]'); await sleep(300);
      await fragShot(page, downloads, 'fragment-9x16-hw', { look: 'palco', render: 'normal' });
      await page.click('[data-uitheme="neon"]'); await sleep(300);
      await page.evaluate(() => localStorage.setItem('coding-misk-claude-transcript', 'true'));
      await fragShot(page, downloads, 'fragment-9x16-claude', { look: 'claude', render: 'normal' }, 5.5);
      await page.evaluate(() => localStorage.removeItem('coding-misk-claude-transcript'));
    }
    await play(page);
  }

  // ---- a voice track: prova-voce-notte, the line on bar 8, and with the narrator off
  await stop(page);
  await openSong(page, 'prova-voce-notte', { style: 'explain' });
  await play(page);
  lines = await cap(page, C => C.lines());
  const voice = lines.filter(x => x.kind === 'voice');
  check(voice.length >= 4, 'prova-voce-notte: voice-track captions', `${voice.length}`);
  let vOk = 0;
  for (const x of voice.slice(0, 3)) { const l = await laneAt(page, Math.floor(x.at)); if (l.rows.some(r => r.kind === 'voice' && r.text === `“${x.text}”`)) vOk++; }
  check(vOk === Math.min(3, voice.length), 'voice track: its lines shown in quotes', `${vOk}`);
  await shot(page, 'lane-voice-track');
  // narrator only: voice track, console lines, step lines and replies off
  await cap(page, C => C.set(S => { Object.assign(S, { voice: false, typed: false, steps: false, claude: false }); }));
  const only = await laneAt(page, Math.floor(voice[0].at));
  check(!only.on || (!only.rows.some(r => r.kind !== 'narrator') && !only.tag), 'narrator only: no voice-track line, no step tag', JSON.stringify(only));
  await cap(page, C => C.set(S => { Object.assign(S, { voice: true, typed: true, steps: true, claude: true }); }));
  // 400 px
  await page.setViewportSize({ width: 400, height: 860 }); await sleep(500);
  await laneAt(page, Math.floor(voice[0].at)); await shot(page, 'lane-400px');
  await page.setViewportSize({ width: 1300, height: 900 }); await sleep(300);

  // ---- a long line under Code over (caption fit): on the Pixel visual with the code on the left, in the page's stage
  // and in full screen, neon and hardware, the whole line is drawn (no …, nothing hidden) inside its box, on up to three
  // lines, the box in the free side of the stage, the font not below 60%
  await fitCase(page, shot);
  await stop(page);

  // ---- samples prepared ahead (D9): a narrator line's sample taken away is made again by the voice helper, the song
  // written again and the line captioned; without the helper, skipped
  const helper = await page.evaluate(() => fetch('/voice/status').then(r => r.json()).then(j => !!j.ok).catch(() => false));
  if (!helper) console.log('skip  samples prepared ahead: no voice helper on this machine');
  else {
    // (Classic: the steps come from the clips, so a missing sample does not change the build; a grown song may grow
    // another way without it)
    await page.reload(); await page.waitForFunction(() => !!globalThis.codingMiskCaptions, null, { timeout: WAIT }); await sleep(1500);
    await openSong(page, 'luci-rosse', { profile: 'classic', style: 'auto' });
    const x = (await cap(page, C => C.lines())).filter(y => y.kind === 'narrator')[2], slug = await cap(page, (C, t) => C.slug(t), x.text);
    const file = path.join('public', 'samples', 'say_it', `${slug}.wav`), keep = path.join(require('node:os').tmpdir(), `cap-${slug}.wav`);
    let notes = new Set(), back = false;
    if (fs.existsSync(file)) {
      fs.renameSync(file, keep);
      try {
        await cap(page, C => C.reload());
        const t0 = Date.now();
        while (Date.now() - t0 < 120000) {
          const n = await page.evaluate(() => { const el = document.querySelector('#voice-prep'); return el ? el.textContent : ''; });
          if (n) notes.add(n);
          back = fs.existsSync(file) && (await cap(page, (C, t) => C.lines().some(y => y.kind === 'narrator' && y.text === t), x.text));
          if (back) break;
          await sleep(500);
        }
        check(back, 'a missing narrator sample is made by the voice helper and the line captioned again', `"${x.text}"`);
        check(notes.size > 0, 'the Voices group says the voices are being prepared', [...notes].join(' | '));
      } finally { if (!fs.existsSync(file)) fs.renameSync(keep, file); else if (fs.existsSync(keep)) fs.unlinkSync(keep); }
    } else console.log(`skip  samples prepared ahead: ${file} not here (copy the voice samples first)`);
  }

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
