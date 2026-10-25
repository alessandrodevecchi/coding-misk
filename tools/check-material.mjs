// Checks for the material generator (material-generator, #71; docs/ENDLESS.md "Material"). No browser.
//   npm run check:material     run every check; exit 1 when any fails
// Rules, determinism, ranges, key: every generated part is an idea that passes the song validator and compiles.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { compose, KINDS, FAMILIES, SOUND_KINDS, SOUND_KIND_ALIASES, FM_RANGES, fmInRange, sharedRoots, modeProgression, SESSION_SOURCES } from '../src/material/index.js';
import { tonesOf, rootOf, modeSteps, chordsOf } from '../src/material/common.js';
import { spanOf } from '../src/material/melody.js';
import { miniEvents, expandIdea, unknownChords, parseMini } from '../src/song/ideas.js';
import { validateSong } from '../src/song/validate.js';
import { validateRecipe } from '../src/endless/recipe.js';
import { compileSong } from '../src/song/compile.js';
import { DEVICES, rackCode } from '../src/song/rack.js';
import { PROGS, BASS, ARPS, GROOVES, meterSteps } from '../src/music.js';
import { generateSession, createSession } from '../src/endless/director.js';
import { fitsTrack, userPool } from '../src/endless/material.js';
import { loadStyles } from './styles-dir.mjs';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const seeds = n => Array.from({ length: n }, (_, i) => `seed-${i}`);
const H = { key: 'A', mode: 'minor', chords: 'epica' };
const STYLE = { rules: ['polymeter', 'tail', 'call-response'] };
const types = { melody: 'hook', bass: 'bass', arp: 'arp', chords: 'pad', drums: 'drums' };

// a test song: one section of 4 bars in a meter, one track per generated part
export function materialSong(parts, { meter = '4/4', chords = 'epica', key = 'A', id = 'material-test', shared } = {}) {
  const song = {
    format: 'coding-misk/song', version: 2, id, title: 'Material test', tags: { free: ['test'] },
    sections: [{ name: 'Loop', bars: 4, bpm: 124, key, chords, meter }],
    tracks: parts.map((p, i) => ({ id: `${p.type}${i}`, type: p.type, settings: { ...(p.settings || {}) }, ...(p.rack && p.rack.length ? { rack: p.rack } : {}), patterns: { A: { idea: p.idea } }, clips: [{ section: 'Loop', pattern: 'A' }] })),
  };
  if (shared) song.shared = shared;
  return song;
}
// the numbers a mini-notation text plays in one cycle
const valuesAt = (text, cycle) => miniEvents(text, cycle).map(e => e.v);
const valueAt = (text, cycle, at) => { const ev = miniEvents(text, cycle).filter(e => e.b <= at + 1e-9 && e.e > at + 1e-9); return ev.length ? +ev[0].v : 0; };
// onsets of a part in a bar (16ths, x positions)
const onsetsOf = (type, idea, N = 16, cycle = 0) => [...expandIdea(idea, { type, N, chords: chordsOf(H), ch: {}, shared: {} }).steps].map((c, i) => (c === 'x' ? i : -1)).filter(i => i >= 0);

const CHECKS = {
  'determinism: same inputs give the same part, no Math.random in the generator'() {
    for (const kind of KINDS) for (const e of [0.2, 0.5, 0.9]) {
      const o = { seed: 'aurora', style: STYLE, harmony: H, energy: e };
      assert(same(compose(kind, o), compose(kind, o)), `${kind} at ${e} differs on a second run`);
    }
    for (const f of fs.readdirSync('src/material')) assert(!/Math\.random/.test(fs.readFileSync(`src/material/${f}`, 'utf8')), `src/material/${f} uses Math.random`);
  },
  'determinism: each kind has its own stream'() {
    const a = compose('melody', { seed: 'x', harmony: H }), b = compose('melody', { seed: 'x', harmony: H });
    compose('drums', { seed: 'x' });
    assert(same(a, b), 'composing drums changed the melody of the same seed');
  },
  'variety: 50 seeds give at least 45 different melodies'() {
    const out = {};
    for (const kind of KINDS) out[kind] = new Set(seeds(50).map(s => JSON.stringify(compose(kind, { seed: s, style: STYLE, harmony: H, energy: 0.6 })))).size;
    console.log(`      different parts over 50 seeds: ${KINDS.map(k => `${k} ${out[k]}`).join(', ')}`);
    assert(out.melody >= 45, `${out.melody} different melodies out of 50`);
  },
  'melodies: rules, notes are degrees, no random source'() {
    const seen = new Set();
    for (const s of seeds(80)) for (const e of [0.2, 0.5, 0.9]) for (const mode of ['minor', 'phrygian', 'chromatic']) {
      const p = compose('melody', { seed: s, style: STYLE, harmony: { ...H, mode }, energy: e }), d = p.idea.degrees;
      assert(!p.idea.random, `${s}: a random source`);
      // degrees and the progression are whole numbers
      for (const text of [d, p.idea.add].filter(Boolean)) for (let c = 0; c < 8; c++) assert(valuesAt(text, c).every(v => /^-?\d+$/.test(v)), `${s}: not whole degrees in ${text}`);
      const rule = p.why.find(w => /polymeter|tail|call and response/.test(w)) || '';
      seen.add(rule.split(' ')[0]);
      if (/^polymeter/.test(rule)) {
        const m = d.match(/^\{(.*)\}%(\d+)$/), n = m[1].split(' ').length;
        assert([5, 7].includes(n) && +m[2] % n !== 0, `${s}: polymeter ${d}`);
      } else if (rule === "tail A A A A'") {
        const bars = [0, 1, 2, 3].map(c => miniEvents(d, c));
        assert(same(bars[0], bars[1]) && same(bars[1], bars[2]), `${s}: tail does not repeat its cell: ${d}`);
        const a = bars[0], z = bars[3];
        assert(a.length === z.length && a.every((x, i) => x.b === z[i].b), `${s}: tail changes the rhythm: ${d}`);
        const diff = a.map((x, i) => x.v !== z[i].v);
        assert(diff.some(Boolean) && diff.slice(0, Math.max(0, a.length - 2)).every(x => !x), `${s}: tail changes more than the last notes: ${d}`);
      } else if (rule === 'call and response') {
        const B = miniEvents(d, 1);
        assert(B[B.length - 1].v === '0', `${s}: the answer does not end on degree 0: ${d}`);
      } else throw new Error(`${s}: no melody rule in ${p.why}`);
    }
    assert(['polymeter', 'tail', 'call'].every(r => seen.has(r)), `rules used: ${[...seen]}`);
  },
  'basslines: every note is a tone of its bar\'s chord'() {
    for (const prog of ['epica', 'notturna', 'tensione', 'lofi', 'frigio']) for (const s of seeds(40)) for (const e of [0.2, 0.5, 0.9]) {
      const h = { ...H, chords: prog }, p = compose('bass', { seed: s, harmony: h, energy: e }), chords = PROGS[prog][1];
      chords.forEach((c, bar) => {
        for (const at of onsetsOf('bass', p.idea)) {
          const semi = rootOf(c) + (typeof p.idea.add === 'string' ? valueAt(p.idea.add, bar, at / 16) : 0);
          assert(tonesOf(c).includes(((semi % 12) + 12) % 12), `${prog} ${s}: bar ${bar} plays ${semi} on ${c} (${JSON.stringify(p.idea)})`);
        }
      });
    }
    // a shared progression: the bass reads it at least an octave down, every note the root of its bar's chord
    const h = { ...H, chords: 'epica' }, text = sharedRoots(h), p = compose('bass', { seed: 'sh', harmony: { ...h, shared: { roots: text }, useShared: true }, energy: 0.6 });
    assert(p.idea.from === 'roots' && p.idea.sub >= 7, `shared: ${JSON.stringify(p.idea)}`);
    PROGS.epica[1].forEach((c, bar) => {
      const d = valueAt(text, bar, 0), semi = 12 * Math.floor(d / 7) + modeSteps('minor')[((d % 7) + 7) % 7];
      assert(tonesOf(c).includes(((semi % 12) + 12) % 12), `shared: bar ${bar} degree ${d} on ${c}`);
    });
  },
  'arpeggios: indices are chord tones, random sources carry a seed and a loop'() {
    let random = 0;
    for (const s of seeds(120)) for (const e of [0.2, 0.5, 0.9]) {
      const p = compose('arp', { seed: s, energy: e }), i = p.idea;
      if (i.random) {
        random++;
        assert(Number.isInteger(i.random.seed) && Number.isInteger(i.random.cycles) && i.random.cycles >= 1 && i.random.max <= 4, `${s}: random ${JSON.stringify(i.random)}`);
      } else for (let c = 0; c < 6; c++) assert(valuesAt(i.index, c).every(v => /^[0-3]$/.test(v)), `${s}: index outside the four chord notes: ${i.index}`);
    }
    assert(random > 10, `only ${random} random arpeggios`);
  },
  'progressions: on the degrees of the mode, at most four chords a phrase'() {
    for (const mode of ['minor', 'phrygian', 'dorian', 'mixolydian']) for (const s of seeds(40)) {
      const p = compose('chords', { seed: s, style: { rules: ['mode'] }, harmony: { ...H, mode }, energy: 0.5 });
      const names = valuesAt(`[${p.idea.chords.replace(/^<|>$/g, '')}]`.replace(/!(\d+)/g, (m, n) => ''), 0);
      assert(!unknownChords(p.idea.chords).length, `${mode}: unknown chords ${p.idea.chords}`);
      const steps = modeSteps(mode);
      for (const n of names) assert(steps.includes(rootOf(n)), `${mode} ${s}: ${n} is not on a degree of A ${mode}`);
      assert(new Set(names).size >= 1 && new Set(names).size <= 4, `${mode}: ${p.idea.chords}`);
    }
    const ph = modeProgression({ int: () => 2, shuffle: a => a, next: () => 0 }, 'phrygian');
    assert(ph.names[0] === 'Am' && ph.different <= 4, `phrygian: ${ph.names}`);
  },
  'grooves: each family keeps its fixed hits over 50 seeds'() {
    const has = (beat, row, list) => list.every(x => String(beat[row] || '').split(',').map(Number).includes(x));
    const count = {};
    for (const f of FAMILIES) for (const s of seeds(50)) for (const e of [0.2, 0.5, 0.9]) {
      const { idea } = compose('drums', { seed: s, style: { families: [f] }, energy: e }), b = idea.beat;
      count[f] = (count[f] || 0) + 1;
      if (f === 'four-floor') assert(has(b, 'bd', [0, 4, 8, 12]), `${f} ${s}: ${JSON.stringify(b)}`);
      if (f === 'breakbeat') assert(has(b, 'sd', [4, 12]) && has(b, 'bd', [0]), `${f} ${s}: ${JSON.stringify(b)}`);
      if (f === 'two-step') assert(has(b, 'cp', [4, 12]) && !has(b, 'bd', [0, 4, 8, 12]), `${f} ${s}: ${JSON.stringify(b)}`);
      if (f === 'half-time') assert(has(b, 'sd', [8]) && has(b, 'bd', [0]), `${f} ${s}: ${JSON.stringify(b)}`);
      assert(b.grid === 16 && Object.keys(b).every(k => k === 'grid' || ['bd', 'cp', 'sd', 'hh', 'oh', 'rd'].includes(k)), `${f}: rows ${Object.keys(b)}`);
    }
  },
  'energy: more onsets and a range at least as wide from 0.2 to 0.9'() {
    for (const s of seeds(50)) {
      const lo = compose('melody', { seed: s, style: STYLE, harmony: H, energy: 0.2 }), hi = compose('melody', { seed: s, style: STYLE, harmony: H, energy: 0.9 });
      assert(hi.stats.onsets > lo.stats.onsets, `${s}: melody onsets ${lo.stats.onsets} then ${hi.stats.onsets}`);
      assert(spanOf(hi.idea.degrees) >= spanOf(lo.idea.degrees), `${s}: melody range ${spanOf(lo.idea.degrees)} then ${spanOf(hi.idea.degrees)}`);
      for (const kind of ['bass', 'arp']) {
        const a = compose(kind, { seed: s, harmony: H, energy: 0.2 }), b = compose(kind, { seed: s, harmony: H, energy: 0.9 });
        assert(b.stats.onsets > a.stats.onsets, `${s}: ${kind} onsets ${a.stats.onsets} then ${b.stats.onsets}`);
      }
      const d0 = compose('drums', { seed: s, energy: 0.2 }), d1 = compose('drums', { seed: s, energy: 0.9 });
      assert(d1.stats.hits > d0.stats.hits, `${s}: drum hits ${d0.stats.hits} then ${d1.stats.hits}`);
    }
  },
  'presets varied: keep the rhythm or keep the notes'() {
    for (const s of seeds(20)) {
      const r = compose('bass', { seed: s, type: 'bass', from: 'rolling', keep: 'rhythm' });
      assert(same(onsetsOf('bass', r.idea), onsetsOf('bass', BASS.rolling.idea)) && typeof r.idea.add === 'string', `rolling keep rhythm: ${JSON.stringify(r.idea)}`);
      const a = compose('arp', { seed: s, type: 'arp', from: 'pulsar', keep: 'rhythm' });
      assert(same(onsetsOf('arp', a.idea), onsetsOf('arp', ARPS.pulsar.idea)) && a.idea.index !== ARPS.pulsar.idea.index, `pulsar keep rhythm: ${JSON.stringify(a.idea)}`);
      const h = compose('melody', { seed: s, type: 'hook', from: 'neon', keep: 'notes' });
      const nums = t => (t.match(/-?\d+/g) || []).join();
      assert(nums(h.idea.degrees) === nums('<[0 ~ 0 2 ~ 4 ~ 7] [5 ~ 4 ~ 2 ~ 0 ~] [4 ~ 4 5 ~ 7 ~ 9] [7 ~ 5 ~ 4 2 ~ ~]>') && h.idea.degrees !== '<[0 ~ 0 2 ~ 4 ~ 7] [5 ~ 4 ~ 2 ~ 0 ~] [4 ~ 4 5 ~ 7 ~ 9] [7 ~ 5 ~ 4 2 ~ ~]>', `neon keep notes: ${h.idea.degrees}`);
    }
    assert(compose('bass', { seed: 's', type: 'bass', from: 'nope' }) === null, 'an unknown preset gives a part');
  },
  'songs: every kind in 4/4 and 7/8 is a valid idea and compiles'() {
    for (const meter of ['4/4', '7/8', '3/4']) for (const s of seeds(12)) {
      const parts = Object.entries(types).map(([kind, type]) => ({ type, idea: compose(kind, { seed: s, style: STYLE, harmony: H, meter, energy: [0.2, 0.5, 0.9][s.length % 3] }).idea }));
      parts.push({ type: 'guitar', idea: compose('chords', { seed: s, type: 'guitar', meter, energy: 0.8 }).idea });
      parts.push({ type: 'pad', idea: compose('chords', { seed: s, style: { rules: ['mode', 'sevenths'] }, harmony: { ...H, mode: 'phrygian' }, meter }).idea });
      for (const [type, from] of [['bass', 'rolling'], ['arp', 'pulsar'], ['hook', 'neon'], ['pad', 'stab'], ['guitar', 'thrash']]) for (const keep of ['rhythm', 'notes']) {
        const p = compose(type === 'hook' ? 'melody' : type === 'pad' || type === 'guitar' ? 'chords' : type, { seed: s, type, from, keep, meter });
        if (p) parts.push({ type, idea: p.idea });
      }
      const song = materialSong(parts, { meter });
      const { errors } = validateSong(song);
      assert(!errors.length, `${meter} ${s}: ${errors.slice(0, 3).map(e => `${e.path}: ${e.msg}`).join('; ')}`);
      const code = compileSong(song);
      assert(code.includes('$:') && !/undefined|NaN/.test(code), `${meter} ${s}: code ${code.slice(0, 200)}`);
      for (const tr of song.tracks) if (tr.type !== 'drums' && tr.patterns.A.idea.degrees) parseMini(tr.patterns.A.idea.degrees);
    }
  },
  'sounds: 100 FM patches stay in the range table, two operators at most'() {
    const kinds = new Set();
    for (const s of seeds(100)) for (const type of ['bass', 'arp', 'hook', 'pad']) {
      const p = compose('sound', { seed: s, type, energy: (s.length % 10) / 10 });
      kinds.add(p.why[0].split(' ')[1]);
      assert(['sawtooth', 'square', 'sine', 'triangle'].includes(p.settings.wave), `${s}: wave ${p.settings.wave}`);
      for (const d of p.rack) {
        assert(d.device === 'fm' && fmInRange(d), `${s} ${type}: out of range ${JSON.stringify(d)}`);
        if (type === 'hook' || type === 'arp') assert(d.index <= 4, `${s}: index ${d.index}`);
        const code = rackCode([d], type);
        assert(!/\.fm[3-8]|fmh[3-8]|fmi|feedback|fm1[0-9]|fm2[0-9]/.test(code.replace(/\.fm2\(|\.fmh2\(/g, '')), `${s}: a third operator or feedback: ${code}`);
      }
    }
    assert(SOUND_KINDS.every(k => kinds.has(k)), `sound kinds drawn: ${[...kinds]}`);
    assert(DEVICES.fm && DEVICES.fm.kind === 'sound', 'no fm device in the rack');
    // the rack menu offers the same ratios as the range table
    const choice = DEVICES.fm.args.find(a => a[0] === 'harmonicity')[3];
    assert(JSON.stringify(choice) === JSON.stringify(FM_RANGES.harmonicity), `rack ratios ${choice} differ from FM_RANGES ${FM_RANGES.harmonicity}`);
  },
  'sounds: the old kind saw plays reese, in a style and in a saved recipe (no saw kind left)'() {
    assert(!SOUND_KINDS.includes('saw') && SOUND_KIND_ALIASES.saw === 'reese', `kinds ${SOUND_KINDS}`);
    for (const s of seeds(20)) {
      const a = compose('sound', { seed: s, type: 'bass', style: { sounds: ['saw'] }, energy: 0.6 });
      const b = compose('sound', { seed: s, type: 'bass', style: { sounds: ['reese'] }, energy: 0.6 });
      assert(JSON.stringify(a) === JSON.stringify(b) && a.why[0].startsWith('sound reese'), `${s}: saw ${a.why[0]} differs from reese ${b.why[0]}`);
    }
    const old = JSON.parse(fs.readFileSync('styles/drum-and-bass.json', 'utf8'));
    old.bass.material = { ...(old.bass.material || {}), sounds: ['reese', 'saw'] };
    const v = validateRecipe(old);
    assert(!v.errors.length && v.warnings.some(w => /"saw" is now "reese"/.test(w.msg)), `old style with saw: ${JSON.stringify(v)}`);
  },
  'sounds: a reese always beats (its ratio is never exactly 1 or 0.5, #71)'() {
    let n = 0;
    for (const s of seeds(200)) {
      const p = compose('sound', { seed: s, type: 'bass', style: { sounds: ['reese'] }, energy: 0.6 });
      const h = p.rack[0] && p.rack[0].harmonicity;
      assert(p.rack.length === 1 && ![1, 0.5].includes(h) && (Math.abs(h - 1) < 0.021 || Math.abs(h - 0.5) < 0.011), `${s}: reese ratio ${h}`);
      n++;
    }
    assert(n === 200, `${n} reese patches`);
  },
  'material source: "patterns" applies no mutation and a replay matches'() {
    const recipes = loadStyles(), grooveRows = new Set(Object.values(GROOVES).flatMap(g => Object.values(g[1])));
    for (const id of ['berlin-techno', 'synthwave', 'jazz']) {
      const opts = { styles: [id], minutes: 12, seed: `src-${id}`, complexity: 1, material: 'patterns' };
      const a = generateSession(recipes, opts), b = generateSession(recipes, opts);
      assert(same(a, b), `${id}: replay differs`);
      assert(a.session.options.material === 'patterns', `${id}: material not stored with the session`);
      for (const sg of a.songs) for (const t of sg.tracks) for (const p of Object.values(t.patterns)) {
        assert(p.notes === undefined && p.idea === undefined, `${id} ${t.id}: patterns wrote ${JSON.stringify(p)}`);
        for (const r of Object.values(p.rows || {})) assert(grooveRows.has(r), `${id} ${t.id}: drum row ${r} is not a groove's`);
      }
      const c = generateSession(recipes, { ...opts, material: 'composed' });
      assert(c.songs.some(sg => sg.tracks.some(t => Object.values(t.patterns).some(p => p.idea))), `${id}: composed gave no generated part`);
    }
    assert(SESSION_SOURCES.join() === 'patterns,varied,composed,mix', 'session sources');
  },
  'guitar riffs on request (pattern-followups D3): riff true a riff every time, false power chords, left out unchanged'() {
    const H2 = { key: 'A', mode: 'minor', chords: 'epica' }, isRiff = o => o.why.includes('power chord riff');
    for (let i = 0; i < 40; i++) for (const e of [0, 0.3, 0.6, 0.9]) for (const meter of ['4/4', '7/8']) {
      const o = { seed: `riff-${i}`, type: 'guitar', energy: e, harmony: H2, meter };
      const yes = compose('chords', { ...o, riff: true }), no = compose('chords', { ...o, riff: false });
      assert(isRiff(yes) && yes.idea.per === 'slot' && /x/.test(yes.idea.rhythm) && /[1-9]/.test(yes.idea.add), `riff-${i} at ${e} ${meter}: ${yes.why}`);
      assert(!isRiff(no) && !no.idea.add, `riff-${i} at ${e}: power chords only, got ${no.why}`);
      const v = validateSong(materialSong([{ type: 'guitar', idea: yes.idea }], { meter }));
      assert(!v.errors.length, `riff-${i}: ${JSON.stringify(v.errors[0])}`);
    }
    // left out: the same parts as before the option existed (digest of 240 parts, written when riff came in)
    const outs = [];
    for (let i = 0; i < 60; i++) for (const e of [0, 0.3, 0.6, 0.9]) outs.push(compose('chords', { seed: 'g' + i, type: 'guitar', energy: e, harmony: H2 }));
    const digest = crypto.createHash('sha1').update(JSON.stringify(outs)).digest('hex').slice(0, 16);
    assert(digest === '0e5085fdaf8046d5' && outs.filter(o => o.why.includes('power chord riff')).length === 62, `guitar parts without riff moved: ${digest}`);
  },
  "user patterns: drawn only where they fit"() {
    const riff = { id: 'p-1', name: 'Riff', type: 'guitar', kind: 'chords', styles: ['melodic-metal'], pattern: { idea: { rhythm: 'x*8' } }, context: { key: 'E', mode: 'phrygian' } };
    const any = { id: 'p-2', name: 'Line', type: 'bass', kind: 'bass', styles: ['any'], pattern: { idea: { rhythm: '[~ x]*4' } }, context: { key: 'A' } };
    assert(!fitsTrack(riff, { type: 'guitar', styles: ['ambient'] }) && fitsTrack(riff, { type: 'guitar', styles: ['melodic-metal'] }), 'riff fit');
    assert(!fitsTrack(riff, { type: 'bass', styles: ['melodic-metal'] }) && fitsTrack(any, { type: 'bass', styles: ['ambient'] }), 'kind and any style');
    const recipes = loadStyles();
    for (const sg of generateSession(recipes, { styles: ['ambient'], minutes: 30, seed: 'user', complexity: 0.6, userPatterns: [riff, any] }).songs)
      for (const t of sg.tracks) for (const p of Object.values(t.patterns)) assert(!same(p, riff.pattern), `${sg.id}: the metal riff was drawn in ambient`);
    const used = generateSession(recipes, { styles: ['melodic-metal'], minutes: 30, seed: 'user', complexity: 0.6, userPatterns: [riff] }).songs.filter(sg => sg.tracks.some(t => Object.values(t.patterns).some(p => same(p, riff.pattern)))).length;
    assert(used > 0, 'the riff is never drawn in its own style');
    assert(userPool([riff, any], { type: 'bass', styles: ['ambient'] }).length === 1, 'pool');
  },
};

if (process.argv[1] && process.argv[1].endsWith('check-material.mjs')) {
  let failed = 0;
  const t0 = Date.now();
  for (const [name, fn] of Object.entries(CHECKS)) {
    try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); }
  }
  console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  process.exit(failed ? 1 : 0);
}
