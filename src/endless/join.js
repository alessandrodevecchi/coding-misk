// Joins songs on one timeline of absolute bars: the radio's window (the song on air and the next one)
// and a whole session as one song, to play it in Compose as one live build. Track ids get the song number
// as prefix ("s2-bass"), sections and steps move by the bars before them, every comment is spoken by the
// voice track of its own song, and the transition planned between two songs (#23, transitions.js) is
// written where they meet.
import { FORMAT, VERSION } from '../song/format.js';
import { transitionParts, overlapOf, extraOf, layout } from './transitions.js';

const list = v => (Array.isArray(v) ? v : [v]);
const barsOf = song => song.sections.reduce((a, s) => a + s.bars, 0);

// the sections covering bars [from, to) of a song, cut at the edges
function slice(sections, from, to) {
  const out = [];
  let at = 0;
  for (const s of sections) {
    const a = Math.max(at, from), b = Math.min(at + s.bars, to);
    if (b > a) out.push({ ...s, bars: b - a });
    at += s.bars;
  }
  return out;
}

// items: [{ song, n, start, transition?, cut? }] in order, n = song number in the stream, start = its first bar.
// transition: from this song to the next (written only when the next song is in the items; cut: skipped).
// Bars before the first song are a silent section, so the window song's bar numbers equal the stream's
// and the scheduler never restarts. Track ids carry the song number ("s7-bass"), which does not change
// when the window moves.
export function windowSong(items) {
  const first = items[0], sections = [], tracks = [], build = [];
  const lead = first.start;
  // silent lead in sections of at most 256 bars (the longest section the format accepts)
  const s0 = first.song.sections[0];
  for (let left = lead, k = 1; left > 0; left -= 256, k++) sections.push({ name: `Before ${k}`, bars: Math.min(256, left), bpm: s0.bpm, key: s0.key, chords: s0.chords, meter: s0.meter });
  let expect = lead, into = null, crash = false;
  items.forEach((item, i) => {
    const { song, n, start } = item, next = items[i + 1];
    if (start !== expect) throw new Error(`song ${n} starts at bar ${start}, expected ${expect}`);
    const t = next && !item.cut ? item.transition : null;
    const A = barsOf(song), skip = overlapOf(into), cutEnd = A - overlapOf(t);
    const parts = t ? transitionParts(song, next.song, t) : { steps: [], tracks: [], tail: [], crash: false };
    const pre = `s${n}-`, ren = id => pre + id;
    // sections: the bars the song before did not cover, up to this song's own transition, then the transition's
    slice(song.sections, skip, cutEnd).forEach((s, k) => sections.push({ ...s, name: `${n} ${s.name}`, ...(k === 0 && crash ? { crash: true } : {}) }));
    parts.tail.forEach(s => sections.push({ ...s, name: `${n} ${s.name}` }));
    for (const tr of [...song.tracks, ...parts.tracks]) tracks.push({ ...tr, id: ren(tr.id), name: `${n} ${tr.name || tr.id}`, clips: (tr.clips || []).map(c => ({ ...c, start: c.start + start })) });
    const voice = song.tracks.find(tr => tr.type === 'voice');
    for (const s of [...(song.build || []), ...parts.steps]) {
      const step = { ...s, at: s.at + start };
      for (const k of ['add', 'remove']) if (s[k] !== undefined) step[k] = Array.isArray(s[k]) ? s[k].map(ren) : ren(s[k]);
      for (const k of ['set', 'pattern', 'rack', 'unrack']) if (s[k]) step[k] = { ...s[k], track: ren(s[k].track) };
      if (s.say && voice) step.voice = ren(s.voice || voice.id);
      build.push(step);
    }
    expect = start + A + extraOf(t) - overlapOf(t);
    into = t; crash = parts.crash;
  });
  build.sort((a, b) => a.at - b.at);
  return { format: FORMAT, version: VERSION, id: `radio-${first.n}`, title: first.song.title, sections, tracks, build };
}

// A whole session as one song, with the transitions the director planned.
export function joinSession(session, songs) {
  const items = songs.map((song, i) => ({ song, n: i + 1, bars: barsOf(song), transition: (session.songs[i] || {}).transition }));
  const starts = layout(items, 0);
  const joined = windowSong(items.map((x, i) => ({ ...x, start: starts[i] })));
  const first = songs[0];
  return {
    ...joined, id: first.id.replace(/-1$/, '-joined'),
    title: `Endless · ${songs.map(s => s.title).join(' / ')}`.slice(0, 120),
    style: { en: `Endless session ${session.seed}: ${songs.length} songs, ${list(session.options.styles).join(' + ')}`, it: `Sessione endless ${session.seed}: ${songs.length} brani, ${list(session.options.styles).join(' + ')}` },
    tags: { styles: [...new Set(songs.flatMap(s => (s.tags && s.tags.styles) || []))] }, origin: 'endless',
  };
}
