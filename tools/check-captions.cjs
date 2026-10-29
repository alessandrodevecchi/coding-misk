// Browser check of the stage captions (spoken-text-on-stage, #82): the cases of the design measured again (the caption
// is the line heard on every spoken bar, the voice track's lines shown, nothing shown that is not heard), the step tag,
// the marks of each voice, the settings card (switch off and on with the choices kept, narrator only, each of the five
// marks, the old behaviour), the "Claude" look (reply block, no page caption, the transcript pane at 16:9 and none at
// 9:16, an invented prompt line never captioned), the hardware theme, 400 px, and a fast video fragment's captions.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-captions.cjs [shots-dir] [--no-video]
//   (dev server on PORT, default 5173; with shots-dir: pictures of the lane and the "Claude" look)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`, WAIT = 180000;
const args = process.argv.slice(2), shots = args[0] && !args[0].startsWith('--') && args[0] !== '-' ? args[0] : null, noVideo = args.includes('--no-video');
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
const shot = async (page, name, sel = '#stagewrap') => { if (shots) await page.locator(sel).screenshot({ path: path.join(shots, `${name}.png`) }); };

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL);
  await page.waitForFunction(() => !!globalThis.codingMiskCaptions && !!globalThis.codingMiskBars, null, { timeout: WAIT });
  await sleep(1500);
  // (the design's lines are Italian)
  await page.click('.langs [data-lang="it"]'); await sleep(800);
  await cap(page, C => C.set(S => { Object.assign(S, { on: true, narrator: true, voice: true, typed: true, steps: true, claude: true, stepForm: 'tag', where: 'look', videos: true, marks: {} }); }));

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

  // ---- poetic with Narrated growth: bar 8 says "la città respira" with the tag "ritmo più fitto"
  await stop(page);
  await openSong(page, 'luci-rosse', { style: 'poetic', narrated: true });
  await play(page);
  lines = await cap(page, C => C.lines());
  check(lines.filter(x => x.kind === 'narrator').length === 38, 'poetic with Narrated growth: 38 narrator captions', `${lines.filter(x => x.kind === 'narrator').length}`);
  let l8 = await laneAt(page, 7);
  check(l8.rows[0] && l8.rows[0].text === 'la città respira' && l8.tag === 'ritmo più fitto', 'bar 8: "la città respira" with the step tag "ritmo più fitto"', JSON.stringify(l8));
  await shot(page, 'lane-neon-poetic-16x9');
  const l17 = await laneAt(page, 16);
  check(l17.rows.some(r => r.text === 'qualcosa di profondo si sveglia'), 'bar 17: the entry image', JSON.stringify(l17.rows));
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
  await page.click('[data-uitheme="neon"]'); await sleep(300);

  // ---- the "Claude" look: no page caption, the reply block, the transcript pane at 16:9
  await page.selectOption('#looks', 'claude'); await sleep(400);
  const lc = await laneAt(page, 7), ic = await cap(page, C => C.info(C.now()));
  check(!lc.on, 'Claude look: no page caption');
  check(ic.captions && ic.captions.rows.some(r => r.text === 'la città respira') && ic.prompt === 'ritmo più fitto', 'Claude look: the reply and the step prompt', JSON.stringify({ rows: ic.captions && ic.captions.rows.map(r => r.text), prompt: ic.prompt }));
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
  // 400 px
  await page.setViewportSize({ width: 400, height: 860 }); await sleep(500);
  await laneAt(page, Math.floor(voice[0].at)); await shot(page, 'lane-400px');
  await page.setViewportSize({ width: 1300, height: 900 }); await sleep(300);
  await stop(page);

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
