// Browser checks for the FM lab of the Sounds tab (fm-groove-lab).
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-fm-lab.cjs [shots-dir] [--no-levels]   (dev server on PORT, default 5173)
// The FM category and its eight cards (Italian names, thumbnails, headphones), search by name and "fm", a card alone
// (player bar untouched, its own orbit and analyser), Phrase selected at first with its line, Held note and FM rise
// from the next bar (the rise from 0 to the top over 4 bars), the mode kept across cards, the FM amount (lit drawing,
// code, sound from the next bar), one card at a time, riding a playing song, stop on leaving the tab, the scope (as
// bright as the formula allows for a held note: RMS frequency over start phases and envelope), Use in track (disabled without a melodic track, the
// wave and the FM device on a bass track), the hardware fader (no knob, centred, at most 320 px, keyboard and drag),
// two by two drawings at 400 px, English labels, and peaks below 0.97 for every card and mode at the top amount.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 5173;
const args = process.argv.slice(2), shots = args.find(a => !a.startsWith('--')) || null, levels = !args.includes('--no-levels');
if (shots) fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0, passed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (ok) passed++; else failed++; };
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };
const NAMES_IT = ['Campana', 'Reese', 'Ringhio', 'Sporco', 'Piano elettrico', 'Metallo', 'Sub', 'Organo'];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept().catch(() => {}));
  page.on('console', m => { if (m.type() === 'error' || /\[preview\]/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  const lab = () => page.evaluate(() => globalThis.codingMiskLabPreview.state);
  const main = () => page.evaluate(() => { const e = document.querySelector('strudel-editor').editor, s = e.repl.scheduler; return { code: e.code, started: s.started, lastEnd: s.lastEnd, err: String(e.repl.state.evalError || ''), title: document.getElementById('pb-title').textContent }; });
  const openFm = async () => { await page.click('[data-mode="lab"]').catch(() => {}); await page.click('[data-tab="suoni"]'); await sleep(500); await page.click('[data-sb-cat="fm"]'); await sleep(400); };
  const lang = async l => { await page.evaluate(l => localStorage.setItem('coding-misk-lang', l), l); await page.reload(); await sleep(4500); await openFm(); };
  const modeState = () => page.evaluate(() => ({ pressed: [...document.querySelectorAll('[data-fm-mode]')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.dataset.fmMode), labels: [...document.querySelectorAll('[data-fm-mode]')].map(b => b.textContent.trim()), line: (document.getElementById('fm-mode-line') || {}).textContent }));
  const setAmount = v => page.evaluate(v => { const el = document.getElementById('fm-amount'); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
  // the lab preview's own haps (orbit 30) from bar `a` for `n` bars: their onsets and FM index
  const labHaps = (a, n) => page.evaluate(([a, n]) => { const p = globalThis.codingMiskLabPreview.pattern; return p ? p.queryArc(a, a + n).filter(h => h.hasOnset()).map(h => ({ t: h.whole.begin.valueOf(), fmi: h.value.fmi, note: h.value.note })) : []; }, [a, n]);
  const level = (ms = 2000) => page.evaluate(async ms => { const v = globalThis.codingMiskVolume, post = v.node(); if (!post) return 0; const a = post.context.createAnalyser(); a.fftSize = 2048; post.connect(a); const d = new Float32Array(2048); let mx = 0; const end = performance.now() + ms; while (performance.now() < end) { a.getFloatTimeDomainData(d); for (const x of d) mx = Math.max(mx, Math.abs(x)); await new Promise(r => setTimeout(r, 40)); } post.disconnect(a); return mx; }, ms);

  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); });
  await page.reload(); await sleep(5000);
  await openFm();

  // ---- the category and its cards
  const cards = await page.$$eval('.fm-card', xs => xs.map(x => ({ name: x.querySelector('.sb-cname b').textContent, meta: x.querySelector('.sb-cname small').textContent, thumb: !!x.querySelector('canvas.fm-thumb'), listen: !!x.querySelector('[data-fm-listen] svg.ico-listen') })));
  const chip = await page.$eval('[data-sb-cat="fm"]', b => b.textContent.replace(/\s+/g, ' ').trim());
  check(chip === 'FM 8' && cards.map(c => c.name).join('|') === NAMES_IT.join('|') && cards.every(c => c.thumb && c.listen), 'FM category with eight cards in Italian, each with a wave thumbnail and the headphones', `${chip}: ${cards.map(c => c.name).join(', ')}`);
  check(cards.every(c => /^(sine|sawtooth|triangle) · FM [\d.]+ · /.test(c.meta)), 'each card shows its carrier, FM amount and part', cards[0] && cards[0].meta);
  const search = async q => { await page.fill('.sb-search', q); await sleep(300); return page.$$eval('.fm-card .sb-cname b', xs => xs.map(x => x.textContent)); };
  const sFm = await search('fm'), sIt = await search('campana'), sEn = await search('growl');
  check(sFm.length === 8 && sIt.join() === 'Campana' && sEn.join() === 'Ringhio', 'search finds the cards by "fm", the Italian and the English name', `${sFm.length} / ${sIt} / ${sEn}`);
  await page.fill('.sb-search', ''); await sleep(200); await page.click('[data-sb-cat="fm"]'); await sleep(300);
  await shot(page, 'it-fm-cards.png');

  // ---- a card alone, Phrase first
  const m0 = await main();
  await page.click('[data-fm-listen="bell"]'); await sleep(2000);
  let s = await lab(), m1 = await main(), ms = await modeState();
  check(s && s.id === 'bell' && s.free && !s.riding, 'the headphones play Campana alone', JSON.stringify(s && { id: s.id, free: s.free }));
  check(!m1.started && m1.code === m0.code && m1.title === m0.title, 'the player bar stays stopped, same title and code', m1.title);
  check(s && /\.orbit\(30\)\.analyze\("fmlab"\)$/.test(s.expr) && /\.arp\(/.test(s.expr) && /\.fm\(2\)\.fmh\(3\.5\)/.test(s.expr), 'its own orbit and analyser, the arpeggio with the card\'s FM', s && s.expr.slice(-60));
  check(ms.pressed.join() === 'phrase' && ms.labels.join('|') === 'Frase|Nota tenuta|Salita FM' && /come suona nella musica/.test(ms.line), 'Phrase selected at first, with its line', `${ms.pressed} · ${ms.line}`);
  const lb = await page.$eval('[data-fm-listen="bell"]', b => ({ pressed: b.getAttribute('aria-pressed'), stop: !!b.querySelector('svg.ico-stop'), title: b.title }));
  check(lb.pressed === 'true' && lb.stop, 'its button shows stop', lb.title);
  const sc = await page.evaluate(() => ({ n: +(document.getElementById('fm-scope') || {}).dataset?.samples || 0, word: document.getElementById('fm-scope-state').textContent }));
  check(sc.n > 0 && sc.word === 'in ascolto', 'the scope draws the card\'s sound', `${sc.n} samples, ${sc.word}`);
  await page.locator('.fm-insp').scrollIntoViewIfNeeded(); await sleep(300);
  await shot(page, 'it-fm-detail-neon.png');

  // ---- Held note, then FM rise, from the next bar
  await page.click('[data-fm-mode="held"]'); await sleep(600);
  s = await lab(); ms = await modeState();
  check(/^note\("a3"\)/.test(s.expr) && ms.pressed.join() === 'held' && /inviluppo FM/.test(ms.line), 'Held note: one note per bar, its line', s.expr.slice(0, 40));
  const heldAt = s.at, held = await labHaps(heldAt, 4);
  check(heldAt >= 1 && held.length === 4 && held.every(h => Number.isInteger(h.t)), 'it plays from the next bar, one note per bar', `at ${heldAt}, ${held.length} notes`);
  await page.click('[data-fm-mode="rise"]'); await sleep(600);
  s = await lab();
  const rise = await labHaps(s.at, 4);
  check(rise.length === 64 && Math.abs(rise[0].fmi) < 1e-6 && Math.abs(rise[63].fmi - 4) < 0.05 && rise.every((h, i) => !i || h.fmi > rise[i - 1].fmi), 'FM rise: sixteenths, the index from 0 at the first to the top at the last of 4 bars, from the next bar', rise.length && `${rise[0].fmi} → ${rise[63].fmi.toFixed(3)}`);
  await page.click('[data-fm-mode="held"]'); await sleep(300);
  // ---- the mode stays when another card is picked (the card playing hands over)
  await page.click('[data-fm-pick="organ"]'); await sleep(600);
  s = await lab(); ms = await modeState();
  check(s.id === 'organ' && ms.pressed.join() === 'held' && /^note\("a3"\)\.s\("sine"\)/.test(s.expr), 'Organo picked: Held note stays and Organo plays held notes', `${s.id} ${ms.pressed}`);

  // ---- the FM amount: lit drawing and code at once, the sound from the next bar
  await setAmount(0.5); await sleep(500);
  s = await lab();
  const am = await page.evaluate(() => ({ lit: [...document.querySelectorAll('.fm-wave')].filter(f => f.getAttribute('aria-current') === 'true').map(f => f.dataset.fmAt), out: document.getElementById('fm-amount-out').textContent, code: document.getElementById('fm-code').textContent }));
  check(am.lit.join() === '1' && am.out === '0.50' && /\.fm\(0\.5\)/.test(am.code) && /\.fm\(0\.5\)/.test(s.expr) && s.at >= 1, 'FM amount 0.5: drawing FM 1 lit, the code and the sound from the next bar', `${am.lit} ${am.out}`);
  await setAmount(1); await sleep(400);

  // ---- the scope against the drawing: the RMS frequency of a held note (its brightness, read from the slope), within
  // 10% (the zero crossings move with the modulator's start phase, which superdough does not fix: see rmsFreq)
  const zc = await page.evaluate(async () => {
    const { rmsFreq, briRange, cardOf } = await import('/src/sounds/fm-lab.js');
    const out = [];
    for (const kind of ['bell', 'organ', 'sub', 'clang', 'tine']) {
      const card = cardOf(kind); document.querySelector(`[data-fm-pick="${kind}"]`).click();
      document.querySelector('[data-fm-mode="held"]').click();
      const el = document.getElementById('fm-amount'); el.value = card.fm.index; el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, 4200));
      const d = globalThis.getAnalyzerData('time', 'fmlab'), sr = globalThis.getAudioContext().sampleRate;
      const f = 440 * Math.pow(2, ({ bass: 33, arp: 57, hook: 69, pad: 57 }[card.type] - 69) / 12);
      const scope = rmsFreq(Array.from(d), 1 / sr) / f, [lo, hi] = briRange(card, card.fm.index);
      out.push({ kind, scope: +scope.toFixed(2), lo: +lo.toFixed(2), hi: +hi.toFixed(2) });
    }
    return out;
  });
  check(zc.length === 5 && zc.every(x => x.scope >= 0.9 * x.lo && x.scope <= 1.1 * x.hi), 'the scope of a held note is as bright as the formula allows (RMS frequency in its range over start phases and envelope, 10% margin)', zc.map(x => `${x.kind} ${x.scope} in ${x.lo}-${x.hi}`).join(', '));

  // ---- one card at a time
  await page.click('[data-fm-listen="growl"]'); await sleep(500);
  s = await lab();
  const pressedN = await page.$$eval('[data-fm-listen][aria-pressed="true"]', xs => [...new Set(xs.map(x => x.dataset.fmListen))]);
  check(s && s.id === 'growl' && pressedN.join() === 'growl', 'Ringhio started while Piano elettrico plays: that one stops, one button on', pressedN.join());

  // ---- over a playing song: rides it, the song unchanged
  await page.click('#play'); await sleep(3000);
  s = await lab(); m1 = await main();
  check(s && s.riding && !s.free && m1.started && !m1.err, 'Play: the card rides the song from its next bar', JSON.stringify(s && { riding: s.riding, at: s.at }));
  const m2 = await main();
  check(m2.code === m1.code && m2.title === m1.title, 'the song\'s code and title do not change', m2.title);
  const stage = await page.evaluate(() => Object.keys(window.analysers || {}).includes('fmlab'));
  check(stage, 'the card has its own analyser (the stage visual skips it)');
  await page.click('#stop').catch(() => page.click('[data-act="stop"]').catch(() => {})); await sleep(1200);
  s = await lab();
  check(s && s.free && !s.riding, 'the song stops: the card plays on alone', JSON.stringify(s && { free: s.free }));

  // ---- leaving the tab stops it
  await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await sleep(600);
  check(!(await lab()), 'leaving the Sounds tab stops the card');

  // ---- Use in track: disabled without a melodic track, then the wave and FM device on the bass track
  const T0 = await page.evaluate(() => globalThis.codingMiskPatterns.compose().T.tracks.map(t => t.type));
  const bi = T0.indexOf('bass');
  await page.evaluate(() => { const n = document.querySelector('.trk-name[data-trk="0"]'); if (n) n.click(); }); await sleep(300);
  await openFm(); await page.click('[data-fm-pick="reese"]'); await sleep(300);
  const dis = T0[0] === 'drums' ? await page.$eval('[data-fm-use]', b => ({ dis: b.disabled, title: b.title })) : null;
  check(!dis || (dis.dis && /Componi/.test(dis.title)), 'Use in track disabled with a reason when the selected track is not melodic', dis && dis.title);
  await page.click('[data-mode="ascolta"]').catch(() => {}); await page.click('[data-tab="componi"]'); await sleep(400);
  await page.evaluate(bi => { const n = [...document.querySelectorAll(`.trk-name[data-trk="${bi}"]`)].find(x => x.offsetParent) || document.querySelector(`.trk-name[data-trk="${bi}"]`); n.click(); }, bi); await sleep(300);
  await openFm(); await page.click('[data-fm-pick="reese"]'); await sleep(300);
  await page.click('[data-fm-use="reese"]'); await sleep(400);
  const tr = await page.evaluate(bi => { const t = globalThis.codingMiskPatterns.compose().T.tracks[bi]; return { wave: t.settings.wave, rack: (t.rack || []).filter(d => d.device === 'fm') }; }, bi);
  check(tr.wave === 'sawtooth' && tr.rack.length === 1 && tr.rack[0].harmonicity === 1.01 && tr.rack[0].index === 0.8, 'Use in track: the bass track gets the sawtooth and the Reese FM device', JSON.stringify(tr));

  // ---- hardware theme: a horizontal fader, centred, at most 320 px
  await page.click('[data-fm-listen="clang"]'); await sleep(800);
  await page.click('[data-uitheme="hw"]'); await sleep(700);
  const hw = await page.evaluate(() => {
    const inp = document.getElementById('fm-amount'), next = inp.nextElementSibling, fader = document.querySelector('.fm-amount .fader'), waves = document.querySelector('.fm-waves');
    const r = fader.getBoundingClientRect(), w = waves.getBoundingClientRect();
    return { fader: !!fader && fader === next, knob: !!document.querySelector('.fm-insp .knob'), width: r.width, centre: Math.abs((r.left + r.width / 2) - (w.left + w.width / 2)), shown: getComputedStyle(fader).display };
  });
  check(hw.fader && !hw.knob && hw.shown === 'block' && hw.width <= 320 && hw.width > 200 && hw.centre < 4, 'hardware theme: a horizontal fader, no knob, centred under the drawings, at most 320 px', `${Math.round(hw.width)} px, off centre ${hw.centre.toFixed(1)}`);
  await page.focus('#fm-amount'); const v0 = +(await page.$eval('#fm-amount', x => x.value)); await page.keyboard.press('ArrowRight'); await sleep(200);
  const v1 = +(await page.$eval('#fm-amount', x => x.value)), o1 = await page.$eval('#fm-amount-out', x => x.textContent);
  check(Math.abs(v1 - v0 - 0.05) < 1e-6 && o1 === v1.toFixed(2), 'the arrow keys move the amount', `${v0} → ${v1}`);
  const fb = await page.$eval('.fm-amount .fader', f => { const r = f.getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, w: r.width }; });
  await page.mouse.move(fb.x + fb.w * 0.25, fb.y); await page.mouse.down(); await page.mouse.move(fb.x + fb.w * 0.25 + 1, fb.y); await page.mouse.up(); await sleep(400);
  const v2 = +(await page.$eval('#fm-amount', x => x.value)), lit2 = await page.$$eval('.fm-wave[aria-current="true"]', xs => xs.map(x => x.dataset.fmAt).join()); s = await lab();
  check(Math.abs(v2 - 1) < 0.1 && lit2 === '1' && new RegExp(`\\.fm\\(${v2}\\)`).test(s.expr), 'dragging the fader to a quarter: amount near 1, FM 1 lit, the sound follows', `${v2} ${lit2}`);
  await page.locator('.fm-insp').scrollIntoViewIfNeeded(); await sleep(300);
  await shot(page, 'it-fm-detail-hw.png');

  // ---- phone width: drawings two by two, the fader the card's width
  await page.setViewportSize({ width: 400, height: 860 }); await sleep(600);
  for (const th of ['hw', 'neon']) {
    await page.click(`[data-uitheme="${th}"]`).catch(() => {}); await sleep(500);
    const ph = await page.evaluate(() => { const cols = getComputedStyle(document.querySelector('.fm-waves')).gridTemplateColumns.split(' ').length, w = document.querySelector('.fm-waves').getBoundingClientRect().width, f = document.querySelector(document.documentElement.dataset.ui === 'hw' ? '.fm-amount .fader' : '#fm-amount').getBoundingClientRect().width; return { cols, w, f, over: document.documentElement.scrollWidth > window.innerWidth + 1 }; });
    check(ph.cols === 2 && !ph.over && (th !== 'hw' || ph.f > ph.w * 0.9), `400 px (${th}): drawings two by two, no sideways scroll${th === 'hw' ? ', the fader the card\'s width' : ''}`, `${ph.cols} columns, fader ${Math.round(ph.f)} of ${Math.round(ph.w)}`);
    await page.locator('.fm-cards').scrollIntoViewIfNeeded(); await sleep(200); await shot(page, `it-phone-cards-${th}.png`);
    await page.locator('.fm-waves').scrollIntoViewIfNeeded(); await sleep(200); await shot(page, `it-phone-detail-${th}.png`);
  }
  await page.setViewportSize({ width: 1440, height: 900 }); await sleep(300);
  await page.click('[data-fm-listen="clang"]'); await sleep(300);

  // ---- English
  await lang('en');
  await page.click('[data-fm-pick="bell"]'); await sleep(300);
  ms = await modeState();
  const en = await page.evaluate(() => ({ names: [...document.querySelectorAll('.fm-card .sb-cname b')].map(x => x.textContent).join('|'), intro: document.querySelector('.fm-intro').textContent, amount: document.querySelector('label[for="fm-amount"]').textContent, use: document.querySelector('[data-fm-use]').textContent, listen: document.querySelector('[data-fm-listen]').title }));
  check(ms.labels.join('|') === 'Phrase|Held note|FM rise' && /how it sounds in music/.test(ms.line) && /^FM sounds/.test(en.intro) && en.amount === 'FM amount' && en.use === 'Use in track' && /Listen alone/.test(en.listen) && /Bell\|Reese\|Growl/.test(en.names), 'English labels', `${ms.labels.join(', ')} · ${en.names}`);
  await page.locator('.fm-insp').scrollIntoViewIfNeeded(); await sleep(200);
  await shot(page, 'en-fm-detail-neon.png');

  // ---- levels: every card in every mode at the top amount, below 0.97 on the master
  if (levels) {
    const rows = [];
    for (const kind of ['bell', 'reese', 'growl', 'dirty', 'tine', 'clang', 'sub', 'organ']) {
      await page.click(`[data-fm-pick="${kind}"]`); await sleep(150);
      const max = +(await page.$eval('#fm-amount', x => x.max)); await setAmount(max);
      if (!(await lab())) { await page.click(`[data-fm-listen="${kind}"]`); }
      for (const m of ['phrase', 'held', 'rise']) {
        await page.click(`[data-fm-mode="${m}"]`); await sleep(200);
        await sleep(2200); // past the next bar
        const pk = await level(m === 'rise' ? 7600 : 3800);
        rows.push({ kind, m, pk });
      }
      await page.click(`[data-fm-listen="${kind}"]`); await sleep(200);
    }
    const worst = rows.reduce((a, b) => (b.pk > a.pk ? b : a), rows[0]);
    console.log(rows.map(r => `${r.kind}/${r.m} ${r.pk.toFixed(3)}`).join('  '));
    check(rows.length === 24 && rows.every(r => r.pk > 0.005 && r.pk < 0.97), 'every card heard and below 0.97 in every mode at the top amount', `highest ${worst.kind}/${worst.m} ${worst.pk.toFixed(3)}`);
  }

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  console.log(`\n${passed} passed, ${failed} failed`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
