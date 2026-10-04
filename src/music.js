import { t, tx } from './i18n.js';

export const f = n => String(Math.round(n * 100) / 100).replace(/^0\./, '.');

// ---------- dati musicali ----------
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const KEYS = [
  ['F#', -3, { it: 'Fa# minore', en: 'F# minor' }], ['G', -2, { it: 'Sol minore', en: 'G minor' }],
  ['A', 0, { it: 'La minore', en: 'A minor' }], ['B', 2, { it: 'Si minore', en: 'B minor' }],
  ['C', 3, { it: 'Do minore', en: 'C minor' }], ['D', 5, { it: 'Re minore', en: 'D minor' }],
];
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
  epica: [{ it: 'Epica', en: 'Epic' }, ['Am', 'F', 'C', 'G']],
  notturna: [{ it: 'Notturna', en: 'Nocturne' }, ['Am', 'Dm', 'F', 'E']],
  euforica: [{ it: 'Euforica', en: 'Euphoric' }, ['F', 'G', 'Am', 'Am']],
  ipnotica: [{ it: 'Ipnotica', en: 'Hypnotic' }, ['Am', 'G', 'F', 'G']],
  malinconica: [{ it: 'Malinconica', en: 'Melancholic' }, ['Am', 'Em', 'F', 'G']],
};
export const chordName = (c, tr) => {
  const m = c.match(/^([A-G]#?)(m?)$/);
  return NOTE_NAMES[(NOTE_NAMES.indexOf(m[1]) + tr + 12) % 12] + m[2];
};
export const WAVES = [['sawtooth', 'Sawtooth'], ['supersaw', 'Supersaw'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine']];
export const MOVES = [['fisso', { it: 'Fisso', en: 'Fixed' }], ['lento', { it: 'Respiro lento', en: 'Slow sweep' }], ['veloce', { it: 'Respiro veloce', en: 'Fast sweep' }]];
export const BASS = {
  rolling: ['Rolling', '[~ x x x]*4', .12, 0], offbeat: ['Offbeat', '[~ x]*4', .18, 0],
  galoppo: [{ it: 'Galoppo', en: 'Gallop' }, '[x ~ x x]*4', .1, 0], sub: [{ it: 'Sub lungo', en: 'Long sub' }, 'x', .6, .8],
};
export const ARPS = {
  su: [{ it: 'Su', en: 'Up' }, [0, 1, 2, 3, 0, 1, 2, 3]], sugiu: [{ it: 'Su e giù', en: 'Up and down' }, [0, 1, 2, 3, 2, 1, 0, 1]],
  pulsar: ['Pulsar', [0, 3, 1, 3, 2, 3, 1, 3]], pedale: [{ it: 'Pedale', en: 'Pedal' }, [0, 3, 0, 2, 0, 1, 0, 2]],
  spezzato: [{ it: 'Spezzato', en: 'Broken' }, [0, 2, 1, 3, 2, 0, 3, 1]],
};
export const HOOKS = {
  richiamo: [{ it: 'Richiamo', en: 'Call' }, '0 ~ 0 2 ~ 4 ~ 2'], discesa: [{ it: 'Discesa', en: 'Descent' }, '7 ~ 4 ~ 5 4 2 ~'],
  eco: [{ it: 'Eco', en: 'Echo' }, '0 ~ ~ 4 ~ ~ 7 ~'], ostinato: ['Ostinato', '0 4 7 4 0 4 7 9'],
  domanda: [{ it: 'Domanda e risposta', en: 'Call and response' }, '<[0 2 4 ~ 4 ~ 2 ~] [4 5 7 ~ 9 ~ 7 ~]>'],
};
export const KITS = ['RolandTR909', 'RolandTR808', 'RolandTR707', 'LinnDrum', 'AkaiLinn'];
// [id campione, etichetta, moltiplicatore volume, strumento nel visual Palco]
export const ROWS = [['bd', 'Kick', 1, 'kick'], ['cp', 'Clap', .8, 'snare'], ['sd', 'Snare', .75, 'snare'], ['hh', 'Hat', .5, 'hats'], ['oh', 'Open', .45, 'hats']];
export const GROOVES = {
  trance:   ['Trance', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '................', hh: '..x...x...x...x.', oh: '................' }],
  rolling:  ['Rolling hat', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '................', hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.' }],
  breakbeat:['Breakbeat', { bd: 'x.....x...x.....', cp: '................', sd: '....x.......x..x', hh: 'x.x.x.x.x.x.x.x.', oh: '..............x.' }],
  halftime: ['Half-time', { bd: 'x.........x.....', cp: '........x.......', sd: '................', hh: 'x.x.x.x.x.x.x.x.', oh: '................' }],
  techno:   ['Techno', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '...........x....', hh: '..x...x...x...x.', oh: '..x.......x.....' }],
};
export const LOOKS = [
  ['palco', { it: 'Palco', en: 'Stage' }], ['pixel', 'Pixel'], ['tramonto', { it: 'Tramonto', en: 'Sunset' }],
  ['montagne', { it: 'Montagne', en: 'Mountains' }], ['spazio', { it: 'Spazio', en: 'Space' }], ['sonar', 'Sonar'],
];
// strumenti del visual Palco, nell'ordine in cui compaiono sul palco
export const INSTRUMENTS = ['kick', 'snare', 'hats', 'fx', 'bass', 'arp', 'pad', 'hook', 'riser'];
export const SCENES = {
  intro: { drums: true, kick: false, bass: false, arp: true, hook: false, pad: true, riser: false },
  build: { drums: true, kick: true, bass: true, arp: true, hook: false, pad: true, riser: true },
  drop:  { drums: true, kick: true, bass: true, arp: true, hook: true, pad: true, riser: false },
  break: { drums: false, kick: true, bass: false, arp: true, hook: true, pad: true, riser: false },
};

export const DEFAULT = {
  bpm: 138, key: 'A', prog: 'epica', look: 'palco', scene: 'drop',
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
    groups.push(q.every(x => x === '~') ? '~' : `[${q.join(' ')}]`);
  }
  return groups.join(' ');
};

export function gen(s) {
  const [, tr, keyName] = KEYS.find(k => k[0] === s.key);
  const trs = tr ? `.transpose(${tr})` : '';
  const chords = PROGS[s.prog][1];
  const names = chords.map(c => chordName(c, tr)).join(' ');
  const L = [];
  L.push(`// coding-misk · ${tx(PROGS[s.prog][0])}: ${names} · ${tx(keyName)}`);
  L.push(`// ${t('cTag')}`);
  L.push(`setcpm(${s.bpm}/4)`, '');

  const d = s.drums;
  L.push(`// ${t('cDrums')} · ${d.kit}`);
  for (const [id, , mult, inst] of ROWS) {
    const row = d.rows[id];
    if (!row.steps.includes('x')) continue;
    L.push(`${lab(d.on && !row.mute)}: s("${drumPattern(id, row.steps)}").bank("${d.kit}").gain(${f(d.gain * mult)}).analyze("${inst}")`);
  }

  const b = s.bass, bp = BASS[b.preset];
  L.push('', `// ${t('cBass')} · ${tx(bp[0])}`);
  L.push(`${lab(b.on)}: note("<${chords.map(c => CHORDS[c].bass).join(' ')}>")${trs}`);
  L.push(`  .struct("${bp[1]}")`);
  L.push(`  .s("${b.wave}")${lpf(b.cutoff, b.move)}.lpq(8)`);
  L.push(`  .decay(${f(bp[2])}).sustain(${f(bp[3])}).gain(${f(b.gain)}).analyze("bass")`);

  const a = s.arp, ap = ARPS[a.preset];
  const rep = a.speed === '16' ? '*2' : '';
  const seq = chords.map(c => `[${ap[1].map(i => CHORDS[c].arp[i]).join(' ')}]${rep}`).join(' ');
  L.push('', `// ${t('cArp')} · ${tx(ap[0])}, ${a.speed === '16' ? t('c16') : t('c8')}`);
  L.push(`${lab(a.on)}: note("<${seq}>")${trs}`);
  L.push(`  .s("${a.wave}")${lpf(a.cutoff, a.move)}.lpq(4)`);
  L.push(`  .decay(.15).sustain(.15).delay(${f(a.delay)}).gain(${f(a.gain)}).analyze("arp")`);

  const h = s.hook, hp = HOOKS[h.preset];
  L.push('', `// Hook · ${tx(hp[0])}`);
  L.push(`${lab(h.on)}: n("${hp[1]}").scale("${s.key}4:minor")`);
  L.push(`  .s("${h.wave}")${lpf(h.cutoff, h.move)}`);
  L.push(`  .decay(.2).sustain(.3).delay(${f(h.delay)}).room(.3).gain(${f(h.gain)}).analyze("hook")`);

  const p = s.pad;
  L.push('', `// ${t('cPad')}`);
  L.push(`${lab(p.on)}: note("<${chords.map(c => `[${CHORDS[c].pad}]`).join(' ')}>")${trs}`);
  L.push(`  .s("${p.wave}").attack(.4).release(1.2)${lpf(p.cutoff, p.move)}`);
  L.push(`  .room(${f(p.room)}).gain(${f(p.gain)}).analyze("pad")`);

  const r = s.riser;
  L.push('', `// ${t('cRiser', { n: r.bars })}`);
  L.push(`${lab(r.on)}: s("white*16").decay(.06).sustain(0)`);
  L.push(`  .hpf(saw.slow(${r.bars}).range(300, 8000))`);
  L.push(`  .gain(saw.slow(${r.bars}).range(0, ${f(r.gain)})).analyze("riser")`);
  return L.join('\n');
}

// Codice libero (guida, suoni): se non ha già i suoi .analyze, ne aggiungiamo uno generico.
export const withVisuals = code => code.includes('.analyze(') ? code : `${code}\n\n// ${t('cVis')}\nall(x => x.analyze(1))`;
