// Brani a scene inclusi nell'app. Ognuno si apre e si modifica nell'arrangiatore.
// Ghost Protocol e Neon Ascent sono la versione a scene dei brani scritti a mano in patterns/:
// stessa struttura, stesse idee di transizione, con gli strumenti dell'arrangiatore.
import { makeScene, GROOVES, DEMO_TRACK } from './music.js';

const E16 = '................';
const steps = (s, rows) => { for (const [id, st] of Object.entries(rows)) s.drums.rows[id].steps = st; };
const only = (s, keep) => { for (const c of ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture', 'riser']) s[c].on = keep.includes(c); };
// chitarra ritmica sul canale Chitarra: tipo, ritmo, volume, opzioni
const guitar = (s, pattern, gain = .5, type = 'distorted', extra = {}) => Object.assign(s.guitar, { on: true, type, pattern, gain, gainEnd: null, cutoff: 4200, cutoffEnd: null, drive: 0, octave: '0', width: 'double', room: .2, ...extra });
const cyber = (s, key = 'E') => { s.key = key; s.prog = 'cyber'; };
const acid = (s, from, to, gain = .36, drive = 1.4) => Object.assign(s.arp, { on: true, preset: 'acid', wave: 'sawtooth', speed: '8', cutoff: from, cutoffEnd: to, reso: 20, drive, delay: 0, gain, move: 'fisso' });
const rumble = (s, from, to, gain = .55) => Object.assign(s.bass, { on: true, preset: 'rumble', wave: 'sawtooth', cutoff: from, cutoffEnd: to, reso: 10, drive: 3, gain, move: 'fisso' });
const cyberHook = (s, gain, extra = {}) => Object.assign(s.hook, { on: true, preset: 'cyber', mode: 'phrygian', wave: 'square', fm: 3, vowel: '<a e i o>', cutoff: 3500, delay: .45, gain, move: 'fisso', ...extra });

export const GHOST_TRACK = {
  id: 'ghost-protocol-scenes', title: 'Ghost Protocol', look: 'palco',
  style: { it: 'Hard techno cyberpunk · Mi frigio, poi Fa nel drop B · tempo da 132 a 148 BPM', en: 'Cyberpunk hard techno · E phrygian, then F in drop B · tempo from 132 to 148 BPM' },
  scenes: [
    makeScene('Intro', 8, {}, s => {
      s.bpm = 132; cyber(s); only(s, ['drums', 'bass', 'pad', 'texture']);
      Object.assign(s.drums, { kit: 'RolandTR606', gain: .6, gainEnd: 1, grit: .9 }); steps(s, { bd: E16, cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16 });
      Object.assign(s.bass, { preset: 'sub', wave: 'sine', cutoff: 400, gain: 0, gainEnd: .5, move: 'fisso' });
      Object.assign(s.pad, { cutoff: 500, cutoffEnd: 1400, gain: .05, gainEnd: .28, room: .9 });
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'bar', grit: .85, gain: .5, room: .7 });
    }),
    makeScene('Build', 8, { fade: 2, breath: true }, s => {
      s.bpm = 134; s.bpmEnd = 140; cyber(s); only(s, ['drums', 'bass', 'arp', 'pad', 'texture', 'riser']);
      Object.assign(s.drums, { drive: 1.6, gain: .9 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: '..x...x...x...x.', oh: E16, rd: E16 });
      rumble(s, 200, 450, .2); s.bass.gainEnd = .55;
      acid(s, 300, 2800, .3, 1); s.arp.gainEnd = .38;
      Object.assign(s.pad, { gain: .28, gainEnd: .08 });
      Object.assign(s.texture, { sample: 'industrial', rhythm: 'eighth', grit: .6, gain: .25 });
      Object.assign(s.riser, { bars: '8', gain: .35 });
    }),
    makeScene('Drop A', 12, { crash: true }, s => {
      s.bpm = 140; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'texture']);
      Object.assign(s.drums, { drive: 1.6, grit: .4 }); steps(s, { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', rd: E16 });
      rumble(s, 450, null); acid(s, 1400, 3400);
      cyberHook(s, 0, { fm: 2 }); s.hook.gainEnd = .24;
      Object.assign(s.pad, { preset: 'stab', cutoff: 2800, drive: .8, room: .4, gain: .3, move: 'fisso' });
      Object.assign(s.texture, { sample: 'metal', rhythm: 'euclid', grit: .75, gain: .35, room: .3 });
    }),
    makeScene('Fall', 2, {}, s => {
      s.bpm = 140; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'riser']);
      Object.assign(s.drums, { drive: 1.6, gain: .9, gainEnd: .3 }); steps(s, { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 });
      rumble(s, 450, 150, .55); s.bass.gainEnd = .2;
      acid(s, 3000, 450);
      cyberHook(s, .24, { delay: .7 });
      Object.assign(s.pad, { preset: 'stab', cutoff: 2800, cutoffEnd: 600, gain: .3, gainEnd: .06, move: 'fisso' });
      Object.assign(s.riser, { dir: 'down', bars: '2', gain: .35 });
    }),
    makeScene('Break', 6, { fade: 1, crash: true }, s => {
      s.bpm = 140; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'texture']);
      Object.assign(s.drums, { kit: 'LinnDrum', gain: .75, grit: .85 }); steps(s, GROOVES.halftime[1]);
      Object.assign(s.bass, { preset: 'sub', wave: 'sine', cutoff: 400, gain: .6, move: 'fisso', drive: 0 });
      acid(s, 380, null, .18, 1);
      Object.assign(s.pad, { cutoff: 1400, cutoffEnd: 2400, room: .9, gain: .28 });
      cyberHook(s, .24, { delay: .6 });
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'bar', grit: .85, gain: .4, room: .7 });
    }),
    makeScene('Rebuild', 8, { fade: 2, breath: true }, s => {
      s.bpm = 141; s.bpmEnd = 148; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'riser']);
      Object.assign(s.drums, { drive: 1.8, gain: .5, gainEnd: .9, cutoff: 300, cutoffEnd: 20000 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: '..x...x...x...x.', oh: E16, rd: E16 });
      rumble(s, 150, 500, .2); s.bass.gainEnd = .55;
      acid(s, 400, 3600, .3, 1.2); s.arp.gainEnd = .36;
      Object.assign(s.pad, { cutoff: 2400, cutoffEnd: 800, gain: .28, gainEnd: .06 });
      cyberHook(s, .24); s.hook.gainEnd = .1;
      Object.assign(s.riser, { bars: '8', gain: .4 });
    }),
    makeScene('Drop B', 12, { crash: true }, s => {
      s.bpm = 148; cyber(s, 'F'); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'texture']);
      Object.assign(s.drums, { drive: 2, grit: .6 }); steps(s, GROOVES.hard[1]);
      rumble(s, 500, null); s.bass.drive = 3.5;
      acid(s, 1800, 4800, .34, 1.8); s.arp.reso = 24;
      Object.assign(s.pad, { preset: 'stab', cutoff: 3400, drive: 1.2, room: .4, gain: .3, move: 'fisso' });
      cyberHook(s, .22, { fm: 4, grit: .6 });
      Object.assign(s.texture, { sample: 'industrial', rhythm: 'eighth', grit: .9, gain: .18, room: .2 });
    }),
    makeScene('Outro', 4, {}, s => {
      s.bpm = 148; cyber(s, 'F'); only(s, ['drums', 'bass', 'arp', 'pad', 'texture']);
      Object.assign(s.drums, { drive: 2.5, grit: .95, gain: .9, gainEnd: .2 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16 });
      rumble(s, 500, 120, .5); s.bass.gainEnd = .1;
      acid(s, 3000, 250, .34); s.arp.gainEnd = 0;
      Object.assign(s.pad, { gain: 0, gainEnd: .3, cutoff: 1400 });
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'bar', grit: .9, gain: .5, room: .8 });
    }),
  ],
};

const neonHook = s => Object.assign(s.hook, { on: true, preset: 'neon', mode: 'minor', wave: 'square', cutoff: 3200, delay: .4, gain: .28, move: 'fisso' });
export const NEON_TRACK = {
  id: 'neon-ascent-scenes', title: 'Neon Ascent', look: 'tramonto',
  style: { it: 'Techno trance · La minore · 128 BPM', en: 'Techno trance · A minor · 128 BPM' },
  scenes: [
    makeScene('Intro', 4, {}, s => {
      s.bpm = 128; only(s, ['drums', 'pad']);
      steps(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: '..x...x...x...x.', rd: E16 });
      Object.assign(s.pad, { cutoff: 1400, gain: .3, room: .9, move: 'fisso' });
    }),
    makeScene('Build', 8, {}, s => {
      s.bpm = 128; only(s, ['drums', 'bass', 'arp', 'riser']);
      Object.assign(s.drums, { gain: .7, gainEnd: .95 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', rd: E16 });
      Object.assign(s.bass, { gain: 0, gainEnd: .85, reso: 10 });
      Object.assign(s.arp, { preset: 'su', cutoff: 600, cutoffEnd: 4200, reso: 5, delay: .3, gain: .38 });
      Object.assign(s.riser, { bars: '8', gain: .3 });
    }),
    makeScene('Drop', 8, { crash: true }, s => {
      s.bpm = 128; only(s, ['drums', 'bass', 'arp', 'hook', 'pad']);
      steps(s, { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', rd: E16 });
      Object.assign(s.bass, { gain: .85, reso: 10 });
      Object.assign(s.arp, { cutoff: 4200, reso: 5, delay: .3, gain: .38, move: 'fisso' });
      Object.assign(s.pad, { preset: 'pump', cutoff: 2200, room: .5, gain: .3, move: 'fisso' });
      neonHook(s);
    }),
    makeScene('Break', 4, { fade: 1 }, s => {
      s.bpm = 128; only(s, ['arp', 'hook', 'pad', 'riser']);
      Object.assign(s.arp, { cutoff: 2000, reso: 5, delay: .3, gain: .38, move: 'fisso' });
      Object.assign(s.pad, { cutoff: 1400, room: .9, gain: .3, move: 'fisso' });
      neonHook(s);
      Object.assign(s.riser, { bars: '4', gain: .3 });
    }),
    makeScene('Drop 2', 8, { crash: true }, s => {
      s.bpm = 128; only(s, ['drums', 'bass', 'arp', 'hook', 'pad']);
      steps(s, { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: '..x...x...x...x.', rd: '..x...x...x...x.' });
      Object.assign(s.bass, { gain: .85, reso: 10 });
      Object.assign(s.arp, { cutoff: 4200, reso: 5, delay: .3, gain: .38, move: 'fisso' });
      Object.assign(s.pad, { preset: 'pump', cutoff: 2200, room: .5, gain: .3, move: 'fisso' });
      neonHook(s);
    }),
  ],
};

// ---------- stile "future pop" (da sf-tenyears-149s.m4a) ----------
// 92 BPM, Mi minore, cassa dritta con sidechain su pad e basso, plucks a sedicesimi, swoosh e riser.
const fourFloor = (s, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR909', gain: .85, drive: 0, grit: 0 }); steps(s, { bd: 'x...x...x...x...', cp: '....x.......x...', sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16, ...extra }); };
const scPad = (s, cutoff, cutoffEnd = null, gain = .3) => Object.assign(s.pad, { on: true, preset: 'sidechain', wave: 'supersaw', cutoff, cutoffEnd, gain, gainEnd: null, room: .45, move: 'fisso', drive: 0 });
const airPad = (s, cutoff, cutoffEnd = null, gain = .28, gainEnd = null) => Object.assign(s.pad, { on: true, preset: 'pad', wave: 'supersaw', cutoff, cutoffEnd, gain, gainEnd, room: .9, move: 'fisso', drive: 0 });
const pumpBass = (s, gain = .7) => Object.assign(s.bass, { on: true, preset: 'pumping', wave: 'sine', cutoff: 600, cutoffEnd: null, reso: 2, gain, gainEnd: null, move: 'fisso', drive: 0 });
const subBass = (s, gain = .4) => Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 400, cutoffEnd: null, reso: 2, gain, gainEnd: null, move: 'fisso', drive: 0 });
const pluck = (s, cutoff = 2600, gain = .28, cutoffEnd = null, gainEnd = null) => Object.assign(s.arp, { on: true, preset: 'sugiu', wave: 'triangle', speed: '16', cutoff, cutoffEnd, reso: 2, delay: .35, gain, gainEnd, move: 'fisso', drive: 0 });
const lead = (s, preset, gain = .26, mode = 'minor') => Object.assign(s.hook, { on: true, preset, mode, wave: 'square', fm: 0, vowel: '', cutoff: 3200, cutoffEnd: null, delay: .3, gain, gainEnd: null, move: 'fisso', grit: 0 });
const future = (s, prog, bpm = 92, key = 'E') => { s.bpm = bpm; s.key = key; s.prog = prog; };

export const TEN_YEARS_TRACK = {
  id: 'ten-years-rebuild', title: 'Ten Years · ricostruzione', look: 'montagne',
  style: { it: 'Ricostruita da sf-tenyears-149s.m4a · future pop ispirazionale · Mi minore · 92 BPM · sidechain su pad e basso', en: 'Rebuilt from sf-tenyears-149s.m4a · inspirational future pop · E minor · 92 BPM · sidechained pad and bass' },
  scenes: [
    makeScene('Intro', 8, {}, s => { future(s, 'pendolo'); only(s, ['bass', 'arp', 'pad']); subBass(s, .35); airPad(s, 600, 2200, .2, .32); pluck(s, 1200, .15, 2600, .28); }),
    makeScene('Strofa A', 9, { crash: true, fill: true }, s => { future(s, 'anthem'); only(s, ['drums', 'bass', 'arp', 'pad']); fourFloor(s); pumpBass(s); scPad(s, 2400); pluck(s); }),
    makeScene('Swoosh', 1, {}, s => { future(s, 'anthem'); only(s, ['pad', 'riser']); airPad(s, 1200, null, .2); Object.assign(s.riser, { dir: 'down', bars: '2', gain: .35 }); }),
    makeScene('Strofa B', 8, { crash: true }, s => { future(s, 'anthem'); only(s, ['drums', 'bass', 'arp', 'hook', 'pad']); fourFloor(s); pumpBass(s); scPad(s, 2600); pluck(s); lead(s, 'decade', .24); }),
    makeScene('Breakdown', 6, { fade: 2 }, s => { future(s, 'pendolo'); only(s, ['bass', 'arp', 'pad']); subBass(s, .4); airPad(s, 900, 1600, .3); pluck(s, 900, .2); }),
    makeScene('Riser', 2, { fill: true, breath: true }, s => { future(s, 'pendolo'); only(s, ['drums', 'arp', 'pad', 'riser']); fourFloor(s, { bd: E16, cp: E16 }); airPad(s, 1600, 3000, .3); pluck(s, 1400, .22, 2600); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .4 }); }),
    makeScene('Finale', 20, { crash: true, fill: true }, s => { future(s, 'anthem'); only(s, ['drums', 'bass', 'arp', 'hook', 'pad']); fourFloor(s, { oh: '..x...x...x...x.' }); pumpBass(s, .8); scPad(s, 3200, null, .34); pluck(s, 3000, .3); lead(s, 'decade', .28); }),
    makeScene('Outro', 3, {}, s => { future(s, 'pendolo'); only(s, ['pad', 'riser']); airPad(s, 2000, 600, .3, 0); Object.assign(s.riser, { dir: 'down', bars: '4', gain: .3 }); }),
  ],
};

// nuovo brano nello stesso stile: 96 BPM, Si minore con giro VI-VII-i-v, salto di un semitono nel drop 2
export const NEXT_CHAPTER_TRACK = {
  id: 'next-chapter', title: 'Next Chapter', look: 'montagne',
  style: { it: 'Nuovo brano nello stile di Ten Years · future pop · Si minore, poi Do · 96 BPM', en: 'New track in the Ten Years style · future pop · B minor, then C · 96 BPM' },
  scenes: [
    makeScene('Intro', 4, {}, s => { future(s, 'ascesa', 96, 'B'); only(s, ['arp', 'pad']); airPad(s, 500, 1800, .18, .3); pluck(s, 900, .12, 2200, .26); }),
    makeScene('Strofa', 8, { fade: 1 }, s => { future(s, 'ascesa', 96, 'B'); only(s, ['drums', 'bass', 'arp', 'pad']); fourFloor(s, { cp: E16, hh: '..x...x...x...x.' }); pumpBass(s, .6); scPad(s, 1800, 2600, .28); pluck(s, 2400); }),
    makeScene('Pre', 4, { fill: true, breath: true }, s => { future(s, 'pendolo', 96, 'B'); only(s, ['drums', 'bass', 'arp', 'pad', 'riser']); fourFloor(s, { hh: 'x.x.x.x.x.x.x.x.' }); pumpBass(s, .6); scPad(s, 2600, 3600, .3); pluck(s, 2600); Object.assign(s.riser, { dir: 'up', bars: '4', gain: .35 }); }),
    makeScene('Drop', 16, { crash: true, fill: true }, s => { future(s, 'ascesa', 96, 'B'); only(s, ['drums', 'bass', 'arp', 'hook', 'pad']); fourFloor(s, { oh: '..x...x...x...x.' }); pumpBass(s, .8); scPad(s, 3400, null, .34); pluck(s, 3000, .28); lead(s, 'orizzonte', .27); }),
    makeScene('Break', 8, { fade: 2 }, s => { future(s, 'pendolo', 96, 'B'); only(s, ['drums', 'bass', 'hook', 'pad']); fourFloor(s, { bd: E16, cp: E16, hh: '..x...x...x...x.' }); subBass(s, .4); airPad(s, 1200, 2400, .3); lead(s, 'orizzonte', .2); s.hook.cutoff = 1800; s.hook.delay = .5; }),
    makeScene('Riser', 2, { fill: true, breath: true }, s => { future(s, 'pendolo', 96, 'B'); only(s, ['drums', 'pad', 'riser']); fourFloor(s, { bd: E16, cp: E16 }); airPad(s, 2400, 3600, .3); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .4 }); }),
    makeScene('Drop 2', 16, { crash: true, fill: true }, s => { future(s, 'ascesa', 96, 'C'); only(s, ['drums', 'bass', 'arp', 'hook', 'pad']); fourFloor(s, { oh: '..x...x...x...x.', rd: '..x...x...x...x.' }); pumpBass(s, .85); scPad(s, 3800, null, .36); pluck(s, 3400, .3); lead(s, 'orizzonte', .29); }),
    makeScene('Outro', 4, {}, s => { future(s, 'pendolo', 96, 'C'); only(s, ['arp', 'pad', 'riser']); airPad(s, 2400, 600, .3, 0); pluck(s, 2000, .24, 600, 0); Object.assign(s.riser, { dir: 'down', bars: '4', gain: .3 }); }),
  ],
};

// ---------- stile "jingle tech" (da dci-track-23s.m4a) ----------
// 103 BPM, Fa# minore con tensione frigia, accordi staccati, build di hi-hat e rumore, drop sincopato a cassa dritta.
const stabs = (s, preset, cutoff, gain = .38, cutoffEnd = null, gainEnd = null) => Object.assign(s.pad, { on: true, preset, wave: 'supersaw', cutoff, cutoffEnd, gain, gainEnd, room: .25, move: 'fisso', drive: .6 });
const techBass = (s, gain = .6) => Object.assign(s.bass, { on: true, preset: 'offbeat', wave: 'sawtooth', cutoff: 500, cutoffEnd: null, reso: 6, gain, gainEnd: null, move: 'fisso', drive: 1 });
const techDrums = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR909', gain: .9, gainEnd: null, drive: .6, grit: 0, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: E16, rd: E16, ...rows }); };
const tech = (s, bpm = 103, key = 'F#', prog = 'pendolo') => { s.bpm = bpm; s.key = key; s.prog = prog; };

export const DCI_TRACK = {
  id: 'dci-rebuild', title: 'DCI Jingle · ricostruzione', look: 'palco',
  style: { it: 'Ricostruita da dci-track-23s.m4a · jingle tech · Fa# minore · 103 BPM · stab sincopati', en: 'Rebuilt from dci-track-23s.m4a · tech jingle · F# minor · 103 BPM · syncopated stabs' },
  scenes: [
    makeScene('Stab', 2, {}, s => { tech(s); only(s, ['pad']); stabs(s, 'staccato', 3000, .35); }),
    makeScene('Build', 2, { fill: true, breath: true }, s => { tech(s); only(s, ['drums', 'pad', 'riser']); techDrums(s, { hh: 'xxxxxxxxxxxxxxxx' }, { gain: .2, gainEnd: .85 }); stabs(s, 'staccato', 3000, .35, 5000, .45); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .4 }); }),
    makeScene('Drop', 5, { crash: true }, s => { tech(s); only(s, ['drums', 'bass', 'pad']); techDrums(s, { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.' }); techBass(s); stabs(s, 'synco', 4000, .4); }),
    makeScene('Coda', 1, { crash: true }, s => { tech(s); only(s, ['pad']); Object.assign(s.pad, { on: true, preset: 'pad', wave: 'supersaw', cutoff: 3000, cutoffEnd: 800, gain: .35, gainEnd: 0, room: .9, move: 'fisso', drive: 0 }); }),
  ],
};

// nuovo jingle nello stesso stile, più lungo: aggiunge un hook frigio e una sezione che sale di un semitono (bII)
const spark = (s, gain = .24, cutoff = 3600) => Object.assign(s.hook, { on: true, preset: 'scintilla', mode: 'phrygian', wave: 'square', fm: 1, vowel: '', cutoff, cutoffEnd: null, delay: .25, gain, gainEnd: null, move: 'fisso', grit: 0 });
export const DCI_IGNITION_TRACK = {
  id: 'dci-ignition', title: 'DCI Ignition', look: 'palco',
  style: { it: 'Nuovo jingle nello stile DCI · tech · Fa# frigio, sezione in Sol · 106 BPM', en: 'New jingle in the DCI style · tech · F# phrygian, section in G · 106 BPM' },
  scenes: [
    makeScene('Stab', 4, {}, s => { tech(s, 106); only(s, ['pad', 'hook']); stabs(s, 'staccato', 2400, .32, 3600); spark(s, .14, 1400); }),
    makeScene('Build', 4, { fill: true, breath: true }, s => { tech(s, 106); only(s, ['drums', 'bass', 'pad', 'riser']); techDrums(s, { bd: 'x...x...x...x...', hh: 'xxxxxxxxxxxxxxxx' }, { gain: .3, gainEnd: .9, cutoff: 600, cutoffEnd: 20000 }); techBass(s, .4); s.bass.gainEnd = .6; stabs(s, 'staccato', 3600, .36, 5200); Object.assign(s.riser, { dir: 'up', bars: '4', gain: .4 }); }),
    makeScene('Drop', 8, { crash: true, fill: true }, s => { tech(s, 106); only(s, ['drums', 'bass', 'hook', 'pad']); techDrums(s, { bd: 'x...x...x...x...', cp: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: '..x...x...x...x.' }); techBass(s); stabs(s, 'synco', 4200, .4); spark(s); }),
    makeScene('Switch', 4, { fade: 1 }, s => { tech(s, 106, 'G'); only(s, ['drums', 'bass', 'hook', 'pad']); techDrums(s, GROOVES.halftime[1]); Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 400, cutoffEnd: null, gain: .5, drive: 0, reso: 2, move: 'fisso' }); stabs(s, 'pad', 2000, .3, 3200); s.pad.room = .7; spark(s, .22, 2600); s.hook.delay = .5; }),
    makeScene('Drop 2', 6, { crash: true, fill: true }, s => { tech(s, 106); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']); techDrums(s, GROOVES.hard[1], { drive: 1 }); techBass(s, .65); stabs(s, 'synco', 4800, .42); spark(s, .26); s.hook.fm = 2; Object.assign(s.texture, { on: true, sample: 'metal', rhythm: 'euclid', grit: .5, gain: .25, room: .3 }); }),
    makeScene('Coda', 2, { crash: true }, s => { tech(s, 106); only(s, ['pad', 'hook']); Object.assign(s.pad, { on: true, preset: 'pad', wave: 'supersaw', cutoff: 3200, cutoffEnd: 700, gain: .35, gainEnd: 0, room: .9, move: 'fisso', drive: 0 }); spark(s, .18, 2400); s.hook.gainEnd = 0; s.hook.delay = .6; }),
  ],
};

// ---------- reel cyberpunk: 145 BPM, 17 battute = 28 secondi ----------
// Impatto subito (cassa filtrata dalla prima battuta), build corto, drop lungo, glitch, colpo finale.
export const NEON_RUSH_TRACK = {
  id: 'neon-rush-reel', title: 'Neon Rush · reel 28s', look: 'palco',
  style: { it: 'Techno cyberpunk ruvida per un reel · Mi frigio · 145 BPM · 28 secondi', en: 'Rough cyberpunk techno for a reel · E phrygian · 145 BPM · 28 seconds' },
  scenes: [
    makeScene('Glitch', 2, {}, s => {
      s.bpm = 145; cyber(s); only(s, ['drums', 'arp', 'texture']);
      Object.assign(s.drums, { drive: 2.5, grit: .3, cutoff: 400, cutoffEnd: 2200 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: E16, oh: E16, rd: E16 });
      acid(s, 300, 900, .3, 1.5); s.arp.reso = 22;
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'bar', grit: .95, gain: .55, room: .5 });
    }),
    makeScene('Build', 3, { fill: true, breath: true }, s => {
      s.bpm = 145; cyber(s); only(s, ['drums', 'bass', 'arp', 'texture', 'riser']);
      Object.assign(s.drums, { drive: 2.5, grit: .3, gain: .55, gainEnd: .95, cutoff: 2200, cutoffEnd: 20000 }); steps(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16 });
      rumble(s, 200, 500, .45); s.bass.gainEnd = .6;
      acid(s, 900, 3200, .32, 1.6); s.arp.reso = 22;
      Object.assign(s.texture, { sample: 'industrial', rhythm: 'eighth', grit: .8, gain: .25 });
      Object.assign(s.riser, { dir: 'up', bars: '4', gain: .42 });
    }),
    makeScene('Drop', 8, { crash: true }, s => {
      s.bpm = 145; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'texture']);
      Object.assign(s.drums, { drive: 2.8, grit: .5 }); steps(s, GROOVES.hard[1]);
      rumble(s, 500, null, .6); s.bass.drive = 4;
      acid(s, 1600, 4500, .34, 2); s.arp.reso = 24;
      Object.assign(s.pad, { preset: 'stab', wave: 'supersaw', cutoff: 3200, drive: 1.5, room: .3, gain: .3, move: 'fisso' });
      cyberHook(s, .22, { fm: 5, grit: .6 });
      Object.assign(s.texture, { sample: 'metal', rhythm: 'euclid', grit: .8, gain: .3, room: .2 });
    }),
    makeScene('Glitch break', 2, { breath: true }, s => {
      s.bpm = 145; cyber(s); only(s, ['drums', 'arp', 'texture', 'riser']);
      Object.assign(s.drums, { drive: 3, grit: .95 }); steps(s, { bd: 'x.....x...x.x.xx', cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16 });
      acid(s, 3000, 500, .34, 2);
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'sixteenth', grit: .95, gain: .3 });
      Object.assign(s.riser, { dir: 'up', bars: '2', gain: .45 });
    }),
    makeScene('Final', 1, { crash: true }, s => {
      s.bpm = 145; cyber(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad']);
      Object.assign(s.drums, { drive: 3, grit: .5 }); steps(s, GROOVES.hard[1]);
      rumble(s, 600, null, .6); s.bass.drive = 4; acid(s, 4500, null, .34, 2);
      Object.assign(s.pad, { preset: 'stab', wave: 'supersaw', cutoff: 3600, drive: 1.5, room: .3, gain: .32, move: 'fisso' });
      cyberHook(s, .22, { fm: 5, grit: .6 });
    }),
    makeScene('Hit', 1, { crash: true }, s => {
      s.bpm = 145; cyber(s); only(s, ['bass', 'guitar', 'texture']);
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 300, gain: .8, gainEnd: 0, drive: 1, reso: 2, move: 'fisso' });
      guitar(s, 'held', .55, 'metal', { octave: '-12', gainEnd: 0, room: .5 });
      Object.assign(s.texture, { sample: 'numbers', rhythm: 'bar', grit: .95, gain: .5, room: .9 });
    }),
  ],
};

// ---------- progressive rock: 7/8, 5/4 e 4/4, chitarre, organo, archi stile mellotron ----------
const rockKit = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'AkaiXR10', gain: .9, gainEnd: null, drive: .3, grit: 0, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, rows); };
const rockBass = (s, preset = 'ottavi', gain = .9) => Object.assign(s.bass, { on: true, preset, wave: 'gm_electric_bass_pick', cutoff: 2000, cutoffEnd: null, reso: 1, gain, gainEnd: null, move: 'fisso', drive: .4 });
const organ = (s, preset = 'su', gain = .4, wave = 'gm_rock_organ', speed = '8') => Object.assign(s.arp, { on: true, preset, wave, speed, cutoff: 4000, cutoffEnd: null, reso: 1, delay: .15, gain, gainEnd: null, move: 'fisso', drive: 0 });
const solo = (s, preset, wave, gain = .3, mode = 'minor') => Object.assign(s.hook, { on: true, preset, mode, wave, fm: 0, vowel: '', cutoff: 6000, cutoffEnd: null, delay: .25, gain, gainEnd: null, move: 'fisso', grit: 0 });
const prog = (s, meter, chords = 'prog', bpm = 120) => { s.bpm = bpm; s.key = 'A'; s.prog = chords; s.meter = meter; };

export const PROG_TRACK = {
  id: 'settimo-cielo', title: 'Settimo Cielo', look: 'montagne',
  style: { it: 'Progressive rock · La minore · 120 BPM · riff in 7/8, ponte in 5/4, assolo in 4/4 · chitarre distorte, organo, archi', en: 'Progressive rock · A minor · 120 BPM · riff in 7/8, bridge in 5/4, solo in 4/4 · distorted guitars, organ, strings' },
  scenes: [
    makeScene('Mellotron', 4, {}, s => {
      prog(s, '4/4', 'andalusa'); only(s, ['hook', 'pad']);
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_string_ensemble_1', cutoff: 3000, gain: .1, gainEnd: .32, room: .8, move: 'fisso', drive: 0 });
      solo(s, 'prog', 'gm_flute', .4);
    }),
    makeScene('Riff 7/8', 8, { crash: true }, s => {
      prog(s, '7/8'); only(s, ['drums', 'bass', 'guitar']);
      rockKit(s, GROOVES.prog78[1]); rockBass(s, 'ottavi'); guitar(s, 'riff', .8);
    }),
    makeScene('Strofa 7/8', 8, {}, s => {
      prog(s, '7/8'); only(s, ['drums', 'bass', 'guitar', 'arp', 'hook']);
      rockKit(s, { ...GROOVES.prog78[1], hh: E16.slice(0, 14), rd: 'x.x.x.x.x.x.x.' }); rockBass(s, 'ottavi', .85);
      guitar(s, 'held', .55, 'crunch'); organ(s, 'su', .4); solo(s, 'prog', 'gm_lead_2_sawtooth', .4);
    }),
    makeScene('Ponte 5/4', 6, { fade: 1, fill: true }, s => {
      prog(s, '5/4', 'andalusa'); only(s, ['drums', 'bass', 'arp', 'pad']);
      rockKit(s, GROOVES.prog54[1]); rockBass(s, 'walking', .9);
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_drawbar_organ', cutoff: 4000, gain: .26, room: .5, move: 'fisso', drive: 0 });
      organ(s, 'spezzato', .3, 'gm_electric_guitar_clean', '16');
    }),
    makeScene('Assolo 4/4', 8, { crash: true, fill: true }, s => {
      prog(s, '4/4', 'andalusa', 124); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      rockKit(s, { ...GROOVES.rock[1], oh: '..............x.', rd: E16 }); rockBass(s, 'ottavi', .9);
      guitar(s, 'power8', .7, 'crunch'); solo(s, 'assolo', 'gm_distortion_guitar,sawtooth', .4, 'dorian'); s.hook.drive = 2.5;
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_drawbar_organ', cutoff: 3000, gain: .18, room: .4, move: 'fisso', drive: 0 });
    }),
    makeScene('Riff ripresa', 4, { crash: true }, s => {
      prog(s, '7/8'); only(s, ['drums', 'bass', 'guitar', 'arp']);
      rockKit(s, GROOVES.prog78[1]); rockBass(s, 'ottavi'); guitar(s, 'riff', .85); organ(s, 'pulsar', .38);
    }),
    makeScene('Finale', 4, { crash: true }, s => {
      prog(s, '4/4', 'andalusa'); s.bpmEnd = 92; only(s, ['drums', 'bass', 'guitar', 'pad', 'hook']);
      rockKit(s, { bd: 'x.......x.......', cp: E16, sd: '........x.......', hh: E16, oh: E16, rd: 'x...x...x...x...' }, { gain: .9, gainEnd: .4 });
      rockBass(s, 'sub', .9); guitar(s, 'held', .8); s.guitar.gainEnd = .15;
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_string_ensemble_1', cutoff: 4000, gain: .25, gainEnd: .05, room: .8, move: 'fisso', drive: 0 });
      Object.assign(s.hook, { on: true, preset: 'prog', mode: 'minor', wave: 'gm_string_ensemble_1', fm: 0, vowel: '', cutoff: 5000, cutoffEnd: null, delay: .3, gain: .2, gainEnd: 0, move: 'fisso', grit: 0 });
    }),
  ],
};

// ---------- lo-fi: 78 BPM, swing, settime, piano elettrico, vinile ----------
const lofi = s => { s.bpm = 78; s.key = 'D'; s.prog = 'lofi'; s.swing = .6; };
const dusty = (s, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'EmuSP12', gain: .75, gainEnd: null, drive: 0, grit: .3, cutoff: 5000, cutoffEnd: null, ...extra }); steps(s, GROOVES.boombap[1]); };
const keys = (s, cutoff = 2400, gain = .32, extra = {}) => Object.assign(s.pad, { on: true, preset: 'comp', wave: 'gm_epiano1', cutoff, cutoffEnd: null, gain, gainEnd: null, room: .45, move: 'fisso', drive: 0, ...extra });
const upright = (s, gain = .55) => Object.assign(s.bass, { on: true, preset: 'walking', wave: 'gm_acoustic_bass', cutoff: 1200, cutoffEnd: null, reso: 1, gain, gainEnd: null, move: 'fisso', drive: 0 });
const vinyl = (s, gain = .5) => Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain, gainEnd: null, room: .2 });

export const LOFI_TRACK = {
  id: 'pioggia-sul-vetro', title: 'Pioggia sul vetro', look: 'pixel',
  style: { it: 'Lo-fi hip hop · Re minore · 78 BPM con swing · piano elettrico, contrabbasso, vibrafono, vinile', en: 'Lo-fi hip hop · D minor · 78 BPM with swing · electric piano, upright bass, vibraphone, vinyl' },
  scenes: [
    makeScene('Vinile', 4, {}, s => { lofi(s); only(s, ['pad', 'texture']); keys(s, 800, .28, { cutoffEnd: 2200 }); vinyl(s, .6); }),
    makeScene('A', 8, {}, s => { lofi(s); only(s, ['drums', 'bass', 'pad', 'texture']); dusty(s); upright(s); keys(s); vinyl(s); }),
    makeScene('B', 8, {}, s => {
      lofi(s); only(s, ['drums', 'bass', 'arp', 'hook', 'pad', 'texture']); dusty(s); upright(s); keys(s, 2200, .28); vinyl(s);
      Object.assign(s.hook, { on: true, preset: 'pioggia', mode: 'minor', wave: 'gm_vibraphone', fm: 0, vowel: '', cutoff: 5000, cutoffEnd: null, delay: .35, gain: .55, gainEnd: null, move: 'fisso', grit: 0 });
      Object.assign(s.arp, { on: true, preset: 'pedale', wave: 'gm_electric_guitar_clean', speed: '8', cutoff: 2600, cutoffEnd: null, reso: 1, delay: .3, gain: .14, gainEnd: null, move: 'fisso', drive: 0 });
    }),
    makeScene('Pausa', 4, { fade: 1 }, s => {
      lofi(s); only(s, ['hook', 'pad', 'texture']); keys(s, 1400, .3); vinyl(s, .7);
      Object.assign(s.hook, { on: true, preset: 'pioggia', mode: 'minor', wave: 'gm_vibraphone', fm: 0, vowel: '', cutoff: 3000, cutoffEnd: null, delay: .5, gain: .5, gainEnd: null, move: 'fisso', grit: 0 });
    }),
    makeScene('Ritorno', 8, {}, s => {
      lofi(s); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']); dusty(s, { gain: .8 }); upright(s); keys(s); vinyl(s);
      Object.assign(s.hook, { on: true, preset: 'pioggia', mode: 'minor', wave: 'gm_flute', fm: 0, vowel: '', cutoff: 4000, cutoffEnd: null, delay: .3, gain: .4, gainEnd: null, move: 'fisso', grit: 0 });
    }),
    makeScene('Coda', 4, {}, s => { lofi(s); only(s, ['drums', 'pad', 'texture']); dusty(s, { gain: .6, gainEnd: 0 }); keys(s, 2200, .32, { cutoffEnd: 500, gainEnd: 0 }); vinyl(s, .6); }),
  ],
};

// ---------- metal: 160 BPM, 20 battute = 30 secondi ----------
// Mi frigio ribassato, doppia cassa, galoppo e chug in palm mute, breakdown djent, accordo finale che suona.
const metalKit = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'AkaiXR10', gain: .95, gainEnd: null, drive: 1.2, grit: 0, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, rows); };
const metalBass = (s, gain = .6) => Object.assign(s.bass, { on: true, preset: 'ottavi', wave: 'gm_electric_bass_pick', cutoff: 1500, cutoffEnd: null, reso: 1, gain, gainEnd: null, move: 'fisso', drive: 2 });
const heavy = (s, bpm = 160) => { s.bpm = bpm; s.key = 'E'; s.prog = 'frigio'; };

export const METAL_TRACK = {
  id: 'ferro-reel', title: 'Ferro · reel 30s', look: 'palco',
  style: { it: 'Metal · Mi frigio ribassato · 160 BPM · doppia cassa, galoppo, palm mute, breakdown · 30 secondi', en: 'Metal · dropped E phrygian · 160 BPM · double kick, gallop, palm mute, breakdown · 30 seconds' },
  scenes: [
    makeScene('Feedback', 2, { breath: true }, s => { heavy(s); only(s, ['guitar', 'riser', 'drums']);
      metalKit(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: E16, rd: 'x...x...x...x...' }, { gain: .5, gainEnd: .9 });
      guitar(s, 'held', .45, 'metal', { octave: '-2', cutoff: 1500, cutoffEnd: 4500 }); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .3 }); }),
    makeScene('Riff', 6, { crash: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar']);
      metalKit(s, GROOVES.gallopDrums[1]); metalBass(s); guitar(s, 'gallop', .5, 'metal', { octave: '-2' }); }),
    makeScene('Chug', 4, { fill: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar']);
      metalKit(s, GROOVES.metal[1]); metalBass(s); guitar(s, 'chug', .5, 'muted', { octave: '-2', drive: 2 }); }),
    makeScene('Breakdown', 4, { crash: true, breath: true }, s => { heavy(s, 160); s.prog = 'pendolo'; only(s, ['drums', 'bass', 'guitar', 'texture']);
      metalKit(s, { bd: 'x..x..x.x..x..x.', cp: E16, sd: '........x.......', hh: E16, oh: E16, rd: E16 }); s.drums.rows.cr = { steps: 'x...............', mute: false };
      metalBass(s, .7); guitar(s, 'djent', .52, 'metal', { octave: '-2', drive: 3 });
      Object.assign(s.texture, { on: true, sample: 'metal', rhythm: 'bar', grit: .4, gain: .3, room: .6 }); }),
    makeScene('Assalto', 3, { crash: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar']);
      metalKit(s, GROOVES.blast[1]); metalBass(s); guitar(s, 'chug', .5, 'metal', { octave: '-2' }); }),
    makeScene('Ultimo accordo', 1, { crash: true }, s => { heavy(s); only(s, ['bass', 'guitar']);
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'gm_electric_bass_pick', cutoff: 1500, gain: .7, gainEnd: 0, drive: 2, reso: 1, move: 'fisso' });
      guitar(s, 'held', .52, 'metal', { octave: '-2', gainEnd: 0, room: .5 }); }),
  ],
};

// ---------- metal melodico: 150 BPM, 19 battute ≈ 30 secondi ----------
// Si minore eroico, chitarre gemelle armonizzate a terze, intro pulita, galoppo, assolo.
const twinLead = (s, preset, gain = .13, extra = {}) => Object.assign(s.hook, { on: true, preset, mode: 'minor', wave: 'gm_distortion_guitar,sawtooth', fm: 0, vowel: '', cutoff: 4500, cutoffEnd: null, delay: .2, gain, gainEnd: null, move: 'fisso', grit: 0, drive: 2.5, harmony: '2', ...extra });
const epic = (s, bpm = 150) => { s.bpm = bpm; s.key = 'B'; s.prog = 'epica'; };

export const MELODIC_METAL_TRACK = {
  id: 'ali-di-cenere', title: 'Ali di cenere · reel 30s', look: 'montagne',
  style: { it: 'Metal melodico · Si minore · 150 BPM · chitarre gemelle armonizzate a terze, galoppo, assolo · 30 secondi', en: 'Melodic metal · B minor · 150 BPM · twin guitars harmonised in thirds, gallop, solo · 30 seconds' },
  scenes: [
    makeScene('Arpeggio', 2, {}, s => { epic(s); only(s, ['guitar', 'pad', 'arp']);
      guitar(s, 'held', .28, 'clean', { width: 'mono', room: .6 });
      Object.assign(s.arp, { on: true, preset: 'sugiu', wave: 'gm_electric_guitar_clean', speed: '8', cutoff: 5000, cutoffEnd: null, reso: 1, delay: .3, gain: .4, gainEnd: null, move: 'fisso', drive: 0 });
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_string_ensemble_1', cutoff: 3000, gain: .1, gainEnd: .3, room: .8, move: 'fisso', drive: 0 }); }),
    makeScene('Carica', 1, { fill: true, breath: true }, s => { epic(s); only(s, ['drums', 'guitar', 'riser']);
      metalKit(s, { bd: 'x.x.x.x.x.x.x.x.', cp: E16, sd: E16, hh: E16, oh: E16, rd: E16 }); guitar(s, 'power8', .7, 'distorted');
      Object.assign(s.riser, { dir: 'up', bars: '2', gain: .35 }); }),
    makeScene('Tema', 8, { crash: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.gallopDrums[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'gallop', .72, 'distorted');
      twinLead(s, 'eroico');
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_string_ensemble_1', cutoff: 3500, gain: .2, room: .6, move: 'fisso', drive: 0 }); }),
    makeScene('Assolo', 4, { crash: true, fill: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook']);
      metalKit(s, GROOVES.metal[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'chug', .65, 'muted');
      twinLead(s, 'assolo', .18, { harmony: '', cutoff: 5500, delay: .3 }); }),
    makeScene('Finale', 3, { crash: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.gallopDrums[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'power8', .72, 'distorted');
      twinLead(s, 'eroico', .14);
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_choir_aahs', cutoff: 4000, gain: .25, room: .7, move: 'fisso', drive: 0 }); }),
    makeScene('Coda', 1, { crash: true }, s => { epic(s); only(s, ['guitar', 'pad', 'bass']);
      guitar(s, 'held', .75, 'distorted', { gainEnd: 0, room: .5 });
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'gm_electric_bass_pick', cutoff: 1500, gain: .6, gainEnd: 0, drive: 1, reso: 1, move: 'fisso' });
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_choir_aahs', cutoff: 4000, gain: .3, gainEnd: 0, room: .8, move: 'fisso', drive: 0 }); }),
  ],
};

// ---------- phonk: 128 BPM, 16 battute = 30 secondi ----------
// Fa# minore, melodia di cowbell 808, basso 808 distorto, hi-hat a sedicesimi, voce radio sgranata.
const phonkKit = (s, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR808', gain: .95, gainEnd: null, drive: 1.5, grit: .2, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, GROOVES.phonk[1]); };
const bass808 = (s, gain = .8, drv = 4) => Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 900, cutoffEnd: null, reso: 2, gain, gainEnd: null, move: 'fisso', drive: drv });
const cowbell = (s, gain = .45, extra = {}) => Object.assign(s.hook, { on: true, preset: 'phonk', mode: 'minor', wave: 'cowbell', fm: 0, vowel: '', cutoff: 6000, cutoffEnd: null, delay: .15, gain, gainEnd: null, move: 'fisso', grit: 0, drive: 1, harmony: '', ...extra });
const phonkKey = s => { s.bpm = 128; s.key = 'F#'; s.prog = 'pendolo'; };

export const PHONK_TRACK = {
  id: 'drift-reel', title: 'Drift · phonk reel 30s', look: 'pixel',
  style: { it: 'Phonk · Fa# minore · 128 BPM · cowbell 808, basso distorto, hi-hat a sedicesimi · 30 secondi', en: 'Phonk · F# minor · 128 BPM · 808 cowbell, distorted bass, 16th hi-hats · 30 seconds' },
  scenes: [
    makeScene('Intro', 2, {}, s => { phonkKey(s); only(s, ['hook', 'texture']);
      cowbell(s, .4, { cutoff: 1500, cutoffEnd: 6000 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'bar', grit: .9, gain: .45, room: .6 }); }),
    makeScene('Drop', 8, { crash: true }, s => { phonkKey(s); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']);
      phonkKit(s); bass808(s); cowbell(s);
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_choir_aahs', cutoff: 2000, gain: .18, room: .6, move: 'fisso', drive: 0 });
      Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain: .4, room: .2 }); }),
    makeScene('Respiro', 2, { breath: true, fill: true }, s => { phonkKey(s); only(s, ['drums', 'hook', 'riser', 'texture']);
      phonkKit(s, { cutoff: 600, cutoffEnd: 20000 }); steps(s, { bd: E16, cp: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16 });
      cowbell(s, .4, { cutoff: 2000 }); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .35 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'sixteenth', grit: .9, gain: .25, room: .3 }); }),
    makeScene('Drop 2', 3, { crash: true }, s => { phonkKey(s); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']);
      phonkKit(s, { drive: 2.5, grit: .4 }); bass808(s, .85, 6); cowbell(s, .5, { drive: 2 });
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_choir_aahs', cutoff: 2500, gain: .2, room: .6, move: 'fisso', drive: 0 });
      Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain: .4, room: .2 }); }),
    makeScene('Coda', 1, { crash: true }, s => { phonkKey(s); only(s, ['bass', 'hook']); bass808(s, .8, 5); s.bass.gainEnd = 0; cowbell(s, .4, { gainEnd: 0, delay: .5 }); }),
  ],
};

export const BUILTIN_TRACKS = [METAL_TRACK, MELODIC_METAL_TRACK, PHONK_TRACK, NEON_RUSH_TRACK, PROG_TRACK, LOFI_TRACK, GHOST_TRACK, NEON_TRACK, TEN_YEARS_TRACK, NEXT_CHAPTER_TRACK, DCI_TRACK, DCI_IGNITION_TRACK, DEMO_TRACK];
