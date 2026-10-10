import { createSession } from '/Users/Alessandro.Vecchi/webdev/projects/coding-misk/src/endless/director.js';
import { songCurves, densityMax } from '/Users/Alessandro.Vecchi/webdev/projects/coding-misk/src/endless/steering.js';
import { loadStyles } from '/Users/Alessandro.Vecchi/webdev/projects/coding-misk/tools/styles-dir.mjs';
import { withDefaults } from '/Users/Alessandro.Vecchi/webdev/projects/coding-misk/src/endless/recipe.js';
import fs from 'node:fs';
const S = loadStyles().map(withDefaults);
const WHICH = process.argv[2] || '1';
let ses, g;
if (WHICH === '1') for (let k = 0; k < 60; k++) { ses = createSession(S, 'nostromo-' + k); g = ses.next({ styles: ['darksynth', 'industrial'], energy: 0.75, complexity: 0.8, chaos: 0.5 }); const r = g.plan.plan.map(d => d.role); if (r.includes('drop') && r.includes('break') && g.song.tracks.length >= 7 && r.length >= 9) break; }
else for (let k = 0; k < 80; k++) { ses = createSession(S, 'lantern-' + k); g = ses.next({ styles: ['jazz', 'lo-fi'], energy: 0.35, complexity: 0.4, chaos: 0.6 }); const r = g.plan.plan.map(d => d.role); if (new Set(r).size >= 3 && !r.includes('drop') && r.length >= 7) break; }
const C = songCurves(g.song, g.plan, g.opts);
const out = {
  seed: ses.seed, title: g.song.title, key: g.entry.key, bpm: g.entry.bpm, meter: g.entry.meter, shape: g.entry.shape, bars: g.plan.bars, phrase: g.plan.phrase,
  styles: g.entry.styles, parts: g.entry.parts, opts: { chaos: g.opts.chaos, energy: g.opts.energy, complexity: g.opts.complexity, talk: g.opts.talk },
  roles: g.plan.plan.map(d => d.role), energy: g.plan.plan.map(d => d.target), max: densityMax(g.plan),
  density: C.map(c => c.measured.density), brightness: C.map(c => c.measured.brightness), tension: C.map(c => c.measured.tension), voice: C.map(c => c.measured.voice),
  tracks: g.song.tracks.filter(t => t.type !== 'voice').map(t => ({ id: t.id, type: t.type, name: t.name })),
  steps: g.song.build.map(s => ({ at: s.at, add: s.add, remove: s.remove, kind: s.add !== undefined ? 'add' : s.remove !== undefined ? 'remove' : s.set ? 'set' : s.pattern ? 'pattern' : s.rack ? 'rack' : 'other', say: s.say && s.say.en })),
  speaker: g.entry.voice,
};
fs.writeFileSync(`/private/tmp/claude-501/-Users-Alessandro-Vecchi-webdev-projects/242cecd1-8d8c-4538-99ed-8d8f8f6642e8/scratchpad/soul/song${WHICH}.json`, JSON.stringify(out));
console.log(out.title, out.key, out.bpm, out.roles.join(','), out.tracks.map(t=>t.type).join(','), out.steps.length);
