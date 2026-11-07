// What the radio says is what it plays, measured in the browser (fx1, fx3): a radio session grown on air (Live coder,
// synthwave, Voice: track always with many phrases) played from its first bar. Every voice-track entry the stage
// captions show has its sample started on that bar (a line of several entries joined by « · » in the code's comment:
// each entry); then a line typed in the console with Say now, late in a bar and with the CPU slowed 4 times, starts on
// the bar the song puts it on. A sample counts as heard when the page starts its buffer within 0.6 bar of the caption,
// at a gain above 0 (the silent warm-ups of the voices are left out). You cannot listen: these are the buffers started.
// #82, a sample made while the page plays: a new line's sample fetched the moment the voice helper answers is audio (a
// missing one a 404, never the page); a new line typed with Say now (its sample not made before, the CPU slowed 4 times)
// starts its own sample on its bar, no stand-in of a voice bank is played and the sound guard's store
// (coding-misk-sound-health) never holds a say_* entry; a say_* entry already stored is dropped on load. The samples the
// run makes are deleted at the end.
// Needs the voice samples in public/samples/say_* and the dev server's voice helper (macOS say and ffmpeg).
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voice-heard.cjs [--bars 8] [--seed fx1-a]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const BARS = +arg('--bars', 8), SEED = arg('--seed', 'fx1-a');
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
// a sample's file name from a caption's text, as saySlug writes it
const W = ['amber', 'velvet', 'harbour', 'silver', 'quiet', 'neon', 'river', 'distant', 'paper', 'winter', 'hollow', 'golden', 'midnight', 'glass', 'ember', 'lantern', 'violet', 'copper'];
const fresh = lead => `${lead} ${Array.from({ length: 3 }, () => W[Math.floor(Math.random() * W.length)]).join(' ')} ${Math.floor(Math.random() * 9000) + 1000}`;
const FONTS_VERSION = require('../node_modules/@strudel/soundfonts/package.json').version, HEALTH = 'coding-misk-sound-health';
const slug = t => t.replace(/[“”]/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1300 } });
  // every buffer of a voice sample the page starts: its file and the bar it starts on; the voices warmed up at gain 0
  // (main.js warmVoices) and the release of a buffer that was never played (started 5 s later) are marked
  await ctx.addInitScript(() => {
    window.__starts = []; window.__warm = [];
    let sd;
    Object.defineProperty(window, 'superdough', { configurable: true, get: () => sd, set: v => { sd = (val, t, ...a) => { if (val && val.gain === 0) window.__warm.push(t); return v(val, t, ...a); }; } });
    const tagOf = new WeakMap(), of = window.fetch;
    window.fetch = async (u, ...a) => { const r = await of(u, ...a); const url = String((u && u.url) || u); if (url.includes('/samples/say_') && url.split('?')[0].endsWith('.wav')) { const ab = r.arrayBuffer.bind(r); r.arrayBuffer = async () => { const b = await ab(); tagOf.set(b, url); return b; }; } return r; };
    const dec = BaseAudioContext.prototype.decodeAudioData;
    BaseAudioContext.prototype.decodeAudioData = function (b, ...a) { const url = tagOf.get(b); return dec.call(this, b, ...a).then(buf => { if (url) buf.__url = url; return buf; }); };
    const st = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (when, ...a) {
      const now = this.context.currentTime;
      if (this.buffer && this.buffer.__url && when - now < 4 && window.__rel) window.__starts.push({ file: decodeURI(this.buffer.__url.split('?')[0].split('/').pop()), bar: window.__rel() + (when - now) * window.__cps(), warm: window.__warm.some(w => Math.abs(w - when) < 0.002) });
      return st.call(this, when, ...a);
    };
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // the sound guard's stand-ins of a voice bank (#82: "[sounds] say_en_kathy 324 is broken, playing 325")
  const standIns = [];
  page.on('console', m => { const t = m.text(); if (/^\[sounds\] say_/.test(t)) standIns.push(t); });
  const base = `http://localhost:${process.env.PORT || 5173}`, made = [];
  await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'en'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['synthwave'], chaos: 0.3, energy: 0.5, complexity: 0.5, talk: 0.5, artist: null, transition: 'cut', harmony: 'compatible', scope: 'song', profile: 'switch', compilation: 'off', voice: { presence: 'always', phrases: 'many', kind: 'mixed' } })); });
  // (an owner's store poisoned before #82: a say_* entry, next to an entry of another bank)
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify({ version: v, broken: [{ name: 'say_en_kathy', index: 324 }, { name: 'cm_probe', index: 0 }] })), [HEALTH, FONTS_VERSION]);
  await page.reload(); await sleep(3500);
  {
    const h = await page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), HEALTH), names = h && Array.isArray(h.broken) ? h.broken.map(e => e.name) : [];
    check(!names.some(n => /^say_/.test(n)) && names.includes('cm_probe'), 'a stored say_* entry of the sound guard is dropped on load, the others kept (#82)', JSON.stringify(names));
  }
  const helper = await page.evaluate(() => fetch('/voice/status').then(r => r.ok).catch(() => false));
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', SEED); await page.click('#radio-start');
  await page.evaluate(() => {
    const sch = () => document.querySelector('strudel-editor').editor.repl.scheduler;
    window.__rel = () => { const r = globalThis.codingMiskRadio.state, it = r.stream[r.onAir]; return sch().now() - it.start; };
    window.__cps = () => sch().cps;
    // the voice-track captions on the stage, each with the bar it appeared on
    window.__caps = [];
    setInterval(() => { try { const t = [...document.querySelectorAll('#say .cap-row')].map(r => r.querySelector('.cap-txt').textContent).filter(x => /“/.test(x)).join(' | '), last = window.__caps[window.__caps.length - 1]; if (t && (!last || last.t !== t)) window.__caps.push({ bar: window.__rel(), t }); } catch (e) {} }, 60);
  });
  // the song on air grown (away from the page), then played again from its first bar, as a listener hears it
  for (let k = 0; k < 240; k++) { if (await page.evaluate(() => { const s = globalThis.codingMiskRadio.state; return s.stream[s.onAir].grown && !s.stream[s.onAir].growing; })) break; await sleep(250); }
  const song = await page.evaluate(() => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(t => t.type === 'spoken'); return { title: s.song.title, growth: s.song.crescendo && s.song.crescendo.growth, clips: sp ? sp.clips : [] }; });
  check(song.growth > 0 && song.clips.length > 0, 'the song on air grew and has a voice track', `${song.title}, growth ${song.growth} bars, clips at ${song.clips.map(c => c.start + 1).join(', ')}`);
  await page.evaluate(() => { window.__starts = []; window.__caps = []; globalThis.codingMiskRadio.restart(); });
  const rel = () => page.evaluate(() => window.__rel());
  for (let i = 0; i < 2000 && (await rel()) < BARS; i++) await sleep(250);
  const heardOf = (starts, text, bar) => starts.find(x => !x.warm && x.file === `${slug(text)}.wav` && Math.abs(x.bar - bar) < 0.6);
  {
    const r = await page.evaluate(() => ({ starts: window.__starts, caps: window.__caps }));
    const shown = r.caps.flatMap(c => c.t.split(' | ').map(t => ({ bar: c.bar, t }))), missed = shown.filter(c => !heardOf(r.starts, c.t, c.bar));
    check(shown.length > 0, `voice-track captions in the first ${BARS} bars`, shown.map(c => `${c.bar.toFixed(2)} ${c.t}`).join(', '));
    check(shown.length > 0 && !missed.length, 'every voice-track entry shown is started on its bar (fx1)', missed.map(c => `${c.bar.toFixed(2)} ${c.t} not heard`).join(', '));
  }
  // fx3: a typed line, Say now, late in a bar, the CPU slowed 4 times; its sample made first (the voice helper), so the
  // command goes at once
  if (!helper) check(false, 'typed line: the dev server voice helper answers');
  else {
    const text = 'the signal hums under the bridge';
    await page.evaluate(async t => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(x => x.type === 'spoken'), { speakerOf } = await import('/src/song/spoken.js'); await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, lang: 'en', speaker: speakerOf(s.song, sp) }) }); }, text);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const from = Math.floor(await rel()) + 1;
    while ((await rel()) < from + 0.62) await sleep(30);
    await page.evaluate(() => { window.__starts = []; window.__caps = []; });
    await page.fill('#radio-steer [data-sv-line]', text); await page.click('#radio-steer [data-sv-say="now"]');
    const asked = await rel();
    let clip = null;
    for (let k = 0; k < 200 && !clip; k++) { await sleep(50); clip = await page.evaluate(t => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(x => x.type === 'spoken'), k = sp && Object.keys(sp.patterns).find(q => sp.patterns[q].text && Object.values(sp.patterns[q].text).includes(t)); return k ? { ...sp.clips.find(c => c.pattern === k), seen: window.__rel() } : null; }, text); }
    check(!!clip, 'typed line: on the song on air', clip ? `asked on ${asked.toFixed(2)}, on the song on ${clip.seen.toFixed(2)}, its bar ${clip.start + 1}` : '');
    if (clip) {
      check(clip.start - asked >= 0.5, 'typed line: its bar starts at least half a bar after it was asked', `${(clip.start - asked).toFixed(2)} bar`);
      while ((await rel()) < clip.start + 1.5) await sleep(100);
      const starts = await page.evaluate(() => window.__starts), hit = heardOf(starts, text, clip.start);
      check(!!hit, 'typed line: its sample starts on its bar (fx3)', hit ? `bar ${(hit.bar + 1).toFixed(2)}` : `starts: ${starts.filter(x => !x.warm).map(x => `${x.file} ${x.bar.toFixed(2)}`).join(', ') || 'none'}`);
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    // #82: a typed line whose sample arrives late (its file held back 4 s, decoded after the bar Say now aimed at) is
    // never lost: the line goes on a later bar, once its sample is decoded, and starts there
    const late = 'a slow tape rolls in the rain', file = `${slug(late)}.wav`;
    await page.evaluate(async t => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(x => x.type === 'spoken'), { speakerOf } = await import('/src/song/spoken.js'); await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: t, lang: 'en', speaker: speakerOf(s.song, sp) }) }); }, late);
    let released = null;
    const held = u => u.pathname.endsWith(`/${file}`);
    await page.route(held, async route => { await sleep(4000); released = await rel(); await route.continue(); });
    const from2 = Math.floor(await rel()) + 1;
    while ((await rel()) < from2 + 0.3) await sleep(30);
    await page.evaluate(() => { window.__starts = []; });
    await page.fill('#radio-steer [data-sv-line]', late); await page.click('#radio-steer [data-sv-say="now"]');
    const asked2 = await rel();
    let clip2 = null;
    for (let k = 0; k < 400 && !clip2; k++) { await sleep(50); clip2 = await page.evaluate(t => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(x => x.type === 'spoken'), k = sp && Object.keys(sp.patterns).find(q => sp.patterns[q].text && Object.values(sp.patterns[q].text).includes(t)); return k ? { ...sp.clips.find(c => c.pattern === k), seen: window.__rel() } : null; }, late); }
    check(!!clip2, 'late sample: the typed line is on the song on air', clip2 ? `asked on ${asked2.toFixed(2)}, sample arrived on ${released === null ? '?' : released.toFixed(2)}, its bar ${clip2.start + 1}` : '');
    if (clip2) {
      check(released !== null && clip2.start > released, 'late sample: its bar comes after the sample arrived (moved on, not dropped)', `bar ${clip2.start + 1}, sample on ${released === null ? '?' : (released + 1).toFixed(2)}`);
      while ((await rel()) < clip2.start + 1.5) await sleep(100);
      const starts = await page.evaluate(() => window.__starts), hit = heardOf(starts, late, clip2.start);
      check(!!hit, 'late sample: its sample starts on its bar (#82)', hit ? `bar ${(hit.bar + 1).toFixed(2)}` : `starts: ${starts.filter(x => !x.warm).map(x => `${x.file} ${x.bar.toFixed(2)}`).join(', ') || 'none'}`);
    }
    await page.unroute(held).catch(() => {});
  }
  // #82: a sample made while the page plays
  if (helper) {
    const text = fresh('the wires hum'), r = await fetch(`${base}/voice/say`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang: 'en', speaker: '' }) }).then(x => x.json()).catch(() => null);
    if (r && r.bank) {
      made.push(`${r.bank}/${slug(text)}.wav`);
      const got = await fetch(`${base}/samples/${r.bank}/${slug(text)}.wav`), type = got.headers.get('content-type') || '', head = Buffer.from(await got.arrayBuffer()).toString('ascii', 0, 4);
      check(got.status === 200 && /^audio\//.test(type) && head === 'RIFF', 'new sample: fetched the moment the voice helper answers, it is audio (#82)', `${got.status} ${type} ${head}`);
    } else check(false, 'new sample: the voice helper made it', JSON.stringify(r));
    const miss = await fetch(`${base}/samples/say_en/no_such_line_${Date.now()}.wav`), mtype = miss.headers.get('content-type') || '';
    check(miss.status === 404 && !/text\/html/.test(mtype), 'a missing sample is a 404, not the page (#82)', `${miss.status} ${mtype}`);
    // a new line typed with Say now, its sample not made before, the CPU slowed 4 times
    const line = fresh('the lights hum'), file = `${slug(line)}.wav`;
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const from = Math.floor(await rel()) + 1;
    while ((await rel()) < from + 0.5) await sleep(30);
    await page.evaluate(() => { window.__starts = []; });
    standIns.length = 0;
    await page.fill('#radio-steer [data-sv-line]', line); await page.click('#radio-steer [data-sv-say="now"]');
    let clip = null;
    for (let k = 0; k < 600 && !clip; k++) { await sleep(50); clip = await page.evaluate(t => { const s = globalThis.codingMiskRadio.steering, sp = s.song.tracks.find(x => x.type === 'spoken'), k = sp && Object.keys(sp.patterns).find(q => sp.patterns[q].text && Object.values(sp.patterns[q].text).includes(t)); return k ? sp.clips.find(c => c.pattern === k) : null; }, line); }
    check(!!clip, 'new line with Say now: on the song on air (#82)', clip ? `bar ${clip.start + 1}` : '');
    if (clip) {
      while ((await rel()) < clip.start + 1.5) await sleep(100);
      const starts = await page.evaluate(() => window.__starts), hit = heardOf(starts, line, clip.start);
      check(!!hit, 'new line with Say now: its own sample starts on its bar (#82)', hit ? `bar ${(hit.bar + 1).toFixed(2)}` : `starts: ${starts.filter(x => !x.warm).map(x => `${x.file} ${x.bar.toFixed(2)}`).join(', ') || 'none'}`);
      check(!standIns.length, 'new line with Say now: no stand-in of a voice bank played (#82)', standIns.slice(0, 2).join(' | '));
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const h = await page.evaluate(k => localStorage.getItem(k) || '', HEALTH);
    check(!/"name":"say_/.test(h), 'the sound guard\'s store holds no say_* entry (#82)', h.slice(0, 160));
    const usage = await fetch(`${base}/voice/usage`).then(x => x.json()).catch(() => null);
    for (const [b, files] of Object.entries((usage && usage.banks) || {})) if (Array.isArray(files) && files.some(x => x && x.f === file)) made.push(`${b}/${file}`);
  }
  // (the samples this run made, deleted again)
  if (made.length) await fetch(`${base}/voice/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: made, protect: [] }) }).catch(() => {});
  check(!errors.length, 'no page errors', errors.slice(0, 2).join(' | '));
  await page.click('#radio-start').catch(() => {});
  await browser.close();
  if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
  console.log('\nall passed');
})();
