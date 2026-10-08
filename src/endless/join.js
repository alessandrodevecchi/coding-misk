// Joins the songs of a session into one song, to play the whole session in Compose as one live build.
// Track ids get the song number as prefix ("s2-bass"), sections and steps move by the bars before them,
// and every comment is spoken by the voice track of its own song.
import { FORMAT, VERSION } from '../song/format.js';

const list = v => (Array.isArray(v) ? v : [v]);

export function joinSession(session, songs) {
  const sections = [], tracks = [], build = [];
  let offset = 0;
  songs.forEach((song, i) => {
    const pre = `s${i + 1}-`, ren = id => pre + id;
    const bars = song.sections.reduce((a, s) => a + s.bars, 0);
    song.sections.forEach(s => sections.push({ ...s, name: `${i + 1} ${s.name}` }));
    for (const t of song.tracks) {
      tracks.push({ ...t, id: ren(t.id), name: `${i + 1} ${t.name || t.id}`, clips: (t.clips || []).map(c => ({ ...c, start: c.start + offset })) });
    }
    const voice = song.tracks.find(t => t.type === 'voice');
    for (const s of song.build || []) {
      const step = { ...s, at: s.at + offset };
      for (const k of ['add', 'remove']) if (s[k] !== undefined) step[k] = Array.isArray(s[k]) ? s[k].map(ren) : ren(s[k]);
      for (const k of ['set', 'pattern', 'rack', 'unrack']) if (s[k]) step[k] = { ...s[k], track: ren(s[k].track) };
      if (s.say && voice) step.voice = ren(s.voice || voice.id);
      build.push(step);
    }
    offset += bars;
  });
  const first = songs[0];
  return {
    format: FORMAT, version: VERSION, id: first.id.replace(/-1$/, '-joined'),
    title: `Endless · ${songs.map(s => s.title).join(' / ')}`.slice(0, 120),
    style: { en: `Endless session ${session.seed}: ${songs.length} songs, ${list(session.options.styles).join(' + ')}`, it: `Sessione endless ${session.seed}: ${songs.length} brani, ${list(session.options.styles).join(' + ')}` },
    tags: { styles: [...new Set(songs.flatMap(s => (s.tags && s.tags.styles) || []))] }, origin: 'endless',
    sections, tracks, build,
  };
}

// The radio's window: the song on air and the next one on one timeline of absolute bars.
// items: [{ song, n, start }] in order, n = song number in the stream, start = its first bar on the stream.
// Bars before the first song are a silent section, so the window song's bar numbers equal the stream's
// and the scheduler never restarts. Track ids carry the song number ("s7-bass"), which does not change
// when the window moves, so the code of a song stays the same while it is on air.
export function windowSong(items) {
  const first = items[0], sections = [], tracks = [], build = [];
  const lead = first.start;
  // silent lead in sections of at most 256 bars (the longest section the format accepts)
  const s0 = first.song.sections[0];
  for (let left = lead, k = 1; left > 0; left -= 256, k++) sections.push({ name: `Before ${k}`, bars: Math.min(256, left), bpm: s0.bpm, key: s0.key, chords: s0.chords, meter: s0.meter });
  let expect = lead;
  for (const { song, n, start } of items) {
    if (start !== expect) throw new Error(`song ${n} starts at bar ${start}, expected ${expect}`);
    const pre = `s${n}-`, ren = id => pre + id;
    song.sections.forEach(s => sections.push({ ...s, name: `${n} ${s.name}` }));
    for (const t of song.tracks) tracks.push({ ...t, id: ren(t.id), name: `${n} ${t.name || t.id}`, clips: (t.clips || []).map(c => ({ ...c, start: c.start + start })) });
    const voice = song.tracks.find(t => t.type === 'voice');
    for (const s of song.build || []) {
      const step = { ...s, at: s.at + start };
      for (const k of ['add', 'remove']) if (s[k] !== undefined) step[k] = Array.isArray(s[k]) ? s[k].map(ren) : ren(s[k]);
      for (const k of ['set', 'pattern', 'rack', 'unrack']) if (s[k]) step[k] = { ...s[k], track: ren(s[k].track) };
      if (s.say && voice) step.voice = ren(s.voice || voice.id);
      build.push(step);
    }
    expect = start + song.sections.reduce((a, s) => a + s.bars, 0);
  }
  return { format: FORMAT, version: VERSION, id: `radio-${first.n}`, title: first.song.title, sections, tracks, build };
}
