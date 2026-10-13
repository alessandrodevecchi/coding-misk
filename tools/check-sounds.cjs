// Checks every sound the app can call (#54): every zone of every General MIDI soundfont font, and every sample of every
// sample bank in the app's sound map, fetched and decoded in the browser. A broken part is "covered" when the sound
// guard has a stand-in for it: another font of the instrument whose zone holds the same notes, or another sample of the
// bank that decodes. Long (thousands of files) but unattended.
// Usage: PLAYWRIGHT_CORE=... node tools/check-sounds.cjs [--fonts] [--samples] [--only <prefix>] [--limit <n>] [--out <file.json>] [--url <app url>] [--banks a,b] [--width <parallel fetches>]
//   (dev server on :5173; without --fonts or --samples both). Exit 1 when a broken part has no stand-in.
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const fs = require('node:fs');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : null; };
const wantFonts = args.includes('--fonts') || !args.includes('--samples'), wantSamples = args.includes('--samples') || !args.includes('--fonts');
const only = opt('only') || '', limit = Number(opt('limit')) || Infinity, out = opt('out'), url = opt('url') || 'http://localhost:5173/', banks = (opt('banks') || '').split(',').filter(Boolean), width = Number(opt('width')) || 8;
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', m => { if (m.text().startsWith('[check-sounds]')) process.stderr.write(m.text() + '\n'); });
  await page.goto(url);
  let n = 0;
  for (let i = 0; i < 40 && n < 1500; i++) { await sleep(1000); n = await page.evaluate(() => Object.keys((globalThis.soundMap && globalThis.soundMap.get()) || {}).length); }
  const report = await page.evaluate(async ({ wantFonts, wantSamples, only, limit, pick, width }) => {
    const map = globalThis.soundMap.get();
    const decode = async ab => {
      const ac = new OfflineAudioContext(1, 1, 44100);
      return Promise.race([ac.decodeAudioData(ab).then(b => (b && b.length ? true : 'empty'), e => `decode: ${e && e.name}`), new Promise(r => setTimeout(() => r('timeout'), 10000))]);
    };
    const pool = async (items, fn, width = 8) => { const q = items.slice(); await Promise.all(Array.from({ length: width }, async () => { while (q.length) await fn(q.shift()); })); };
    const out = { fonts: [], samples: [], counts: { instruments: 0, fonts: 0, zones: 0, banks: 0, files: 0 } };
    let done = 0;
    const tick = what => { if (++done % 200 === 0) console.log(`[check-sounds] ${done} ${what}`); };
    if (wantFonts) {
      const entries = Object.entries(map).filter(([k, s]) => s.data && s.data.type === 'soundfont' && k.startsWith(only)).slice(0, limit);
      out.counts.instruments = entries.length;
      for (const [name, s] of entries) {
        const fonts = s.data.fonts, per = [];
        await pool(fonts.map((font, index) => ({ font, index })), async ({ font, index }) => {
          out.counts.fonts++;
          let zones;
          try { const txt = await (await fetch(`https://felixroos.github.io/webaudiofontdata/sound/${font}.js`)).text(); zones = (0, eval)('{' + txt.split('={')[1]); if (!Array.isArray(zones)) throw new Error('no zones'); }
          catch (e) { per.push({ index, font, whole: true, why: `font file: ${e.message.slice(0, 60)}` }); return; }
          const good = [];
          for (const z of zones) {
            out.counts.zones++; tick('zones');
            if (!z.file) continue;
            const bin = atob(z.file), ab = new ArrayBuffer(bin.length), v = new Uint8Array(ab);
            for (let i = 0; i < bin.length; i++) v[i] = bin.charCodeAt(i);
            const ok = await decode(ab);
            if (ok === true) good.push([z.keyRangeLow, z.keyRangeHigh]);
            else per.push({ index, font, low: z.keyRangeLow, high: z.keyRangeHigh, bytes: bin.length, why: ok });
          }
          per.push({ index, good });
        }, 4);
        const goods = per.filter(x => x.good), bad = per.filter(x => !x.good);
        for (const b of bad) {
          // covered: another font holds every note of the broken range (the whole keyboard for a broken font)
          const lo = b.whole ? 0 : b.low, hi = b.whole ? 127 : b.high;
          const by = goods.filter(g => g.index !== b.index).find(g => { for (let k = lo; k <= hi; k++) if (!g.good.some(([a, z]) => a <= k && z + 1 >= k)) return false; return true; });
          out.fonts.push({ name, ...b, standIn: by ? by.index : null });
        }
      }
    }
    if (wantSamples) {
      const banks = Object.entries(map).filter(([k, s]) => s.data && s.data.type === 'sample' && k.startsWith(only) && (!pick.length || pick.includes(k))).slice(0, limit);
      out.counts.banks = banks.length;
      for (const [name, s] of banks) {
        const list = Array.isArray(s.data.samples) ? s.data.samples : Object.values(s.data.samples || {}).flat();
        const bad = [];
        let ok = 0;
        await pool(list.map((url, index) => ({ url, index })), async ({ url, index }) => {
          out.counts.files++; tick('samples');
          let r;
          try { const res = await fetch(url); r = res.ok ? await decode(await res.arrayBuffer()) : `http ${res.status}`; } catch (e) { r = `network: ${e.message}`; }
          if (r === true) ok++; else bad.push({ index, url, why: r });
        }, width);
        for (const b of bad) out.samples.push({ name, ...b, standIn: ok > 0 && Array.isArray(s.data.samples) ? 'another sample of the bank' : null });
      }
    }
    return out;
  }, { wantFonts, wantSamples, only, limit: Number.isFinite(limit) ? limit : 1e9, pick: banks, width });
  await browser.close();
  const c = report.counts;
  const uncovered = [...report.fonts, ...report.samples].filter(x => x.standIn === null && !/^network/.test(x.why || ''));
  for (const f of report.fonts) console.log(`font   ${f.name} #${f.index} ${f.whole ? 'whole font' : `keys ${f.low}-${f.high}`}: ${f.why} → ${f.standIn === null ? 'NO STAND-IN' : `font ${f.standIn}`}`);
  for (const s of report.samples) console.log(`sample ${s.name}:${s.index} ${s.why} → ${s.standIn || 'NO STAND-IN'}`);
  console.log(`${c.instruments} instruments, ${c.fonts} fonts, ${c.zones} zones; ${c.banks} banks, ${c.files} samples; ${report.fonts.length + report.samples.length} broken, ${uncovered.length} without a stand-in`);
  if (out) fs.writeFileSync(out, JSON.stringify(report, null, 1));
  process.exit(uncovered.length ? 1 : 0);
})();
