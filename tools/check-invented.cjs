// Browser checks for invented styles (invented-styles, #51): the radio's invent die and trial chip, three invented
// styles played two songs each (no evalError, the output below clipping), Ancora, ×, a reload during a trial, a session
// saved during a trial replayed after the discard, Tieni (Styles tab, badge, radio chip), an edit marking the style
// edited, the backup, the Styles tab's trial card, a Genres card, the New song panel, both languages, 400 px.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-invented.cjs [shots-dir] [--no-play]   (dev server on PORT)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const { CLIP, tapOutput, outputPeak } = require('./output-peak.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = process.env.PORT || 5173;
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const args = process.argv.slice(2), shots = args.find(a => !a.startsWith('--')), noPlay = args.includes('--no-play');
if (shots) fs.mkdirSync(shots, { recursive: true });

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno', 'lo-fi'], energy: 0.6 })); });
  await page.reload(); await sleep(3500);
  const opts = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'));
  const mine = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-styles') || '[]'));
  const radioState = () => page.evaluate(() => globalThis.codingMiskRadio.state);
  const toastText = () => page.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join(' | '));
  const shot = async name => { if (shots) await page.screenshot({ path: path.join(shots, name) }); };
  const ed = () => page.evaluate(() => { const e = document.querySelector('strudel-editor'); return e && e.editor ? String(e.editor.repl.state.evalError || '') : ''; });
  await page.click('[data-tab="radio"]'); await sleep(400);

  // ---------- the die and the trial chip ----------
  const die = '#tab-radio [data-dice="invent"]';
  check(await page.isVisible(die) && await page.locator(`${die} svg.ico-invent`).count() === 1 && (await page.innerText(die)).includes('Inventa'), 'radio: the invent die, drawn, next to Mix and Genere');
  await page.click(die); await sleep(400);
  let o = await opts();
  const first = o.tempStyle;
  check(first && first.invented && o.styles.length === 1 && o.styles[0] === first.id && !o.artist, 'invent: a trial style, alone, artist Custom', first && first.name.it);
  check(JSON.stringify(o.trialBefore.styles) === JSON.stringify(['berlin-techno', 'lo-fi']), 'the styles before the trial are kept', JSON.stringify(o.trialBefore));
  check(await page.isVisible('#tab-radio .trial-style') && /in prova/.test(await page.innerText('#tab-radio .trial-style')) && /genere /.test(await page.innerText('#tab-radio .trial-style')), 'the trial chip: name, in prova, its genre');
  check(/seme/.test(await page.getAttribute(die, 'title')) && /seme/.test(await page.getAttribute('#tab-radio .trial-style [data-style]', 'title')), 'the seed in the tooltips');
  check(/prossimo brano/.test(await toastText()), 'toast: from the next song', await toastText());
  await shot('radio-trial.png');

  // Ancora: another style, from a fresh seed; the styles from before stay remembered
  await page.click('#tab-radio [data-trial-again]'); await sleep(300);
  o = await opts();
  check(o.tempStyle && o.tempStyle.id !== first.id && o.tempStyle.invented.seed !== first.invented.seed && o.trialBefore.styles.join() === 'berlin-techno,lo-fi', 'Ancora: a different style, the choice before still remembered', o.tempStyle && o.tempStyle.id);
  // ×: back to the styles before
  await page.click('#tab-radio [data-trial-drop]'); await sleep(300);
  o = await opts();
  check(!o.tempStyle && o.styles.join() === 'berlin-techno,lo-fi' && !(await page.isVisible('#tab-radio .trial-style')), '×: Berlin techno and Lo-fi again, the chip gone', o.styles.join());

  // ---------- three invented styles played two songs each ----------
  if (!noPlay) {
    for (let k = 0; k < 3; k++) {
      await page.click(die); await sleep(300);
      const r = (await opts()).tempStyle;
      await page.click('#radio-start'); await sleep(2500); await tapOutput(page); await outputPeak(page);
      let st = await radioState(), peak = 0, err = '';
      check(st && st.recipe.extraStyles && st.recipe.extraStyles[0].id === r.id, `style ${k + 1}: the session embeds the trial style`, r.id);
      for (let song = 0; song < 2; song++) {
        await sleep(6000); peak = Math.max(peak, await outputPeak(page)); err = err || await ed();
        if (song === 0) {
          check(await page.isVisible('#tab-radio .trial-tag'), `style ${k + 1}: the song on air is marked "stile in prova"`);
          await page.click('#radio-skip'); await sleep(2500);
        }
      }
      st = await radioState();
      check(!err && peak > 0.01 && peak < CLIP, `style ${k + 1} (${r.name.it}, ${r.genre}): two songs, no evalError, below clipping`, `peak ${peak.toFixed(3)}${err ? `, ${err}` : ''}`);
      if (k === 0) await shot('radio-trial-playing.png');
      if (k < 2) { await page.click('#radio-start'); await sleep(500); await page.click('#tab-radio [data-trial-drop]'); await sleep(200); }
    }
    // a session saved during the trial replays the same songs after the discard
    const item = await page.evaluate(() => globalThis.codingMiskRadio.sessionNow);
    const titles = (await radioState()).stream.slice(0, item.count).map(x => x.title);
    await page.click('#radio-start'); await sleep(500);
    await page.click('#tab-radio [data-trial-drop]'); await sleep(300);
    await page.evaluate(it => globalThis.codingMiskRadio.playSession(it), item); await sleep(2500);
    const again = (await radioState()).stream.map(x => x.title);
    check(item.recipe.extraStyles && again[0] === titles[0], 'a session saved during a trial replays after the discard', `${titles[0]} / ${again[0]}`);
    await page.click('#radio-start'); await sleep(500);
  }

  // ---------- reload during a trial, then Tieni ----------
  await page.click(die); await sleep(300);
  const kept = (await opts()).tempStyle;
  await page.reload(); await sleep(3500); await page.click('[data-tab="radio"]'); await sleep(300);
  o = await opts();
  check(o.tempStyle && o.tempStyle.id === kept.id && o.styles[0] === kept.id && await page.isVisible('#tab-radio .trial-style'), 'the trial survives a reload');
  await page.click('#tab-radio [data-trial-keep]'); await sleep(400);
  o = await opts();
  const saved = (await mine()).find(r => r.id === kept.id);
  check(!o.tempStyle && saved && saved.invented && saved.invented.edited === false && o.styles.includes(kept.id), 'Tieni: among your styles with its origin, still selected');
  check(await page.isVisible(`#tab-radio .chip[data-style="${kept.id}"]`) && !(await page.isVisible('#tab-radio .trial-style')), 'the kept style is a radio chip');
  check(/Stili/.test(await toastText()), 'toast: saved among yours (Stili)');

  // Styles tab: badge, origin, edit marks it edited
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="stili"]'); await sleep(300);
  check(/Genere<\/strong> = famiglia ampia/.test(await page.innerHTML('#tab-stili .words-line')), 'Styles tab: the genre, style, artist line');
  await page.click(`#tab-stili [data-open="${kept.id}"]`); await sleep(300);
  check(/Inventato/i.test(await page.innerText(`#tab-stili [data-open="${kept.id}"].lib-card`)) && await page.isVisible('#tab-stili .invent-origin'), 'Styles tab: the Inventato badge and where each part comes from');
  await page.click('#st-edit'); await sleep(200);
  await page.fill('[data-num="tempo.1"]', String(kept.tempo[1] + 2)); await page.dispatchEvent('[data-num="tempo.1"]', 'change'); await sleep(200);
  await page.click('#st-save'); await sleep(300);
  const edited = (await mine()).find(r => r.id === kept.id);
  check(edited.invented.edited === true && edited.tempo[1] === kept.tempo[1] + 2 && /Inventato, modificato/i.test(await page.innerText(`#tab-stili [data-open="${kept.id}"].lib-card`)), 'an edit: "Inventato, modificato"');

  // the trial card
  await page.click('#st-invent'); await sleep(300);
  check(await page.isVisible('#st-trial') && /in prova/i.test(await page.innerText("#st-trial h3")) && /seme/.test(await page.innerText('#st-trial')) && /Da dove viene/i.test(await page.innerText('#st-trial')), 'Styles tab: Inventa uno stile opens the trial card');
  const card1 = await page.innerText('#st-trial h3');
  await page.click('#st-trial-again'); await sleep(300);
  check((await page.innerText('#st-trial h3')) !== card1, 'the card\'s Ancora: another style');
  await shot('styles-trial-card.png');
  await page.click('#st-trial-radio'); await sleep(2500);
  o = await opts();
  check(o.tempStyle && await page.evaluate(() => globalThis.codingMiskRadio.on), 'Ascolta in radio: the radio plays the trial', o.tempStyle && o.tempStyle.id);
  await page.click('#radio-start'); await sleep(500);
  await page.click('#tab-radio [data-trial-drop]'); await sleep(200);

  // ---------- backup ----------
  const backupHas = await page.evaluate(id => { const keys = Object.keys(localStorage).filter(k => k.startsWith('coding-misk-')); return keys.includes('coding-misk-styles') && JSON.parse(localStorage.getItem('coding-misk-styles')).some(r => r.id === id); }, kept.id);
  check(backupHas, 'the kept style is in coding-misk-styles, which the backup carries');

  // ---------- a Genres card ----------
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="generi"]'); await sleep(300);
  check(/Genere<\/strong> = famiglia ampia/.test(await page.innerHTML('#tab-generi .words-line')) && await page.locator('#tab-generi [data-genre-invent]').count() >= 8, 'Genres tab: the words line and a button on each card with styles');
  await shot('genres-invent.png');
  await page.click('#tab-generi [data-genre-invent="jazz"]'); await sleep(2500);
  o = await opts();
  check(o.tempStyle && o.tempStyle.genre === 'jazz' && o.styles[0] === o.tempStyle.id, 'Inventa uno stile di questo genere: a jazz style on trial in the radio', o.tempStyle && o.tempStyle.name.it);
  await page.click('#radio-start'); await sleep(500);
  await page.click('#tab-radio [data-trial-drop]'); await sleep(200);

  // ---------- the New song panel ----------
  const radioBefore = (await opts()).styles.join();
  await page.click('[data-mode="ascolta"]'); await page.click('[data-tab="componi"]'); await sleep(400);
  await page.click('#tr-new'); await sleep(300);
  if ((await page.getAttribute('[data-ns-fold="style"]', 'aria-expanded')) !== 'true') { await page.click('[data-ns-fold="style"]'); await sleep(200); }
  await page.click('#new-song [data-dice="invent"]'); await sleep(300);
  const ns = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-new-song') || '{}'));
  check(ns.tempStyle && ns.styles[0] === ns.tempStyle.id && await page.isVisible('#new-song .trial-style'), 'New song panel: the invent die and the trial chip', ns.tempStyle && ns.tempStyle.name.it);
  await shot('new-song-invent.png');
  await page.click('#ns-generate'); await sleep(3000);
  const song = await page.evaluate(() => globalThis.codingMiskPatterns.compose().T);
  check(song && song.tags && (song.tags.styles || []).includes(ns.tempStyle.id), 'Genera makes the song from the trial style', JSON.stringify(song && song.tags));
  check((await opts()).styles.join() === radioBefore && !(await opts()).tempStyle, 'the radio\'s styles do not change');

  // ---------- the compilation (phase 2): the setup switch, off by default; an invented segment kept from the tag ----------
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#radio-comp-setup'); await sleep(300);
  check((await page.getAttribute('[data-comp-invented]', 'aria-pressed')) === 'false', 'compilation setup: Stili inventati, off by default');
  await page.click('[data-comp-invented]'); await sleep(200);
  check((await opts()).compSetup.invented === true && (await page.getAttribute('[data-comp-invented]', 'aria-pressed')) === 'true', 'the switch turns it on');
  if (shots) await page.screenshot({ path: path.join(shots, 'comp-setup.png') });
  await page.click('#radio-comp-setup'); await sleep(200);
  while ((await opts()).compilation !== 'song') { await page.click('#radio-comp'); await sleep(150); }
  await page.fill('#radio-seed', 'inv').catch(() => {});
  await page.click('#radio-start'); await sleep(2500);
  let found = false;
  for (let i = 0; i < 10 && !found; i++) { found = await page.isVisible('[data-comp-keep-style]'); if (!found) { await page.click('#radio-skip'); await sleep(2000); } }
  check(found, 'a compilation segment plays an invented style, with Tieni on the tag');
  if (found) {
    const err = await ed();
    await shot('comp-invented.png');
    const n0 = (await mine()).length;
    await page.click('[data-comp-keep-style]'); await sleep(300);
    check((await mine()).length === n0 + 1 && (await mine()).slice(-1)[0].invented && !err, 'Tieni on the tag keeps the invented style', err);
  }
  await page.click('#radio-start'); await sleep(500);

  // ---------- English, phone width ----------
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'en')); await page.reload(); await sleep(3500);
  await page.click('[data-tab="radio"]'); await sleep(300);
  await page.click('#tab-radio [data-dice="invent"]'); await sleep(300);
  check(/on trial/.test(await page.innerText('#tab-radio .trial-style')) && /Invent/.test(await page.innerText('#tab-radio [data-dice="invent"]')), 'English labels');
  await page.setViewportSize({ width: 400, height: 900 }); await sleep(300);
  const wide = await page.evaluate(() => { const c = document.querySelector('#tab-radio .trial-style'); const r = c.getBoundingClientRect(); return { right: r.right, doc: document.documentElement.scrollWidth }; });
  check(wide.right <= 401 && wide.doc <= 401, '400 px: the trial chip fits, no side scroll', JSON.stringify(wide));
  await shot('radio-400.png');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
