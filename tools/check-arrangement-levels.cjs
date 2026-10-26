// Levels and load of a radio song stacked to 12 tracks with "+" (radio-arrangement D4, D5, tasks 1.5 and 1.8): for each
// style, a radio session where the console adds tracks of every instrument until 12 play; then the level into the
// master limiter (in=) and the output (out=) over the phrases after the additions, and, with --minutes, the song played
// that long in real time: evaluation errors, long tasks on the page and late audio (Chrome's playback stats when the
// browser has them, else the audio clock against the page clock).
// Target (D5): in= at most 1.2, out= below 1.0. Load: no evaluation error, no audio underrun.
// Usage: PORT=5183 PLAYWRIGHT_CORE=... node tools/check-arrangement-levels.cjs [style,style…] [--minutes 2] [--seed s] [--plain]
// (--plain: no additions, the same song as the director wrote it: a baseline of the load)
// --scenario: the owner's listening test of radio-arrangement (task 7.3) instead: two arps, three pads, two kicks, a locked
// bass, a riser into the next change, a saved bassline as a new track and Part harmony on the pad; then every phrase up
// to the outro: the added tracks still play (a break may take one out), no evaluation error, the output below clipping
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const { CLIP, tapOutput, outputPeak, limiterInput } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const styles = (args.find(a => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--minutes' && args[args.indexOf(a) - 1] !== '--seed') || 'berlin-techno,darksynth,jazz').split(',');
const minutes = Number(opt('--minutes') || 0), seed = opt('--seed') || 'arr-levels', plain = args.includes('--plain'), scenario = args.includes('--scenario');
const PORT = process.env.PORT || 5173;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

async function runScenario(page, style) {
  const bass = { id: 'p-scenario', name: 'Bassline', kind: 'basslines', type: 'bass', pattern: { preset: 'rolling' }, sound: 'sawtooth', settings: { wave: 'sawtooth', gain: 0.7 }, context: { key: 'A', chords: 'notturna', meter: '4/4', bpm: 128, mode: 'minor' }, styles: [], source: 'compose', created: '2026-10-26' };
  await page.evaluate(([st, b]) => { localStorage.clear(); localStorage.setItem('coding-misk-patterns', JSON.stringify([b])); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); }, [style, bass]);
  await page.reload(); await sleep(3500);
  await tapOutput(page);
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', `${seed}-scenario`); await page.click('#radio-start'); await sleep(2500);
  const cmds = [['more', 'arp'], ['more', 'arp'], ['more', 'pad'], ['more', 'pad'], ['more', 'pad'], ['more', 'kick'], ['more', 'kick'], ['lock-part', 'bass']].map(([kind, part]) => ({ kind, part }));
  for (const c of cmds) { await page.evaluate(c => globalThis.codingMiskRadio.command(c), c); await sleep(150); }
  await page.evaluate(() => globalThis.codingMiskRadio.command({ kind: 'riser', bars: 'auto', dir: 'up', sound: 'noise' })); await sleep(150);
  if ((await page.getAttribute('#sp-toggle', 'aria-expanded')) !== 'true') { await page.click('#sp-toggle'); await sleep(300); }
  await page.click('#radio-steer [data-sp-new="p-scenario"]').catch(() => {}); await sleep(300);
  await page.evaluate(() => globalThis.codingMiskRadio.command({ kind: 'voicing', type: 'pad', target: 'auto', treatment: 'auto' })); await sleep(300);
  const s0 = await page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return { added: s.plan.added, risers: s.plan.risers, at: Math.min(...s.commands.map(c => c.at)), phrase: s.plan.phrase, roles: s.plan.roles, bars: s.plan.bars, kinds: s.commands.map(c => c.kind) }; });
  console.log(`${style}: ${s0.kinds.join(', ')}; added ${s0.added.map(a => a.id).join(', ')}; riser ${JSON.stringify(s0.risers[0] || null)}`);
  check(s0.added.length >= 8, `${style}: the additions are on the song`, `${s0.added.length}`);
  let end = s0.roles.length; while (end > 0 && s0.roles[end - 1] === 'outro') end--;
  const stop = Math.min(end * 2 * s0.phrase, s0.bars - s0.phrase);
  let out = 0, pre = 0;
  const missing = [];
  for (let b = s0.at; b < stop; b += s0.phrase) {
    await page.evaluate(x => globalThis.codingMiskRadio.seek(x), b + 0.5); await sleep(2200);
    await outputPeak(page); await limiterInput(page); await sleep(1500);
    out = Math.max(out, await outputPeak(page)); pre = Math.max(pre, await limiterInput(page));
    const r = await page.evaluate(async b => { const { stateAt } = await import('/src/song/build.js'), s = globalThis.codingMiskRadio.steering; return { on: stateAt(s.song, b).song.tracks.filter(t => !t.mute).map(t => t.id), err: String(document.querySelector('strudel-editor').editor.repl.state.evalError || '') }; }, b + 0.5);
    const role = s0.roles[Math.floor(b / (2 * s0.phrase))];
    const gone = s0.added.map(a => a.id).filter(id => !r.on.includes(id));
    console.log(`  bar ${b} (${role}): ${r.on.filter(id => id !== 'voice').join(' ')}${gone.length ? `  silent: ${gone.join(' ')}` : ''}`);
    if (role !== 'break' && gone.length) missing.push(`${b}: ${gone.join(' ')}`);
    check(!r.err, `${style}: no evaluation error on bar ${b}`, r.err);
  }
  check(!missing.length, `${style}: every added track still plays later, breaks aside`, missing.join(' | '));
  console.log(`  levels: out=${out.toFixed(2)} in=${pre.toFixed(2)}`);
  check(out < CLIP, `${style}: output below clipping`, out.toFixed(2));
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await (await browser.newContext({ viewport: { width: 1300, height: 1000 } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  if (scenario) { await runScenario(page, styles[0]); check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | ')); await browser.close(); console.log(failed ? `${failed} check(s) failed` : 'the listening scenario passed'); process.exit(failed ? 1 : 0); }
  for (const style of styles) {
    await page.evaluate(st => { localStorage.clear(); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: [st], chaos: 0.3, energy: 0.6, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song' })); }, style);
    await page.reload(); await sleep(3500);
    await tapOutput(page);
    await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
    await page.fill('#radio-seed', `${seed}-${style}`);
    await page.click('#radio-start'); await sleep(2500);
    // "+" on every instrument the style has, in turn, until 12 tracks play on the bar the commands apply
    const stack = await page.evaluate(async PLAIN => {
      const R = globalThis.codingMiskRadio, { stateAt } = await import('/src/song/build.js'), S = await import('/src/endless/steering.js');
      const it = () => R.steering, count = (song, bar) => stateAt(song, bar).song.tracks.filter(t => !t.mute && !['voice', 'spoken', 'riser'].includes(t.type)).length;
      const at0 = () => { const s = it(); return s.commands.length ? s.commands[0].at : null; };
      let j = 0, made = 0;
      for (; j < (PLAIN ? 0 : 40); j++) {
        const s = it(), at = at0();
        if (at !== null && count(s.song, at) >= S.TRACK_CAP) break;
        const parts = S.INSTRUMENTS;
        const part = parts[j % parts.length];
        if (R.command({ kind: 'more', part })) made++;
      }
      const s = it(), at = at0();
      return { at, made, n: at === null ? 0 : count(s.song, at), phrase: s.plan.phrase, bars: s.plan.bars, usual: s.plan.usualHigh, tracks: at === null ? [] : stateAt(s.song, at).song.tracks.filter(t => !t.mute && t.type !== 'voice').map(t => `${t.id}:${t.settings.gain}`) };
    }, plain);
    // (--plain: the song as the director wrote it, for a baseline of the load)
    if (plain) stack.at = 2 * stack.phrase;
    console.log(`${style}: ${stack.made} + pressed, ${stack.n} tracks from bar ${stack.at} (usual ${stack.usual}): ${stack.tracks.join(' ')}`);
    if (!plain) check(stack.n === 12, `${style}: 12 tracks play`, `${stack.n}`);
    // the phrases after the additions: levels into the limiter and out of it
    await page.evaluate(b => globalThis.codingMiskRadio.seek(b), stack.at + 0.5); await sleep(1500);
    await outputPeak(page); await limiterInput(page);
    let out = 0, pre = 0;
    const lines = {};
    const ms = Math.min(20000, stack.phrase * 2.2 * 1000);
    for (let t = 0; t < ms; t += 1000) {
      const r = await page.evaluate(async () => { const mx = {}; for (let k = 0; k < 16; k++) { for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); mx[a] = Math.max(mx[a] || 0, m); } await new Promise(r => setTimeout(r, 50)); } return mx; });
      for (const [k, v] of Object.entries(r)) lines[k] = Math.max(lines[k] || 0, v);
      out = Math.max(out, await outputPeak(page)); pre = Math.max(pre, await limiterInput(page));
    }
    const ev = await page.evaluate(() => String(document.querySelector('strudel-editor').editor.repl.state.evalError || ''));
    console.log(`  ${Object.entries(lines).filter(([, v]) => v > 0.02).map(([a, v]) => `${a}=${v.toFixed(2)}`).join(' ')}  out=${out.toFixed(2)} in=${pre.toFixed(2)}`);
    check(!ev, `${style}: no evaluation error`, ev);
    check(pre <= 1.2, `${style}: level into the limiter at most 1.2`, pre.toFixed(2));
    check(out < CLIP, `${style}: output below clipping`, out.toFixed(2));
    if (minutes > 0) {
      // the song in real time: long tasks, late audio, errors
      await page.evaluate(b => globalThis.codingMiskRadio.seek(b), stack.at + 0.5); await sleep(500);
      await page.evaluate(() => {
        const L = globalThis.miskLoad = { long: 0, longest: 0, drift: 0, ctx: null };
        try { new PerformanceObserver(list => { for (const e of list.getEntries()) { L.long++; L.longest = Math.max(L.longest, e.duration); } }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
        const ctx = globalThis.getAudioContext(), s = ctx.playbackStats;
        L.start = { a: ctx.currentTime, p: performance.now(), under: s ? s.underrunEvents : null, underDur: s ? s.underrunDuration : null };
      });
      await sleep(minutes * 60000);
      const L = await page.evaluate(() => { const L = globalThis.miskLoad, ctx = globalThis.getAudioContext(), s = ctx.playbackStats, a = ctx.currentTime - L.start.a, p = (performance.now() - L.start.p) / 1000; return { long: L.long, longest: Math.round(L.longest), audio: a, page: p, under: s && L.start.under !== null ? s.underrunEvents - L.start.under : null, underDur: s && L.start.underDur !== null ? s.underrunDuration - L.start.underDur : null, err: String(document.querySelector('strudel-editor').editor.repl.state.evalError || '') }; });
      console.log(`  ${minutes} min: long tasks ${L.long} (longest ${L.longest} ms), audio clock ${L.audio.toFixed(1)} s against ${L.page.toFixed(1)} s${L.under !== null ? `, underruns ${L.under} (${(L.underDur || 0).toFixed(3)} s)` : ', no playback stats'}`);
      check(!L.err, `${style}: no evaluation error in ${minutes} min`, L.err);
      check(L.under === null ? Math.abs(L.audio - L.page) < 0.5 : L.under === 0, `${style}: no audio underrun in ${minutes} min`, L.under === null ? `clock drift ${(L.audio - L.page).toFixed(2)} s` : `${L.under}`);
    }
    await page.click('#radio-stop').catch(() => {}); await sleep(300);
  }
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : 'all arrangement level checks passed');
  process.exit(failed ? 1 : 0);
})();
