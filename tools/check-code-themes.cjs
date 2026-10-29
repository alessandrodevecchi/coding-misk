// Browser check of the code themes (code-themes): the default, every theme installed on the editor (token colours
// read in the panel), no flash of Strudel's default after a reload, Automatic following the app theme and Neon the
// look, font and size, the widgets, the dimmed muted lines and their option, the flash and the playing-note outline,
// the Settings card (saved, the line naming Automatic's theme, the reset), the code drawn in videos (the theme, the
// app theme's colours, a fast video keeping the theme it started with). With a shots dir: pictures of every theme on
// the same song and bar (luci-rosse, Crescendo, bar 38, the hook muted by hand), a phone and the Settings card.
// Usage: PLAYWRIGHT_CORE=... PORT=5173 node tools/check-code-themes.cjs [shots-dir] [--lang it|en] [--no-song]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const LANG = flag('--lang') || 'it', noSong = args.includes('--no-song');
const shots = args.find(a => !a.startsWith('--')), URL = `http://localhost:${process.env.PORT || 5173}/`;
if (shots) fs.mkdirSync(shots, { recursive: true });
const OWN = ['neon', 'amber', 'terminal', 'contrast-dark', 'contrast-light'], STRUDEL = ['strudelTheme', 'teletext', 'blackscreen', 'whitescreen', 'bluescreen'];
const rgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h); if (!m) return h; const n = parseInt(m[1], 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  // every frame until the panel shows: what is installed the first time the editor is visible
  await ctx.addInitScript(lang => {
    try { if (!localStorage.getItem('coding-misk-lang')) localStorage.setItem('coding-misk-lang', lang); } catch (e) {}
    globalThis.__ctFirst = null;
    const look = () => {
      const e = document.querySelector('#edhost .cm-editor');
      if (e && getComputedStyle(e).visibility === 'visible' && e.getBoundingClientRect().height > 0) {
        const C = globalThis.codingMiskCodeThemes;
        globalThis.__ctFirst = { installed: C ? String(C.installed).split(':')[0] : 'none', bg: getComputedStyle(e.closest('#edhost')).backgroundColor };
        return;
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  }, LANG);
  const page = await ctx.newPage();
  const errors = [], warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (/code themes/.test(m.text())) warnings.push(m.text()); });
  await page.goto(URL); await sleep(1500);
  await page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('coding-misk-code-theme') || k === 'codemirror-settings') localStorage.removeItem(k); localStorage.setItem('coding-misk-ui', JSON.stringify('neon')); localStorage.setItem('coding-misk-code-widgets', JSON.stringify({ on: true })); });
  await page.reload(); await sleep(5000);
  await page.click('[data-mode="ascolta"]').catch(() => {});
  await page.click('[data-tab="componi"]'); await sleep(800);

  const CT = (fn, a) => page.evaluate(fn, a);
  const state = () => CT(() => { const C = globalThis.codingMiskCodeThemes; return { id: C.current.id, installed: String(C.installed).split(':')[0], roles: C.current.roles, S: C.settings() }; });
  // the computed colour of the first token of the panel with this text
  const colourOf = text => CT(text => {
    const v = document.querySelector('strudel-editor').editor.editor;
    for (const s of v.contentDOM.querySelectorAll('.cm-line span')) if (s.textContent === text) return getComputedStyle(s).color;
    return null;
  }, text);
  const setTheme = async patch => { await CT(p => globalThis.codingMiskCodeThemes.set(p), patch); await sleep(250); };

  // ---------- default ----------
  let s = await state();
  check(s.S.theme === 'auto' && s.id === 'neon' && s.installed === 'neon', 'default: Automatic gives Neon in the neon app theme', `${s.S.theme} → ${s.id}, installed ${s.installed}`);
  const first = await CT(() => globalThis.__ctFirst);
  check(first && first.installed === 'neon', 'no flash of Strudel\'s default: the panel shows only once Neon is installed', JSON.stringify(first));
  const font = await CT(() => { const v = document.querySelector('strudel-editor').editor.editor; const cs = getComputedStyle(v.contentDOM); return { family: cs.fontFamily, size: cs.fontSize }; });
  check(/JetBrains Mono/.test(font.family) && font.size === '14px', 'default font: JetBrains Mono at the Medium size (14 px)', `${font.family} ${font.size}`);

  // ---------- every theme on the editor ----------
  // tokens of the starting code: a comment, a string, a label ($), a method (bank)
  const code0 = await CT(() => document.querySelector('strudel-editor').editor.code);
  const strTok = (/"[^"]+"/.exec(code0) || [''])[0];
  for (const id of [...OWN, ...STRUDEL]) {
    await setTheme({ theme: id });
    s = await state();
    const R = s.roles, bg = await CT(() => getComputedStyle(document.getElementById('edhost')).backgroundColor);
    const got = { text: await CT(() => getComputedStyle(document.querySelector('strudel-editor').editor.editor.contentDOM).color), string: strTok ? await colourOf(strTok) : null, label: await colourOf('$') };
    const want = { text: rgb(R.text), string: rgb(R.string), label: rgb(R.label) };
    const ok = s.installed === id && bg === rgb(R.bg) && got.text === want.text && (!strTok || got.string === want.string) && (!/\$:/.test(code0) || got.label === want.label);
    check(ok, `theme ${id}: installed, ground, text, string and label colours in the panel`, ok ? '' : JSON.stringify({ installed: s.installed, bg, got, want }));
  }
  check(!warnings.length, 'no installer warning', warnings.join(' | '));

  // ---------- reload with a chosen theme: shown from the first paint ----------
  for (const id of ['terminal', 'teletext', 'contrast-light']) {
    await setTheme({ theme: id });
    await page.reload(); await sleep(4500);
    const f = await CT(() => globalThis.__ctFirst);
    check(f && f.installed === id, `reload with ${id}: the panel first shows in ${id}`, JSON.stringify(f));
  }
  await page.click('[data-mode="ascolta"]').catch(() => {});
  await page.click('[data-tab="componi"]'); await sleep(600);

  // ---------- Automatic follows the app theme, a chosen theme stays; Neon follows the look ----------
  await setTheme({ theme: 'auto' });
  await page.click('[data-uitheme="hw"]'); await sleep(400);
  s = await state(); check(s.id === 'amber' && s.installed === 'amber', 'Automatic: HW gives Amber, without a reload', s.installed);
  await setTheme({ theme: 'contrast-dark' });
  await page.click('[data-uitheme="neon"]'); await sleep(300); await page.click('[data-uitheme="hw"]'); await sleep(300);
  s = await state(); check(s.installed === 'contrast-dark', 'a chosen theme stays when the app theme changes', s.installed);
  await page.click('[data-uitheme="neon"]'); await sleep(300);
  await setTheme({ theme: 'auto' });
  const looks = await CT(() => [...document.querySelectorAll('#looks option')].map(o => o.value).filter(v => v !== 'soul'));
  const pick = async v => { await page.selectOption('#looks', v); await sleep(400); };
  if (looks.includes('palco') && looks.includes('sonar')) {
    await pick('palco'); const a = (await state()).roles.string;
    await pick('sonar'); const b = (await state()).roles.string, a2 = await CT(() => getComputedStyle(document.documentElement).getPropertyValue('--a2').trim());
    const shown = strTok ? await colourOf(strTok) : rgb(b);
    check(a !== b && b.toLowerCase() === a2.toLowerCase() && shown === rgb(b), 'Neon follows the look: Palco to Sonar changes the strings to Sonar\'s accent', `${a} → ${b} (--a2 ${a2}, shown ${shown})`);
    await pick('palco');
  } else check(false, 'looks palco and sonar in the visual menu', looks.join());

  // ---------- font and size ----------
  const fz = () => CT(() => { const v = document.querySelector('strudel-editor').editor.editor; return { size: getComputedStyle(v.contentDOM).fontSize, family: getComputedStyle(v.contentDOM).fontFamily, cw: v.defaultCharacterWidth }; });
  await setTheme({ size: 'small' }); await sleep(300); const small = await fz();
  await setTheme({ size: 'large' }); await sleep(300); const large = await fz();
  check(small.size === '13px' && large.size === '16px' && large.cw > small.cw, 'Code size: Small 13 px, Large 16 px, the character width follows (the panel\'s width in characters)', `${small.size} ${small.cw.toFixed(2)} → ${large.size} ${large.cw.toFixed(2)}`);
  await page.click('#code-full'); await sleep(400); const full = await fz(); await page.click('#code-full'); await sleep(300);
  check(full.size === '18px', 'the full view: one step larger (Large → 18 px)', full.size);
  await setTheme({ size: 'medium', font: 'vt323' }); await sleep(300); const vt = await fz();
  check(/VT323/.test(vt.family) && parseFloat(vt.size) > 14, 'Code font: VT323, drawn larger', `${vt.family} ${vt.size}`);
  await setTheme({ font: 'jetbrains' });

  // ---------- a song with widgets, a muted line, the flash and the outline ----------
  let songOk = false;
  if (!noSong) {
    await page.locator('#track-pick').selectOption('luci-rosse'); await sleep(1500);
    await CT(() => document.querySelector('[data-profile="crescendo"]').click()); await sleep(10000);
    await page.addStyleTag({ content: '.edhost { max-height: 1050px !important; }' });
    await page.click('#play');
    const now = () => CT(() => { const s = document.querySelector('strudel-editor').editor.repl.scheduler; return s.started ? s.now() : -1; });
    for (let k = 0; k < 600; k++) { if ((await now()) >= 37.3) break; await sleep(250); }
    await page.click('#play'); await sleep(1500);
    // a muted line as a user types it: the hook's `$:` becomes `_$:`
    songOk = await CT(() => {
      const ed = document.querySelector('strudel-editor').editor, view = ed.editor, at = view.state.doc.toString().indexOf('$: n("<[12');
      if (at < 0) return false;
      view.dispatch({ changes: { from: at, to: at, insert: '_' } });
      return true;
    });
    check(songOk, 'luci-rosse at bar 38 with a hand-muted hook line');
  }
  // widgets: the hidden groups take the theme's widget colours (at the next evaluation)
  await setTheme({ theme: 'contrast-light' });
  const wg = await CT(async () => { const ed = document.querySelector('strudel-editor').editor; try { await ed.evaluate(false); } catch (e) {} const W = globalThis.miskWidgets || {}; return { active: W.pianoroll && W.pianoroll.active, scope: W.scope && W.scope.color, want: globalThis.codingMiskCodeThemes.current.roles.widget }; });
  check(wg.active === wg.want.a1 && wg.scope === wg.want.a1, 'widgets take the code theme\'s colours (Light high contrast)', JSON.stringify(wg));
  // the muted line's text: dimmed with the option on, as it is with the option off
  const dimOf = () => CT(() => { const l = document.querySelector('#edhost .ct-muted'); return l ? { n: document.querySelectorAll('#edhost .ct-muted').length, opacity: getComputedStyle(l).opacity, text: l.textContent.slice(0, 30) } : null; });
  await setTheme({ dim: true }); await sleep(200); const d1 = await dimOf();
  await setTheme({ dim: false }); await sleep(200); const d0 = await dimOf();
  await setTheme({ dim: true });
  if (songOk) {
    check(d1 && /_\$:/.test(d1.text) && Math.abs(+d1.opacity - 0.55) < 0.01, 'Dim muted lines on (default): the _$: line and its continuation lines at 55 %', JSON.stringify(d1));
    check(d0 && +d0.opacity === 1, 'Dim muted lines off: the text keeps the theme\'s colours', JSON.stringify(d0));
    const cwm = await CT(() => { const e = document.querySelector('#edhost .cw-muted'); return e ? getComputedStyle(e).outlineColor : null; });
    check(!cwm || cwm === rgb('#6b6b6b'), 'the dimmed widget of a muted line: outline in the theme\'s muted colour', cwm || 'no dimmed widget in view');
  }
  // the flash on a white ground, and the playing-note outline
  const fl = await CT(async () => {
    const ed = document.querySelector('strudel-editor').editor; ed.flash(1500); await new Promise(r => setTimeout(r, 120));
    const sp = document.querySelector('#edhost [style*="255,255,255"]');
    return { bg: sp ? getComputedStyle(sp).backgroundColor : null, outline: getComputedStyle(document.documentElement).getPropertyValue('--foreground').trim() };
  });
  check(fl.bg === 'rgba(106, 0, 176, 0.22)', 'the flash takes the theme\'s colour on the white ground (Light high contrast)', fl.bg);
  check(fl.outline === '#000000', 'the playing notes are outlined in the theme\'s colour (--foreground)', fl.outline);
  if (shots) { await sleep(100); await page.locator('.codecol').screenshot({ path: path.join(shots, 'fatto-11-lampo-chiaro-alto-contrasto.png') }); }
  await sleep(1500);

  // ---------- pictures of every theme on the same song and bar ----------
  if (shots) {
    const P = [['01', 'neon', 'neon-palco', { look: 'palco' }], ['02', 'neon', 'neon-sonar', { look: 'sonar' }], ['03', 'amber', 'ambra-hw', { ui: 'hw' }], ['04', 'terminal', 'terminale'], ['05', 'contrast-dark', 'alto-contrasto-scuro'], ['06', 'contrast-light', 'chiaro-alto-contrasto'],
      ['07', 'strudelTheme', 'strudel-strudelTheme'], ['08', 'teletext', 'strudel-teletext'], ['09', 'blackscreen', 'strudel-blackscreen'], ['10', 'whitescreen', 'strudel-whitescreen'], ['10b', 'bluescreen', 'strudel-bluescreen']];
    for (const [n, id, name, o = {}] of P) {
      await page.click(`[data-uitheme="${o.ui || 'neon'}"]`); await sleep(200);
      await pick(o.look || 'palco');
      await setTheme({ theme: id });
      await CT(async () => { try { await document.querySelector('strudel-editor').editor.evaluate(false); } catch (e) {} document.querySelector('#edhost').scrollTop = 0; });
      await sleep(900);
      await page.locator('.codecol').screenshot({ path: path.join(shots, `fatto-${n}-${name}.png`) });
    }
    await page.click('[data-uitheme="neon"]'); await sleep(200);
    await setTheme({ theme: 'auto', dim: false }); await sleep(400);
    await page.locator('.codecol').screenshot({ path: path.join(shots, 'fatto-12-neon-righe-mute-non-attenuate.png') });
    await setTheme({ dim: true });
  }

  // ---------- videos ----------
  const vid = await CT(async () => {
    const L = await import('/src/video/layout.js'), V = globalThis.codingMiskVideo, C = globalThis.codingMiskCodeThemes;
    const q = { w: 640, h: 360 }, A = L.layoutAreas('code', q.w, q.h, null).code;
    const px = () => { const d = V.canvas.getContext('2d').getImageData(Math.round(A.x + A.w - 6), Math.round(A.y + A.h - 6), 1, 1).data; return `#${[d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, '0')).join('')}`; };
    const out = {};
    C.set({ theme: 'amber' });
    const ct = C.forVideo();
    V.composeAt({ layout: 'code', q, ct }, 1, 1); out.amber = px();
    // the theme changes during a fast video: the frames keep the one read at the start
    C.set({ theme: 'contrast-light' });
    V.composeAt({ layout: 'code', q, ct }, 2, 2); out.kept = px();
    V.composeAt({ layout: 'code', q }, 2, 2); out.now = px();
    // Settings → Video → Code colours: the app theme
    const keep = localStorage.getItem('coding-misk-video');
    localStorage.setItem('coding-misk-video', JSON.stringify({ ...(JSON.parse(keep || '{}') || {}), codeColors: 'app' }));
    V.composeAt({ layout: 'code', q }, 2, 2); out.app = px(); out.panel = getComputedStyle(document.documentElement).getPropertyValue('--panel').trim();
    if (keep === null) localStorage.removeItem('coding-misk-video'); else localStorage.setItem('coding-misk-video', keep);
    out.roles = C.forVideo().roles && C.forVideo().roles.bg;
    return out;
  });
  check(vid.amber === '#140e04', 'video code panel: Amber\'s ground', vid.amber);
  check(vid.kept === '#140e04' && vid.now === '#ffffff', 'a fast video keeps the theme it started with; the next video takes the new one', `${vid.kept} / ${vid.now}`);
  check(vid.app === vid.panel.toLowerCase(), 'Code colours: App theme draws the code on the app\'s panel colour', `${vid.app} vs ${vid.panel}`);

  // ---------- the Settings card ----------
  await setTheme({ theme: 'auto' });
  await page.click('#open-settings'); await sleep(600);
  const card = await CT(() => { const sel = document.querySelector('#set-code-theme'); if (!sel) return null; const row = sel.closest('.set-row'); return { value: sel.value, groups: sel.querySelectorAll('optgroup').length, options: sel.options.length, hint: row.querySelector('.hint') ? row.querySelector('.hint').textContent : '' }; });
  check(card && card.value === 'auto' && card.groups === 2 && card.options === 11, 'Settings → Appearance: Code theme with Automatic, the app\'s themes and Strudel\'s', JSON.stringify(card));
  check(card && /Neon/.test(card.hint), 'the line under the menu names the theme Automatic uses', card && card.hint);
  await page.selectOption('#set-code-theme', 'terminal'); await sleep(400);
  s = await state(); check(s.installed === 'terminal' && s.S.theme === 'terminal', 'choosing Terminal in Settings installs it and saves it', `${s.installed} ${JSON.stringify(s.S)}`);
  await page.click('#tab-impostazioni [data-set-code-size="large"]'); await sleep(200);
  await page.click('#tab-impostazioni [data-set-code-dim="0"]'); await sleep(200);
  await page.selectOption('#set-code-font', 'sharetech'); await sleep(200);
  const saved = await CT(() => JSON.parse(localStorage.getItem('coding-misk-code-theme')));
  check(saved && saved.size === 'large' && saved.dim === false && saved.font === 'sharetech', 'font, size and Dim muted lines saved', JSON.stringify(saved));
  const vsel = await CT(() => { const e = document.querySelector('[data-vid-opt="codeColors"]'); return e ? [...e.options].map(o => o.value).join() : null; });
  check(vsel === 'panel,app', 'Settings → Video → Code colours: Same as the panel, App theme', vsel);
  if (shots) {
    await page.selectOption('#set-code-theme', 'auto'); await sleep(300);
    await page.click('#tab-impostazioni [data-set-code-size="medium"]'); await sleep(200);
    await page.click('#tab-impostazioni [data-set-code-dim="1"]'); await sleep(200);
    await page.selectOption('#set-code-font', 'jetbrains'); await sleep(300);
    const c = page.locator('#tab-impostazioni .set-card').first(); await c.screenshot({ path: path.join(shots, `fatto-13-impostazioni-aspetto-${LANG}.png`) });
    await page.click('#open-settings'); await sleep(300);
    // a phone: Compose with the code below
    await page.setViewportSize({ width: 400, height: 860 }); await sleep(800);
    await page.evaluate(() => { const c = document.querySelector('#codecol'); if (c) c.scrollIntoView(); });
    await sleep(500); await page.screenshot({ path: path.join(shots, 'fatto-14-telefono-neon.png') });
    await setTheme({ theme: 'contrast-light' }); await sleep(500);
    await page.screenshot({ path: path.join(shots, 'fatto-15-telefono-chiaro-alto-contrasto.png') });
    await page.setViewportSize({ width: 1440, height: 1100 }); await sleep(300);
  }
  // the reset removes the code theme with the other settings (every coding-misk- key)
  check(await CT(() => Object.keys(localStorage).includes('coding-misk-code-theme')), 'the code theme is kept under coding-misk-code-theme (backup and reset take every coding-misk- key)');

  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await page.evaluate(() => { localStorage.removeItem('coding-misk-code-theme'); });
  await browser.close();
  console.log(failed ? `${failed} check(s) failed` : 'code themes in the browser: all ok');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
