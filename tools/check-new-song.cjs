// Browser checks for the New song panel of Compose (openspec new-song-panel): open and close (button, ×, Esc, kept on
// reload), the quick row in order, the five folded sections with summaries and remembered folds, the panel's values
// apart from the radio's, Prendi dalla radio, presets (pick, Personalizzato after a change, save, overwrite after a
// second press, a built-in name saves one of the owner's, delete), Genera (artist, Custom Live coder with an opening,
// composed material, Breve in Classic, Media in Live coder within 3 to 4 minutes), the length kept across profile
// switches in Compose, Libera clearing the target with its line, Durata and free growth excluding each other,
// Sorprendimi repeatable by seed, the voice track off, Da zero, the Artists tab, hardware faders, 400 px.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-new-song.cjs [shots-dir]   (dev server on PORT, default 5173)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const shots = process.argv[2];
const PORT = process.env.PORT || 5173;
if (shots) fs.mkdirSync(shots, { recursive: true });
// the panel alone in a screenshot: the fixed and sticky bars of the page hidden meanwhile
const shot = async (page, file) => {
  await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if ((p === 'fixed' || p === 'sticky') && !el.contains(document.getElementById('new-song'))) { el.dataset.nsShot = el.style.visibility || '-'; el.style.visibility = 'hidden'; } } });
  await (await page.$('#new-song')).screenshot({ path: file });
  await page.evaluate(() => { for (const el of document.querySelectorAll('[data-ns-shot]')) { el.style.visibility = el.dataset.nsShot === '-' ? '' : el.dataset.nsShot; delete el.dataset.nsShot; } });
};
const secs = s => { const m = /(\d+):(\d\d)\s*$/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : NaN; };

(async () => {
  let browser;
  try { browser = await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { browser = await chromium.launch({ headless: true }); }
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://localhost:${PORT}/`); await sleep(2500);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('coding-misk-lang', 'it'); localStorage.setItem('coding-misk-radio', JSON.stringify({ styles: ['berlin-techno'], energy: 0.4, profile: 'crescendo' })); });
  await page.reload(); await sleep(3500);
  await page.click('[data-mode="ascolta"]');
  const compose = async () => { await page.click('[data-tab="componi"]'); await sleep(300); };
  await compose();
  const panel = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-new-song') || 'null'));
  const radioSaved = () => page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-radio') || 'null'));
  const toastText = () => page.evaluate(() => [...document.querySelectorAll('.toast')].filter(x => !x.hidden).map(x => x.textContent).join(' | '));
  const T = () => page.evaluate(() => globalThis.codingMiskPatterns.compose());
  const fold = async k => { if ((await page.getAttribute(`[data-ns-fold="${k}"]`, 'aria-expanded')) !== 'true') { await page.click(`[data-ns-fold="${k}"]`); await sleep(150); } };
  const unfold = async k => { if ((await page.getAttribute(`[data-ns-fold="${k}"]`, 'aria-expanded')) === 'true') { await page.click(`[data-ns-fold="${k}"]`); await sleep(150); } };
  // the heard length in Compose once the growth is ready: the total of the ruler
  const heard = async () => { for (let i = 0; i < 120; i++) { const p = await page.evaluate(() => globalThis.codingMiskBars().compose.pending); if (!p) break; await sleep(500); } await sleep(300); return secs((await page.textContent('#ruler-time')).split('/')[1]); };
  const generate = async (seed = '') => { await page.fill('#ns-seed', seed); await page.click('#ns-generate'); await sleep(1500); if (/di nuovo|again/i.test(await toastText())) { await page.click('#ns-generate'); await sleep(1500); } };

  // ---------- open, close, quick row ----------
  check((await page.getAttribute('#tr-new', 'aria-expanded')) === 'false' && await page.isHidden('#new-song') && !(await page.$('#tr-artist')), 'Nuovo brano is closed at first, and the title row has no artist select');
  const before = await T();
  await page.click('#tr-new'); await sleep(300);
  check((await page.getAttribute('#tr-new', 'aria-expanded')) === 'true' && await page.isVisible('#new-song'), 'Nuovo brano opens the panel and reads as expanded');
  const order = await page.evaluate(() => [...document.querySelectorAll('.ns-quick > button, .ns-quick > .ctrl')].map(x => x.id || x.className.split(' ').pop()));
  check(order.join() === 'ns-scratch,ns-artist,ns-presets,ns-seed,ns-generate,ns-surprise', 'quick row: Da zero, Artista, Preset, Seme, Genera, Sorprendimi', order.join());
  const secsInfo = await page.evaluate(() => [...document.querySelectorAll('[data-ns-fold]')].map(b => ({ k: b.dataset.nsFold, open: b.getAttribute('aria-expanded'), sum: b.querySelector('.custom-summary').textContent })));
  check(secsInfo.map(x => x.k).join() === 'style,profile,voices,material,length' && secsInfo.every(x => x.open === 'false' && x.sum), 'five sections, closed, each with a summary', JSON.stringify(secsInfo.map(x => x.sum)));
  check((await panel()).styles.join() === 'berlin-techno' && (await panel()).energy === 0.4 && (await panel()).profile === 'crescendo', 'the panel starts from a copy of the radio');
  if (shots) await shot(page, path.join(shots, 'panel-closed.png'));
  await page.keyboard.press('Escape'); await sleep(200);
  check(await page.isHidden('#new-song') && JSON.stringify((await T()).T.tracks) === JSON.stringify(before.T.tracks), 'Esc closes the panel, the song is unchanged');
  await page.click('#tr-new'); await sleep(200); await page.click('#ns-close'); await sleep(200);
  check(await page.isHidden('#new-song'), 'the close button closes it');
  await page.click('#tr-new'); await sleep(200);

  // ---------- sections, values apart from the radio ----------
  await fold('style');
  await page.evaluate(() => { const el = document.getElementById('ns-chaos'); el.value = 0.7; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(200); await unfold('style');
  const sum = await page.textContent('[data-ns-fold="style"] .custom-summary');
  check(/0\.7/.test(sum) && /Techno/i.test(sum), 'chaos 0.7: the closed Stile e genere shows the styles and chaos 0.7', sum);
  await fold('style');
  const genre = await page.evaluate(() => { const b = document.querySelector('[data-genre-pick="synthwave"]') || document.querySelector('[data-genre-pick]'); const g = b.dataset.genrePick; b.click(); return g; });
  await sleep(200);
  const picked = await page.evaluate(g => [...document.querySelectorAll('#new-song [data-style][aria-pressed="true"]')].map(b => b.dataset.style), genre);
  check(picked.length > 1, `a genre chip (${genre}) picks the styles of that genre`, picked.join());
  await page.evaluate(() => { const el = document.getElementById('ns-energy'); el.value = 0.9; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await fold('voices');
  await page.click('#ns-voice [data-rvoice-switch="track"]'); await sleep(200);
  const r1 = await radioSaved(), p1 = await panel();
  check(r1.energy === 0.4 && !(r1.voices && r1.voices.track === false) && p1.energy === 0.9 && p1.voices.track === false, 'energy 0.9 and the voice track off in the panel leave the radio alone', JSON.stringify({ radio: r1.energy, panel: p1.energy }));
  await page.click('[data-tab="radio"]'); await sleep(600);
  check((await page.inputValue('#radio-energy')) === '0.4' && (await page.getAttribute('#radio-voice [data-rvoice-switch="track"]', 'aria-pressed')) === 'true', 'the radio shows its own energy and voice track');
  await page.selectOption('#radio-profile', 'switch'); await sleep(300);
  await compose();
  check((await panel()).profile === 'crescendo', 'a change in the radio leaves the panel alone');
  await page.click('#ns-take'); await sleep(300);
  await fold('profile');
  check((await page.inputValue('#ns-profile')) === 'switch' && (await panel()).voices.track === true, 'Prendi dalla radio: Profilo e crescita shows Live coder, the voices are the radio\'s');
  // a shape control with Live coder makes it Custom based on Live coder, the radio keeps its own profile
  await page.selectOption('#ns-custom [data-custom="pace"]', 'fast'); await sleep(300);
  const pc = await panel();
  check(pc.profile === 'custom' && pc.custom.base === 'switch' && pc.custom.controls.pace === 'fast' && (await radioSaved()).profile === 'switch', 'a pace with Live coder: Custom based on Live coder with that pace, the radio unchanged', JSON.stringify(pc.custom));
  await fold('material');
  await page.selectOption('#ns-custom [data-custom="build"]', 'blocks'); await sleep(300);
  check(await page.evaluate(() => { const s = document.querySelector('[data-ns-sec="material"] [data-custom="gen"]'); return s.disabled && /costruzione/.test(s.closest('.ctrl').title); }), 'the Generator is disabled with the reason when the build is in blocks');
  // folds remembered after a reload
  await page.reload(); await sleep(3500); await page.click('[data-mode="ascolta"]'); await compose();
  check(await page.isVisible('#new-song') && (await page.getAttribute('[data-ns-fold="material"]', 'aria-expanded')) === 'true' && (await page.getAttribute('[data-ns-fold="voices"]', 'aria-expanded')) === 'true', 'the open panel and the open sections stay after a reload');

  // ---------- presets ----------
  await page.selectOption('#ns-preset', 'short-groove'); await sleep(300);
  let p = await panel();
  check(p.profile === 'classic' && p.material === 'patterns' && p.length === 'short' && /Groove breve/.test(await page.textContent('#ns-preset-now')), 'Groove breve sets its values and shows in the footer', JSON.stringify({ profile: p.profile, material: p.material, length: p.length }));
  await fold('style');
  await page.evaluate(() => { const el = document.getElementById('ns-chaos'); el.value = 0.2; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await sleep(300);
  check((await panel()).preset === '' && /Personalizzato/.test(await page.textContent('#ns-preset-now')), 'moving chaos: the select shows Personalizzato');
  await page.click('#ns-save'); await page.fill('#ns-name', 'Notte'); await page.click('#ns-save-ok'); await sleep(300);
  await page.reload(); await sleep(3500); await page.click('[data-mode="ascolta"]'); await compose();
  check(await page.evaluate(() => [...document.querySelectorAll('#ns-preset option')].some(o => o.value === 'Notte')), 'a saved preset is in the select after a reload');
  await page.selectOption('#ns-preset', 'live-coder'); await sleep(200);
  await page.selectOption('#ns-preset', 'Notte'); await sleep(300);
  p = await panel();
  check(p.length === 'short' && p.chaos === 0.2 && p.preset === 'Notte', 'picking Notte sets the saved values, length included');
  await page.click('#ns-save'); await page.fill('#ns-name', 'Notte'); await page.click('#ns-save-ok'); await sleep(200);
  const ask = await page.textContent('#ns-save-msg');
  await page.click('#ns-save-ok'); await sleep(300);
  check(/esiste/.test(ask) && /sovrascritto/i.test(await toastText()), 'saving over his own preset asks once, then overwrites', ask);
  await page.click('#ns-save'); await page.fill('#ns-name', 'Groove breve'); await page.click('#ns-save-ok'); await sleep(300);
  const owned = await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-song-presets')));
  check(owned['Groove breve'] && await page.evaluate(() => [...document.querySelectorAll('#ns-preset option')].filter(o => o.value === 'short-groove').length === 1), 'a built-in name saves a preset of his own, the built-in one stays');
  check(await page.isDisabled('#ns-del') === false, 'his own preset can be deleted');
  await page.click('#ns-del'); await sleep(200);
  await page.selectOption('#ns-preset', 'fresh'); await sleep(200);
  check(await page.isDisabled('#ns-del'), 'a built-in preset cannot be deleted');

  // ---------- Genera ----------
  await page.click('#ns-take'); await sleep(200);
  await page.selectOption('#ns-artist', 'dreamer'); await sleep(200);
  await generate();
  let t1 = await T(), tt = await toastText();
  check(t1.dirty && /Lumen Drift/.test(tt) && /^u-/.test(t1.T.id), 'artist and Genera: a new song by that artist opens unsaved and the toast names the artist', tt);
  const seedUsed = await page.inputValue('#ns-seed');
  check(seedUsed.length > 0 && await page.isVisible('#new-song'), 'the panel stays open and shows the seed used', seedUsed);
  await page.selectOption('#ns-artist', ''); await sleep(200);
  // Custom Live coder with an opening
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem('coding-misk-new-song')); });
  await fold('profile');
  await page.selectOption('#ns-profile', 'switch'); await sleep(200);
  await page.selectOption('#ns-custom [data-custom="opening"]', 'full-kick'); await sleep(200);
  await fold('length'); await page.click('[data-song-length="style"]'); await sleep(200);
  await generate('ns-custom');
  t1 = await T();
  check(t1.T.config && t1.T.config.live && t1.T.config.options && t1.T.config.options.opening === 'full-kick' && (await page.getAttribute('#live-toggle', 'aria-pressed')) === 'true' && await page.isHidden('#cfg-changed'), 'Custom Live coder with an opening: Live build on, the opening, no configuration changed mark', JSON.stringify(t1.T.config));
  // composed material, voice track off
  await fold('material'); await page.click('[data-ns-sec="material"] [data-material="composed"]'); await sleep(200);
  await fold('voices'); if ((await page.getAttribute('#ns-voice [data-rvoice-switch="track"]', 'aria-pressed')) === 'true') { await page.click('#ns-voice [data-rvoice-switch="track"]'); await sleep(200); }
  await generate('ns-composed');
  t1 = await T();
  check(!t1.T.tracks.some(x => x.type === 'spoken'), 'Voce: traccia off: the song has no voice track');
  check(t1.T.tracks.some(x => JSON.stringify(x.patterns || {}).length > 20), 'Composti: the song has its parts');
  // Breve in Classic
  await fold('profile'); await page.selectOption('#ns-profile', 'classic'); await sleep(200);
  await page.click('[data-song-length="short"]'); await sleep(200);
  await generate('ns-short');
  let h = await heard();
  check(h >= 120 - 48 && h <= 150 + 16, 'Breve in Classic: 2 to 2.5 minutes, give or take a phrase', `${h} s`);
  // Media in Live coder, then the profile switched in Compose both ways
  await page.selectOption('#ns-profile', 'switch'); await sleep(200);
  await page.click('[data-song-length="medium"]'); await sleep(200);
  const durSel = await page.evaluate(() => { const s = document.querySelector('[data-ns-sec="length"] [data-custom="duration"]'); return s ? s.value : null; });
  const lsum = await page.textContent('[data-ns-fold="length"] .custom-summary');
  check(durSel === 'planned' && /3:00–4:00/.test(lsum), 'Media with Live coder: Durata della crescita "nella durata scelta" beside it, the summary 3 to 4 minutes', `${durSel} · ${lsum}`);
  if (shots) await shot(page, path.join(shots, 'panel-length.png'));
  await generate('ns-medium');
  t1 = await T();
  const hLive = await heard();
  // one phrase of the song in seconds (a slow style has long phrases: the length lands within one of the target)
  const sec0 = t1.T.sections[0], ph = (t1.T.config.durationTarget ? t1.T.config.durationTarget.phrase : 8) * (+sec0.meter.split('/')[0] * 4 / +sec0.meter.split('/')[1]) * 60 / sec0.bpm;
  check(t1.T.config.durationTarget && t1.T.config.durationTarget.length === 'medium' && hLive >= 180 - ph - 1 && hLive <= 240 + ph + 1 && (await page.inputValue('#live-duration')) === 'planned', 'Media in Live coder: grows in the plan, heard 3 to 4 minutes', `${hLive} s, phrase ${Math.round(ph)} s`);
  await page.click('#live-profile [data-profile="classic"]'); await sleep(1500);
  const hClassic = await heard();
  await page.click('#live-profile [data-profile="switch"]'); await sleep(1500);
  const hBack = await heard();
  check(Math.abs(hClassic - hLive) <= ph + 1 && Math.abs(hBack - hLive) <= 2, 'switching to Classic and back keeps the length within a phrase', `${hLive} → ${hClassic} → ${hBack} s`);
  // Libera in Compose
  await page.selectOption('#live-duration', 'free'); await sleep(500);
  const hFree = await heard();
  check(!(await T()).T.config.durationTarget || !(await page.evaluate(() => JSON.parse(localStorage.getItem('coding-misk-song-trials') || '{}')))[t1.T.id]?.durationTarget, 'Libera in Compose removes the target');
  check(await page.isVisible('#live-target-off') && hFree > hLive, 'its line shows and the song grows freely', `${hFree} s`);
  // Durata and free growth exclude each other in the panel
  await fold('length');
  await page.selectOption('[data-ns-sec="length"] [data-custom="duration"]', 'free'); await sleep(300);
  check((await panel()).length === 'style' && await page.isVisible('#ns-target-off'), 'Libera in the panel turns the Durata to Come lo stile, with its line');
  await page.click('[data-song-length="long"]'); await sleep(300);
  check(await page.evaluate(() => document.querySelector('[data-ns-sec="length"] [data-custom="duration"]').value) === 'planned', 'choosing a Durata again: the growth duration is in the chosen length');

  // ---------- Sorprendimi ----------
  await page.click('#ns-surprise'); await sleep(1800);
  if (/di nuovo|again/i.test(await toastText())) { await page.click('#ns-surprise'); await sleep(1800); }
  const s1 = await T(), sseed = await page.inputValue('#ns-seed'), sv = await panel();
  check(s1.dirty && sseed && sv.preset === '' && /Personalizzato/.test(await page.textContent('#ns-preset-now')), 'Sorprendimi: a new song, the seed shown, Personalizzato', sseed);
  check(JSON.stringify((await radioSaved()).styles) === JSON.stringify(r1.styles) || (await radioSaved()).profile === 'switch', 'Sorprendimi leaves the radio alone');
  await generate(sseed);
  const s2 = await T();
  check(JSON.stringify(s2.T.tracks) === JSON.stringify(s1.T.tracks) && s2.T.title === s1.T.title, 'the seed shown and Genera give the same song', `${s1.T.title} / ${s2.T.title}`);

  // ---------- Da zero ----------
  await page.click('#ns-scratch'); await sleep(600);
  if (/di nuovo|again/i.test(await toastText())) { await page.click('#ns-scratch'); await sleep(600); }
  const z = await T();
  check(z.T.tracks.length === 1 && z.T.tracks[0].type === 'drums' && !z.T.config, 'Da zero: an empty song with one drum track, no configuration');

  // ---------- Artists tab ----------
  await page.click('#ns-close'); await sleep(200);
  await page.click('[data-mode="lab"]'); await page.click('[data-tab="artisti"]'); await sleep(500);
  await page.click('[data-open="night-owl"]'); await sleep(300);
  await page.click('#ar-compose'); await sleep(1500);
  if (/di nuovo|again/i.test(await toastText())) { await page.click('#ar-compose'); await sleep(1500); }
  check(await page.isVisible('#new-song') && (await page.inputValue('#ns-artist')) === 'night-owl' && /Night Owl/.test(await toastText()), 'the Artists tab: Compose with a new song by that artist, the panel open, the artist in the quick row');

  // ---------- hardware faders and phone ----------
  await page.evaluate(() => { localStorage.setItem('coding-misk-ui', JSON.stringify('hw')); });
  await page.reload(); await sleep(3500); await page.click('[data-mode="ascolta"]'); await compose();
  await fold('style'); await sleep(400);
  const fad = await page.evaluate(() => ['ns-chaos', 'ns-energy', 'ns-complexity'].map(id => { const i = document.getElementById(id); return !!i && i.dataset.fader === 'h' && !!(i.nextElementSibling && i.nextElementSibling.classList.contains('fader')); }));
  const shown = await page.evaluate(() => document.documentElement.dataset.ui === 'hw' && ['ns-chaos', 'ns-energy', 'ns-complexity'].every(id => getComputedStyle(document.getElementById(id).nextElementSibling).display !== 'none'));
  check(fad.every(Boolean) && shown, 'hardware theme: chaos, energy and complexity are faders', JSON.stringify(fad));
  if (shots) { for (const k of ['profile', 'voices', 'material', 'length']) await fold(k); await shot(page, path.join(shots, 'panel-hw.png')); }
  await page.setViewportSize({ width: 400, height: 900 }); await sleep(600);
  for (const k of ['style', 'profile', 'voices', 'material', 'length']) await fold(k);
  const wide = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth, panel: document.getElementById('new-song').scrollWidth, w: window.innerWidth }));
  check(wide.doc <= wide.w + 1 && wide.panel <= wide.w, '400 px with every section open: nothing scrolls sideways', JSON.stringify(wide));
  await page.locator('#ns-generate').scrollIntoViewIfNeeded();
  check(await page.isVisible('#ns-generate'), 'Genera is reachable on a phone');
  if (shots) await shot(page, path.join(shots, 'panel-phone-hw.png'));
  await page.evaluate(() => { localStorage.setItem('coding-misk-ui', JSON.stringify('neon')); });
  await page.reload(); await sleep(3500); await page.click('[data-mode="ascolta"]'); await compose();
  if (shots) { for (const k of ['style', 'profile', 'voices', 'material', 'length']) await fold(k); await shot(page, path.join(shots, 'panel-phone.png')); await page.setViewportSize({ width: 1440, height: 1100 }); await sleep(500); await shot(page, path.join(shots, 'panel-open.png')); }

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
