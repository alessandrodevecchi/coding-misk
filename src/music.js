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
export const DEFAULT = {
  bpm: 138, key: 'A', prog: 'epica',
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

// righe di codice per i layer di una scena.
// start: battuta in cui inizia la scena (gli accordi ripartono da lì)
// gate: nome della lane che accende e sfuma la scena (null nel codice di una scena sola)
// labels: true scrive anche i layer spenti come "_$:" (anteprima di una scena)
function sceneLayers(s, { start = 0, gate = null, labels = false } = {}) {
  const [, tr] = KEYS.find(k => k[0] === s.key);
  const trs = tr ? `.transpose(${tr})` : '';
  const rot = arr => arr.map((_, j) => arr[((j - start) % arr.length + arr.length) % arr.length]);
  const chords = rot(PROGS[s.prog][1]);
  const g = gate ? `.mask(${gate}).velocity(${gate})` : '';
  const late = start ? `.late(${start})` : '';
  const show = on => labels || on;
  const L = [];

  const d = s.drums;
  if (labels || d.on) L.push(`// ${t('cDrums')} · ${d.kit}`);
  for (const [id, , mult, inst] of ROWS) {
    const row = d.rows[id], on = d.on && !row.mute;
    if (!row.steps.includes('x') || !show(on)) continue;
    L.push(`${lab(on)}: s("${drumPattern(id, row.steps)}").bank("${d.kit}").gain(${f(d.gain * mult)})${g}.analyze("${inst}")`);
  }
  const b = s.bass, bp = BASS[b.preset];
  if (show(b.on)) {
    L.push('', `// ${t('cBass')} · ${tx(bp[0])}`);
    L.push(`${lab(b.on)}: note("<${chords.map(c => CHORDS[c].bass).join(' ')}>")${trs}.struct("${bp[1]}")`);
    L.push(`  .s("${b.wave}")${lpf(b.cutoff, b.move)}.lpq(8)`);
    L.push(`  .decay(${f(bp[2])}).sustain(${f(bp[3])}).gain(${f(b.gain)})${g}.analyze("bass")`);
  }
  const a = s.arp, ap = ARPS[a.preset];
  if (show(a.on)) {
    const rep = a.speed === '16' ? '*2' : '';
    L.push('', `// ${t('cArp')} · ${tx(ap[0])}, ${a.speed === '16' ? t('c16') : t('c8')}`);
    L.push(`${lab(a.on)}: note("<${chords.map(c => `[${ap[1].map(i => CHORDS[c].arp[i]).join(' ')}]${rep}`).join(' ')}>")${trs}`);
    L.push(`  .s("${a.wave}")${lpf(a.cutoff, a.move)}.lpq(4)`);
    L.push(`  .decay(.15).sustain(.15).delay(${f(a.delay)}).gain(${f(a.gain)})${g}.analyze("arp")`);
  }
  const h = s.hook, hp = HOOKS[h.preset];
  if (show(h.on)) {
    L.push('', `// Hook · ${tx(hp[0])}`);
    L.push(`${lab(h.on)}: n("${hp[1]}").scale("${s.key}4:minor")`);
    L.push(`  .s("${h.wave}")${lpf(h.cutoff, h.move)}`);
    L.push(`  .decay(.2).sustain(.3).delay(${f(h.delay)}).room(.3).gain(${f(h.gain)})${g}.analyze("hook")`);
  }
  const p = s.pad;
  if (show(p.on)) {
    L.push('', `// ${t('cPad')}`);
    L.push(`${lab(p.on)}: note("<${chords.map(c => `[${CHORDS[c].pad}]`).join(' ')}>")${trs}`);
    L.push(`  .s("${p.wave}").attack(.4).release(1.2)${lpf(p.cutoff, p.move)}`);
    L.push(`  .room(${f(p.room)}).gain(${f(p.gain)})${g}.analyze("pad")`);
  }
  const r = s.riser;
  if (show(r.on)) {
    L.push('', `// ${t('cRiser', { n: r.bars })}`);
    L.push(`${lab(r.on)}: s("white*16").decay(.06).sustain(0)`);
    L.push(`  .hpf(saw.slow(${r.bars}).range(300, 8000)${late})`);
    L.push(`  .gain(saw.slow(${r.bars}).range(0, ${f(r.gain)})${late})${g}.analyze("riser")`);
  }
  return L;
}

// codice di una scena sola, con i layer spenti scritti come "_$:"
export function gen(s) {
  const [, tr, keyName] = KEYS.find(k => k[0] === s.key);
  const names = PROGS[s.prog][1].map(c => chordName(c, tr)).join(' ');
  return [`// coding-misk · ${tx(PROGS[s.prog][0])}: ${names} · ${tx(keyName)}`, `// ${t('cTag')}`, `setcpm(${s.bpm}/4)`, '',
    ...sceneLayers(s, { labels: true })].join('\n');
}

// "<0 0 0 1 1>" → "<0!3 1!2>"
const rle = vals => {
  const out = [];
  for (let i = 0; i < vals.length;) {
    let j = i; while (j < vals.length && vals[j] === vals[i]) j++;
    out.push(j - i > 1 ? `${vals[i]}!${j - i}` : `${vals[i]}`); i = j;
  }
  return `<${out.join(' ')}>`;
};
const safeName = (n, i) => (String(n || '').replace(/['"`\\\n\r]/g, ' ').replace(/\s+/g, ' ').trim() || `${t('scene')} ${i + 1}`).slice(0, 40);

// Brano composto con l'arrangiatore → codice Strudel.
// Ogni scena è un blocco di layer acceso dalla sua lane (un valore per battuta):
// 1 suona, 0 tace, i valori intermedi sono la dissolvenza tra una scena e la successiva.
export function compileTrack(track) {
  const sc = track.scenes, starts = [];
  let total = 0;
  for (const s of sc) { starts.push(total); total += s.bars; }
  const names = [];
  sc.forEach((s, i) => { let n = safeName(s.name, i), k = 2; while (names.includes(n)) n = `${safeName(s.name, i)} ${k++}`; names.push(n); });
  const fadeOf = i => i > 0 ? Math.min(sc[i].fade || 0, sc[i].bars) : 0;
  const tempo = sc.map((s, i) => {
    const prev = i > 0 ? sc[i - 1].state.bpm : s.state.bpm, fin = fadeOf(i);
    if (!fin || prev === s.state.bpm) return s.state.bpm;
    return s.bars > fin ? [[fin, prev, s.state.bpm], [s.bars - fin, s.state.bpm]] : [[fin, prev, s.state.bpm]];
  });
  const L = [
    `// coding-misk · ${safeName(track.title, 0)}`,
    `// ${t('cTrack')}`,
    `// ${t('cTag')}`,
    `setcpm(${sc[0].state.bpm}/4)`, '',
    `const SECTIONS = [${names.map((n, i) => `['${n}', ${sc[i].bars}]`).join(', ')}]`,
    `const TEMPO = {${names.map((n, i) => `'${n}': ${JSON.stringify(tempo[i]).replace(/"/g, "'")}`).join(', ')}}`,
  ];
  sc.forEach((s, i) => {
    const v = Array(total).fill(0), st = starts[i], end = st + s.bars, fin = fadeOf(i);
    for (let b = st; b < end; b++) v[b] = 1;
    for (let k = 0; k < fin; k++) v[st + k] = +((k + 1) / (fin + 1)).toFixed(2);
    const fo = i < sc.length - 1 ? fadeOf(i + 1) : 0;
    for (let k = 0; k < fo; k++) v[end + k] = +(1 - (k + 1) / (fo + 1)).toFixed(2);
    const [, tr, keyName] = KEYS.find(k => k[0] === s.state.key);
    const gate = `scene${i + 1}`;
    L.push('', `// ---------- ${i + 1} · ${names[i]} · ${t('cSceneInfo', { bars: s.bars, bpm: s.state.bpm, key: tx(keyName), chords: PROGS[s.state.prog][1].map(c => chordName(c, tr)).join(' ') })}${fin ? ' · ' + t('cFadeIn', { n: fin }) : ''} ----------`);
    L.push(`const ${gate} = "${rle(v.map(String))}"`);
    L.push(...sceneLayers(s.state, { start: st, gate }));
  });
  return L.join('\n');
}

export const cloneState = s => JSON.parse(JSON.stringify(s));
// stato di una scena a partire da quello predefinito, con alcune modifiche
const scene = (name, bars, fade, edit) => { const st = cloneState(DEFAULT); edit(st); return { name, bars, fade, state: st }; };

// La traccia di prova del primo giorno, ora un brano a scene.
export const DEMO_TRACK = {
  id: 'demo-synth-lab', title: 'Synth Lab Demo', look: 'tramonto', kind: 'composed',
  scenes: [
    scene('Intro', 8, 0, s => { s.drums.rows.bd.mute = true; s.bass.on = false; s.hook.on = false; s.arp.cutoff = 900; s.pad.cutoff = 900; }),
    scene('Build', 8, 2, s => { s.hook.on = false; s.bass.cutoff = 450; s.arp.cutoff = 1600; s.riser.on = true; s.riser.bars = '8'; }),
    scene('Drop', 16, 0, s => { s.arp.cutoff = 2600; }),
    scene('Break', 8, 2, s => { s.drums.on = false; s.bass.on = false; s.arp.cutoff = 1200; s.pad.room = .95; s.riser.on = true; s.riser.bars = '8'; }),
    scene('Drop 2', 16, 0, s => { s.bpm = 140; s.key = 'B'; s.hook.preset = 'domanda'; s.arp.cutoff = 3000; s.arp.preset = 'pulsar';
      for (const [id, steps] of Object.entries(GROOVES.rolling[1])) s.drums.rows[id].steps = steps; }),
  ],
};

// Codice libero (guida, suoni): se non ha già i suoi .analyze, ne aggiungiamo uno generico.
export const withVisuals = code => code.includes('.analyze(') ? code : `${code}\n\n// ${t('cVis')}\nall(x => x.analyze(1))`;
