// Checks for the song soul data (#46): same song, same soul; radio souls follow the director; every built-in song
// gives a soul the views can draw; steering changes the soul. No browser.
//   npm run check:soul      exit 1 when any check fails
import fs from 'node:fs';
import { soulData, soulCurves, defaultView, trackOn, VIEWS, seedHash, eventAt } from '../src/soul/data.js';
import { createSession } from '../src/endless/director.js';
import { steerSong } from '../src/endless/steering.js';
import { withDefaults } from '../src/endless/recipe.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const recipes = loadStyles().map(withDefaults);
const radioSong = (seed = 'soul-check', styles = ['darksynth', 'industrial']) => {
  const g = createSession(recipes, seed).next({ styles, energy: 0.7, complexity: 0.6, chaos: 0.4 });
  return { g, ctx: { plan: g.plan, entry: g.entry, opts: g.opts, seed, n: 0 } };
};
const songFiles = JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(id => JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8')));
const drawable = D => {
  const C = soulCurves(D), n = D.roles.length;
  assert(n >= 2, `${D.title}: at least two parts`);
  for (const [k, v] of Object.entries(C)) assert(v.length === n && v.every(x => Number.isFinite(x) && x >= 0 && x <= 1.0001), `${D.title}: curve ${k} in 0..1 for every part`);
  assert(D.bars > 0 && D.bpm > 0 && /^[0-9A-F]{8}$/.test(D.hex), `${D.title}: bars, tempo, signature`);
  assert(D.tracks.length > 0 && D.steps.every(s => Number.isFinite(s.at)), `${D.title}: tracks and steps`);
  assert(VIEWS.includes(defaultView(D)), `${D.title}: a default view`);
};

const CHECKS = {
  'same song, same soul'() {
    const { g, ctx } = radioSong();
    assert(JSON.stringify(soulData(g.song, ctx)) === JSON.stringify(soulData(g.song, ctx)), 'radio song');
    for (const s of songFiles) assert(JSON.stringify(soulData(s)) === JSON.stringify(soulData(s)), s.id);
    assert(seedHash('nostromo-6') === seedHash('nostromo-6') && seedHash('a') !== seedHash('b'), 'seed hash');
    const h = seedHash('x'), e = t => JSON.stringify(eventAt(h, t, 7, 3, 1, 0.9));
    assert(e(12.5) === e(12.5), 'seeded events');
  },
  'radio souls follow the director'() {
    const { g, ctx } = radioSong();
    const D = soulData(g.song, ctx);
    assert(D.roles.join() === g.plan.plan.map(d => d.role).join(), 'parts are the plan\'s double phrases');
    assert(D.energy.join() === g.plan.plan.map(d => d.target).join(), 'energy is the plan\'s targets');
    assert(D.key === g.entry.key && D.bpm === g.entry.bpm && D.bars === g.plan.bars, 'key, tempo, bars');
    drawable(D);
  },
  'the v3 reference song gives the same curves'() {
    const ref = JSON.parse(fs.readFileSync('docs/soul/v3/song1.json', 'utf8'));
    const g = createSession(recipes, ref.seed).next({ styles: ref.styles, energy: ref.opts.energy, complexity: ref.opts.complexity, chaos: ref.opts.chaos });
    const D = soulData(g.song, { plan: g.plan, entry: g.entry, opts: g.opts });
    for (const k of ['energy', 'density', 'brightness', 'tension']) assert(D[k].map(x => x.toFixed(3)).join() === ref[k].map(x => x.toFixed(3)).join(), k);
  },
  'every built-in song has a soul the views can draw'() {
    for (const s of songFiles) drawable(soulData(s));
  },
  'tracks come in and out with the steps'() {
    const { g, ctx } = radioSong();
    const D = soulData(g.song, ctx), added = D.steps.find(s => s.at > 0 && s.add !== undefined);
    if (added) { const id = [].concat(added.add)[0]; assert(!trackOn(D, id, added.at - 0.5) && trackOn(D, id, added.at), 'a track added at a bar plays from there'); }
  },
  'steering changes the soul'() {
    const { g, ctx } = radioSong();
    const before = soulData(g.song, ctx);
    const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [{ kind: 'curve', curve: 'tension', d: 2, value: 0.95, at: 0 }], seed: 'soul-check', n: 0 });
    const after = soulData(r.song, { ...ctx, plan: r.plan, opts: r.opts });
    assert(after.tension[2] !== before.tension[2] && Math.abs(after.tension[2] - 0.95) < 0.01, `set tension shows (${before.tension[2]} -> ${after.tension[2]})`);
    assert(after.seed === before.seed && after.hex === before.hex, 'same signature');
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
