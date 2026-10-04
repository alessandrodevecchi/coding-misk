export const f = n => String(Math.round(n * 100) / 100).replace(/^0\./, '.');

// ---------- dati musicali ----------
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const KEYS = [['F#', -3, 'Fa# minore'], ['G', -2, 'Sol minore'], ['A', 0, 'La minore'], ['B', 2, 'Si minore'], ['C', 3, 'Do minore'], ['D', 5, 'Re minore']];
export const CHORDS = {
  Am: { bass: 'a1', pad: 'a2,c3,e3', arp: ['a3', 'c4', 'e4', 'a4'] },
  F:  { bass: 'f1', pad: 'f2,a2,c3', arp: ['f3', 'a3', 'c4', 'f4'] },
  C:  { bass: 'c2', pad: 'g2,c3,e3', arp: ['g3', 'c4', 'e4', 'g4'] },
  G:  { bass: 'g1', pad: 'g2,b2,d3', arp: ['g3', 'b3', 'd4', 'g4'] },
  Dm: { bass: 'd2', pad: 'a2,d3,f3', arp: ['a3', 'd4', 'f4', 'a4'] },
  E:  { bass: 'e1', pad: 'g#2,b2,e3', arp: ['g#3', 'b3', 'e4', 'g#4'] },
  Em: { bass: 'e1', pad: 'g2,b2,e3', arp: ['g3', 'b3', 'e4', 'g4'] },
};
export const PROGS = {
  epica: ['Epica', ['Am', 'F', 'C', 'G']],
  notturna: ['Notturna', ['Am', 'Dm', 'F', 'E']],
  euforica: ['Euforica', ['F', 'G', 'Am', 'Am']],
  ipnotica: ['Ipnotica', ['Am', 'G', 'F', 'G']],
  malinconica: ['Malinconica', ['Am', 'Em', 'F', 'G']],
};
export const chordName = (c, t) => {
  const m = c.match(/^([A-G]#?)(m?)$/);
  return NOTE_NAMES[(NOTE_NAMES.indexOf(m[1]) + t + 12) % 12] + m[2];
};
export const WAVES = [['sawtooth', 'Sawtooth'], ['supersaw', 'Supersaw'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine']];
export const MOVES = [['fisso', 'Fisso'], ['lento', 'Respiro lento'], ['veloce', 'Respiro veloce']];
export const BASS = { rolling: ['Rolling', '[~ x x x]*4', .12, 0], offbeat: ['Offbeat', '[~ x]*4', .18, 0], galoppo: ['Galoppo', '[x ~ x x]*4', .1, 0], sub: ['Sub lungo', 'x', .6, .8] };
export const ARPS = { su: ['Su', [0, 1, 2, 3, 0, 1, 2, 3]], sugiu: ['Su e giù', [0, 1, 2, 3, 2, 1, 0, 1]], pulsar: ['Pulsar', [0, 3, 1, 3, 2, 3, 1, 3]], pedale: ['Pedale', [0, 3, 0, 2, 0, 1, 0, 2]], spezzato: ['Spezzato', [0, 2, 1, 3, 2, 0, 3, 1]] };
export const HOOKS = { richiamo: ['Richiamo', '0 ~ 0 2 ~ 4 ~ 2'], discesa: ['Discesa', '7 ~ 4 ~ 5 4 2 ~'], eco: ['Eco', '0 ~ ~ 4 ~ ~ 7 ~'], ostinato: ['Ostinato', '0 4 7 4 0 4 7 9'], domanda: ['Domanda e risposta', '<[0 2 4 ~ 4 ~ 2 ~] [4 5 7 ~ 9 ~ 7 ~]>'] };
export const KITS = ['RolandTR909', 'RolandTR808', 'RolandTR707', 'LinnDrum', 'AkaiLinn'];
export const ROWS = [['bd', 'Kick', 1], ['cp', 'Clap', .8], ['sd', 'Snare', .75], ['hh', 'Hat', .5], ['oh', 'Open', .45]];
export const GROOVES = {
  trance:   ['Trance', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '................', hh: '..x...x...x...x.', oh: '................' }],
  rolling:  ['Rolling hat', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '................', hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.' }],
  breakbeat:['Breakbeat', { bd: 'x.....x...x.....', cp: '................', sd: '....x.......x..x', hh: 'x.x.x.x.x.x.x.x.', oh: '..............x.' }],
  halftime: ['Half-time', { bd: 'x.........x.....', cp: '........x.......', sd: '................', hh: 'x.x.x.x.x.x.x.x.', oh: '................' }],
  techno:   ['Techno', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '...........x....', hh: '..x...x...x...x.', oh: '..x.......x.....' }],
};
export const LOOKS = [['tramonto', 'Tramonto'], ['montagne', 'Montagne'], ['spazio', 'Spazio'], ['sonar', 'Sonar']];
export const SCENES = {
  intro: { drums: true, kick: false, bass: false, arp: true, hook: false, pad: true, riser: false },
  build: { drums: true, kick: true, bass: true, arp: true, hook: false, pad: true, riser: true },
  drop:  { drums: true, kick: true, bass: true, arp: true, hook: true, pad: true, riser: false },
  break: { drums: false, kick: true, bass: false, arp: true, hook: true, pad: true, riser: false },
};

export const DEFAULT = {
  bpm: 138, key: 'A', prog: 'epica', look: 'tramonto', scene: 'drop',
  drums: { on: true, kit: 'RolandTR909', gain: .9, rows: Object.fromEntries(ROWS.map(([id]) => [id, { steps: GROOVES.trance[1][id], mute: false }])) },
  bass: { on: true, preset: 'rolling', wave: 'sawtooth', gain: .8, cutoff: 700, move: 'lento' },
  arp: { on: true, preset: 'su', wave: 'supersaw', gain: .4, cutoff: 2400, move: 'lento', delay: .35, speed: '16' },
  hook: { on: true, preset: 'richiamo', wave: 'square', gain: .3, cutoff: 3000, move: 'fisso', delay: .4 },
  pad: { on: true, wave: 'supersaw', gain: .28, cutoff: 1400, move: 'lento', room: .85 },
  riser: { on: false, gain: .25, bars: '8' },
};
// ---------- generatore di codice ----------
export const lpf = (c, move) => {
  c = Math.round(c);
  if (move === 'fisso') return `.lpf(${c})`;
  return `.lpf(sine.range(${Math.round(c * .4)}, ${Math.round(c * 1.6)}).slow(${move === 'lento' ? 8 : 2}))`;
};
export const lab = on => on ? '$' : '_$';
export const drumPattern = (id, steps) => {
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const q = steps.slice(g * 4, g * 4 + 4).split('').map(c => c === 'x' ? id : '~');
    groups.push(q.every(t => t === '~') ? '~' : `[${q.join(' ')}]`);
  }
  return groups.join(' ');
};

export function gen(s) {
  const [, t, keyName] = KEYS.find(k => k[0] === s.key);
  const tr = t ? `.transpose(${t})` : '';
  const chords = PROGS[s.prog][1];
  const names = chords.map(c => chordName(c, t)).join(' ');
  const L = [];
  L.push(`// coding-misk · ${PROGS[s.prog][0]}: ${names} · ${keyName}`);
  L.push(`setcpm(${s.bpm}/4)`, '');

  const d = s.drums;
  L.push(`// Batteria · ${d.kit}`);
  for (const [id, , mult] of ROWS) {
    const row = d.rows[id];
    if (!row.steps.includes('x')) continue;
    L.push(`${lab(d.on && !row.mute)}: s("${drumPattern(id, row.steps)}").bank("${d.kit}").gain(${f(d.gain * mult)})`);
  }

  const b = s.bass, bp = BASS[b.preset];
  L.push('', `// Basso · ${bp[0]}`);
  L.push(`${lab(b.on)}: note("<${chords.map(c => CHORDS[c].bass).join(' ')}>")${tr}`);
  L.push(`  .struct("${bp[1]}")`);
  L.push(`  .s("${b.wave}")${lpf(b.cutoff, b.move)}.lpq(8)`);
  L.push(`  .decay(${f(bp[2])}).sustain(${f(bp[3])}).gain(${f(b.gain)})`);

  const a = s.arp, ap = ARPS[a.preset];
  const rep = a.speed === '16' ? '*2' : '';
  const seq = chords.map(c => `[${ap[1].map(i => CHORDS[c].arp[i]).join(' ')}]${rep}`).join(' ');
  L.push('', `// Arpeggio · ${ap[0]}, ${a.speed === '16' ? 'sedicesimi' : 'ottavi'}`);
  L.push(`${lab(a.on)}: note("<${seq}>")${tr}`);
  L.push(`  .s("${a.wave}")${lpf(a.cutoff, a.move)}.lpq(4)`);
  L.push(`  .decay(.15).sustain(.15).delay(${f(a.delay)}).gain(${f(a.gain)})`);

  const h = s.hook, hp = HOOKS[h.preset];
  L.push('', `// Hook · ${hp[0]}`);
  L.push(`${lab(h.on)}: n("${hp[1]}").scale("${s.key}4:minor")`);
  L.push(`  .s("${h.wave}")${lpf(h.cutoff, h.move)}`);
  L.push(`  .decay(.2).sustain(.3).delay(${f(h.delay)}).room(.3).gain(${f(h.gain)})`);

  const p = s.pad;
  L.push('', '// Pad');
  L.push(`${lab(p.on)}: note("<${chords.map(c => `[${CHORDS[c].pad}]`).join(' ')}>")${tr}`);
  L.push(`  .s("${p.wave}").attack(.4).release(1.2)${lpf(p.cutoff, p.move)}`);
  L.push(`  .room(${f(p.room)}).gain(${f(p.gain)})`);

  const r = s.riser;
  L.push('', `// Riser · rumore bianco che sale in ${r.bars} battute`);
  L.push(`${lab(r.on)}: s("white*16").decay(.06).sustain(0)`);
  L.push(`  .hpf(saw.slow(${r.bars}).range(300, 8000))`);
  L.push(`  .gain(saw.slow(${r.bars}).range(0, ${f(r.gain)}))`);

  L.push('', '// collega i visual all\'audio', 'all(x => x.analyze(1))');
  return L.join('\n');
}
export const VIS = "\n\n// collega i visual all'audio\nall(x => x.analyze(1))";

