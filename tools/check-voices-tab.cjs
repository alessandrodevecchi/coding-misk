// Browser check of my phrases and the Voci tab (my-phrases): lines typed in the radio console and the Compose phrase
// list captured with the three save policies (a fake voice helper for the radio: the sample "is made" at once), the
// Salva sempre toast and its Annulla (in Compose the edit's Undo), Chiedi with no answer for 10 s (No) and the late save
// of the console, Non salvare mai; the tab's four sections, a new phrase, edit, delete with its protected files (a copy
// of a vocabulary entry keeps the built-in file), Copia nelle mie frasi, the test bench (a temporary sample), a delete
// of samples while a song plays (the code's sample numbers follow the new manifest), the Settings card, English, the
// hardware and light themes and 400 px (no sideways scroll). With shots-dir: pictures of the tab, the phrase editor,
// the Settings card and the Chiedi notice in neon, hardware and light, at desktop and 400 px.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/check-voices-tab.cjs [shots-dir]
//   (dev server on PORT, default 5173, with the voice helper: macOS `say` and ffmpeg; samples in public/samples)
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs'), path = require('node:path');
const PORT = process.env.PORT || 5173, URL = `http://localhost:${PORT}/`;
const shots = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const SAMPLES = path.join(__dirname, '..', 'public', 'samples');
// a click through the element (the sticky top bar never takes it)
const tap = (page, sel) => page.$eval(sel, el => el.click());
const sleep = ms => new Promise(r => setTimeout(r, ms));
const until = async (fn, ms = 8000, step = 100) => { const t = Date.now(); for (;;) { let v = null; try { v = await fn(); } catch (e) { v = null; } if (v || Date.now() - t > ms) return v; await sleep(step); } };
const slug = x => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);
let failed = 0;
const check = (ok, name, extra = '') => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };
if (shots) fs.mkdirSync(shots, { recursive: true });

async function launch() {
  try { return await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { return chromium.launch({ headless: true }); }
}
const items = page => page.evaluate(() => globalThis.codingMiskPhrases.phr.items.map(p => ({ id: p.id, text: p.text, kind: p.kind, tag: p.tag, styles: p.styles, source: p.source, uses: p.uses })));
const toastText = page => page.evaluate(() => { const b = document.querySelector('.toast'); return b && !b.hidden ? b.textContent : ''; });
const setPolicy = (page, save) => page.evaluate(s => globalThis.codingMiskPhrases.phr.setSettings({ save: s }), save);
async function fresh(page, { lang = 'it', ui = 'neon', phrases = null } = {}) {
  await page.goto(URL);
  await page.evaluate(([l, u, p]) => { localStorage.clear(); localStorage.setItem('coding-misk-lang', l); localStorage.setItem('coding-misk-ui', JSON.stringify(u)); localStorage.setItem('coding-misk-ui-follow', 'false'); if (p) localStorage.setItem('coding-misk-phrases', JSON.stringify(p)); }, [lang, ui, phrases]);
  await page.reload(); await sleep(3000);
}
async function openTab(page, section) {
  await tap(page, '[data-mode="lab"]'); await sleep(150); await tap(page, '[data-tab="voci"]'); await sleep(250);
  if (section) { await tap(page, `[data-vt-sub="${section}"]`); await sleep(section === 'samples' || section === 'voices' ? 2000 : 300); }
}
async function radioOn(page, seed) {
  await page.evaluate(() => { const o = JSON.parse(localStorage.getItem('coding-misk-radio') || '{}'); localStorage.setItem('coding-misk-radio', JSON.stringify({ ...o, styles: ['ambient'], voice: { presence: 'always', phrases: '1' }, scope: 'song', profile: 'artist', artist: null, compilation: 'off' })); });
  await page.reload(); await sleep(3000);
  await tap(page, '[data-mode="ascolta"]'); await tap(page, '[data-tab="radio"]'); await sleep(300);
  await page.fill('#radio-seed', seed); await tap(page, '#radio-start'); await sleep(3500);
}
async function say(page, text) { await page.fill('#radio-steer [data-sv-line]', text); await tap(page, '#radio-steer [data-sv-say="now"]'); await sleep(900); }
const shot = async (page, name, sel = '#tab-voci') => { if (!shots) return; const el = await page.$(sel); if (el) await el.screenshot({ path: path.join(shots, `${name}.png`) }); };

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1300, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  // the radio's typed lines: a fake helper (the sample "is made" at once, the file does not exist)
  await page.route('**/voice/say', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"bank":"say_it","n":0,"seconds":1,"made":true}' }));

  // ---------- 1. radio console with the three policies ----------
  await fresh(page);
  await radioOn(page, 'my-phrases-1');
  await say(page, 'le torri non dormono mai');
  let list = await items(page), t1 = await toastText(page);
  check(list.length === 1 && list[0].kind === 'voice' && list[0].source === 'radio' && list[0].tag === 'calm' && list[0].styles.join() === 'ambient', 'Salva sempre (default): a typed line is saved as kind voice, the style\'s vocabulary group and the style', JSON.stringify(list));
  check(/Salvata nelle tue frasi/.test(t1) && /Annulla/.test(t1), 'the toast says it with Annulla', t1);
  await tap(page, '.toast .toast-act'); await sleep(200);
  check(!(await items(page)).length, 'Annulla removes the phrase');
  await say(page, 'le torri non dormono mai');
  await say(page, 'le torri non dormono mai');
  list = await items(page);
  check(list.length === 1 && list[0].uses >= 2, 'the same line twice: one phrase with two uses', JSON.stringify(list));
  // Chiedi: a toast with Salva, No, Sempre; no answer in 10 s is No, the line still plays (it is queued)
  await setPolicy(page, 'ask');
  await say(page, 'chi guida stanotte');
  const ask = await page.evaluate(() => [...document.querySelectorAll('.toast .toast-act')].map(b => b.textContent));
  check(ask.join() === 'Salva,No,Sempre', 'Chiedi ogni volta: a toast with Salva, No and Sempre', ask.join());
  if (shots) await page.screenshot({ path: path.join(shots, 'chiedi-neon.png'), clip: { x: 0, y: 600, width: 1300, height: 300 } });
  const cmd = await page.evaluate(() => { const s = globalThis.codingMiskRadio.steering; return s && s.commands.some(c => c.kind === 'say-live' && c.text === 'chi guida stanotte'); });
  check(cmd, 'the asked line plays whatever the answer (a say-live command)');
  await sleep(10500);
  check(!(await toastText(page)) && !(await items(page)).some(p => p.text === 'chi guida stanotte'), 'no answer in 10 s: not saved, the toast gone');
  const late = await page.$('#radio-steer [data-sv-keep]');
  check(!!late, 'the console keeps a save button on the typed line');
  if (late) { await late.click(); await sleep(300); }
  check((await items(page)).some(p => p.text === 'chi guida stanotte'), 'the late save keeps it');
  // Sempre switches the policy to Salva sempre
  await say(page, 'nessuno dorme qui');
  await page.evaluate(() => [...document.querySelectorAll('.toast .toast-act')].find(b => b.textContent === 'Sempre').click()); await sleep(200);
  const pol = await page.evaluate(() => globalThis.codingMiskPhrases.phr.settings.save);
  check(pol === 'always' && (await items(page)).some(p => p.text === 'nessuno dorme qui'), 'Sempre saves and switches to Salva sempre', pol);
  await setPolicy(page, 'never');
  await say(page, 'mai salvata');
  check(!(await items(page)).some(p => p.text === 'mai salvata') && !/nelle tue frasi/.test(await toastText(page)), 'Non salvare mai: nothing saved, no toast asks');
  // the session recipe records the snapshot of the collection (Ogni tanto by default)
  const rec = await page.evaluate(() => globalThis.codingMiskRadio.state.recipe.mine);
  check(rec === undefined || rec === null || (rec.share === 0.25 && Array.isArray(rec.list)), 'a new session records the snapshot only when not Mai', JSON.stringify(rec || null).slice(0, 80));
  await tap(page, '#stop').catch(() => {}); await sleep(300);
  await page.unroute('**/voice/say');

  // ---------- 2. Compose phrase list: the edit's Undo removes the phrase too ----------
  await fresh(page);
  await tap(page, '[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', 'prova-voce-notte'); await sleep(1500);
  await page.evaluate(() => document.querySelectorAll('#live-voices details[data-vfold="compose-spoken-phrases"]').forEach(d => { d.open = true; }));
  await sleep(300);
  const input = await page.$('#live-vinst [data-pl-text]');
  if (input) { await input.fill('il vento parla piano'); await input.press('Enter'); await input.evaluate(el => el.blur()).catch(() => {}); await sleep(500); }
  list = await items(page);
  check(input && list.some(p => p.text === 'il vento parla piano' && p.kind === 'voice' && p.source === 'compose'), 'Compose phrase list: an edited line is saved as kind voice', JSON.stringify(list));
  const ct = await toastText(page);
  check(/Salvata nelle tue frasi/.test(ct), 'one toast for the edit and the save', ct);
  await tap(page, '.toast .toast-act').catch(() => {}); await sleep(400);
  check(!(await items(page)).some(p => p.text === 'il vento parla piano'), 'the edit\'s Undo removes the phrase it created');

  // ---------- 3. the Voci tab ----------
  await openTab(page, 'mine');
  check(await page.isVisible('[data-ph-q]') && await page.isVisible('[data-ph-share="sometimes"][aria-checked="true"]'), 'Le mie frasi: search, Quanto usarle on Ogni tanto');
  await tap(page, '[data-ph-new]'); await sleep(200);
  await page.fill('[data-ph-f="text"]', 'fermi tutti');
  await page.selectOption('[data-ph-f="kind"]', 'explain'); await sleep(200);
  await page.selectOption('[data-ph-f="tag"]', 'breakdown');
  const groups = await page.$$eval('[data-ph-f="tag"] optgroup', g => g.map(x => x.label));
  check(groups.length === 3, 'the moments in three groups', groups.join());
  await shot(page, 'editor-neon');
  await tap(page, '[data-ph-save]'); await sleep(400);
  list = await items(page);
  const fermi = list.find(p => p.text === 'fermi tutti');
  check(fermi && fermi.kind === 'explain' && fermi.tag === 'breakdown' && fermi.source === 'tab', 'Nuova frase: kind explain, moment breakdown (spec: new narrator phrase)', JSON.stringify(fermi));
  // its sample is made by the real helper
  const made = await until(() => fs.existsSync(path.join(SAMPLES, 'say_it', 'fermi_tutti.wav')), 15000);
  check(made, 'its sample is made (say_it/fermi_tutti.wav)');
  // edit: the tag, then the text
  await tap(page, `[data-ph-edit="${fermi.id}"]`); await sleep(200);
  await page.selectOption('[data-ph-f="tag"]', 'drop'); await tap(page, '[data-ph-save]'); await sleep(300);
  check((await items(page)).find(p => p.id === fermi.id).tag === 'drop', 'Modifica: the moment changed');
  // copy a vocabulary entry: kind voice, tag night, source copy (spec: copy)
  await tap(page, '[data-vt-sub="vocab"]'); await sleep(300);
  await tap(page, '[data-vt-group="voice-night"]'); await sleep(200);
  const idx = await page.$$eval('.vt-row .ph-text', r => r.findIndex(x => x.textContent === "l'ultimo treno"));
  await tap(page, `[data-vt-copy="${idx}"]`); await sleep(300);
  const copied = (await items(page)).find(p => p.text === "l'ultimo treno");
  check(copied && copied.kind === 'voice' && copied.tag === 'night' && copied.source === 'copy', 'Copia nelle mie frasi: kind voice, tag night, source copy', JSON.stringify(copied));
  await shot(page, 'vocab-neon');
  // delete the copy: its file is built-in and stays
  await tap(page, '[data-vt-sub="mine"]'); await sleep(300);
  await tap(page, `[data-ph-del="${copied.id}"]`); await sleep(1500);
  const askDel = await page.textContent('.ph-confirm');
  check(/0 file/.test(askDel), 'deleting a copy of a vocabulary entry deletes no file (spec: shared file)', askDel.trim().slice(0, 90));
  await tap(page, '[data-ph-confirm-yes]'); await sleep(800);
  check(fs.existsSync(path.join(SAMPLES, 'say_it_reed', 'l_ultimo_treno.wav')) && !(await items(page)).some(p => p.id === copied.id), 'the phrase goes, the built-in sample stays');
  // delete "fermi tutti": its own file goes, Undo brings the phrase back
  await tap(page, `[data-ph-del="${fermi.id}"]`); await sleep(1500);
  check(/1 file/.test(await page.textContent('.ph-confirm')), 'the confirmation counts its own file');
  await tap(page, '[data-ph-confirm-yes]'); await sleep(1200);
  check(!fs.existsSync(path.join(SAMPLES, 'say_it', 'fermi_tutti.wav')), 'its sample is deleted');
  await tap(page, '.toast .toast-act'); await sleep(400);
  check((await items(page)).some(p => p.id === fermi.id), 'Annulla brings the phrase back (its sample comes with the next preparation)');
  await until(() => fs.existsSync(path.join(SAMPLES, 'say_it', 'fermi_tutti.wav')), 15000);

  // ---------- 4. voices and the test bench ----------
  await tap(page, '[data-vt-sub="voices"]'); await sleep(2500);
  const cards = await page.$$eval('.vt-speaker', c => c.length);
  check(cards === 9, 'Voci e suoni: the default voice and eight speakers', String(cards));
  await page.fill('[data-vt-bench="text"]', 'prova del banco notturno'); await tap(page, '[data-vt-bench-hear]'); await sleep(2500);
  const ledger = (() => { try { return JSON.parse(fs.readFileSync(path.join(SAMPLES, 'say_temp.json'), 'utf8')); } catch (e) { return {}; } })();
  check(!!ledger['say_it/prova_del_banco_notturno.wav'], 'the test bench line is a temporary sample', Object.keys(ledger).join());
  await shot(page, 'voices-neon');

  // ---------- 5. a delete during playback: the code follows the new manifest ----------
  // an orphan sorted first in say_it shifts every index; cleaning it while a song plays must leave the code right
  const orphan = path.join(SAMPLES, 'say_it', 'aaa_orphan_check.wav');
  fs.copyFileSync(path.join(SAMPLES, 'say_it', 'fermi_tutti.wav'), orphan);
  await tap(page, '[data-mode="ascolta"]'); await tap(page, '[data-tab="componi"]'); await sleep(300);
  await page.selectOption('#track-pick', 'luci-rosse'); await sleep(1500);
  if (await page.$eval('#live-toggle', el => el.getAttribute('aria-pressed')) !== 'true') { await tap(page, '#live-toggle'); await sleep(600); }
  await page.$eval('#live-profile [data-profile="classic"]', el => el.click()).catch(() => {}); await sleep(600);
  await page.evaluate(() => globalThis.codingMiskPhrases.reload()); await sleep(800);
  await tap(page, '#play'); await sleep(2500);
  await openTab(page, 'samples');
  await tap(page, '[data-vt-orphans]'); await sleep(800);
  const olist = await page.textContent('.vt-orphans');
  check(/aaa_orphan_check/.test(olist) && fs.existsSync(orphan), 'Pulisci gli orfani lists first and deletes nothing yet (spec: cleanup)');
  await shot(page, 'samples-orphans-neon');
  await tap(page, '[data-vt-orphans-yes]'); await sleep(2500);
  check(!fs.existsSync(orphan), 'after the confirmation the orphan is gone');
  const ok = await page.evaluate(() => {
    const code = globalThis.codingMiskPhrases.code(), man = globalThis.codingMiskPhrases.manifest(), out = [];
    const re = /\/\/ "([^"]+)", spoken on bar \d+\n[^\n]*s\("(say_[a-z_]+)"\)\.n\((\d+)\)/g;
    let m; while ((m = re.exec(code))) out.push({ text: m[1], bank: m[2], n: +m[3], file: decodeURI((man[m[2]] || [])[+m[3]] || '') });
    return out;
  });
  check(ok.every(x => x.file.endsWith(`/${slug(x.text)}.wav`)), 'from the next bar the code uses the sample numbers of the new manifest (spec: delete during playback)', ok.slice(0, 2).map(x => `${x.text}→${x.file}`).join(', ') || 'no narrator line in the code now');
  await tap(page, '#stop').catch(() => {}); await sleep(300);

  // ---------- 6. Settings card, English, themes, 400 px ----------
  await tap(page, '#open-settings'); await sleep(600);
  check(await page.isVisible('#set-phrases [data-ph-set-save="always"][aria-pressed="true"]') || await page.isVisible('#set-phrases'), 'Settings: the Voci e frasi card');
  await page.$eval('#set-phrases [data-ph-set-share="always"]', el => el.click()); await sleep(200);
  check(await page.evaluate(() => globalThis.codingMiskPhrases.phr.settings.share) === 'always', 'Settings: Sempre (five levels)');
  await shot(page, 'settings-neon', '#set-phrases');
  for (const ui of ['neon', 'hw', 'light']) {
    for (const w of [1300, 400]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.evaluate(u => { localStorage.setItem('coding-misk-ui', JSON.stringify(u)); localStorage.setItem('coding-misk-ui-follow', 'false'); }, ui);
      await page.reload(); await sleep(2500);
      await openTab(page, 'mine');
      const sx = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
      check(sx, `${ui} ${w} px: no sideways scroll`);
      if (w === 400) {
        const first = await page.evaluate(() => { const r = document.querySelector('.ph-item'); if (!r) return true; const a = r.querySelector('.ph-acts').getBoundingClientRect(), m = r.querySelector('.ph-main').getBoundingClientRect(); return Math.abs(a.top - m.top) < 12; });
        check(first, `${ui} 400 px: the row's actions on its first line`);
      }
      const sfx = `${ui}-${w}`;
      await shot(page, `mine-${sfx}`);
      if (shots) {
        await tap(page, '[data-ph-new]'); await sleep(200); await shot(page, `editor-${sfx}`); await tap(page, '[data-ph-cancel]'); await sleep(150);
        for (const s of ['vocab', 'voices', 'samples']) { await tap(page, `[data-vt-sub="${s}"]`); await sleep(s === 'vocab' ? 300 : 2000); await shot(page, `${s}-${sfx}`); }
        await tap(page, '#open-settings'); await sleep(500); await shot(page, `settings-${sfx}`, '#set-phrases');
        // the Chiedi notice
        await page.evaluate(() => { globalThis.codingMiskPhrases.phr.setSettings({ save: 'ask' }); globalThis.codingMiskPhrases.phr.offer({ text: 'la notte non finisce', lang: 'it', kind: 'voice', tag: 'night', styles: [], source: 'radio' }); });
        await sleep(200);
        const box = await page.$('.toast'); if (box) await box.screenshot({ path: path.join(shots, `chiedi-${sfx}.png`) });
        await page.evaluate(() => globalThis.codingMiskPhrases.phr.setSettings({ save: 'always' }));
      }
      if (ui === 'hw' && w === 400) {
        await openTab(page, 'samples');
        const lcd = await page.evaluate(() => { const el = document.querySelector('.vt-lcd'); return el ? getComputedStyle(el).fontFamily : ''; });
        check(/VT323/.test(lcd), 'hardware: the space is an LCD', lcd);
      }
    }
  }
  await page.setViewportSize({ width: 1300, height: 900 });
  // English
  await page.evaluate(() => localStorage.setItem('coding-misk-lang', 'en')); await page.reload(); await sleep(2500);
  await openTab(page, 'mine');
  const en = await page.$$eval('[data-vt-sub]', b => b.map(x => x.textContent).join(','));
  check(en === 'My phrases,Built-in vocabularies,Voices and sounds,Samples', 'English section names', en);
  check(!errors.length, 'no page errors', errors.slice(0, 3).join(' | '));
  await browser.close();
  console.log(failed ? `\n${failed} failed` : '\nall passed');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
