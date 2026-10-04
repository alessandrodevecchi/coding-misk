import { t, tx } from './i18n.js';

export const f = n => String(Math.round(n * 100) / 100).replace(/^0\./, '.');
const num = n => String(Math.round(n * 100) / 100);

// ---------- dati musicali ----------
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// [radice, semitoni da La, nome]: tutto è scritto in La e trasposto
export const KEYS = [
  ['E', -5, { it: 'Mi', en: 'E' }], ['F', -4, { it: 'Fa', en: 'F' }], ['F#', -3, { it: 'Fa#', en: 'F#' }], ['G', -2, { it: 'Sol', en: 'G' }],
  ['A', 0, { it: 'La', en: 'A' }], ['B', 2, { it: 'Si', en: 'B' }], ['C', 3, { it: 'Do', en: 'C' }], ['D', 5, { it: 'Re', en: 'D' }],
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
// progressioni scritte in La minore (gradi i, VI, III, VII, …)
export const PROGS = {
  epica: [{ it: 'Epica', en: 'Epic' }, ['Am', 'F', 'C', 'G']],
  notturna: [{ it: 'Notturna', en: 'Nocturne' }, ['Am', 'Dm', 'F', 'E']],
  euforica: [{ it: 'Euforica', en: 'Euphoric' }, ['F', 'G', 'Am', 'Am']],
  ipnotica: [{ it: 'Ipnotica', en: 'Hypnotic' }, ['Am', 'G', 'F', 'G']],
  malinconica: [{ it: 'Malinconica', en: 'Melancholic' }, ['Am', 'Em', 'F', 'G']],
  cyber: ['Cyber', ['Am', 'F', 'G', 'E']],
  // un accordo ogni due battute
  pendolo: [{ it: 'Pendolo (2 battute)', en: 'Pendulum (2 bars)' }, ['Am', 'Am', 'G', 'G']],
  anthem: [{ it: 'Anthem (2 battute)', en: 'Anthem (2 bars)' }, ['Am', 'Am', 'G', 'G', 'F', 'F', 'G', 'G']],
  ascesa: [{ it: 'Ascesa (2 battute)', en: 'Ascent (2 bars)' }, ['F', 'F', 'G', 'G', 'Am', 'Am', 'Em', 'Em']],
};
export const chordName = (c, tr) => {
  const m = c.match(/^([A-G]#?)(m?)$/);
  return NOTE_NAMES[(NOTE_NAMES.indexOf(m[1]) + tr + 12) % 12] + m[2];
};
export const WAVES = [['sawtooth', 'Sawtooth'], ['supersaw', 'Supersaw'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine']];
export const MOVES = [['fisso', { it: 'Fisso', en: 'Fixed' }], ['lento', { it: 'Respiro lento', en: 'Slow sweep' }], ['veloce', { it: 'Respiro veloce', en: 'Fast sweep' }]];
// [nome, struttura, decay, sustain, forma del volume facoltativa (postgain)]
export const BASS = {
  rolling: ['Rolling', '[~ x x x]*4', .12, 0], offbeat: ['Offbeat', '[~ x]*4', .18, 0],
  rumble: ['Rumble', '[~ x x]*4', .1, 0], galoppo: [{ it: 'Galoppo', en: 'Gallop' }, '[x ~ x x]*4', .1, 0],
  sub: [{ it: 'Sub lungo', en: 'Long sub' }, 'x', .6, .8],
  // sedicesimi che riprendono volume dopo ogni cassa: il sidechain del future pop
  pumping: [{ it: 'Pompato (sidechain)', en: 'Pumping (sidechain)' }, 'x*16', .2, .6, '[.1 .4 .75 1]*4'],
};
// figure come modelli: 0-3 sono le note dell'accordo dal basso verso l'alto
export const ARPS = {
  su: [{ it: 'Su', en: 'Up' }, '0 1 2 3 0 1 2 3'], sugiu: [{ it: 'Su e giù', en: 'Up and down' }, '0 1 2 3 2 1 0 1'],
  pulsar: ['Pulsar', '0 3 1 3 2 3 1 3'], pedale: [{ it: 'Pedale', en: 'Pedal' }, '0 3 0 2 0 1 0 2'],
  spezzato: [{ it: 'Spezzato', en: 'Broken' }, '0 2 1 3 2 0 3 1'], acid: ['Acid', '0 0 [3 0] 1 0 2 [0 3] 1'],
};
export const HOOKS = {
  richiamo: [{ it: 'Richiamo', en: 'Call' }, '0 ~ 0 2 ~ 4 ~ 2'], discesa: [{ it: 'Discesa', en: 'Descent' }, '7 ~ 4 ~ 5 4 2 ~'],
  eco: [{ it: 'Eco', en: 'Echo' }, '0 ~ ~ 4 ~ ~ 7 ~'], ostinato: ['Ostinato', '0 4 7 4 0 4 7 9'],
  domanda: [{ it: 'Domanda e risposta', en: 'Call and response' }, '<[0 2 4 ~ 4 ~ 2 ~] [4 5 7 ~ 9 ~ 7 ~]>'],
  neon: ['Neon', '<[0 ~ 0 2 ~ 4 ~ 7] [5 ~ 4 ~ 2 ~ 0 ~] [4 ~ 4 5 ~ 7 ~ 9] [7 ~ 5 ~ 4 2 ~ ~]>'],
  cyber: ['Cyber', '<[0 ~ 3 ~ 7 ~ 3 1] [0 ~ 3 ~ 8 7 ~ ~]>'],
  decade: [{ it: 'Decennale', en: 'Decade' }, '<[0 0 0 1 2 0 2 0] [0 0 4 1 0 0 2 0] [2 -1 -1 ~ -1 1 2 1] [-1 ~ -1 ~ -1 -1 2 2] [4 ~ 4 3 2 ~ 1 0] [2 ~ 2 1 0 ~ -1 0] [1 1 1 ~ 1 2 1 -1] [-1 ~ ~ ~ 1 ~ 2 ~]>'],
  scintilla: [{ it: 'Scintilla', en: 'Spark' }, '<[0 ~ 0 1 ~ 0 ~ 4] [~ 3 ~ 1 0 ~ -1 ~] [0 ~ 0 1 ~ 4 ~ 5] [4 ~ 3 ~ 1 ~ 0 ~]>'],
  orizzonte: [{ it: 'Orizzonte', en: 'Horizon' }, '<[4 ~ 4 5 4 ~ 2 ~] [0 ~ 2 ~ 4 ~ 7 ~] [5 ~ 5 4 2 ~ 0 ~] [1 ~ 2 ~ 4 ~ ~ ~]>'],
};
export const MODES = [['minor', { it: 'Minore', en: 'Minor' }], ['phrygian', { it: 'Frigio', en: 'Phrygian' }], ['dorian', { it: 'Dorico', en: 'Dorian' }], ['mixolydian', { it: 'Misolidio', en: 'Mixolydian' }]];
export const VOWELS = [['', { it: 'Nessuna', en: 'None' }], ['<a e i o>', 'a e i o'], ['a', 'a'], ['o', 'o']];
// [nome, struttura, attack, decay, sustain, release, forma del volume facoltativa (postgain)]
export const PADS = {
  pad: [{ it: 'Tappeto', en: 'Sustained' }, '', .4, 0, 1, 1.2],
  stab: ['Stab', 'x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~', .01, .15, 0, .1],
  pump: [{ it: 'In levare', en: 'Offbeat pump' }, '[~ x]*4', .02, .25, .2, .3],
  sidechain: ['Sidechain', 'x*16', .01, .2, .7, .05, '[.1 .4 .75 1]*4'],
  staccato: [{ it: 'Staccato a ottavi', en: 'Staccato 8ths' }, 'x*8', .005, .08, 0, .05],
  synco: [{ it: 'Sincopato', en: 'Syncopated' }, '[~ ~ x x]*4', .005, .1, 0, .05],
};
export const TEXTURES = ['numbers', 'industrial', 'metal', 'glitch', 'space', 'wind', 'crow'];
// [nome, mini-notation con X al posto del campione, varianti n]
export const TEX_RHYTHMS = {
  bar: [{ it: 'Uno per battuta', en: 'One per bar' }, 'X', '<0 3 7 1>'],
  euclid: [{ it: 'Euclideo 3/8', en: 'Euclidean 3/8' }, 'X(3,8,2)', '<0 2 4 6>'],
  eighth: [{ it: 'Ottavi', en: '8th notes' }, 'X*8', 'irand(16)'],
  sixteenth: [{ it: 'Sedicesimi', en: '16th notes' }, 'X*16', 'irand(16)'],
};
export const KITS = ['RolandTR909', 'RolandTR808', 'RolandTR707', 'RolandTR606', 'LinnDrum', 'AkaiLinn'];
// [id campione, etichetta, moltiplicatore volume, strumento nel visual Palco]
export const ROWS = [['bd', 'Kick', 1, 'kick'], ['cp', 'Clap', .8, 'snare'], ['sd', 'Snare', .75, 'snare'], ['hh', 'Hat', .5, 'hats'], ['oh', 'Open', .45, 'hats'], ['rd', 'Ride', .35, 'hats']];
const E16 = '................';
export const GROOVES = {
  trance:   ['Trance', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: '..x...x...x...x.', oh: E16, rd: E16 }],
  rolling:  ['Rolling hat', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', rd: E16 }],
  breakbeat:['Breakbeat', { bd: 'x.....x...x.....', cp: E16, sd: '....x.......x..x', hh: 'x.x.x.x.x.x.x.x.', oh: '..............x.', rd: E16 }],
  halftime: ['Half-time', { bd: 'x.........x.....', cp: '........x.......', sd: E16, hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }],
  techno:   ['Techno', { bd: 'x...x...x...x...', cp: '....x.......x...', sd: '...........x....', hh: '..x...x...x...x.', oh: '..x.......x.....', rd: E16 }],
  hard:     ['Hard techno', { bd: 'x...x...x...x...', cp: '....x.......x..x', sd: E16, hh: 'x.xx.x.xx.xx.x.x', oh: '..x...x...x...x.', rd: '..x...x...x...x.' }],
};
export const LOOKS = [
  ['palco', { it: 'Palco', en: 'Stage' }], ['pixel', 'Pixel'], ['tramonto', { it: 'Tramonto', en: 'Sunset' }],
  ['montagne', { it: 'Montagne', en: 'Mountains' }], ['spazio', { it: 'Spazio', en: 'Space' }], ['sonar', 'Sonar'],
];
// strumenti del visual Palco, nell'ordine in cui compaiono sul palco
export const INSTRUMENTS = ['kick', 'snare', 'hats', 'fx', 'bass', 'arp', 'pad', 'hook', 'riser'];

// Stato di una scena. "…End" a null significa nessuna automazione: il valore resta fisso.
// cutoff 20000 = filtro aperto. grit 0 = niente bitcrusher. drive 0 = niente saturazione.
export const DEFAULT = {
  bpm: 138, bpmEnd: null, key: 'A', prog: 'epica',
  drums: { on: true, kit: 'RolandTR909', gain: .9, gainEnd: null, cutoff: 20000, cutoffEnd: null, drive: 0, grit: 0,
    rows: Object.fromEntries(ROWS.map(([id]) => [id, { steps: GROOVES.trance[1][id], mute: false }])) },
  bass: { on: true, preset: 'rolling', wave: 'sawtooth', gain: .8, gainEnd: null, cutoff: 700, cutoffEnd: null, move: 'lento', reso: 8, drive: 0 },
  arp: { on: true, preset: 'su', wave: 'supersaw', gain: .4, gainEnd: null, cutoff: 2400, cutoffEnd: null, move: 'lento', reso: 4, delay: .35, speed: '16', drive: 0 },
  hook: { on: true, preset: 'richiamo', wave: 'square', gain: .3, gainEnd: null, cutoff: 3000, cutoffEnd: null, move: 'fisso', delay: .4, mode: 'minor', fm: 0, vowel: '', grit: 0 },
  pad: { on: true, preset: 'pad', wave: 'supersaw', gain: .28, gainEnd: null, cutoff: 1400, cutoffEnd: null, move: 'lento', room: .85, drive: 0 },
  texture: { on: false, sample: 'numbers', rhythm: 'bar', gain: .4, gainEnd: null, grit: .7, room: .6 },
  riser: { on: false, gain: .25, bars: '8', dir: 'up' },
};
export const cloneState = s => JSON.parse(JSON.stringify(s));
// completa uno stato salvato con una versione precedente del modello
export function normalizeState(s) {
  const out = cloneState(DEFAULT);
  for (const [k, v] of Object.entries(s || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
      Object.assign(out[k], v);
      if (k === 'drums') out.drums.rows = { ...cloneState(DEFAULT.drums.rows), ...(v.rows || {}) };
    } else out[k] = v;
  }
  return out;
}

// ---------- generatore di codice ----------
export const lab = on => on ? '$' : '_$';
export const drumPattern = (id, steps) => {
  const groups = [];
  for (let g = 0; g < 4; g++) {
    const q = steps.slice(g * 4, g * 4 + 4).split('').map(c => c === 'x' ? id : '~');
    groups.push(q.every(x => x === '~') ? '~' : `[${q.join(' ')}]`);
  }
  return groups.join(' ');
};
// "<0 0 0 1 1>" → "<0!3 1!2>"
const rle = vals => {
  const out = [];
  for (let i = 0; i < vals.length;) {
    let j = i; while (j < vals.length && vals[j] === vals[i]) j++;
    out.push(j - i > 1 ? `${vals[i]}!${j - i}` : `${vals[i]}`); i = j;
  }
  return `<${out.join(' ')}>`;
};
// elenco di valori per battuta, ruotato perché il primo cada sulla battuta "start"
const rotate = (arr, start) => arr.map((_, j) => arr[((j - start) % arr.length + arr.length) % arr.length]);
// "<a [b c] d>" → ["a", "[b c]", "d"]
const altItems = s => {
  const m = s.match(/^<(.*)>$/); if (!m) return null;
  const out = []; let depth = 0, cur = '';
  for (const ch of m[1]) {
    if (ch === '[' || ch === '<') depth++;
    if (ch === ']' || ch === '>') depth--;
    if (ch === ' ' && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

// righe di codice per i layer di una scena.
// start/bars: dove inizia e quanto dura la scena (accordi, melodie e automazioni partono da lì)
// gate: nome della lane che accende e sfuma la scena (null nel codice di una scena sola)
// labels: true scrive anche i layer spenti come "_$:" (anteprima di una scena)
// crash, breath: crash sul primo colpo, mezza battuta di silenzio alla fine
function sceneLayers(s, { start = 0, bars = 1, gate = null, labels = false, crash = false, breath = false, fill = false } = {}) {
  s = normalizeState(s);
  const [, tr] = KEYS.find(k => k[0] === s.key) || KEYS[4];
  const trs = tr ? `.transpose(${tr})` : '';
  const chords = rotate(PROGS[s.prog][1], start);
  const g = gate ? `.mask(${gate}).velocity(${gate})` : '';
  const late = start ? `.late(${start})` : '';
  const show = on => labels || on;
  // valore fisso o rampa da inizio a fine scena, una battuta alla volta
  const auto = (a, b) => {
    if (b === null || b === undefined || b === a || bars < 2) return num(a);
    return `"${rle(rotate(Array.from({ length: bars }, (_, i) => num(a + (b - a) * i / (bars - 1))), start))}"`;
  };
  const filter = (c, cEnd, move) => {
    if (cEnd !== null && cEnd !== undefined && cEnd !== c) return `.lpf(${auto(c, cEnd)})`;
    if (c >= 18000) return '';
    c = Math.round(c);
    if (!move || move === 'fisso') return `.lpf(${c})`;
    return `.lpf(sine.range(${Math.round(c * .4)}, ${Math.round(c * 1.6)}).slow(${move === 'lento' ? 8 : 2}))`;
  };
  const drive = d => d > 0 ? `.distort(${num(d)}).distortvol(.5)` : '';
  const grit = v => v > 0 ? `.crush(${Math.round(16 - v * 13)})` : '';
  const scaleGain = (a, b, k) => auto(a * k, b === null || b === undefined ? null : b * k);
  const breathMask = breath && bars > 0 ? `.mask("${rle(rotate([...Array(bars - 1).fill('1'), '[1 0]'], start))}")` : '';
  const L = [];

  const d = s.drums;
  if (show(d.on)) L.push(`// ${t('cDrums')} · ${d.kit}`);
  for (const [id, , mult, inst] of ROWS) {
    const row = d.rows[id], on = d.on && !row.mute;
    if (!row || !row.steps.includes('x') || !show(on)) continue;
    L.push(`${lab(on)}: s("${drumPattern(id, row.steps)}").bank("${d.kit}").gain(${scaleGain(d.gain, d.gainEnd, mult)})${filter(d.cutoff, d.cutoffEnd)}${drive(d.drive)}${grit(d.grit)}${breathMask}${g}.analyze("${inst}")`);
  }
  if (fill && d.on) L.push(`$: s("sd*16").bank("${d.kit}").gain(saw.range(.15, .75)).mask("${rle(rotate([...Array(Math.max(0, bars - 1)).fill('0'), '1'], start))}")${g}.analyze("snare")`);
  if (crash && d.on) L.push(`$: s("cr").bank("${d.kit}").gain(.55).room(.4).mask("${rle(rotate(['1', ...Array(Math.max(0, bars - 1)).fill('0')], start))}")${g}.analyze("fx")`);

  const b = s.bass, bp = BASS[b.preset] || BASS.rolling;
  if (show(b.on)) {
    L.push('', `// ${t('cBass')} · ${tx(bp[0])}`);
    L.push(`${lab(b.on)}: note("<${chords.map(c => CHORDS[c].bass).join(' ')}>")${trs}.struct("${bp[1]}")`);
    L.push(`  .s("${b.wave}")${filter(b.cutoff, b.cutoffEnd, b.move)}.lpq(${num(b.reso)})${drive(b.drive)}`);
    L.push(`  .decay(${f(bp[2])}).sustain(${f(bp[3])})${bp[4] ? `.postgain("${bp[4]}")` : ''}.gain(${auto(b.gain, b.gainEnd)})${breathMask}${g}.analyze("bass")`);
  }
  const a = s.arp, ap = ARPS[a.preset] || ARPS.su;
  if (show(a.on)) {
    const rep = a.speed === '16' ? '*2' : '';
    L.push('', `// ${t('cArp')} · ${tx(ap[0])}, ${a.speed === '16' ? t('c16') : t('c8')}`);
    L.push(`${lab(a.on)}: note("<${chords.map(c => `[${ap[1].replace(/\d/g, i => CHORDS[c].arp[i])}]${rep}`).join(' ')}>")${trs}`);
    L.push(`  .s("${a.wave}")${filter(a.cutoff, a.cutoffEnd, a.move)}.lpq(${num(a.reso)})${drive(a.drive)}`);
    L.push(`  .decay(.15).sustain(.15)${a.delay > 0 ? `.delay(${f(a.delay)})` : ''}.gain(${auto(a.gain, a.gainEnd)})${breathMask}${g}.analyze("arp")`);
  }
  const h = s.hook, hp = HOOKS[h.preset] || HOOKS.richiamo;
  if (show(h.on)) {
    const items = altItems(hp[1]);
    const mel = items ? `<${rotate(items, start).join(' ')}>` : hp[1];
    L.push('', `// Hook · ${tx(hp[0])}`);
    L.push(`${lab(h.on)}: n("${mel}").scale("${s.key}4:${h.mode}")`);
    L.push(`  .s("${h.wave}")${h.fm > 0 ? `.fm(${num(h.fm)})` : ''}${h.vowel ? `.vowel("${h.vowel}")` : ''}${filter(h.cutoff, h.cutoffEnd, h.move)}${grit(h.grit)}`);
    L.push(`  .decay(.2).sustain(.3).delay(${f(h.delay)}).room(.3).gain(${auto(h.gain, h.gainEnd)})${breathMask}${g}.analyze("hook")`);
  }
  const p = s.pad, pp = PADS[p.preset] || PADS.pad;
  if (show(p.on)) {
    L.push('', `// ${t('cPad')} · ${tx(pp[0])}`);
    L.push(`${lab(p.on)}: note("<${chords.map(c => `[${CHORDS[c].pad}]`).join(' ')}>")${trs}${pp[1] ? `.struct("${pp[1]}")` : ''}`);
    L.push(`  .s("${p.wave}").attack(${f(pp[2])})${pp[3] ? `.decay(${f(pp[3])}).sustain(${f(pp[4])})` : ''}.release(${f(pp[5])})${filter(p.cutoff, p.cutoffEnd, p.move)}${drive(p.drive)}`);
    L.push(`  .room(${f(p.room)})${pp[6] ? `.postgain("${pp[6]}")` : ''}.gain(${auto(p.gain, p.gainEnd)})${g}.analyze("pad")`);
  }
  const x = s.texture, xr = TEX_RHYTHMS[x.rhythm] || TEX_RHYTHMS.bar;
  if (show(x.on)) {
    const nArg = xr[2].startsWith('irand') ? xr[2] : `"${xr[2]}"`;
    L.push('', `// Texture · ${x.sample}`);
    L.push(`${lab(x.on)}: s("${xr[1].replace('X', x.sample)}").n(${nArg})${grit(x.grit)}.hpf(400).room(${f(x.room)})${xr[1].includes('*') ? '.pan(rand)' : ''}`);
    L.push(`  .gain(${auto(x.gain, x.gainEnd)})${g}.analyze("fx")`);
  }
  const r = s.riser;
  if (show(r.on)) {
    const up = r.dir !== 'down';
    L.push('', `// ${t(up ? 'cRiser' : 'cDown', { n: r.bars })}`);
    L.push(`${lab(r.on)}: s("white*16").decay(.06).sustain(0)`);
    L.push(`  .hpf(saw.slow(${r.bars}).range(${up ? '300, 8000' : '8000, 300'})${late})`);
    L.push(`  .gain(saw.slow(${r.bars}).range(${up ? `0, ${f(r.gain)}` : `${f(r.gain)}, 0`})${late})${g}.analyze("riser")`);
  }
  return L;
}

// codice di una scena sola, con i layer spenti scritti come "_$:"
export function gen(s) {
  const [, tr, keyName] = KEYS.find(k => k[0] === s.key) || KEYS[4];
  const names = PROGS[s.prog][1].map(c => chordName(c, tr)).join(' ');
  return [`// coding-misk · ${tx(PROGS[s.prog][0])}: ${names} · ${tx(keyName)}`, `// ${t('cTag')}`, `setcpm(${s.bpm}/4)`, '',
    ...sceneLayers(s, { labels: true })].join('\n');
}

const safeName = (n, i) => (String(n || '').replace(/['"`\\\n\r]/g, ' ').replace(/\s+/g, ' ').trim() || `${t('scene')} ${i + 1}`).slice(0, 40);

// Brano composto con l'arrangiatore → codice Strudel.
// Ogni scena è un blocco di layer acceso dalla sua lane (un valore per battuta):
// 1 suona, 0 tace, i valori intermedi sono la dissolvenza tra una scena e la successiva.
export function compileTrack(track) {
  const sc = track.scenes.map(s => ({ ...s, state: normalizeState(s.state) })), starts = [];
  let total = 0;
  for (const s of sc) { starts.push(total); total += s.bars; }
  const names = [];
  sc.forEach((s, i) => { let n = safeName(s.name, i), k = 2; while (names.includes(n)) n = `${safeName(s.name, i)} ${k++}`; names.push(n); });
  const fadeOf = i => i > 0 ? Math.min(sc[i].fade || 0, sc[i].bars) : 0;
  // tempo per battuta: rampa d'entrata dalla scena precedente, poi eventuale rampa fino a bpmEnd
  const tempo = sc.map((s, i) => {
    const st = s.state, prevEnd = i > 0 ? (sc[i - 1].state.bpmEnd ?? sc[i - 1].state.bpm) : st.bpm, fin = fadeOf(i);
    const end = st.bpmEnd ?? st.bpm;
    const per = Array.from({ length: s.bars }, (_, b) => {
      if (b < fin) return prevEnd + (st.bpm - prevEnd) * (b + 1) / fin;
      const rest = s.bars - fin;
      return rest > 1 ? st.bpm + (end - st.bpm) * (b - fin) / (rest - 1) : end;
    }).map(v => Math.round(v * 100) / 100);
    return per.every(v => v === per[0]) ? per[0] : per.map(v => [1, v]);
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
    const [, tr, keyName] = KEYS.find(k => k[0] === s.state.key) || KEYS[4];
    const gate = `scene${i + 1}`;
    L.push('', `// ---------- ${i + 1} · ${names[i]} · ${t('cSceneInfo', { bars: s.bars, bpm: s.state.bpmEnd ? `${s.state.bpm}→${s.state.bpmEnd}` : s.state.bpm, key: tx(keyName), chords: PROGS[s.state.prog][1].map(c => chordName(c, tr)).join(' ') })}${fin ? ' · ' + t('cFadeIn', { n: fin }) : ''} ----------`);
    L.push(`const ${gate} = "${rle(v.map(String))}"`);
    L.push(...sceneLayers(s.state, { start: st, bars: s.bars, gate, crash: s.crash, breath: s.breath, fill: s.fill }));
  });
  return L.join('\n');
}

// scena = { name, bars, fade, crash, breath, state }; edit modifica una copia dello stato predefinito
export const makeScene = (name, bars, opts, edit) => {
  const st = cloneState(DEFAULT); edit && edit(st);
  return { name, bars, fade: 0, crash: false, breath: false, fill: false, ...opts, state: st };
};
const off = (...chs) => st => chs.forEach(c => { st[c].on = false; });

// La traccia di prova del primo giorno, ora un brano a scene.
export const DEMO_TRACK = {
  id: 'demo-synth-lab', title: 'Synth Lab Demo', look: 'tramonto',
  scenes: [
    makeScene('Intro', 8, {}, s => { s.drums.rows.bd.mute = true; off('bass', 'hook')(s); s.arp.cutoff = 900; s.pad.cutoff = 700; s.pad.cutoffEnd = 1400; }),
    makeScene('Build', 8, { fade: 2, breath: true }, s => { s.hook.on = false; s.bass.cutoff = 300; s.bass.cutoffEnd = 700; s.arp.cutoff = 900; s.arp.cutoffEnd = 2600; s.riser.on = true; s.riser.bars = '8'; }),
    makeScene('Drop', 16, { crash: true }, s => { s.arp.cutoff = 2600; }),
    makeScene('Break', 8, { fade: 2, breath: true }, s => { off('drums', 'bass')(s); s.arp.cutoff = 1200; s.pad.room = .95; s.riser.on = true; s.riser.bars = '8'; }),
    makeScene('Drop 2', 16, { crash: true }, s => { s.bpm = 140; s.key = 'B'; s.hook.preset = 'domanda'; s.arp.cutoff = 3000; s.arp.preset = 'pulsar';
      for (const [id, steps] of Object.entries(GROOVES.rolling[1])) s.drums.rows[id].steps = steps; }),
  ],
};

// Codice libero (guida, suoni): se non ha già i suoi .analyze, ne aggiungiamo uno generico.
export const withVisuals = code => code.includes('.analyze(') ? code : `${code}\n\n// ${t('cVis')}\nall(x => x.analyze(1))`;
