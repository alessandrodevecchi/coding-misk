import { defineConfig } from 'vite';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { canSpeak, makeSampleAsync, writeLengths, wavSeconds, MAX_WORDS, sampleUsage, deleteSamples, keepTemp, sweepTemp, readTemp, systemVoice } from './tools/voice-sample.mjs';

// Campioni personalizzati: ogni cartella in public/samples/ diventa un suono (voce/01.wav → s("voce").n(0)),
// ogni file sciolto diventa un suono col suo nome. L'elenco per Strudel si genera da solo.
const SAMPLES_DIR = join(process.cwd(), 'public', 'samples');
const AUDIO = /\.(wav|mp3|ogg|flac|m4a|aac)$/i;
const clean = n => n.replace(/[^\w-]/g, '_');
function samplesManifest() {
  const out = { _base: '/samples/' };
  if (!existsSync(SAMPLES_DIR)) return out;
  for (const name of readdirSync(SAMPLES_DIR).sort()) {
    const p = join(SAMPLES_DIR, name);
    if (statSync(p).isDirectory()) {
      const files = readdirSync(p).filter(f => AUDIO.test(f)).sort();
      if (files.length) out[clean(name)] = files.map(f => encodeURI(`${name}/${f}`));
    } else if (AUDIO.test(name)) out[clean(name.replace(AUDIO, ''))] = [encodeURI(name)];
  }
  return out;
}
const customSamples = () => ({
  name: 'coding-misk-samples',
  configureServer(server) {
    server.middlewares.use('/samples/strudel.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(samplesManifest()));
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'samples/strudel.json', source: JSON.stringify(samplesManifest()) });
  },
});

// The voice helper (voice-full-controls D8), dev server only: the sample of a new or edited line, made on request with
// the same per-line function as `npm run voices` (tools/voice-sample.mjs). GET /voice/status says whether it works
// here (macOS `say` and ffmpeg); POST /voice/say { text, lang, speaker } makes public/samples/say_<lang>[_<speaker>]/
// <slug>.wav, adds its length to say_lengths.json and answers { bank, n, seconds }. One request at a time (a queue);
// at most 12 words; only from this machine. The samples folder is not a module, so a new file reloads no page.
const SPEAKER_IDS = ['', 'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley'];
const voiceHelper = () => ({
  name: 'coding-misk-voice',
  apply: 'serve',
  configureServer(server) {
    let ok = null, queue = Promise.resolve();
    const local = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
    const send = (res, code, body) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(body)); };
    // my-phrases (D6, D8): sample housekeeping. GET /voice/usage: every say_* bank with its files and sizes, and the
    // temporary samples; POST /voice/delete { files, protect }: deletes the named samples, never a protected language and
    // slug; POST /voice/keep { playing, add, files, protect }: the songs playing now (their temporary samples are not
    // swept), new temporary samples, samples saved later or protected (they leave the ledger). The sweep of expired
    // temporary samples runs at start and every hour; `sweep` in /voice/status counts the sweeps that deleted something,
    // so the page reads the manifest again. Every change goes through the same queue as /voice/say.
    let sweeps = 0;
    const playing = new Map();
    const playingNow = () => { const now = Date.now(); return [...playing].filter(([, at]) => now - at < 10 * 60 * 1000).map(([k]) => k); };
    const sweep = () => { queue = queue.then(() => { try { if (sweepTemp(SAMPLES_DIR, playingNow()).length) sweeps++; } catch (e) { /* the next sweep tries again */ } }); };
    sweep();
    const hourly = setInterval(sweep, 60 * 60 * 1000);
    if (server.httpServer) server.httpServer.on('close', () => clearInterval(hourly));
    const body = (req, res, fn) => {
      if (!local(req)) return send(res, 403, { error: 'local only' });
      if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
      let raw = '';
      req.on('data', c => { raw += c; if (raw.length > 2e6) req.destroy(); });
      req.on('end', () => { let b = null; try { b = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'json' }); } fn(b || {}); });
    };
    const list = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);
    server.middlewares.use('/voice/usage', (req, res) => {
      if (!local(req)) return send(res, 403, { error: 'local only' });
      try { if (ok === null) ok = canSpeak(); const voices = ok ? Object.fromEntries(['it', 'en'].map(l => [l, Object.fromEntries(SPEAKER_IDS.map(sp => [sp, systemVoice(l, sp)]))])) : null; send(res, 200, { banks: sampleUsage(SAMPLES_DIR), temp: readTemp(SAMPLES_DIR), playing: playingNow(), voices }); } catch (e) { send(res, 500, { error: String(e && e.message || e).slice(0, 200) }); }
    });
    server.middlewares.use('/voice/delete', (req, res) => body(req, res, b => {
      queue = queue.then(() => { try { send(res, 200, deleteSamples(SAMPLES_DIR, list(b.files), list(b.protect))); } catch (e) { send(res, 500, { error: String(e && e.message || e).slice(0, 200) }); } });
    }));
    server.middlewares.use('/voice/keep', (req, res) => body(req, res, b => {
      const now = Date.now();
      for (const k of list(b.playing)) playing.set(k.slice(0, 80), now);
      queue = queue.then(() => {
        try { const t = keepTemp(SAMPLES_DIR, { add: Array.isArray(b.add) ? b.add : [], files: list(b.files), protect: list(b.protect) }); send(res, 200, { temp: t }); } catch (e) { send(res, 500, { error: String(e && e.message || e).slice(0, 200) }); }
      });
    }));
    server.middlewares.use('/voice/status', (req, res) => { if (!local(req)) return send(res, 403, { ok: false }); if (ok === null) ok = canSpeak(); send(res, 200, { ok, sweep: sweeps }); });
    server.middlewares.use('/voice/say', (req, res) => {
      if (!local(req)) return send(res, 403, { error: 'local only' });
      if (req.method !== 'POST') return send(res, 405, { error: 'POST' });
      let raw = '';
      req.on('data', c => { raw += c; if (raw.length > 4000) req.destroy(); });
      req.on('end', () => {
        let b = null;
        try { b = JSON.parse(raw); } catch (e) { return send(res, 400, { error: 'json' }); }
        const text = typeof b.text === 'string' ? b.text.trim().replace(/\s+/g, ' ') : '', lang = b.lang, speaker = typeof b.speaker === 'string' ? b.speaker : '';
        if (!text || text.length > 160 || text.split(' ').length > MAX_WORDS) return send(res, 400, { error: 'text' });
        if (!['en', 'it'].includes(lang) || !SPEAKER_IDS.includes(speaker)) return send(res, 400, { error: 'voice' });
        if (ok === null) ok = canSpeak();
        if (!ok) return send(res, 503, { error: 'no generator' });
        const t0 = Date.now();
        queue = queue.then(async () => {
          try {
            const r = await makeSampleAsync(text, lang, speaker, { root: SAMPLES_DIR });
            if (!r) return send(res, 404, { error: 'speaker not installed' });
            writeLengths(SAMPLES_DIR, [r.file]);
            const files = readdirSync(join(SAMPLES_DIR, r.bank)).filter(f => AUDIO.test(f)).sort();
            send(res, 200, { bank: r.bank, n: files.indexOf(r.file.split(sep).pop()), seconds: wavSeconds(r.file), made: r.made, ms: Date.now() - t0 });
          } catch (e) { send(res, 500, { error: String(e && e.message || e).slice(0, 200) }); }
        });
      });
    });
  },
});

// The growth hash (growth-in-background D6): a hash of the code a growth depends on, for the growths stored in the
// browser (src/live/growth-store.js). The page imports it from `virtual:growth-hash`; in dev, a change in one of
// these folders makes it again, so a code change never serves an old growth (the page reloads with the new hash).
const GROWTH_DIRS = ['src/song', 'src/live', 'src/endless', 'styles'];
function growthHash() {
  const h = createHash('sha256'), walk = d => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d).sort()) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else { h.update(relative(process.cwd(), p).split(sep).join('/')); h.update('\0'); h.update(readFileSync(p)); h.update('\0'); }
    }
  };
  for (const d of GROWTH_DIRS) walk(join(process.cwd(), d));
  return h.digest('hex').slice(0, 16);
}
const growthHashModule = () => {
  const ID = 'virtual:growth-hash', RID = '\0' + ID;
  let hash = null;
  return {
    name: 'coding-misk-growth-hash',
    resolveId: id => (id === ID ? RID : null),
    load(id) { if (id !== RID) return null; if (!hash) hash = growthHash(); return `export default ${JSON.stringify(hash)};`; },
    configureServer(server) {
      const dirs = GROWTH_DIRS.map(d => join(process.cwd(), d) + sep);
      const onChange = file => {
        if (!dirs.some(d => file.startsWith(d))) return;
        hash = null;
        const mod = server.moduleGraph.getModuleById(RID);
        if (mod) server.moduleGraph.invalidateModule(mod);
      };
      server.watcher.on('change', onChange); server.watcher.on('add', onChange); server.watcher.on('unlink', onChange);
    },
  };
};

export default defineConfig({
  plugins: [customSamples(), growthHashModule(), voiceHelper()],
  server: { port: 5173, open: true },
  // the fast export's hidden render page (#8); the live output's broadcast window and control room (#52)
  build: { rollupOptions: { input: { main: 'index.html', render: 'render.html', broadcast: 'broadcast.html', live: 'live.html' } } },
});
