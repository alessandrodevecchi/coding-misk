// Does movement help Decode's held notes? (sound-modulation D9, task 3.4, #95; bench only, nothing in src/decode/
// changes). For each file, level B decodes it as Open in Compose writes it, the app fast-exports the decoded song, and the
// envelope error (tools/decode-hits.mjs envelopeError: how each band moves inside the beat) and the band error are
// measured against the original. Then the same decoded song with a movement device on its chords track:
//   modulated songs (.cache/decode/mod/, tools/decode-export.cjs --mod): the true device of the song's pad (an oracle:
//     what a perfect measure of step 3 could give), and the still take against the original (the error's scale);
//   real tracks (--real <dir>, ids real-01… in file name order, as tools/decode-stems.cjs numbers them): a Pump
//     (depth 0.6) and a filter LFO (1/2 bar, depth 0.4) on the decoded chords, each measured against the decoded song
//     without it. Their numbers are printed by id only.
// --listen <dir>: MP3s of the decoded song without and with each device for the files given with --ids (under notes/).
// --phase (with --mod): how much the device's phase and depth matter on the decoded chords: the true device shifted by
//   half a period (written into the chords' code: a Pump's dip and the gate with phaseoffset 0.5, the filter LFO's sine
//   with its depth negated, the tremolo with tremolophase 0.5, the Sweep's ramp 4 bars later) and the true device at
//   half depth (a Sweep: half its range in octaves around the same centre). A Pump with a kick ducks on the decoded kick,
//   so its shift is the kickless dip, measured also in phase (`dip`).
// The analyses are cached in .cache/decode/modbench/models/, the renders in .cache/decode/modbench/render/.
// Usage: PLAYWRIGHT_CORE=... [PORT=5173] node tools/decode-mod-bench.cjs [--mod] [--real <dir>] [--ids real-14,real-17]
//          [--listen <dir>] [--json out]   (dev server on PORT; ffmpeg)
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), { execFileSync } = require('node:child_process');
const { exportSong, SET_DIRS } = require('./decode-export.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const ROOT = path.join(__dirname, '..'), CACHE = path.join(ROOT, '.cache', 'decode', 'modbench');
const AUDIO = /\.(wav|mp3|m4a|aac|flac|ogg|opus|webm|mp4|mov)$/i;
const r3 = x => (x === null || x === undefined || Number.isNaN(x) ? null : Math.round(x * 1000) / 1000);

// --phase: the decoded song with the true device shifted by half a period (shift), at half depth (half) and, for a Pump
// over a kick, the kickless dip in phase (dip). The shifted devices go into the chords' code (the pattern's code, before
// the rack: the same chain), with the base value the compiler would add (movement.js moveFor and applyMove).
function phaseVariants(song, rack, M) {
  const chords = song.tracks.find(t => t.id === 'chords');
  const kick = song.tracks.some(t => t.type === 'drums' && Object.values(t.patterns || {}).some(p => p.rows && /x/.test(p.rows.bd || '')));
  const others = rack.filter(d => !['pump', 'lfo', 'sweep', 'tremolo'].includes(d.device));
  const dev = rack.find(d => ['pump', 'lfo', 'sweep', 'tremolo'].includes(d.device));
  const a = { device: dev.device, ...Object.fromEntries(((M.MOVE_DEVICES[dev.device] || { args: [] }).args).map(([k, , def]) => [k, dev[k] ?? def])), ...dev };
  const r3 = v => Math.round(v * 1000) / 1000;
  // the chords with `suffix` appended to every pattern's code
  const withCode = suffix => ({ ...song, tracks: song.tracks.map(t => (t === chords ? { ...t, rack: [...(t.rack || []), ...others], patterns: Object.fromEntries(Object.entries(t.patterns).map(([k, p]) => [k, { ...p, code: `${String(p.code).trim().replace(/;\s*$/, '')}\n${suffix(String(p.code))}` }])) } : t)) });
  const gainOf = code => { const m = /\.gain\(\s*([\d.]+)\s*\)/.exec(code); return m ? +m[1] : 1; };
  const dip = (phase, depth = a.depth) => code => M.pumpDipCode({ ...a, depth }, gainOf(code)).replace(/ \}\)$/, phase ? `, phaseoffset: ${phase} })` : ' })');
  const out = {};
  if (a.device === 'pump') {
    if (kick) out.dip = withCode(dip(0));
    out.shift = withCode(dip(0.5));
  } else if (a.device === 'lfo') {
    // a sine half a period later is the same sine upside down
    out.shift = withCode(code => `${/\.lpf\(/.test(code) ? '' : '.lpf(18000)'}${M.lfoCode({ ...a, depth: -a.depth })}`);
  } else if (a.device === 'tremolo') {
    out.shift = withCode(() => `.tremolosync(${a.rate}).tremolodepth(${a.depth}).tremolophase(0.5)`);
  } else if (a.device === 'sweep') {
    // the ramp of the compiler's code for a clip at bar 0 (a code track is never a held pad), late by half its bars
    const clip = chords.clips[0];
    out.shift = withCode(() => M.sweepCode(a, { clipStart: a.bars / 2, clipBars: Math.max(clip.bars || 16, a.bars + 1), steps: 16, held: false }));
  }
  const half = a.device === 'sweep'
    ? (() => { const lo = Math.log(a.from), hi = Math.log(a.to), c = (lo + hi) / 2, w = (hi - lo) / 4; return { ...dev, from: Math.round(Math.exp(c - w)), to: Math.round(Math.exp(c + w)) }; })()
    : { ...dev, depth: r3(a.depth / 2) };
  out.half = { ...song, tracks: song.tracks.map(t => (t === chords ? { ...t, rack: [...(t.rack || []), ...rack.map(d => (d === dev ? half : d))] } : t)) };
  return out;
}

module.exports = { phaseVariants };
if (require.main === module) (async () => {
  const S = await import('./decode-similarity.mjs'), HD = await import('./decode-hits.mjs'), DS = await import('./decode-songs.mjs');
  const { analyseFull } = await import('../src/decode/full.js'), W = await import('../src/decode/writer.js');
  const { nodeEssentia } = await import('./essentia-node.mjs');
  const M = await import('../src/song/movement.js');
  for (const d of ['models', 'render']) fs.mkdirSync(path.join(CACHE, d), { recursive: true });
  const ids = opt('--ids') ? opt('--ids').split(',') : null;
  const files = [];
  if (args.includes('--mod')) for (const s of DS.MOD_SONGS) files.push({ id: s.id, file: path.join(SET_DIRS.mod, `${s.id}.wav`), still: path.join(SET_DIRS.mod, `${s.id}-still.wav`), song: s });
  if (opt('--real')) fs.readdirSync(opt('--real')).filter(f => AUDIO.test(f) && !f.startsWith('.')).sort().forEach((f, i) => files.push({ id: `real-${String(i + 1).padStart(2, '0')}`, file: path.join(opt('--real'), f) }));
  const list = files.filter(x => (!ids || ids.includes(x.id)) && fs.existsSync(x.file));

  async function model(x) {
    const st = fs.statSync(x.file), key = `${st.size}-${Math.round(st.mtimeMs)}`, f = path.join(CACHE, 'models', `${x.id}.json`);
    if (fs.existsSync(f)) { const c = JSON.parse(fs.readFileSync(f, 'utf8')); if (c.key === key) return c.m; }
    const m = await analyseFull(S.readAudio(x.file), { engine: nodeEssentia });
    fs.writeFileSync(f, JSON.stringify({ key, m }));
    return JSON.parse(JSON.stringify(m));
  }
  let browser = null, page = null;
  async function render(song) {
    const h = crypto.createHash('sha1').update(JSON.stringify(song)).digest('hex').slice(0, 16), wav = path.join(CACHE, 'render', `${h}.wav`);
    if (!fs.existsSync(wav)) {
      if (!page) {
        const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
        browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
        page = await (await browser.newContext({ viewport: { width: 1300, height: 900 }, acceptDownloads: true })).newPage();
        await page.goto(`http://localhost:${process.env.PORT || 5173}/`); await sleep(2500);
      }
      const part = `${wav}.part.wav`;
      try { await exportSong(page, song, part); } catch (e) { await exportSong(page, song, part); }
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', part, '-ac', '1', wav]); fs.unlinkSync(part);
    }
    return wav;
  }
  // a decoded song with devices on its chords track (the code track the writer names chords)
  const withRack = (song, rack) => ({ ...song, tracks: song.tracks.map(t => (t.id === 'chords' ? { ...t, rack: [...(t.rack || []), ...rack] } : t)) });
  const measure = (fo, wav, grid) => { const fc = S.features(S.readAudio(wav)), c = S.compare(fo, fc, grid); return { env: HD.envelopeError(fo, fc, grid), band: c.bandError, held: HD.density(fo, fc, grid).heldErr }; };
  const fmt = r => `env ${r.env.low}/${r.env.mid}/${r.env.high} (mean ${r.env.mean}) band ${r.band} held ${r.held}`;
  const rows = [];
  for (const x of list) {
    const m = await model(x), fo = S.features(S.readAudio(x.file));
    const song = W.writeFull(m, { id: `mod-${x.id}`, title: x.id }); delete song.config;
    const bars = song.sections.reduce((a, s) => a + s.bars, 0), grid = { bpm: m.bpm, downbeat: m.downbeat, barSeconds: m.barSeconds, bars };
    const chords = song.tracks.some(t => t.id === 'chords');
    const row = { id: x.id, chords, base: measure(fo, await render(song), grid) };
    if (x.song) {
      // the file against itself, the still take against the original (on the song's own grid), the oracle device
      const tg = { downbeat: 0, barSeconds: 240 / x.song.sections[0].bpm, bars: 16 };
      row.self = HD.envelopeError(fo, fo, tg);
      if (fs.existsSync(x.still)) row.still = HD.envelopeError(fo, S.features(S.readAudio(x.still)), tg);
      const truth = DS.modTruth(x.song).pad || [];
      const rack = x.song.tracks.find(t => t.id === 'pad').rack;
      if (chords) row.oracle = measure(fo, await render(withRack(song, rack)), grid);
      row.truth = truth;
      if (chords && args.includes('--phase')) {
        const V = phaseVariants(song, rack, M);
        for (const [k, sg] of Object.entries(V)) row[k] = measure(fo, await render(sg), grid);
        console.log(`${x.id.padEnd(16)} phase: ${Object.keys(V).map(k => `${k} ${fmt(row[k])}`).join(' · ')}`);
      }
      console.log(`${x.id.padEnd(16)} still ${row.still ? `${row.still.low}/${row.still.mid}/${row.still.high}` : '-'} · decoded ${fmt(row.base)}${row.oracle ? ` · + true device ${fmt(row.oracle)}` : ' · no chords written'}`);
    } else {
      if (chords) {
        row.pump = measure(fo, await render(withRack(song, [{ device: 'pump', depth: 0.6, recover: 0.15 }])), grid);
        row.lfo = measure(fo, await render(withRack(song, [{ device: 'lfo', target: 'filter', rate: 0.5, depth: 0.4 }])), grid);
      }
      console.log(`${x.id.padEnd(16)} decoded ${fmt(row.base)}${chords ? ` · + Pump ${fmt(row.pump)} · + LFO ${fmt(row.lfo)}` : ' · no chords written'}`);
    }
    if (opt('--listen') && (!ids || ids.includes(x.id)) && chords) {
      fs.mkdirSync(opt('--listen'), { recursive: true });
      const mp3 = (wav, name) => execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-b:a', '192k', path.join(opt('--listen'), `${x.id}-${name}.mp3`)]);
      mp3(await render(song), 'codice');
      if (x.song) mp3(await render(withRack(song, x.song.tracks.find(t => t.id === 'pad').rack)), 'codice-con-movimento');
      else { mp3(await render(withRack(song, [{ device: 'pump', depth: 0.6, recover: 0.15 }])), 'codice-pompa'); mp3(await render(withRack(song, [{ device: 'lfo', target: 'filter', rate: 0.5, depth: 0.4 }])), 'codice-oscillazione'); }
    }
    rows.push(row);
  }
  // the means: decoded against the decoded with a device
  const mean = (key, f) => { const v = rows.filter(r => r[key]).map(r => f(r[key])).filter(Number.isFinite); return v.length ? r3(v.reduce((a, b) => a + b, 0) / v.length) : null; };
  for (const k of ['base', 'oracle', 'pump', 'lfo', 'shift', 'half', 'dip']) if (rows.some(r => r[k])) console.log(`mean ${k.padEnd(7)} env ${mean(k, r => r.env.mean)} (mid ${mean(k, r => r.env.mid)}) band ${mean(k, r => r.band)} held ${mean(k, r => r.held)} over ${rows.filter(r => r[k]).length} files`);
  if (opt('--json')) fs.writeFileSync(opt('--json'), JSON.stringify(rows, null, 2));
  if (browser) await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
