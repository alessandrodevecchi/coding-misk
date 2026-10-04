import { defineConfig } from 'vite';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

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

export default defineConfig({
  plugins: [customSamples()],
  server: { port: 5173, open: true },
});
