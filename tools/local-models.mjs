// Local only (decode round 14, d12h): the learned beat tracker's model files kept once on this machine and served by
// the dev server, so every port and worktree starts with "Deep beat analysis" on and its files already there, without a
// download per origin. The files live in ~/.cache/coding-misk/models/ (CODING_MISK_MODELS_DIR overrides), named as
// their pins in src/decode/beat-this.js. Only the git-excluded vite.local.config.mjs adds this plugin:
//   import { localModels } from './tools/local-models.mjs';
//   export default { ...base, plugins: [...base.plugins, localModels()] };
// It runs with the dev server only (never in a build): it defines VITE_DECODE_BEAT_TRACKER 'on' and
// VITE_DECODE_BEAT_LOCAL (the path below), and answers that path with the pinned files only, to this machine only. The
// page copies them into its origin's cache after checking their SHA-256 (seedBeatThisLocal in beat-this-store.js).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BEAT_THIS_FILES } from '../src/decode/beat-this.js';

export const LOCAL_MODELS_PATH = '/__local-models/';
export const LOCAL_MODELS_DIR = process.env.CODING_MISK_MODELS_DIR || path.join(os.homedir(), '.cache', 'coding-misk', 'models');

export function localModels({ dir = LOCAL_MODELS_DIR, beatTracker = 'on' } = {}) {
  const names = new Set(Object.values(BEAT_THIS_FILES).map(f => f.name));
  const local = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
  return {
    name: 'coding-misk-local-models',
    apply: 'serve',
    config: () => ({ define: { 'import.meta.env.VITE_DECODE_BEAT_TRACKER': JSON.stringify(beatTracker), 'import.meta.env.VITE_DECODE_BEAT_LOCAL': JSON.stringify(LOCAL_MODELS_PATH) } }),
    configureServer(server) {
      server.middlewares.use(LOCAL_MODELS_PATH, (req, res) => {
        let name = '';
        try { name = decodeURIComponent((req.url || '').split('?')[0].replace(/^\/+/, '')); } catch (e) { /* bad escape */ }
        const p = path.join(dir, name);
        if (!local(req) || !names.has(name) || !fs.existsSync(p)) { res.statusCode = 404; return res.end(); }
        res.setHeader('content-type', 'application/octet-stream');
        res.setHeader('content-length', String(fs.statSync(p).size));
        res.setHeader('cache-control', 'no-store');
        fs.createReadStream(p).pipe(res);
      });
    },
  };
}
