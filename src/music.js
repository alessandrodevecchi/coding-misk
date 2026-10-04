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
  D:  { bass: 'd2', pad: 'a2,d3,f#3', arp: ['a3', 'd4', 'f#4', 'a4'] },
  'A#': { bass: 'a#1', pad: 'a#2,d3,f3', arp: ['a#3', 'd4', 'f4', 'a#4'] },
  // settime per lo-fi e jazz
  Am7:   { bass: 'a1', pad: 'g2,c3,e3,a3', arp: ['a3', 'c4', 'e4', 'g4'] },
  Dm7:   { bass: 'd2', pad: 'c3,d3,f3,a3', arp: ['d4', 'f4', 'a4', 'c5'] },
  Em7:   { bass: 'e1', pad: 'd3,e3,g3,b3', arp: ['e4', 'g4', 'b4', 'd5'] },
  Fmaj7: { bass: 'f1', pad: 'a2,c3,e3,f3', arp: ['f3', 'a3', 'c4', 'e4'] },
  Cmaj7: { bass: 'c2', pad: 'g2,b2,c3,e3', arp: ['c4', 'e4', 'g4', 'b4'] },
  G7:    { bass: 'g1', pad: 'f2,g2,b2,d3', arp: ['g3', 'b3', 'd4', 'f4'] },
};
// bicordi di potenza (fondamentale, quinta, ottava) per le chitarre distorte
const POWER = { A: 'a2,e3,a3', 'A#': 'a#2,f3,a#3', F: 'f2,c3,f3', C: 'c3,g3,c4', G: 'g2,d3,g3', D: 'd3,a3,d4', E: 'e2,b2,e3' };
const powerOf = c => POWER[c.match(/^[A-G]#?/)[0]] || CHORDS[c].pad;
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
  andalusa: [{ it: 'Andalusa', en: 'Andalusian' }, ['Am', 'G', 'F', 'E']],
  prog: ['Prog', ['Am', 'C', 'D', 'F']],
  lofi: ['Lo-fi', ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7']],
  jazz: ['ii-V-I', ['Dm7', 'G7', 'Cmaj7', 'Am7']],
  frigio: [{ it: 'Frigio (metal)', en: 'Phrygian (metal)' }, ['Am', 'A#', 'Am', 'G']],
  // armonia ferma: un accordo solo, o con lo scarto di mezzo tono
  drone: [{ it: 'Un accordo (drone)', en: 'One chord (drone)' }, ['Am']],
  tensione: [{ it: 'Tensione (b2)', en: 'Tension (b2)' }, ['Am', 'Am', 'Am', 'A#']],
  arcade: ['Arcade', ['Am', 'F', 'G', 'Am']],
  dorico: [{ it: 'Dorico (i–IV)', en: 'Dorian (i–IV)' }, ['Am', 'Am', 'D', 'D']],
};
export const chordName = (c, tr) => {
  const m = c.match(/^([A-G]#?)(.*)$/);
  return NOTE_NAMES[(NOTE_NAMES.indexOf(m[1]) + tr + 12) % 12] + m[2];
};
export const WAVES = [['sawtooth', 'Sawtooth'], ['supersaw', 'Supersaw'], ['square', 'Square'], ['triangle', 'Triangle'], ['sine', 'Sine'],
  // strumenti General MIDI (soundfont inclusi in Strudel)
  ['gm_epiano1', { it: 'Piano elettrico', en: 'Electric piano' }], ['gm_piano', 'Piano'], ['gm_vibraphone', { it: 'Vibrafono', en: 'Vibraphone' }],
  ['gm_rock_organ', { it: 'Organo rock', en: 'Rock organ' }], ['gm_drawbar_organ', { it: 'Organo drawbar', en: 'Drawbar organ' }],
  ['gm_distortion_guitar', { it: 'Chitarra distorta', en: 'Distortion guitar' }], ['gm_overdriven_guitar', { it: 'Chitarra overdrive', en: 'Overdriven guitar' }],
  ['gm_electric_guitar_clean', { it: 'Chitarra pulita', en: 'Clean guitar' }], ['gm_electric_guitar_muted', { it: 'Chitarra stoppata', en: 'Muted guitar' }],
  ['gm_electric_bass_finger', { it: 'Basso elettrico', en: 'Electric bass' }], ['gm_electric_bass_pick', { it: 'Basso a plettro', en: 'Picked bass' }],
  ['gm_acoustic_bass', { it: 'Contrabbasso', en: 'Upright bass' }], ['gm_string_ensemble_1', { it: 'Archi', en: 'Strings' }],
  ['gm_synth_strings_1', { it: 'Archi synth', en: 'Synth strings' }], ['gm_choir_aahs', { it: 'Coro', en: 'Choir' }], ['gm_flute', { it: 'Flauto', en: 'Flute' }],
  ['cowbell', 'Cowbell 808'], ['gm_celesta', 'Celesta'], ['gm_tubular_bells', { it: 'Campane tubolari', en: 'Tubular bells' }], ['gm_marimba', 'Marimba'], ['gm_lead_2_sawtooth', 'Lead saw'], ['gm_synth_brass_1', { it: 'Ottoni synth', en: 'Synth brass' }], ['gm_pad_warm', { it: 'Pad caldo', en: 'Warm pad' }]];
// metro → sedicesimi per battuta
export const METERS = [['4/4', 16], ['3/4', 12], ['5/4', 20], ['7/8', 14]];
export const meterSteps = m => (METERS.find(x => x[0] === m) || METERS[0])[1];
export const MOVES = [['fisso', { it: 'Fisso', en: 'Fixed' }], ['lento', { it: 'Respiro lento', en: 'Slow sweep' }], ['veloce', { it: 'Respiro veloce', en: 'Fast sweep' }]];
// Ritmi come modelli per beat [beat intero, mezzo beat]: si ripetono per i beat della battuta,
// così funzionano anche in 3/4, 5/4 e 7/8. 'x' da solo = una nota per battuta.
// [nome, ritmo, decay, sustain, forma del volume facoltativa (postgain)]
export const BASS = {
  rolling: ['Rolling', ['[~ x x x]', '[~ x]'], .12, 0], offbeat: ['Offbeat', ['[~ x]', '~'], .18, 0],
  rumble: ['Rumble', ['[~ x x]', '[~ x]'], .1, 0], galoppo: [{ it: 'Galoppo', en: 'Gallop' }, ['[x ~ x x]', '[x ~]'], .1, 0],
  ottavi: [{ it: 'Ottavi (rock)', en: '8th notes (rock)' }, ['[x x]', 'x'], .25, .5],
  walking: [{ it: 'Walking (un beat)', en: 'Walking (quarters)' }, ['x', 'x'], .4, .3],
  sub: [{ it: 'Sub lungo', en: 'Long sub' }, 'x', .6, .8],
  // sedicesimi che riprendono volume dopo ogni cassa: il sidechain del future pop
  pumping: [{ it: 'Pompato (sidechain)', en: 'Pumping (sidechain)' }, ['[x x x x]', '[x x]'], .2, .6, ['[.1 .4 .75 1]', '[.1 .4]']],
  // riff: sedicesimi con lo spostamento in semitoni dalla fondamentale (12 = ottava sopra, 6 = tritono, ~ = pausa)
  spirale: [{ it: 'Riff spirale (ottave)', en: 'Spiral riff (octaves)' }, null, .12, .3, null, '0 ~ 12 0 ~ 0 12 ~ 0 ~ 12 0 ~ 1 0 -2'],
  mirino: [{ it: 'Riff mirino', en: 'Crosshair riff' }, null, .1, .25, null, '0 0 ~ 0 ~ 0 ~ 3 ~ 0 0 ~ 1 ~ ~ ~'],
  tritono: [{ it: 'Riff tritono', en: 'Tritone riff' }, null, .12, .3, null, '0 ~ ~ 0 ~ ~ 0 ~ 7 ~ 6 ~ 0 ~ ~ ~'],
  ottaveArcade: [{ it: 'Ottave arcade', en: 'Arcade octaves' }, null, .1, .3, null, '0 12 0 12 0 12 0 12 0 12 0 12 -2 10 -2 10'],
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
  // 7 ottavi per frase: in 7/8 riempie la battuta, in 4/4 riprende la prima nota
  prog: ['Prog', '<[0 2 4 ~ 4 5 4] [3 2 0 ~ -1 0 2] [4 5 7 ~ 7 9 7] [5 4 2 ~ 0 -1 0]>'],
  assolo: [{ it: 'Assolo', en: 'Solo' }, '<[0 2 3 4 7 4 3 2] [0 2 3 4 7 9 7 4] [9 7 4 3 4 2 0 -1] [0 ~ 7 ~ 4 ~ 0 ~]>'],
  eroico: [{ it: 'Eroico', en: 'Heroic' }, '<[0 ~ 2 4 7 ~ 4 2] [3 ~ 2 0 -1 ~ 0 2] [4 ~ 5 7 9 ~ 7 5] [4 2 0 2 4 ~ ~ ~]>'],
  phonk: ['Phonk', '<[0 ~ 0 ~ 3 ~ 2 ~] [0 ~ 0 ~ 5 ~ 4 3] [0 ~ 0 ~ 3 ~ 2 ~] [7 ~ 5 ~ 4 ~ 3 ~]>'],
  // melodie per il modo cromatico: i numeri sono semitoni (12 = ottava, 6 = tritono, 1 = seconda bemolle)
  allarme: [{ it: 'Allarme (tritono)', en: 'Alarm (tritone)' }, '<[12 ~ ~ ~ 18 ~ ~ ~] [12 ~ ~ 13 ~ ~ 12 ~]>'],
  colpi: [{ it: 'Colpi', en: 'Hits' }, '<[0 ~ ~ 0 ~ ~ 12 ~] [~ ~ 0 ~ 1 ~ ~ ~]>'],
  boss: ['Boss', '<[0 1 0 1 0 ~ 6 ~] [0 1 0 1 3 ~ 1 ~]>'],
  // Segnale nel rumore: poche note che emergono, una frase che respira
  segnale: [{ it: 'Segnale', en: 'Signal' }, '<[~ ~ ~ 12 ~ ~ ~ ~] [~ ~ ~ ~ ~ 19 ~ ~] [~ 12 ~ ~ ~ ~ ~ ~] [~ ~ ~ ~ 15 ~ ~ ~]>'],
  anima: [{ it: 'Anima', en: 'Soul' }, '<[0 ~ 4 ~ 3 ~ ~ 2] [~ 4 ~ 7 ~ 5 4 ~] [0 ~ 4 ~ 3 ~ 2 0] [-3 ~ ~ ~ ~ ~ ~ ~]>'],
  arcade: ['Arcade', '<[0 0 12 0 ~ 0 10 12] [0 0 12 0 ~ 15 12 10] [8 8 15 8 ~ 8 13 15] [10 ~ 12 ~ 15 ~ 17 ~]>'],
  arcadeB: ['Arcade B', '<[12 ~ 10 12 ~ 15 ~ 12] [10 ~ 8 7 ~ 5 ~ 3] [5 ~ 7 8 ~ 10 ~ 12] [15 12 10 7 ~ 12 ~ ~]>'],
  pioggia: [{ it: 'Pioggia', en: 'Rain' }, '<[4 ~ 2 ~ 0 ~ ~ ~] [~ 1 2 ~ 4 ~ 2 ~] [5 ~ 4 ~ 2 ~ 0 ~] [1 ~ ~ ~ ~ ~ ~ ~]>'],
  orizzonte: [{ it: 'Orizzonte', en: 'Horizon' }, '<[4 ~ 4 5 4 ~ 2 ~] [0 ~ 2 ~ 4 ~ 7 ~] [5 ~ 5 4 2 ~ 0 ~] [1 ~ 2 ~ 4 ~ ~ ~]>'],
};
export const MODES = [['minor', { it: 'Minore', en: 'Minor' }], ['phrygian', { it: 'Frigio', en: 'Phrygian' }], ['dorian', { it: 'Dorico', en: 'Dorian' }], ['mixolydian', { it: 'Misolidio', en: 'Mixolydian' }],
  ['locrian', { it: 'Locrio (tritono)', en: 'Locrian (tritone)' }], ['chromatic', { it: 'Cromatico (semitoni)', en: 'Chromatic (semitones)' }]];
export const HARMONIES = [['', { it: 'Nessuna', en: 'None' }], ['2', { it: 'Terze (chitarre gemelle)', en: 'Thirds (twin guitars)' }], ['4', { it: 'Quinte', en: 'Fifths' }]];
// Chitarra: campione di chitarra + dente di sega, saturati insieme, come un amplificatore simulato.
// [nome, suoni sovrapposti, saturazione di base, passa-alto]
export const GUITAR_TYPES = {
  clean: [{ it: 'Pulita', en: 'Clean' }, 'gm_electric_guitar_clean', 0, 60],
  crunch: ['Crunch', 'gm_overdriven_guitar,sawtooth', 1.5, 70],
  distorted: [{ it: 'Distorta', en: 'Distorted' }, 'gm_distortion_guitar,sawtooth', 3, 80],
  metal: ['Metal hi-gain', 'gm_distortion_guitar,sawtooth', 6, 110],
  muted: [{ it: 'Palm mute', en: 'Palm muted' }, 'gm_electric_guitar_muted,sawtooth', 4, 90],
};
// [nome, ritmo per beat o sedicesimi, note corte, riff]
// riff: sedicesimi con lo spostamento in semitoni del power chord (0 = accordo, 1 = seconda bemolle, ~ = pausa)
export const GUITAR_PATTERNS = {
  thrash: [{ it: 'Riff thrash', en: 'Thrash riff' }, null, true, '0 0 0 0 0 0 1 0 0 0 0 0 3 0 1 0'],
  gallopRiff: [{ it: 'Riff in galoppo', en: 'Gallop riff' }, null, true, '0 ~ 0 0 0 ~ 0 0 1 ~ 1 1 0 ~ -2 -2'],
  groove: [{ it: 'Riff groove', en: 'Groove riff' }, null, true, '0 ~ ~ 0 0 ~ 3 ~ 0 ~ ~ 0 5 ~ 3 ~'],
  djentRiff: [{ it: 'Riff djent', en: 'Djent riff' }, null, true, '0 ~ ~ 0 ~ ~ 0 ~ ~ 0 ~ 1 ~ ~ 0 ~'],
  heroic: [{ it: 'Aperture eroiche', en: 'Heroic chords' }, null, false, '0 ~ 0 ~ 0 ~ 0 ~ 5 ~ 5 ~ 3 ~ 2 ~'],
  // industrial: colpi secchi sui tempi forti (stomp) e sedicesimi stoppati che seguono la cassa
  stomp: ['Stomp (industrial)', null, true, '0 ~ ~ ~ 0 ~ ~ ~ 0 ~ 0 ~ 1 ~ ~ ~'],
  industrial: ['Industrial', null, true, '0 ~ 0 0 ~ 0 0 ~ 1 ~ 0 0 ~ 3 1 ~'],
  power8: [{ it: 'Power chord a ottavi', en: 'Power chords, 8ths' }, ['[x x]', 'x']],
  chug: [{ it: 'Chug a sedicesimi', en: '16th chugs' }, ['[x x x x]', '[x x]'], true],
  gallop: [{ it: 'Galoppo', en: 'Gallop' }, ['[x ~ x x]', '[x ~]'], true],
  riff: ['Riff', 'x ~ x x ~ x ~ x x ~ x ~ x x ~ ~', true],
  djent: ['Djent', 'x ~ ~ x ~ ~ x ~ x ~ ~ x ~ ~ x ~', true],
  quarter: [{ it: 'Quarti', en: 'Quarters' }, ['x', 'x']],
  held: [{ it: 'Tenuto', en: 'Held' }, ''],
};
export const VOWELS = [['', { it: 'Nessuna', en: 'None' }], ['<a e i o>', 'a e i o'], ['a', 'a'], ['o', 'o']];
// [nome, ritmo, attack, decay, sustain, release, forma del volume (postgain), voicing]
// ritmo: '' = accordo tenuto; [beat, mezzo beat] = modello per beat; stringa = sedicesimi che si ripetono
export const PADS = {
  pad: [{ it: 'Tappeto', en: 'Sustained' }, '', .4, 0, 1, 1.2],
  stab: ['Stab', 'x ~ ~ x ~ ~ x ~ ~ ~ x ~ x ~ ~ ~', .01, .15, 0, .1],
  pump: [{ it: 'In levare', en: 'Offbeat pump' }, ['[~ x]', '~'], .02, .25, .2, .3],
  sidechain: ['Sidechain', ['[x x x x]', '[x x]'], .01, .2, .7, .05, ['[.1 .4 .75 1]', '[.1 .4]']],
  staccato: [{ it: 'Staccato a ottavi', en: 'Staccato 8ths' }, ['[x x]', 'x'], .005, .08, 0, .05],
  synco: [{ it: 'Sincopato', en: 'Syncopated' }, ['[~ ~ x x]', '[~ ~]'], .005, .1, 0, .05],
  comp: [{ it: 'Accompagnamento (lo-fi)', en: 'Comping (lo-fi)' }, 'x ~ ~ ~ ~ ~ x ~ ~ ~ x ~ ~ ~ ~ ~', .01, .9, .35, .8],
  power: [{ it: 'Power chord a ottavi', en: 'Power chords, 8ths' }, ['[x x]', 'x'], .005, .25, .6, .1, null, 'power'],
  riff: [{ it: 'Riff power chord', en: 'Power chord riff' }, ['[x ~ x x]', '[x ~]'], .005, .2, .5, .1, null, 'power'],
  ring: [{ it: 'Power chord tenuto', en: 'Held power chord' }, '', .01, 0, 1, .6, null, 'power'],
};
// 'vinyl' non è un campione: è fruscio sintetico
export const TEXTURES = ['vinyl', 'numbers', 'industrial', 'metal', 'glitch', 'space', 'wind', 'crow'];
// [nome, mini-notation con X al posto del campione, varianti n]
export const TEX_RHYTHMS = {
  bar: [{ it: 'Uno per battuta', en: 'One per bar' }, 'X', '<0 3 7 1>'],
  euclid: [{ it: 'Euclideo 3/8', en: 'Euclidean 3/8' }, 'X(3,8,2)', '<0 2 4 6>'],
  eighth: [{ it: 'Ottavi', en: '8th notes' }, 'X*8', 'irand(16)'],
  sixteenth: [{ it: 'Sedicesimi', en: '16th notes' }, 'X*16', 'irand(16)'],
};
// drum machine senza piatto crash: il crash viene preso dalla 909
const NO_CRASH = ['YamahaRX5', 'AlesisHR16', 'KorgMinipops'];
export const KITS = ['RolandTR909', 'RolandTR808', 'RolandTR707', 'RolandTR606', 'LinnDrum', 'AkaiLinn', 'LinnLM1', 'OberheimDMX', 'EmuSP12', 'AkaiMPC60', 'AlesisHR16', 'YamahaRX5'];
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
  rock:     ['Rock', { bd: 'x.......x.x.....', cp: E16, sd: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }],
  boombap:  ['Boom bap (lo-fi)', { bd: 'x......x.x......', cp: E16, sd: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: '..............x.', rd: E16 }],
  // metri dispari: 7/8 = 2+2+3 ottavi, 5/4 = 3+2 beat
  prog78:   ['Prog 7/8', { bd: 'x.......x.....', cp: '..............', sd: '....x.......x.', hh: 'x.x.x.x.x.x.x.', oh: '..............', rd: '..............' }],
  prog54:   ['Prog 5/4', { bd: 'x.........x.........', cp: '....................', sd: '....x.......x...x...', hh: 'x.x.x.x.x.x.x.x.x.x.', oh: '....................', rd: '....................' }],
};
// adatta una riga del sequencer alla lunghezza della battuta
export const fitSteps = (steps, n) => steps.length >= n ? steps.slice(0, n) : steps + '.'.repeat(n - steps.length);
GROOVES.metal = ['Metal (doppia cassa)', { bd: 'xxxxxxxxxxxxxxxx', cp: E16, sd: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }];
GROOVES.gallopDrums = [{ it: 'Galoppo (metal)', en: 'Gallop (metal)' }, { bd: 'x.xxx.xxx.xxx.xx', cp: E16, sd: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }];
GROOVES.blast = ['Blast beat', { bd: 'x.x.x.x.x.x.x.x.', cp: E16, sd: '.x.x.x.x.x.x.x.x', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }];
GROOVES.phonk = ['Phonk', { bd: 'x......x..x.....', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '......x.......x.', rd: E16 }];
export const LOOKS = [
  ['palco', { it: 'Palco', en: 'Stage' }], ['pixel', 'Pixel'], ['tramonto', { it: 'Tramonto', en: 'Sunset' }],
  ['montagne', { it: 'Montagne', en: 'Mountains' }], ['spazio', { it: 'Spazio', en: 'Space' }], ['sonar', 'Sonar'],
];
// strumenti del visual Palco, nell'ordine in cui compaiono sul palco
export const INSTRUMENTS = ['kick', 'snare', 'hats', 'fx', 'bass', 'guitar', 'arp', 'pad', 'hook', 'riser'];

// Stato di una scena. "…End" a null significa nessuna automazione: il valore resta fisso.
// cutoff 20000 = filtro aperto. grit 0 = niente bitcrusher. drive 0 = niente saturazione.
export const DEFAULT = {
  bpm: 138, bpmEnd: null, key: 'A', prog: 'epica', meter: '4/4', swing: 0,
  drums: { on: true, kit: 'RolandTR909', gain: .9, gainEnd: null, cutoff: 20000, cutoffEnd: null, drive: 0, grit: 0,
    rows: Object.fromEntries(ROWS.map(([id]) => [id, { steps: GROOVES.trance[1][id], mute: false }])) },
  bass: { on: true, preset: 'rolling', wave: 'sawtooth', gain: .8, gainEnd: null, cutoff: 700, cutoffEnd: null, move: 'lento', reso: 8, drive: 0 },
  arp: { on: true, preset: 'su', wave: 'supersaw', gain: .4, gainEnd: null, cutoff: 2400, cutoffEnd: null, move: 'lento', reso: 4, delay: .35, speed: '16', drive: 0 },
  hook: { on: true, preset: 'richiamo', wave: 'square', gain: .3, gainEnd: null, cutoff: 3000, cutoffEnd: null, move: 'fisso', delay: .4, mode: 'minor', fm: 0, vowel: '', grit: 0, drive: 0, harmony: '', octave: '4' },
  guitar: { on: false, type: 'distorted', pattern: 'power8', gain: .5, gainEnd: null, cutoff: 4200, cutoffEnd: null, drive: 0, octave: '0', width: 'double', room: .2 },
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
  const q = steps.split('').map(c => c === 'x' ? id : '~');
  if (q.length % 4) return q.join(' ');
  const groups = [];
  for (let i = 0; i < q.length; i += 4) { const b = q.slice(i, i + 4); groups.push(b.every(x => x === '~') ? '~' : `[${b.join(' ')}]`); }
  return groups.join(' ');
};
// modello per beat → battuta di n sedicesimi; l'eventuale mezzo beat finale pesa 2 (@2)
const beatGrid = ([beat, half], n) => {
  const full = Math.floor(n / 4), rest = n % 4, toks = Array(full).fill(beat);
  if (!rest) return toks.join(' ');
  return [...toks.map(x => `${x}@4`), `${half}@${rest}`].join(' ');
};
// sedicesimi scritti per il 4/4 → n sedicesimi, ripetendo da capo
const stepGrid = (str, n) => { const t = str.split(' '); return Array.from({ length: n }, (_, i) => t[i % t.length]).join(' '); };
const rhythm = (spec, n) => !spec ? '' : Array.isArray(spec) ? beatGrid(spec, n) : spec === 'x' ? 'x' : stepGrid(spec, n);
// "a [b c] d" → ["a", "[b c]", "d"]
const topTokens = s => {
  const out = []; let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === '[' || ch === '<') depth++;
    if (ch === ']' || ch === '>') depth--;
    if (ch === ' ' && depth === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};
// riempie la battuta con "count" elementi presi in ciclo dal modello
const fitTokens = (str, count) => { const t = topTokens(str.replace(/^\[(.*)\]$/, '$1')); return Array.from({ length: count }, (_, i) => t[i % t.length]).join(' '); };
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
  const N = meterSteps(s.meter);
  const sw = s.swing > 0 && N % 2 === 0 ? `.swingBy(${num(s.swing / 6)}, ${N / 2})` : '';
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
    const row = d.rows[id], on = d.on && !row.mute, steps = fitSteps(row.steps, N);
    if (!steps.includes('x') || !show(on)) continue;
    L.push(`${lab(on)}: s("${drumPattern(id, steps)}").bank("${d.kit}").gain(${scaleGain(d.gain, d.gainEnd, mult)})${filter(d.cutoff, d.cutoffEnd)}${drive(d.drive)}${grit(d.grit)}${sw}${breathMask}${g}.analyze("${inst}")`);
  }
  if (fill && d.on) L.push(`$: s("sd*${N}").bank("${d.kit}").gain(saw.range(.15, .75)).mask("${rle(rotate([...Array(Math.max(0, bars - 1)).fill('0'), '1'], start))}")${g}.analyze("snare")`);
  if (crash && d.on) L.push(`$: s("cr").bank("${NO_CRASH.includes(d.kit) ? 'RolandTR909' : d.kit}").gain(.55).room(.4).mask("${rle(rotate(['1', ...Array(Math.max(0, bars - 1)).fill('0')], start))}")${g}.analyze("fx")`);

  const b = s.bass, bp = BASS[b.preset] || BASS.rolling;
  if (show(b.on)) {
    L.push('', `// ${t('cBass')} · ${tx(bp[0])}`);
    const briff = bp[5] ? stepGrid(bp[5], N).split(' ') : null;
    const bstruct = briff ? briff.map(x => x === '~' ? '~' : 'x').join(' ') : rhythm(bp[1], N);
    const bshift = briff ? `.transpose("${briff.map(x => x === '~' ? 0 : x).join(' ')}")` : '';
    L.push(`${lab(b.on)}: note("<${chords.map(c => CHORDS[c].bass).join(' ')}>")${trs}.struct("${bstruct}")${bshift}${sw}`);
    L.push(`  .s("${b.wave}")${filter(b.cutoff, b.cutoffEnd, b.move)}.lpq(${num(b.reso)})${drive(b.drive)}`);
    L.push(`  .decay(${f(bp[2])}).sustain(${f(bp[3])})${bp[4] ? `.postgain("${rhythm(bp[4], N)}")` : ''}.gain(${auto(b.gain, b.gainEnd)})${breathMask}${g}.analyze("bass")`);
  }
  const a = s.arp, ap = ARPS[a.preset] || ARPS.su;
  if (show(a.on)) {
    const count = a.speed === '16' ? N : N / 2;
    L.push('', `// ${t('cArp')} · ${tx(ap[0])}, ${a.speed === '16' ? t('c16') : t('c8')}`);
    L.push(`${lab(a.on)}: note("<${chords.map(c => `[${fitTokens(ap[1], count).replace(/\d/g, i => CHORDS[c].arp[i])}]`).join(' ')}>")${trs}${sw}`);
    L.push(`  .s("${a.wave}")${filter(a.cutoff, a.cutoffEnd, a.move)}.lpq(${num(a.reso)})${drive(a.drive)}`);
    L.push(`  .decay(.15).sustain(.15)${a.delay > 0 ? `.delay(${f(a.delay)})` : ''}.gain(${auto(a.gain, a.gainEnd)})${breathMask}${g}.analyze("arp")`);
  }
  const h = s.hook, hp = HOOKS[h.preset] || HOOKS.richiamo;
  if (show(h.on)) {
    const items = (altItems(hp[1]) || [hp[1]]).map(it => `[${fitTokens(it, Math.max(1, Math.round(N / 2)))}]`);
    const mel = `<${rotate(items, start).join(' ')}>`;
    L.push('', `// Hook · ${tx(hp[0])}`);
    L.push(`${lab(h.on)}: n("${mel}")${h.harmony ? `.superimpose(x => x.add(${h.harmony}))` : ''}.scale("${s.key}${h.octave || 4}:${h.mode}")${sw}`);
    L.push(`  ${h.wave === 'cowbell' ? '.s("cb").bank("RolandTR808")' : `.s("${h.wave}")`}${drive(h.drive)}${h.fm > 0 ? `.fm(${num(h.fm)})` : ''}${h.vowel ? `.vowel("${h.vowel}")` : ''}${filter(h.cutoff, h.cutoffEnd, h.move)}${grit(h.grit)}`);
    L.push(`  .decay(.2).sustain(.3).delay(${f(h.delay)}).room(.3).gain(${auto(h.gain, h.gainEnd)})${breathMask}${g}.analyze("hook")`);
  }
  const gt = s.guitar, gty = GUITAR_TYPES[gt.type] || GUITAR_TYPES.distorted, gpt = GUITAR_PATTERNS[gt.pattern] || GUITAR_PATTERNS.power8;
  if (show(gt.on)) {
    // riff: struttura dalle note, spostamento del power chord battuta per battuta
    const riff = gpt[3] ? stepGrid(gpt[3], N).split(' ') : null;
    const gr = riff ? riff.map(x => x === '~' ? '~' : 'x').join(' ') : rhythm(gpt[1], N), short = gt.type === 'muted' || gpt[2], held = !gr;
    const shift = riff ? `.transpose("${riff.map(x => x === '~' ? 0 : x).join(' ')}")` : '';
    const gtr = tr + (Number(gt.octave) || 0), dist = gty[2] + gt.drive;
    const voicing = c => gt.type === 'clean' ? CHORDS[c].pad : powerOf(c);
    L.push('', `// ${t('cGuitar')} · ${tx(gty[0])}, ${tx(gpt[0])}${gt.octave && gt.octave !== '0' ? ` · ${t('tuning').toLowerCase()} ${gt.octave}` : ''}`);
    L.push(`${lab(gt.on)}: note("<${chords.map(c => `[${voicing(c)}]`).join(' ')}>")${gtr ? `.transpose(${gtr})` : ''}${gr ? `.struct("${gr}")` : ''}${shift}${gr ? sw : ''}`);
    L.push(`  .s("${gty[1]}").attack(.003).decay(${held ? 1.5 : short ? .09 : .3}).sustain(${held ? .8 : short ? 0 : .55}).release(.08)`);
    L.push(`  ${dist > 0 ? `.distort(${num(dist)}).distortvol(.2)` : ''}.hpf(${gty[3]})${filter(gt.cutoff, gt.cutoffEnd)}${gt.width === 'double' ? '.jux(x => x.late(.012))' : ''}`);
    // il volume va dopo l'amplificatore (postgain): prima della distorsione cambierebbe solo la saturazione
    const lvl = auto(gt.gain, gt.gainEnd);
    L.push(`  .room(${f(gt.room)}).gain(.8)${breathMask}${gate ? `.mask(${gate}).postgain(${gate}.mul(${lvl}))` : `.postgain(${lvl})`}.analyze("guitar")`);
  }
  const p = s.pad, pp = PADS[p.preset] || PADS.pad;
  if (show(p.on)) {
    L.push('', `// ${t('cPad')} · ${tx(pp[0])}`);
    const voice = c => pp[7] === 'power' ? powerOf(c) : CHORDS[c].pad;
    const pr = rhythm(pp[1], N);
    L.push(`${lab(p.on)}: note("<${chords.map(c => `[${voice(c)}]`).join(' ')}>")${trs}${pr ? `.struct("${pr}")` : ''}${pr ? sw : ''}`);
    L.push(`  .s("${p.wave}").attack(${f(pp[2])})${pp[3] ? `.decay(${f(pp[3])}).sustain(${f(pp[4])})` : ''}.release(${f(pp[5])})${filter(p.cutoff, p.cutoffEnd, p.move)}${drive(p.drive)}`);
    L.push(`  .room(${f(p.room)})${pp[6] ? `.postgain("${rhythm(pp[6], N)}")` : ''}.gain(${auto(p.gain, p.gainEnd)})${g}.analyze("pad")`);
  }
  const x = s.texture, xr = TEX_RHYTHMS[x.rhythm] || TEX_RHYTHMS.bar;
  if (show(x.on)) {
    L.push('', `// Texture · ${x.sample}`);
    if (x.sample === 'vinyl') {
      // fruscio del vinile: impulsi di rumore brevissimi e radi
      L.push(`${lab(x.on)}: s("white*${N * 2}").degradeBy(.9).decay(.006).sustain(0).hpf(1800).pan(rand)`);
      L.push(`  .gain(${auto(x.gain * .5, x.gainEnd === null || x.gainEnd === undefined ? null : x.gainEnd * .5)})${g}.analyze("fx")`);
    } else {
      const nArg = xr[2].startsWith('irand') ? xr[2] : `"${xr[2]}"`;
      const pat = xr[1].replace('*16', `*${N}`).replace('*8', `*${N / 2}`).replace('X', x.sample);
      L.push(`${lab(x.on)}: s("${pat}").n(${nArg})${grit(x.grit)}.hpf(400).room(${f(x.room)})${xr[1].includes('*') ? '.pan(rand)' : ''}`);
      L.push(`  .gain(${auto(x.gain, x.gainEnd)})${g}.analyze("fx")`);
    }
  }
  const r = s.riser;
  if (show(r.on)) {
    const up = r.dir !== 'down';
    L.push('', `// ${t(up ? 'cRiser' : 'cDown', { n: r.bars })}`);
    L.push(`${lab(r.on)}: s("white*${N}").decay(.06).sustain(0)`);
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
    }).map(v => Math.round(v * 16 / meterSteps(st.meter) * 100) / 100);
    // TEMPO è in "BPM da 4/4": in 7/8 una battuta dura 14 sedicesimi invece di 16
    return per.every(v => v === per[0]) ? per[0] : per.map(v => [1, v]);
  });
  const L = [
    `// coding-misk · ${safeName(track.title, 0)}`,
    `// ${t('cTrack')}`,
    `// ${t('cTag')}`,
    `setcpm(${Math.round(sc[0].state.bpm * 16 / meterSteps(sc[0].state.meter) * 100) / 100}/4)`, '',
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
    L.push('', `// ---------- ${i + 1} · ${names[i]} · ${t('cSceneInfo', { bars: `${s.bars}${s.state.meter !== '4/4' ? ` (${s.state.meter})` : ''}`, bpm: s.state.bpmEnd ? `${s.state.bpm}→${s.state.bpmEnd}` : s.state.bpm, key: tx(keyName), chords: PROGS[s.state.prog][1].map(c => chordName(c, tr)).join(' ') })}${fin ? ' · ' + t('cFadeIn', { n: fin }) : ''} ----------`);
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
