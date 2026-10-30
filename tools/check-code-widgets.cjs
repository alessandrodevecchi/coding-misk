// Browser checks for the code widgets (code-widgets, #79): off by default; on, the calls in the code and their widgets
// below the lines, scope with its line's instrument, Classic moving at a section boundary without a step, widgets kept
// while the Live coder types, muted lines dimmed, any parameter accepted, the Settings card, frame time.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-code-widgets.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('fs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHOTS = process.argv[2] || null;
const URL = `http://localhost:${process.env.PORT || 5173}/`;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const CALL = /\._(scope|pianoroll|punchcard|spectrum|spiral|pitchwheel|hitgrid|tonecloud)\(/g;

async function open(browser, { widgets = null, lang = 'it', ui = 'neon', width = 1440, height = 1000 } = {}) {
  const page = await (await browser.newContext({ viewport: { width, height } })).newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(([w, l, u]) => {
    if (sessionStorage.getItem('cw-init')) return;
    sessionStorage.setItem('cw-init', '1');
    localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-ui', JSON.stringify(u));
    if (w) localStorage.setItem('coding-misk-code-widgets', JSON.stringify(w)); else localStorage.removeItem('coding-misk-code-widgets');
  }, [widgets, lang, ui]);
  await page.goto(URL); await page.waitForFunction(() => document.querySelector('strudel-editor') && document.querySelector('strudel-editor').editor, null, { timeout: 30000 }); await sleep(3500);
  return { page, errors };
}
const st = page => page.evaluate(() => {
  const e = document.querySelector('strudel-editor').editor;
  return { code: e.code, active: e.repl.state.activeCode || '', err: String(e.repl.state.evalError || ''), started: e.repl.scheduler.started, cyc: e.repl.scheduler.now(),
    canvases: [...document.querySelectorAll('#edhost [id*="_widget_"]')].map(c => ({ id: c.id, muted: c.classList.contains('cw-muted') })) };
});
const untilBar = async (page, b) => { for (let k = 0; k < 400 && (await st(page)).cyc < b; k++) await sleep(100); };
const calls = code => (code.match(CALL) || []).length;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });

  // 1. off by default: the code of before, no widget
  {
    const { page, errors } = await open(browser);
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(3000);
    const s = await st(page);
    check(s.started && !calls(s.code) && !s.canvases.length && !errors.length, 'off by default: no widget call, no widget', errors.join('; '));
    await page.close();
  }

  // 2. on, Classic (luci-rosse): calls and widgets, scope with its instrument, the move at bar 8 (no step there)
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(3500);
    let s = await st(page);
    const n0 = calls(s.code);
    check(s.started && n0 >= 1 && n0 <= 3 && !s.err, 'on: the code carries 1 to 3 widget calls', `${n0} calls, ${s.err}`);
    check(s.canvases.length >= 1 && s.active.includes('._'), 'on: the widgets are drawn below their lines', `${s.canvases.length} widgets`);
    const link = await page.evaluate(() => {
      const e = document.querySelector('strudel-editor').editor, P = e.repl.scheduler.pattern, t = e.repl.scheduler.now(), out = [];
      const haps = P.queryArc(t, t + 1);
      for (const id of Object.getOwnPropertyNames(window.analysers).filter(k => k.includes('_widget__scope'))) {
        const h = haps.find(x => (x.context.tags || []).includes(id)), inst = h && h.value.analyze;
        out.push({ id, inst, same: !!inst && window.analysers[id] === window.analysers[inst], listed: Object.keys(window.analysers).includes(id) });
      }
      return out;
    });
    check(link.length && link.every(x => x.same && x.inst && !x.inst.includes('_widget_') && !x.listed), 'scope keeps the line\'s analyze and draws that instrument, unseen by the stage', JSON.stringify(link));
    const ink = await page.evaluate(() => [...document.querySelectorAll('#edhost canvas[id*="_widget__scope"]')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 20) n++; return n; }));
    check(ink.some(n => n > 200), 'a scope draws', ink.join(','));
    // bar 8: Pista starts; Classic has no step there, the widgets move with one evaluation
    const before = s.code;
    await untilBar(page, 8.6);
    s = await st(page);
    const lines = s.code.split('\n').filter(l => CALL.test(l) && !(CALL.lastIndex = 0)), bad = lines.filter(l => /mask\(section(\d)\)/.test(l) && !/mask\(section2\)/.test(l));
    check(s.code !== before && lines.length && !bad.length && s.active.includes(lines[0].trim().slice(0, 30)) && !s.err, 'Classic: at a section boundary without a step the widgets move to the new section\'s lines', `${lines.length} lines, ${bad.length} on other sections`);
    check(!errors.length, 'no page errors (Classic)', errors.join('; '));
    if (SHOTS) {
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(400);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-neon.png` });
    }
    // frame time with widgets drawing
    const ft = await page.evaluate(() => new Promise(res => { const t = []; let last = performance.now(); const f = now => { t.push(now - last); last = now; if (t.length < 120) requestAnimationFrame(f); else { t.sort((a, b) => a - b); res({ median: t[60], p95: t[114] }); } }; requestAnimationFrame(f); }));
    check(ft.median < 34, 'frame time with widgets', `median ${ft.median.toFixed(1)} ms, p95 ${ft.p95.toFixed(1)} ms`);
    await page.close();
  }

  // 3. hand code: muted lines dimmed, any parameter accepted, the dimmed look off
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    const code = 'setcpm(30)\n_$: s("bd*4")._scope()\n$: note("c3 e3 g3")._pianoroll({ labels: 1, overscan: 1 })\n_$: note("c4 g4")._pianoroll()\n_$: n("0 2")._punchcard()\n_$: s("hh*8")._spectrum()';
    await page.evaluate(c => { const e = document.querySelector('strudel-editor').editor; e.setCode(c); return e.evaluate(); }, code); await sleep(1500);
    let s = await st(page);
    const muted = s.canvases.filter(c => c.muted).map(c => c.id), plain = s.canvases.filter(c => !c.muted).map(c => c.id);
    check(!s.err && s.canvases.length === 5, 'a line with labels and overscan evaluates; every widget drawn', `${s.err} ${s.canvases.length}`);
    check(muted.length === 4 && plain.length === 1 && plain[0].includes('pianoroll'), 'the widgets of muted lines are dimmed, the playing one is not', `muted ${muted.join(',')}`);
    if (SHOTS) await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-muted.png` });
    await page.evaluate(() => { localStorage.setItem('coding-misk-code-widgets', JSON.stringify({ on: true, dim: false })); return document.querySelector('strudel-editor').editor.evaluate(); }); await sleep(800);
    s = await st(page);
    check(s.canvases.length === 5 && s.canvases.every(c => !c.muted), 'dimmed look off: the muted widgets look as Strudel draws them');
    // a text change without evaluation keeps the widgets of the other lines (range update, D6)
    const kept = await page.evaluate(() => new Promise(res => {
      const e = document.querySelector('strudel-editor').editor, v = e.editor, ln = v.state.doc.line(1);
      v.dispatch({ changes: { from: ln.from, to: ln.to, insert: 'setcpm(31)' } });
      requestAnimationFrame(() => res(document.querySelectorAll('#edhost [id*="_widget_"]').length));
    }));
    check(kept === 5, 'a range change of one line keeps every widget', `${kept}`);
    await page.evaluate(() => document.querySelector('strudel-editor').editor.stop());
    check(!errors.length, 'no page errors (hand code)', errors.join('; '));
    await page.close();
  }

  // 3b. drawing: the scope in the theme's colour between hits, a new spectrum blank, "always full" notes
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    const ev = c => page.evaluate(c => { const e = document.querySelector('strudel-editor').editor; e.setCode(c); return e.evaluate(); }, c);
    await ev('setcpm(30)\n$: s("hh ~ ~ ~").analyze("hats")._scope()\n$: s("white").gain(0.3).analyze("fx")._spectrum()'); await sleep(2500);
    const col = await page.evaluate(() => { const c = [...document.querySelectorAll('#edhost canvas[id*="_widget__scope"]')][0], d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let white = 0, ink = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { ink++; if (d[i] > 235 && d[i + 1] > 235 && d[i + 2] > 235) white++; } return { ink, white }; });
    check(col.ink > 50 && col.white === 0, 'scope: drawn in the theme colour, never white between hits', JSON.stringify(col));
    await ev('setcpm(30)\n$: s("hh ~ ~ ~").analyze("hats")._scope()\n$: s("white").gain(0.3).analyze("fx").lpf(800)._spectrum()'); await sleep(120);
    const blank = await page.evaluate(() => { const c = document.querySelector('#edhost canvas[id*="_widget__spectrum"]'), d = c.getContext('2d').getImageData(0, 0, Math.floor(c.width / 2), c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++; return n; });
    check(blank === 0, 'a new spectrum starts blank', `${blank} pixels of the old one`);
    const alpha = async notes => {
      await page.evaluate(n => localStorage.setItem('coding-misk-code-widgets', JSON.stringify({ on: true, notes: n })), notes);
      await ev('setcpm(60)\n$: note("c3 e3 g3 b3").gain(0.1).analyze("pad")._pianoroll()\n$: note("c3 e3 g3 b3").gain(0.1).analyze("arp")._punchcard()'); await sleep(1500);
      return page.evaluate(() => [...document.querySelectorAll('#edhost canvas[id*="_widget_"]')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let a = 0; for (let i = 3; i < d.length; i += 4) a += d[i]; return { id: c.id.replace(/.*_widget__/, ''), a }; }));
    };
    const vol = await alpha('volume'), full = await alpha('full');
    const ratio = k => (full.find(x => x.id.startsWith(k)) || { a: 0 }).a / Math.max(1, (vol.find(x => x.id.startsWith(k)) || { a: 0 }).a);
    check(ratio('pianoroll') > 2 && ratio('punchcard') > 2, '"always full": quiet notes drawn stronger in pianoroll and punchcard', `pianoroll ×${ratio('pianoroll').toFixed(1)}, punchcard ×${ratio('punchcard').toFixed(1)}`);
    await page.evaluate(() => document.querySelector('strudel-editor').editor.stop());
    check(!errors.length, 'no page errors (drawing)', errors.join('; '));
    await page.close();
  }

  // 3c. Widget notes (7.4): a quiet pad and arp as pianoroll, with each value (screenshots for the owner)
  if (SHOTS) for (const notes of ['volume', 'full']) {
    const { page } = await open(browser, { widgets: { on: true, max: 3, share: 0, notes, order: ['pad', 'arp', 'lead', 'hats', 'bass', 'drums', 'fx', 'voice'], instruments: { pad: { primary: 'pianoroll', secondary: ['scope'] } } } });
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await untilBar(page, 20.5);
    await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget__pianoroll"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(600);
    await page.locator('#edhost').screenshot({ path: `${SHOTS}/note-dei-widget-${notes === 'full' ? 'sempre-piene' : 'come-il-volume'}.png` });
    await page.close();
  }

  // 3d. section boundaries with the widgets on and off: no underrun, the same levels (luci-rosse, bars 6 to 19)
  {
    const run = async on => {
      const { page } = await open(browser, { widgets: on ? { on: true } : null });
      await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
      await page.evaluate(() => { const s = globalThis.getAudioContext().playbackStats; globalThis.cwUnder = s ? s.underrunEvents : null; });
      await page.click('#play');
      const peaks = {};
      for (let k = 0; k < 400; k++) {
        const r = await page.evaluate(() => { const e = document.querySelector('strudel-editor').editor, out = {}; for (const a of Object.keys(window.analysers || {})) { const d = getAnalyzerData('time', a); let m = 0; for (const v of d) m = Math.max(m, Math.abs(v)); out[a] = m; } return { cyc: e.repl.scheduler.now(), out }; });
        if (r.cyc >= 19) break;
        if (r.cyc >= 6) { const bar = Math.floor(r.cyc); for (const [a, m] of Object.entries(r.out)) { const key = `${bar}:${a}`; peaks[key] = Math.max(peaks[key] || 0, m); } }
        await sleep(60);
      }
      const under = await page.evaluate(() => { const s = globalThis.getAudioContext().playbackStats; return s && globalThis.cwUnder !== null ? s.underrunEvents - globalThis.cwUnder : null; });
      await page.close();
      return { peaks, under };
    };
    const off = await run(false), on = await run(true);
    const near = [7, 8, 9, 15, 16, 17, 18], diffs = [];
    for (const k of Object.keys(off.peaks)) { const bar = +k.split(':')[0]; if (!near.includes(bar) || off.peaks[k] < 0.05) continue; const r = (on.peaks[k] || 0) / off.peaks[k]; if (r < 0.6 || r > 1.6) diffs.push(`${k} ${r.toFixed(2)}`); }
    check((on.under === null || on.under === 0) && diffs.length === 0, 'section boundaries with widgets: no underrun, levels as with the option off', `underruns ${on.under}, off ${off.under}; ${diffs.join(', ') || 'levels match'}`);
  }

  // 3e. the session video and the live output draw the widgets in the new scenes only
  {
    const { page, errors } = await open(browser, { widgets: { on: true } });
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
    await page.click('#play'); await sleep(4000);
    // (under load the song can start late: wait until it plays and its widgets have canvases, else both scenes match)
    const ready = () => page.evaluate(() => { const s = document.querySelector('strudel-editor').editor.repl.scheduler, M = globalThis.miskWidgetCanvases; return !!(s && s.started && s.now() > 1 && M && [...M.values()].some(c => c && c.width)); });
    for (let k = 0; k < 40 && !(await ready()); k++) await sleep(500);
    check(await ready(), 'session video: the song plays and its widgets are drawn before the frames are compared');
    const frame = layout => page.evaluate(L => {
      const V = globalThis.codingMiskVideo; V.setOpt('layout', L);
      const c = document.createElement('canvas'); c.width = 960; c.height = 540; document.body.appendChild(c); c.style.position = 'absolute'; c.style.top = '0'; c.style.left = '0';
      V.preview(c); return new Promise(res => setTimeout(() => { const d = c.getContext('2d').getImageData(640, 0, 320, 540).data; let sum = 0; for (let i = 0; i < d.length; i += 16) sum += d[i] + d[i + 1] + d[i + 2]; const url = c.toDataURL(); c.remove(); res({ sum, url }); }, 900));
    }, layout);
    const a = await frame('code'), b = await frame('code-widgets');
    check(a.sum !== b.sum, 'session video: "Visual + code + widgets" draws more than "Visual + code"', `${a.sum} → ${b.sum}`);
    if (SHOTS) for (const [n, f] of [['video-codice', a], ['video-codice-widget', b]]) fs.writeFileSync(`${SHOTS}/${n}.png`, Buffer.from(f.url.split(',')[1], 'base64'));
    await page.evaluate(() => globalThis.codingMiskVideo.setOpt('layout', 'code'));
    check(!errors.length, 'no page errors (video)', errors.join('; '));
    await page.close();
  }

  // 3f. the fast video (5.3, 5.4, 2.5): note widgets from the render page's notes, scope and spectrum from their own
  // instrument's render, the fallback to the whole song's wave in Automatic, Always real
  {
    const { execFileSync } = require('child_process'), os = require('os'), path = require('path');
    const fast = async (layout, realScope, limit) => {
      const { page, errors } = await open(browser, { widgets: { on: true } });
      const logs = [], downloads = [];
      page.on('console', m => { if (/\[fast video\]/.test(m.text())) logs.push(m.text()); });
      page.on('download', d => downloads.push(d));
      await page.evaluate(([layout, realScope, limit]) => {
        localStorage.setItem('coding-misk-export-speed', JSON.stringify('fast')); localStorage.setItem('coding-misk-out-kind', JSON.stringify('video'));
        localStorage.setItem('coding-misk-video', JSON.stringify({ layout, quality: '720p30', card: 'always', soulPanel: true, visual: 'fixed:pixel', soul: 'off', realScope }));
        if (limit !== null) globalThis.codingMiskScopeLimit = limit;
      }, [layout, realScope, limit]);
      await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="brani"]'); await sleep(600);
      const t0 = Date.now();
      // (a Live coder song: its code is short, the widgets are in view)
      await page.click('#songs [data-song-id="switch-prima-luce"] [data-act="export"]'); await sleep(1500);
      while (Date.now() - t0 < 600000 && await page.evaluate(() => globalThis.codingMiskExport.job)) await sleep(400);
      await sleep(1500);
      const d = downloads.find(x => /\.(mp4|webm)$/.test(x.suggestedFilename()));
      let file = null;
      if (d) { file = path.join(os.tmpdir(), `cw-${Date.now()}.mp4`); await d.saveAs(file); }
      const notes = await page.evaluate(() => globalThis.codingMiskFastNotes || 0);
      await page.close();
      return { file, logs, errors, notes, seconds: (Date.now() - t0) / 1000 };
    };
    const frame = (file, at, out) => { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', file, '-frames:v', '1', out]); return fs.readFileSync(out); };
    const own = await fast('code-widgets', 'auto', null), fall = await fast('code-widgets', 'auto', 0.0001), always = await fast('code-widgets', 'always', 0.0001), plain = await fast('code', 'auto', null);
    check(own.notes > 0, 'fast video: note widgets drawn from the notes the render page sends back', `at most ${own.notes} notes in a widget`);
    check(own.file && own.logs.some(l => /own instruments/.test(l)) && !own.errors.length, 'fast video: scope and spectrum from their own instruments (Automatic, in time)', `${own.seconds.toFixed(0)} s; ${own.logs.join(' | ')}`);
    check(fall.file && fall.logs.some(l => /whole song/.test(l)), 'fast video: Automatic falls back to the whole song\'s wave over the limit, and says so', fall.logs.join(' | '));
    check(always.file && always.logs.some(l => /own instruments/.test(l)) && !always.logs.some(l => /whole song/.test(l)), 'fast video: Always real never falls back', always.logs.join(' | '));
    if (own.file && plain.file) {
      // the code panel (the right third) of both files at a few moments: the widgets make it differ
      const tmp = os.tmpdir(), crop = (file, at, out) => { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(at), '-i', file, '-frames:v', '1', '-vf', 'crop=iw/3:ih:iw*2/3:0', '-f', 'rawvideo', '-pix_fmt', 'gray', out]); return fs.readFileSync(out); };
      let best = null;
      for (const at of [8, 16, 24, 32, 40, 60]) { const a = crop(own.file, at, path.join(tmp, 'cw-a.raw')), b = crop(plain.file, at, path.join(tmp, 'cw-b.raw')); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); if (!best || d > best.d) best = { at, d: d / a.length }; }
      check(best.d > 1, 'fast video: "Visual + code + widgets" draws widgets in the code panel', `largest mean difference ${best.d.toFixed(2)} at ${best.at} s`);
      // (Prima luce's bass, with a scope, comes in at 60 s)
      if (SHOTS) { frame(own.file, 64.5, `${SHOTS}/video-veloce-widget.png`); frame(fall.file, 64.5, `${SHOTS}/video-veloce-widget-onda-intera.png`); }
    } else check(false, 'fast videos saved', `${!!own.file} ${!!plain.file}`);
  }

  // 3g. a vertical fragment with "Code + widgets" (rendered like the fast video)
  {
    const { execFileSync } = require('child_process'), os = require('os'), path = require('path');
    const frag = async show => {
      const { page } = await open(browser, { widgets: { on: true } });
      const downloads = []; page.on('download', d => downloads.push(d));
      const r = await page.evaluate(show => globalThis.codingMiskClips.fragments({ source: 'switch-prima-luce', from: 62, to: 70, show, quiet: true, codeMode: 'follow' }), show);
      const t0 = Date.now(); await sleep(1500);
      while (Date.now() - t0 < 300000 && await page.evaluate(() => globalThis.codingMiskClips.job)) await sleep(500);
      await sleep(1500);
      const d = downloads.find(x => /\.(mp4|webm)$/.test(x.suggestedFilename()));
      let file = null; if (d) { file = path.join(os.tmpdir(), `cwf-${show}-${Date.now()}.mp4`); await d.saveAs(file); }
      await page.close();
      return { file, r };
    };
    const w = await frag('code-widgets'), c = await frag('code');
    if (w.file && c.file) {
      const tmp = os.tmpdir(), raw = (f, o) => { execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '4', '-i', f, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', o]); return fs.readFileSync(o); };
      const a = raw(w.file, path.join(tmp, 'cwf-a.raw')), b = raw(c.file, path.join(tmp, 'cwf-b.raw'));
      let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]);
      check(d / a.length > 0.5, 'fragment: "Code + widgets" draws the widgets', `mean difference ${(d / a.length).toFixed(2)}`);
      if (SHOTS) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '4', '-i', w.file, '-frames:v', '1', '-vf', 'scale=540:-1', `${SHOTS}/frammento-codice-widget.png`]);
    } else check(false, 'fragments saved', JSON.stringify([w.r, c.r]).slice(0, 300));
  }

  // 4. Live coder: the widgets stay while a line is typed
  {
    const { page, errors } = await open(browser, { widgets: { on: true, max: 8 } });
    await page.locator('#track-pick').selectOption('switch-prima-luce'); await sleep(800);
    await page.click('#live-profile [data-profile="switch"]', { timeout: 3000 }).catch(() => {});
    await page.waitForFunction(() => !document.querySelector('#play-growing:not([hidden])'), null, { timeout: 120000 }).catch(() => {});
    await sleep(1500);
    await page.click('#play'); await sleep(2000);
    // sample the panel: a frame whose code differs from the evaluated code (typing) and carries calls kept from before
    const r = await page.evaluate(() => new Promise(res => {
      const e = document.querySelector('strudel-editor').editor, out = { typed: 0, lost: 0, calls: 0 };
      const t0 = performance.now();
      const f = () => {
        // (the block widgets in the editor's state: CodeMirror draws only the lines in view)
        const v = e.editor, code = e.code, act = e.repl.state.activeCode || '';
        let canv = 0;
        for (const set of v.state.facet(v.constructor.decorations)) if (set && typeof set !== 'function') set.between(0, v.state.doc.length, (a, b, d) => { if (d.spec && d.spec.block && d.spec.widget) canv++; });
        // (a line with a widget call, evaluated and still in the typed text as it was: its widget must be there)
        const evaluated = new Set(act.split('\n').filter(l => /\._\w+\(\)/.test(l))), shared = code.split('\n').filter(l => evaluated.has(l)).length;
        if (code !== act.slice(0, code.length) && shared) { out.typed++; if (canv < shared) out.lost++; }
        out.calls = Math.max(out.calls, (code.match(/\._(scope|pianoroll|punchcard|spectrum)\(\)/g) || []).length);
        if (performance.now() - t0 < 40000) requestAnimationFrame(f); else res(out);
      };
      requestAnimationFrame(f);
    }));
    const s = await st(page);
    check(r.calls >= 1 && r.typed > 20 && r.lost === 0 && !s.err, 'Live coder: widgets stay at every typed frame', JSON.stringify(r));
    if (SHOTS) {
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(400);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-live-coder.png` });
    }
    check(!errors.length, 'no page errors (Live coder)', errors.join('; '));
    await page.close();
  }

  // 5. the Settings card, hardware theme and phone width (screenshots)
  {
    const { page, errors } = await open(browser, { widgets: null });
    await page.click('#open-settings'); await sleep(600);
    const card = page.locator('#set-widgets');
    check(await card.count() === 1 && (await card.locator('h3').textContent()) === 'Widget nel codice', 'Settings: the card "Widget nel codice"');
    await card.locator('[data-cw-on="1"]').click(); await sleep(200);
    let S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S && S.on === true && S.max === 3 && S.window === 16 && S.share === 25 && S.dim === true && S.widgets.spiral === false && S.instruments.fx.on === false, 'Settings: on, with the defaults stored');
    await page.locator('#set-widgets [data-cw-num="max"]').fill('1'); await page.locator('#set-widgets [data-cw-num="max"]').dispatchEvent('change');
    await page.locator('#set-widgets [data-cw-move="drums"][data-dir="-1"]').click(); await sleep(150);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.max === 1 && S.order.indexOf('drums') === 1, 'Settings: maximum and slot order stored', `${S.max} ${S.order.join(',')}`);
    for (const id of ['muted', 'widgets', 'instruments', 'params', 'sizes']) await page.locator(`#set-widgets [data-cw-sec="${id}"] > summary`).click();
    await sleep(200);
    const opened = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-cw-open')));
    check(opened && opened.length === 6, 'Settings: the open sections are remembered', JSON.stringify(opened));
    await page.locator('#set-widgets [data-cw-widget="spiral"]').check(); await sleep(100);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.widgets.spiral === true, 'Settings: a widget switch stored');
    if (SHOTS) await card.screenshot({ path: `${SHOTS}/settings-card.png` });
    await page.locator('#set-cw-defaults').click(); await sleep(150);
    S = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-code-widgets')));
    check(S.on === true && S.max === 3 && S.widgets.spiral === false, 'Settings: Defaults keeps the switch and restores the rest');
    check(!errors.length, 'no page errors (Settings)', errors.join('; '));
    await page.close();
  }
  if (SHOTS) {
    // hardware theme and phone width, Classic with widgets
    for (const [name, o] of [['hw', { ui: 'hw' }], ['phone', { width: 390, height: 844 }]]) {
      const { page } = await open(browser, { widgets: { on: true }, ...o });
      await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(800);
      await page.click('#play'); await sleep(4000);
      await page.evaluate(() => { const c = document.querySelector('#edhost [id*="_widget_"]'); if (c) c.scrollIntoView({ block: 'center' }); }); await sleep(500);
      await page.locator('#edhost').screenshot({ path: `${SHOTS}/code-widgets-${name}.png` });
      if (name === 'phone') await page.screenshot({ path: `${SHOTS}/code-widgets-phone-page.png`, fullPage: false });
      await page.close();
    }
    const p2 = await open(browser, { widgets: { on: true }, width: 390, height: 844 });
    await p2.page.click('#open-settings'); await sleep(600);
    await p2.page.locator('#set-widgets').screenshot({ path: `${SHOTS}/settings-card-phone.png` });
    await p2.page.close();
  }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
