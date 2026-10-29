// The "Widget notes" measure (code-widgets 7.4, D15): how opaque the notes of a pianoroll would be, per instrument, in
// the built-in songs. Strudel's pianoroll draws a note at velocity × gain. It draws from the line's own pattern (before
// the hidden mixer), so "drawn" reads the haps of the code shown alone; "heard" reads them after the mixer, as they play.
// No browser.   node --no-warnings tools/widget-notes.mjs [song,song…] [--bars 4]
import fs from 'node:fs';
import { crescendoSong } from '../src/song/crescendo.js';
import { resolveProfile, growthRules } from '../src/live/profiles.js';
import { liveCode } from '../src/live/live-code.js';
import { buildSteps, deriveBuild } from '../src/song/build.js';
import { useFns } from '../src/song/writer.js';
import { chainLines } from '../src/song/typing.js';
import { instrumentOf } from '../src/live/widgets.js';
import { strudelInNode } from './mixer-checks.mjs';

const args = process.argv.slice(2), arg = args.find(a => !a.startsWith('--') && !/^\d+$/.test(a));
const BARS = +(args[args.indexOf('--bars') + 1] || 4) || 4;
const STYLES = Object.fromEntries(fs.readdirSync('styles').filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(`styles/${f}`, 'utf8'))).map(r => [r.id, r]));
const ids = arg ? arg.split(',') : JSON.parse(fs.readFileSync('songs/index.json', 'utf8')).map(x => (typeof x === 'string' ? x : x.id));
const S = await strudelInNode();
const NOTE_WIDGETS = ['hats', 'lead', 'arp', 'pad', 'bass', 'drums'];
const data = {};
const add = (profile, kind, inst, v) => { const k = `${profile}|${kind}|${inst}`; (data[k] ||= []).push(v); };

for (const id of ids) {
  const song = JSON.parse(fs.readFileSync(`songs/${id}.json`, 'utf8'));
  if (!Array.isArray(song.sections)) continue;
  for (const profile of ['classic', 'switch']) {
    const C = resolveProfile(profile);
    let b;
    try { b = C.build === 'crescendo' ? crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles: STYLES }) }) : { ...song, build: song.build || deriveBuild(song) }; } catch (e) { continue; }
    const L = liveCode(b, C, { cols: () => 80 }), total = L.build.sections.reduce((a, x) => a + x.bars, 0);
    // a bar in the middle of the song, after its last step there
    const mid = Math.floor(total / 2), at = [0, ...buildSteps(L.build).map(x => x.at)].filter(x => x <= mid).pop() || 0;
    const shown = L.codeAt(at);
    // the shown code's pattern lines and their ranges
    const ranges = []; let pos = 0;
    for (const l of chainLines(shown)) { if (/^\s*[_S]?\$:/.test(l)) ranges.push({ a: pos, b: pos + l.length, l }); pos += l.length + 1; }
    const lineOf = h => { for (const x of (h.context && h.context.locations) || []) { const r = ranges.find(r => x.start >= r.a && x.start < r.b); if (r) return r; } return null; };
    globalThis.miskBuses = L.buses; useFns(L.fns);
    let full, alone;
    try { full = await S.evaluate(L.run ? L.run(shown) : shown); alone = await S.evaluate(shown); } catch (e) { continue; }
    const instOf = new Map();
    for (const h of full.queryArc(mid, mid + BARS).filter(h => h.hasOnset())) {
      const r = lineOf(h), v = h.value || {};
      if (!r) continue;
      const inst = /say_/.test(r.l) ? 'voice' : instrumentOf(`.analyze("${v.analyze}")`) || 'lead';
      instOf.set(r, inst);
      add(profile, 'heard', inst, (v.velocity ?? 1) * (v.gain ?? 1));
    }
    for (const h of alone.queryArc(mid, mid + BARS).filter(h => h.hasOnset())) {
      const r = lineOf(h), v = h.value || {};
      if (!r || !instOf.has(r)) continue;
      add(profile, 'drawn', instOf.get(r), (v.velocity ?? 1) * (v.gain ?? 1));
    }
  }
}
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
console.log(`notes of ${ids.length} songs, ${BARS} bars from the middle of each; opacity = velocity × gain (1 = full)\n`);
console.log('profile   what   instrument  notes  median  p10    under 0.35');
for (const profile of ['classic', 'switch']) for (const kind of ['drawn', 'heard']) for (const inst of NOTE_WIDGETS) {
  const a = data[`${profile}|${kind}|${inst}`];
  if (!a || !a.length) continue;
  const low = a.filter(v => v < 0.35).length / a.length;
  console.log(`${profile.padEnd(9)} ${kind.padEnd(6)} ${inst.padEnd(11)} ${String(a.length).padStart(5)}  ${q(a, .5).toFixed(2).padStart(6)}  ${q(a, .1).toFixed(2).padStart(5)}  ${(low * 100).toFixed(0).padStart(5)}%`);
}
