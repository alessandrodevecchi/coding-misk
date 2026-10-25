import { defineConfig } from 'vite';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';

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
  plugins: [customSamples(), growthHashModule()],
  server: { port: 5173, open: true },
  // the fast export's hidden render page (#8); the live output's broadcast window and control room (#52)
  build: { rollupOptions: { input: { main: 'index.html', render: 'render.html', broadcast: 'broadcast.html', live: 'live.html' } } },
});
