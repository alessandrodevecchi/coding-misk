// Recap of generated endless sessions, to listen with notes at hand and decide what to fine tune.
//   node --no-warnings tools/endless-recap.mjs [dir] [--lang it|en] [--out file]
// Reads every session.json under dir (default songs/endless) and its song files; writes Markdown
// (default <dir>/RECAP.md): per song the styles of each part, length, tempo, key, shape, sections,
// tracks with their presets and sounds, moves and comments, target and measured energy.
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const dir = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--'))) || path.join('songs', 'endless');
const lang = opt('lang', 'it'), out = opt('out', path.join(dir, 'RECAP.md'));
const L = {
  it: { title: 'Riepilogo sessioni endless', session: 'Sessione', seed: 'seme', styles: 'stili', chaos: 'caos', energy: 'energia', complexity: 'complessità', songs: 'brani', open: 'Nell\'app: scheda Brani, cerca', parts: 'Stile per parte', length: 'Durata', shape: 'curva', sections: 'Sezioni', chords: 'accordi', tracks: 'Tracce', voice: 'Voce', moves: 'Mosse', comments: 'commenti', target: 'Energia: bersaglio medio', measured: 'misurata media', peak: 'picco', variants: 'varianti', mutated: 'mutata', notes: 'Note di ascolto', joined: 'Tutta la sessione in un brano' },
  en: { title: 'Endless sessions recap', session: 'Session', seed: 'seed', styles: 'styles', chaos: 'chaos', energy: 'energy', complexity: 'complexity', songs: 'songs', open: 'In the app: Songs tab, look for', parts: 'Style per part', length: 'Length', shape: 'shape', sections: 'Sections', chords: 'chords', tracks: 'Tracks', voice: 'Voice', moves: 'Moves', comments: 'comments', target: 'Energy: average target', measured: 'average measured', peak: 'peak', variants: 'variants', mutated: 'mutated', notes: 'Listening notes', joined: 'Whole session as one song' },
}[lang];
const sessions = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name === 'session.json') sessions.push(p); } };
walk(dir);
if (!sessions.length) { console.error(`no session.json under ${dir}; run npm run endless first`); process.exit(1); }

const mmss = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
// one short description of a track: its pattern names and sounds
function trackLine(t) {
  const s = t.settings || {}, pats = Object.entries(t.patterns || {});
  const what = p => p.rows ? Object.keys(p.rows).join('+') : [p.preset, p.rhythm, p.speed && `${p.speed}`].filter(Boolean).join(' ');
  const vars = pats.map(([k, p]) => `${k} ${what(p)}${p.notes || (p.rows && k !== 'A' && pats[0] && what(p) === what(pats[0][1])) ? ` (${L.mutated})` : ''}`).join(', ');
  const sound = { drums: s.kit, guitar: s.type, texture: s.sample }[t.type] || s.wave || '';
  const extra = [s.mode && `mode ${s.mode}`, Number.isFinite(s.cutoff) && t.type !== 'drums' && `cutoff ${s.cutoff}`, s.drive ? `drive ${s.drive}` : ''].filter(Boolean).join(', ');
  return `- **${t.name || t.id}** (${t.type}${sound ? `, ${sound}` : ''}${extra ? `, ${extra}` : ''}): ${vars}`;
}

const md = [`# ${L.title}`, ''];
for (const file of sessions.sort()) {
  const sd = path.dirname(file), ses = JSON.parse(fs.readFileSync(file, 'utf8')), o = ses.options;
  md.push(`## ${L.session} \`${ses.seed}\``, '', `${L.styles}: ${o.styles.join(', ')} · ${L.chaos} ${o.chaos} · ${L.energy} ${o.energy} · ${L.complexity} ${o.complexity} · ${ses.songs.length} ${L.songs} · ${mmss(ses.seconds)}`, '');
  const joined = (ses.files || []).find(f => f.endsWith('-joined.json'));
  if (joined) md.push(`${L.joined}: \`${joined.replace(/\.json$/, '')}\``, '');
  ses.songs.forEach((e, i) => {
    const song = JSON.parse(fs.readFileSync(path.join(sd, `${e.id}.json`), 'utf8'));
    const parts = Object.entries(e.parts).filter(([k]) => k !== 'dominant').map(([k, v]) => `${k} ${v}`).join(' · ');
    const chords = [...new Set(song.sections.map(s => s.chords))].join(', ');
    const kinds = {};
    for (const p of e.phrases) for (const m of p.moves) { const k = m.split(' ')[0]; kinds[k] = (kinds[k] || 0) + 1; }
    const said = e.phrases.filter(p => p.say).length;
    const voice = song.tracks.find(t => t.type === 'voice');
    md.push(`### ${i + 1}. ${e.title}`, '');
    md.push(`${L.open} \`${e.id}\``, '');
    md.push(`- ${L.parts}: ${parts}`);
    md.push(`- ${L.length} ${mmss(e.seconds)} · ${e.bpm} BPM · ${e.key} ${e.meter} · ${L.shape} ${e.shape} · ${L.chords} ${chords}`);
    md.push(`- ${L.sections}: ${song.sections.map(s => `${s.name} ${s.bars}`).join(' · ')}`);
    md.push(`- ${L.target} ${avg(e.phrases.map(p => p.target)).toFixed(2)}, ${L.measured} ${avg(e.phrases.map(p => p.energy)).toFixed(2)}, ${L.peak} ${Math.max(...e.phrases.map(p => p.energy)).toFixed(2)}`);
    md.push(`- ${L.moves}: ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')} · ${said} ${L.comments}`);
    if (voice) { const v = voice.settings, c = e.voice && e.voice.character; md.push(`- ${L.voice}: ${v.speaker || 'default'}${c ? ` (${c})` : ''} · pitch ${v.pitch}, tempo ${v.tempo}, drive ${v.drive}, room ${v.room}, delay ${v.delay}, hpf ${v.hpf}, cutoff ${v.cutoff}`); }
    md.push('', `${L.tracks}:`, '', ...song.tracks.filter(t => t.type !== 'voice').map(trackLine), '', `${L.notes}:`, '', '- ', '');
  });
}
fs.writeFileSync(out, md.join('\n'));
console.log(`wrote ${out} (${sessions.length} sessions)`);
