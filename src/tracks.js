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

// ---------- reel: estratto da un brano intero ----------
// Un reel parte già carico, come se fosse un pezzo di una canzone più lunga.
// picks: [nome della scena del brano, battute, opzioni]. La prima scena entra col crash.
const reelFrom = (full, id, title, style, picks) => ({
  id, title, look: full.look, style,
  scenes: picks.map(([name, bars, opts = {}], i) => {
    const sc = JSON.parse(JSON.stringify(full.scenes.find(x => x.name === name)));
    return { ...sc, name: opts.name || sc.name, bars, fade: i === 0 ? 0 : (opts.fade ?? 0), crash: i === 0 ? true : (opts.crash ?? sc.crash), fill: opts.fill ?? false, breath: opts.breath ?? false };
  }),
});

// ---------- metal: Ferro ----------
// Mi frigio accordato un tono sotto, 160 BPM. Riff thrash con la seconda bemolle, galoppo, ritornello con aperture e chitarre gemelle, breakdown djent.
const metalKit = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'AkaiXR10', gain: .95, gainEnd: null, drive: 1.2, grit: 0, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, rows); };
const metalBass = (s, gain = .6) => Object.assign(s.bass, { on: true, preset: 'ottavi', wave: 'gm_electric_bass_pick', cutoff: 1500, cutoffEnd: null, reso: 1, gain, gainEnd: null, move: 'fisso', drive: 2 });
const heavy = (s, bpm = 160) => { s.bpm = bpm; s.key = 'E'; s.prog = 'frigio'; };
const twinLead = (s, preset, gain = .13, extra = {}) => Object.assign(s.hook, { on: true, preset, mode: 'minor', wave: 'gm_distortion_guitar,sawtooth', fm: 0, vowel: '', cutoff: 4500, cutoffEnd: null, delay: .2, gain, gainEnd: null, move: 'fisso', grit: 0, drive: 2.5, harmony: '2', ...extra });
const choir = (s, gain = .2, wave = 'gm_choir_aahs') => Object.assign(s.pad, { on: true, preset: 'pad', wave, cutoff: 3500, cutoffEnd: null, gain, gainEnd: null, room: .7, move: 'fisso', drive: 0 });
const DROP = { octave: '-2' };

export const METAL_FULL = {
  id: 'ferro', title: 'Ferro', look: 'palco',
  style: { it: 'Metal · Mi frigio un tono sotto · 160 BPM · brano intero', en: 'Metal · E phrygian one step down · 160 BPM · full track' },
  scenes: [
    makeScene('Feedback', 2, { breath: true }, s => { heavy(s); only(s, ['drums', 'guitar', 'riser']);
      metalKit(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: E16, rd: 'x...x...x...x...' }, { gain: .5, gainEnd: .9 });
      guitar(s, 'held', .45, 'metal', { ...DROP, cutoff: 1500, cutoffEnd: 4500 }); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .3 }); }),
    makeScene('Riff', 8, { crash: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar']);
      metalKit(s, GROOVES.gallopDrums[1]); metalBass(s); guitar(s, 'thrash', .5, 'metal', DROP); }),
    makeScene('Strofa', 8, {}, s => { heavy(s); only(s, ['drums', 'bass', 'guitar']);
      metalKit(s, { ...GROOVES.metal[1], hh: E16, rd: 'x.x.x.x.x.x.x.x.' }); metalBass(s); guitar(s, 'groove', .48, 'muted', { ...DROP, drive: 2 }); }),
    makeScene('Pre', 4, { fill: true, breath: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar', 'riser']);
      metalKit(s, GROOVES.gallopDrums[1]); metalBass(s); guitar(s, 'gallopRiff', .5, 'metal', DROP); Object.assign(s.riser, { dir: 'up', bars: '4', gain: .3 }); }),
    makeScene('Ritornello', 8, { crash: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.metal[1]); metalBass(s); guitar(s, 'heroic', .52, 'distorted', DROP);
      twinLead(s, 'eroico', .13, { mode: 'phrygian' }); choir(s, .16); }),
    makeScene('Breakdown', 8, { crash: true, breath: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar', 'texture']);
      metalKit(s, { bd: 'x..x..x.x..x..x.', cp: E16, sd: '........x.......', hh: E16, oh: E16, rd: 'x.......x.......' }); metalBass(s, .7);
      guitar(s, 'djentRiff', .55, 'metal', { ...DROP, drive: 3 });
      Object.assign(s.texture, { on: true, sample: 'metal', rhythm: 'bar', grit: .4, gain: .3, room: .6 }); }),
    makeScene('Assolo', 8, { fill: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar', 'hook']);
      metalKit(s, GROOVES.gallopDrums[1]); metalBass(s); guitar(s, 'thrash', .38, 'metal', DROP);
      twinLead(s, 'assolo', .17, { harmony: '', mode: 'phrygian', cutoff: 5500, delay: .3 }); }),
    makeScene('Ritornello 2', 8, { crash: true, fill: true }, s => { heavy(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.blast[1]); metalBass(s); guitar(s, 'heroic', .55, 'distorted', DROP);
      twinLead(s, 'eroico', .14, { mode: 'phrygian' }); choir(s, .2); }),
    makeScene('Fine', 1, { crash: true }, s => { heavy(s); only(s, ['bass', 'guitar']);
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'gm_electric_bass_pick', cutoff: 1500, gain: .7, gainEnd: 0, drive: 2, reso: 1, move: 'fisso' });
      guitar(s, 'held', .52, 'metal', { ...DROP, gainEnd: 0, room: .5 }); }),
  ],
};
export const METAL_TRACK = reelFrom(METAL_FULL, 'ferro-reel', 'Ferro · reel 30s',
  { it: 'Reel da 30 s estratto da Ferro: parte dal ritornello, breakdown, ritornello, accordo finale', en: '30 s reel cut from Ferro: chorus, breakdown, chorus, final chord' },
  [['Ritornello', 8], ['Breakdown', 6, { breath: true }], ['Ritornello 2', 5, { fill: true }], ['Fine', 1]]);

// ---------- metal melodico: Ali di cenere ----------
// Si minore, 150 BPM. Chitarre gemelle a terze, galoppo, ritornello con aperture e coro, ultimo ritornello un semitono sopra.
const epic = (s, key = 'B', bpm = 150) => { s.bpm = bpm; s.key = key; s.prog = 'epica'; };
export const MELODIC_METAL_FULL = {
  id: 'ali-di-cenere', title: 'Ali di cenere', look: 'montagne',
  style: { it: 'Metal melodico · Si minore, finale in Do · 150 BPM · brano intero', en: 'Melodic metal · B minor, last chorus in C · 150 BPM · full track' },
  scenes: [
    makeScene('Arpeggio', 4, {}, s => { epic(s); only(s, ['guitar', 'pad', 'arp']);
      guitar(s, 'held', .3, 'clean', { width: 'mono', room: .6 });
      Object.assign(s.arp, { on: true, preset: 'sugiu', wave: 'gm_electric_guitar_clean', speed: '8', cutoff: 5000, cutoffEnd: null, reso: 1, delay: .3, gain: .4, gainEnd: null, move: 'fisso', drive: 0 });
      choir(s, .1, 'gm_string_ensemble_1'); s.pad.gainEnd = .3; }),
    makeScene('Tema', 8, { crash: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.gallopDrums[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'gallopRiff', .62, 'distorted');
      twinLead(s, 'eroico'); choir(s, .18, 'gm_string_ensemble_1'); }),
    makeScene('Strofa', 8, {}, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'pad']);
      metalKit(s, { ...GROOVES.rock[1], bd: 'x.x.....x.x.....' }, { drive: .8 }); metalBass(s, .55); guitar(s, 'groove', .55, 'muted');
      choir(s, .14, 'gm_string_ensemble_1'); }),
    makeScene('Pre', 4, { fill: true, breath: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'riser']);
      metalKit(s, GROOVES.gallopDrums[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'power8', .62, 'distorted');
      Object.assign(s.riser, { dir: 'up', bars: '4', gain: .32 }); }),
    makeScene('Ritornello', 8, { crash: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.metal[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'heroic', .7, 'distorted');
      twinLead(s, 'orizzonte', .14); choir(s, .24); }),
    makeScene('Assolo', 8, { fill: true }, s => { epic(s); only(s, ['drums', 'bass', 'guitar', 'hook']);
      metalKit(s, GROOVES.gallopDrums[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'chug', .55, 'muted');
      twinLead(s, 'assolo', .18, { harmony: '', cutoff: 5500, delay: .3 }); }),
    makeScene('Ritornello finale', 8, { crash: true, fill: true }, s => { epic(s, 'C'); only(s, ['drums', 'bass', 'guitar', 'hook', 'pad']);
      metalKit(s, GROOVES.metal[1], { drive: .8 }); metalBass(s, .55); guitar(s, 'heroic', .72, 'distorted');
      twinLead(s, 'orizzonte', .15); choir(s, .28); }),
    makeScene('Coda', 2, { crash: true }, s => { epic(s, 'C'); only(s, ['guitar', 'pad', 'bass']);
      guitar(s, 'held', .72, 'distorted', { gainEnd: 0, room: .5 });
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'gm_electric_bass_pick', cutoff: 1500, gain: .6, gainEnd: 0, drive: 1, reso: 1, move: 'fisso' });
      choir(s, .3); s.pad.gainEnd = 0; }),
  ],
};
export const MELODIC_METAL_TRACK = reelFrom(MELODIC_METAL_FULL, 'ali-di-cenere-reel', 'Ali di cenere · reel 30s',
  { it: 'Reel da 30 s estratto da Ali di cenere: ritornello, assolo, ritornello finale un semitono sopra, coda', en: '30 s reel cut from Ali di cenere: chorus, solo, last chorus a semitone up, coda' },
  [['Ritornello', 8], ['Assolo', 4, { fill: true }], ['Ritornello finale', 6], ['Coda', 1]]);

// ---------- phonk: Drift ----------
// Fa# minore, 128 BPM. Cowbell 808, basso 808 distorto, hi-hat a sedicesimi, coro, vinile.
const phonkKit = (s, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR808', gain: .95, gainEnd: null, drive: 1.5, grit: .2, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, GROOVES.phonk[1]); };
const bass808 = (s, gain = .8, drv = 4) => Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 900, cutoffEnd: null, reso: 2, gain, gainEnd: null, move: 'fisso', drive: drv });
const cowbell = (s, gain = .45, extra = {}) => Object.assign(s.hook, { on: true, preset: 'phonk', mode: 'minor', wave: 'cowbell', fm: 0, vowel: '', cutoff: 6000, cutoffEnd: null, delay: .15, gain, gainEnd: null, move: 'fisso', grit: 0, drive: 1, harmony: '', ...extra });
const phonkKey = s => { s.bpm = 128; s.key = 'F#'; s.prog = 'pendolo'; };
const vinylOn = (s, gain = .4) => Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain, gainEnd: null, room: .2 });

export const PHONK_FULL = {
  id: 'drift', title: 'Drift', look: 'pixel',
  style: { it: 'Phonk · Fa# minore · 128 BPM · brano intero', en: 'Phonk · F# minor · 128 BPM · full track' },
  scenes: [
    makeScene('Intro', 4, {}, s => { phonkKey(s); only(s, ['hook', 'texture']);
      cowbell(s, .4, { cutoff: 1200, cutoffEnd: 6000 }); Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'bar', grit: .9, gain: .45, room: .6 }); }),
    makeScene('Drop', 16, { crash: true }, s => { phonkKey(s); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']);
      phonkKit(s); bass808(s); cowbell(s); choir(s, .16); s.pad.cutoff = 2000; vinylOn(s); }),
    makeScene('Break', 4, { fade: 1, breath: true, fill: true }, s => { phonkKey(s); only(s, ['drums', 'hook', 'riser', 'texture']);
      phonkKit(s, { cutoff: 600, cutoffEnd: 20000 }); steps(s, { bd: E16, cp: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16 });
      cowbell(s, .4, { cutoff: 2000, delay: .4 }); Object.assign(s.riser, { dir: 'up', bars: '4', gain: .35 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'sixteenth', grit: .9, gain: .22, room: .3 }); }),
    makeScene('Drop 2', 16, { crash: true }, s => { phonkKey(s); only(s, ['drums', 'bass', 'hook', 'pad', 'texture']);
      phonkKit(s, { drive: 2.5, grit: .4 }); steps(s, { oh: '..x...x...x...x.' }); bass808(s, .85, 6); cowbell(s, .5, { drive: 2 });
      choir(s, .2); s.pad.cutoff = 2500; vinylOn(s); }),
    makeScene('Outro', 3, {}, s => { phonkKey(s); only(s, ['drums', 'hook', 'texture']);
      phonkKit(s, { gainEnd: .2 }); cowbell(s, .4, { cutoffEnd: 1200 }); vinylOn(s, .5); }),
    makeScene('Colpo', 1, { crash: true }, s => { phonkKey(s); only(s, ['bass', 'hook']); bass808(s, .8, 5); s.bass.gainEnd = 0; cowbell(s, .4, { gainEnd: 0, delay: .5 }); }),
  ],
};
export const PHONK_TRACK = reelFrom(PHONK_FULL, 'drift-reel', 'Drift · phonk reel 30s',
  { it: 'Reel da 30 s estratto da Drift: drop, break, drop più duro, colpo finale', en: '30 s reel cut from Drift: drop, break, harder drop, final hit' },
  [['Drop', 8], ['Break', 2, { breath: true, fill: true }], ['Drop 2', 5], ['Colpo', 1]]);

// ---------- Circuito Ruggine: techno industrial cyberpunk con chitarre ----------
// 132 BPM, Mi frigio poi Fa. Groove techno saturo, chitarre accordate un tono sotto con riff stomp e industrial.
const rust = (s, key = 'E') => { s.bpm = 132; cyber(s, key); };
const rustGuitar = (s, pattern, gain = .5, extra = {}) => guitar(s, pattern, gain, 'metal', { octave: '-2', drive: 2, cutoff: 3800, ...extra });
const rustDrums = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR909', gain: .95, gainEnd: null, drive: 1.4, grit: .2, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, rows); };
const metalHits = (s, gain = .3) => Object.assign(s.texture, { on: true, sample: 'metal', rhythm: 'euclid', grit: .7, gain, gainEnd: null, room: .25 });

export const RUST_TRACK = {
  id: 'circuito-ruggine', title: 'Circuito Ruggine', look: 'palco',
  style: { it: 'Techno industrial cyberpunk · Mi frigio, poi Fa · 132 BPM · cassa satura, acid, metalli, chitarre distorte un tono sotto', en: 'Cyberpunk industrial techno · E phrygian, then F · 132 BPM · saturated kick, acid, metal hits, distorted guitars one step down' },
  scenes: [
    makeScene('Avvio', 4, { breath: true }, s => { rust(s); only(s, ['drums', 'guitar', 'texture', 'riser']);
      rustDrums(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: E16, oh: E16, rd: E16 }, { cutoff: 300, cutoffEnd: 2500 });
      rustGuitar(s, 'held', .35, { cutoff: 900, cutoffEnd: 3000, room: .6 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'bar', grit: .95, gain: .5, room: .7 });
      Object.assign(s.riser, { dir: 'up', bars: '4', gain: .3 }); }),
    makeScene('Macchina', 8, { crash: true }, s => { rust(s); only(s, ['drums', 'bass', 'arp', 'texture']);
      rustDrums(s, GROOVES.techno[1]); rumble(s, 450, null, .55); acid(s, 700, 2400, .32, 1.6); s.arp.reso = 22; metalHits(s); }),
    makeScene('Riff', 8, { crash: true }, s => { rust(s); only(s, ['drums', 'bass', 'guitar', 'arp', 'texture']);
      rustDrums(s, GROOVES.techno[1]); rumble(s, 450, null, .5); rustGuitar(s, 'stomp', .55);
      acid(s, 1600, null, .24, 1.6); s.arp.reso = 22; metalHits(s, .25); }),
    makeScene('Corridoio', 4, { fill: true, breath: true }, s => { rust(s); only(s, ['drums', 'bass', 'guitar', 'arp', 'riser']);
      rustDrums(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: 'xxxxxxxxxxxxxxxx', oh: E16, rd: E16 }, { gain: .7, gainEnd: .95 });
      rumble(s, 300, 600, .5); rustGuitar(s, 'industrial', .45, { type: 'muted' }); acid(s, 1200, 4000, .3, 1.8);
      Object.assign(s.riser, { dir: 'up', bars: '4', gain: .4 }); }),
    makeScene('Drop', 16, { crash: true }, s => { rust(s); only(s, ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture']);
      rustDrums(s, { ...GROOVES.hard[1], rd: E16 }, { drive: 1.6 }); rumble(s, 550, null, .6); s.bass.drive = 4;
      rustGuitar(s, 'industrial', .55); acid(s, 1800, 4200, .3, 2); s.arp.reso = 24;
      cyberHook(s, .42, { fm: 4, grit: .5 });
      Object.assign(s.pad, { preset: 'stab', wave: 'supersaw', cutoff: 3000, drive: 1.2, room: .3, gain: .24, move: 'fisso' });
      Object.assign(s.texture, { on: true, sample: 'industrial', rhythm: 'eighth', grit: .85, gain: .2, room: .2 }); }),
    makeScene('Blackout', 4, { fade: 1, breath: true }, s => { rust(s); only(s, ['drums', 'guitar', 'texture', 'riser']);
      rustDrums(s, { bd: 'x.........x.....', cp: E16, sd: '........x.......', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }, { grit: .9 });
      rustGuitar(s, 'held', .45, { cutoff: 4000, cutoffEnd: 1200, room: .7 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'sixteenth', grit: .95, gain: .3, room: .4 });
      Object.assign(s.riser, { dir: 'up', bars: '4', gain: .42 }); }),
    makeScene('Drop 2', 12, { crash: true, fill: true }, s => { rust(s, 'F'); only(s, ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture']);
      rustDrums(s, { ...GROOVES.hard[1], oh: '..x...x...x...x.', rd: E16 }, { drive: 1.8 }); rumble(s, 600, null, .6); s.bass.drive = 4;
      rustGuitar(s, 'thrash', .55, { drive: 3 }); acid(s, 2200, 5000, .3, 2.2); s.arp.reso = 24;
      cyberHook(s, .45, { fm: 5, grit: .7 });
      Object.assign(s.pad, { preset: 'stab', wave: 'supersaw', cutoff: 3400, drive: 1.5, room: .3, gain: .26, move: 'fisso' });
      metalHits(s, .3); }),
    makeScene('Spegnimento', 4, {}, s => { rust(s, 'F'); only(s, ['drums', 'guitar', 'texture']);
      rustDrums(s, { bd: 'x...x...x...x...', cp: E16, sd: E16, hh: E16, oh: E16, rd: E16 }, { cutoff: 20000, cutoffEnd: 300, gainEnd: .3 });
      rustGuitar(s, 'held', .5, { gainEnd: 0, cutoff: 3500, cutoffEnd: 700, room: .8 });
      Object.assign(s.texture, { on: true, sample: 'numbers', rhythm: 'bar', grit: .95, gain: .5, room: .9 }); }),
  ],
};

// ---------- Luci Rosse: club scuro da film d'azione (stile Le Castle Vania, John Wick) ----------
// 124 BPM, un solo accordo di La minore. Il protagonista è il riff di basso distorto; pochi strati, tanto ritmo.
const club = (s, prog = 'drone') => { s.bpm = 124; s.key = 'A'; s.prog = prog; };
const clubDrums = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR909', gain: .95, gainEnd: null, drive: 1.6, grit: 0, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: E16, rd: E16, ...rows }); };
const KICK4 = 'x...x...x...x...', CLAP24 = '....x.......x...', OFFHAT = '..x...x...x...x.';
const wickBass = (s, preset, cutoff, cutoffEnd = null, extra = {}) => Object.assign(s.bass, { on: true, preset, wave: 'sawtooth', cutoff, cutoffEnd, reso: 8, gain: .6, gainEnd: null, move: 'fisso', drive: 4.5, ...extra });
const darkHook = (s, preset, gain, extra = {}) => Object.assign(s.hook, { on: true, preset, mode: 'chromatic', octave: '3', wave: 'square', fm: 0, vowel: '', cutoff: 2600, cutoffEnd: null, delay: .25, gain, gainEnd: null, move: 'fisso', grit: 0, drive: 1.5, harmony: '', ...extra });

export const CLUB_TRACK = {
  id: 'luci-rosse', title: 'Luci Rosse', look: 'palco',
  style: { it: 'Club scuro da film d\'azione · La minore su un solo accordo · 124 BPM · riff di basso distorto, cassa, clap, pochi strati', en: 'Dark action-movie club track · A minor on one chord · 124 BPM · distorted bass riff, kick, clap, few layers' },
  scenes: [
    makeScene('Ingresso', 8, {}, s => { club(s); only(s, ['drums', 'bass']);
      clubDrums(s, { bd: KICK4, hh: OFFHAT }); wickBass(s, 'spirale', 300, 1000); }),
    makeScene('Pista', 8, { crash: true }, s => { club(s); only(s, ['drums', 'bass']);
      clubDrums(s, { bd: KICK4, cp: CLAP24, hh: OFFHAT }); wickBass(s, 'spirale', 1400); }),
    makeScene('Taglio', 2, { breath: true }, s => { club(s); only(s, ['bass', 'riser']);
      wickBass(s, 'spirale', 1400, 500); Object.assign(s.riser, { dir: 'up', bars: '2', gain: .35 }); }),
    makeScene('Scontro', 16, { crash: true }, s => { club(s); only(s, ['drums', 'bass', 'hook']);
      clubDrums(s, { bd: KICK4, cp: CLAP24, hh: 'x.x.x.x.x.x.x.x.', oh: OFFHAT });
      wickBass(s, 'mirino', 1300, null, { move: 'veloce', drive: 5 }); darkHook(s, 'colpi', .3); }),
    makeScene('Ombra', 4, {}, s => { club(s, 'tensione'); only(s, ['drums', 'bass', 'hook', 'texture']);
      clubDrums(s, { bd: 'x.........x.....', cp: '........x.......' });
      wickBass(s, 'tritono', 700); darkHook(s, 'allarme', .2, { octave: '4', delay: .45 });
      Object.assign(s.texture, { on: true, sample: 'metal', rhythm: 'bar', grit: .5, gain: .3, room: .7 }); }),
    makeScene('Scontro 2', 16, { crash: true, fill: true }, s => { club(s, 'tensione'); only(s, ['drums', 'bass', 'pad']);
      clubDrums(s, { bd: KICK4, cp: CLAP24, hh: 'xxxxxxxxxxxxxxxx', oh: OFFHAT }, { drive: 1.5 });
      wickBass(s, 'spirale', 2000, null, { drive: 5 });
      Object.assign(s.pad, { on: true, preset: 'stab', wave: 'square', cutoff: 2400, cutoffEnd: null, gain: .16, gainEnd: null, room: .3, move: 'fisso', drive: 1 }); }),
    makeScene('Uscita', 4, {}, s => { club(s); only(s, ['drums', 'bass']);
      clubDrums(s, { bd: KICK4, hh: OFFHAT }, { gainEnd: .4 }); wickBass(s, 'spirale', 1400, 150); }),
  ],
};

// ---------- DCI Jingle · carica ----------
// La stessa identità del jingle DCI (Fa# minore, basso che scarta su Sol, stab), ma parte già col groove e picchia di più.
const dci = (s, prog = 'tensione') => { s.bpm = 106; s.key = 'F#'; s.prog = prog; };
const dciStabs = (s, preset, gain = .36, extra = {}) => Object.assign(s.pad, { on: true, preset, wave: 'supersaw', cutoff: 4200, cutoffEnd: null, gain, gainEnd: null, room: .2, move: 'fisso', drive: 1.2, ...extra });
export const DCI_CHARGED_TRACK = {
  id: 'dci-carica', title: 'DCI Jingle · carica', look: 'palco',
  style: { it: 'Versione più carica del jingle DCI · Fa# minore con lo scarto su Sol · 106 BPM · 27 secondi', en: 'Harder version of the DCI jingle · F# minor with the G push · 106 BPM · 27 seconds' },
  scenes: [
    makeScene('Stab', 1, { crash: true }, s => { dci(s); only(s, ['drums', 'pad']); clubDrums(s, { bd: KICK4 }, { drive: 1.5 }); dciStabs(s, 'staccato'); }),
    makeScene('Carica', 2, { fill: true, breath: true }, s => { dci(s); only(s, ['drums', 'bass', 'pad', 'riser']);
      clubDrums(s, { bd: KICK4, hh: 'xxxxxxxxxxxxxxxx' }, { drive: 1.5, gain: .6, gainEnd: .95 });
      wickBass(s, 'mirino', 400, 1600, { drive: 4 }); dciStabs(s, 'staccato', .34, { cutoff: 2500, cutoffEnd: 5000 });
      Object.assign(s.riser, { dir: 'up', bars: '2', gain: .4 }); }),
    makeScene('Drop', 6, { crash: true }, s => { dci(s); only(s, ['drums', 'bass', 'pad']);
      clubDrums(s, { bd: KICK4, cp: CLAP24, hh: OFFHAT, oh: E16 }, { drive: 1.6 });
      wickBass(s, 'mirino', 1700, null, { drive: 4 }); dciStabs(s, 'synco', .4); }),
    makeScene('Picco', 2, { crash: true }, s => { dci(s); only(s, ['drums', 'bass', 'guitar', 'pad']);
      clubDrums(s, { bd: KICK4, cp: CLAP24, hh: 'xxxxxxxxxxxxxxxx', oh: OFFHAT }, { drive: 1.8 });
      wickBass(s, 'mirino', 2200, null, { drive: 5 }); dciStabs(s, 'synco', .4);
      guitar(s, 'stomp', .45, 'metal', { octave: '-2' }); }),
    makeScene('Colpo', 1, { crash: true }, s => { dci(s); only(s, ['bass', 'pad']);
      Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 400, gain: .8, gainEnd: 0, drive: 2, reso: 2, move: 'fisso' });
      dciStabs(s, 'pad', .38, { gainEnd: 0, cutoffEnd: 800, room: .7 }); }),
  ],
};

// ---------- Insert Coin: arcade anni '90 ----------
// 150 BPM, stile picchiaduro a scorrimento: lead FM squadrato, basso a ottave, arpeggi veloci, drum machine digitale.
const arcadeScene = (s, bpm = 150, key = 'A', prog = 'arcade') => { s.bpm = bpm; s.key = key; s.prog = prog; };
const arcadeDrums = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'YamahaRX5', gain: .9, gainEnd: null, drive: .4, grit: .25, cutoff: 20000, cutoffEnd: null, ...extra }); steps(s, { bd: E16, cp: E16, sd: E16, hh: E16, oh: E16, rd: E16, ...rows }); };
const fmLead = (s, preset, gain = .45, extra = {}) => Object.assign(s.hook, { on: true, preset, mode: 'chromatic', octave: '4', wave: 'square', fm: 2, vowel: '', cutoff: 5000, cutoffEnd: null, delay: .15, gain, gainEnd: null, move: 'fisso', grit: .3, drive: 0, harmony: '', ...extra });
const octBass = (s, preset = 'ottaveArcade', gain = .85) => Object.assign(s.bass, { on: true, preset, wave: 'square', cutoff: 1800, cutoffEnd: null, reso: 2, gain, gainEnd: null, move: 'fisso', drive: .5 });
const chipArp = (s, gain = .32, preset = 'su') => Object.assign(s.arp, { on: true, preset, wave: 'square', speed: '16', cutoff: 4000, cutoffEnd: null, reso: 1, delay: 0, gain, gainEnd: null, move: 'fisso', drive: 0 });
const BREAK = { bd: 'x.....x...x.....', sd: '....x.......x..x', hh: 'x.x.x.x.x.x.x.x.' };

export const ARCADE_TRACK = {
  id: 'insert-coin', title: 'Insert Coin', look: 'pixel',
  style: { it: 'Arcade anni \'90 · La minore, boss in tensione, ultimo livello in Si · 150 BPM · lead FM, basso a ottave, arpeggi', en: '90s arcade · A minor, tense boss, last stage in B · 150 BPM · FM lead, octave bass, arpeggios' },
  scenes: [
    makeScene('Insert coin', 2, { breath: true }, s => { arcadeScene(s); only(s, ['arp', 'drums']); chipArp(s, .26); arcadeDrums(s, { hh: 'xxxxxxxxxxxxxxxx' }, { gain: .4, gainEnd: .8 }); }),
    makeScene('Livello 1', 8, { crash: true }, s => { arcadeScene(s); only(s, ['drums', 'bass', 'hook']); arcadeDrums(s, BREAK); octBass(s); fmLead(s, 'arcade'); }),
    makeScene('Livello 1 B', 8, { fill: true }, s => { arcadeScene(s); only(s, ['drums', 'bass', 'hook', 'arp']); arcadeDrums(s, { ...BREAK, oh: '..............x.' }); octBass(s); fmLead(s, 'arcadeB'); chipArp(s, .24); }),
    makeScene('Boss', 8, { crash: true, fill: true }, s => { arcadeScene(s, 156, 'A', 'tensione'); only(s, ['drums', 'bass', 'hook']);
      arcadeDrums(s, { bd: KICK4, sd: CLAP24, hh: 'xxxxxxxxxxxxxxxx' }, { drive: 1 });
      Object.assign(s.bass, { on: true, preset: 'tritono', wave: 'sawtooth', cutoff: 1600, cutoffEnd: null, reso: 6, gain: .55, gainEnd: null, move: 'fisso', drive: 2 });
      fmLead(s, 'boss', .45, { fm: 3 }); }),
    makeScene('Bonus', 4, { fade: 1 }, s => { arcadeScene(s); only(s, ['drums', 'arp']); arcadeDrums(s, { bd: 'x.........x.....', sd: '........x.......', hh: 'x.x.x.x.x.x.x.x.' }); chipArp(s, .26, 'sugiu'); }),
    makeScene('Livello 2', 8, { crash: true, fill: true }, s => { arcadeScene(s, 152, 'B'); only(s, ['drums', 'bass', 'hook', 'arp']); arcadeDrums(s, { ...BREAK, oh: '..x.......x.....' }); octBass(s, 'ottaveArcade', .9); fmLead(s, 'arcade', .48); chipArp(s, .22); }),
    makeScene('Game over', 2, { crash: true }, s => { arcadeScene(s, 152, 'B'); only(s, ['hook', 'pad']);
      fmLead(s, 'colpi', .26, { gainEnd: 0, delay: .5 });
      Object.assign(s.pad, { on: true, preset: 'pad', wave: 'square', cutoff: 2500, cutoffEnd: 600, gain: .2, gainEnd: 0, room: .6, move: 'fisso', drive: 0 }); }),
  ],
};

// ---------- Segnale nel rumore ----------
// Il brano che ho scritto con la massima libertà. Racconta come un significato emerge da un pattern:
// si parte dal fruscio, un segnale affiora, trova un respiro in 7/8 (asimmetrico, vivo), si apre in 4/4,
// tace un attimo, ritorna più pieno e si scioglie di nuovo nel rumore.
// Re dorico: né triste né dolce, sospeso. Pochi strumenti: vibrafono, celesta, archi, sub, una cassa morbida, click.
const soul = (s, meter = '7/8', prog = 'dorico') => { s.bpm = 96; s.key = 'D'; s.prog = prog; s.meter = meter; };
const vibes = (s, gain = .45, extra = {}) => Object.assign(s.arp, { on: true, preset: 'pulsar', wave: 'gm_vibraphone', speed: '8', cutoff: 6000, cutoffEnd: null, reso: 1, delay: .3, gain: gain * 1.6, gainEnd: null, move: 'fisso', drive: 0, ...extra });
const softKit = (s, rows, extra = {}) => { Object.assign(s.drums, { on: true, kit: 'RolandTR808', gain: .8, gainEnd: null, drive: 0, grit: .55, cutoff: 6000, cutoffEnd: null, ...extra }); steps(s, rows); };
const celesta = (s, preset, gain = .5, extra = {}) => Object.assign(s.hook, { on: true, preset, mode: 'dorian', octave: '4', wave: 'gm_celesta', fm: 0, vowel: '', cutoff: 7000, cutoffEnd: null, delay: .45, gain: gain * 1.5, gainEnd: null, move: 'fisso', grit: 0, drive: 0, harmony: '', ...extra });
const strings = (s, gain = .22, extra = {}) => Object.assign(s.pad, { on: true, preset: 'pad', wave: 'gm_string_ensemble_1', cutoff: 3000, cutoffEnd: null, gain, gainEnd: null, room: .8, move: 'fisso', drive: 0, ...extra });
const sub = (s, gain = .6, extra = {}) => Object.assign(s.bass, { on: true, preset: 'sub', wave: 'sine', cutoff: 500, cutoffEnd: null, reso: 1, gain: gain * 1.6, gainEnd: null, move: 'fisso', drive: .5, ...extra });
const E14 = '..............';

export const SOUL_TRACK = {
  id: 'segnale-nel-rumore', title: 'Segnale nel rumore', look: 'spazio',
  style: { it: 'Il brano che ho scritto con massima libertà · Re dorico · 96 BPM · dal fruscio al 7/8, poi 4/4, e di nuovo rumore', en: 'The track I wrote with complete freedom · D dorian · 96 BPM · from noise to 7/8, then 4/4, and back to noise' },
  scenes: [
    makeScene('Rumore', 4, {}, s => { soul(s, '4/4'); only(s, ['texture', 'hook']);
      Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain: .9, gainEnd: .6, room: .3 });
      celesta(s, 'segnale', .35, { mode: 'chromatic', wave: 'sine', delay: .6 }); }),
    makeScene('Emersione', 8, { fade: 2 }, s => { soul(s); only(s, ['arp', 'drums', 'texture', 'bass']);
      vibes(s, .2); s.arp.gainEnd = .7; sub(s, 0); s.bass.gainEnd = .85;
      softKit(s, { bd: E14, cp: E14, sd: E14, hh: 'x.x.x.x.x.x.x.', oh: E14, rd: E14 }, { gain: .35, gainEnd: .6 });
      Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain: .6, gainEnd: .25, room: .3 }); }),
    makeScene('Pulsazione', 8, {}, s => { soul(s); only(s, ['arp', 'drums', 'bass', 'pad']);
      vibes(s); sub(s, .55);
      softKit(s, { bd: 'x.......x.....', cp: E14, sd: '....x.......x.', hh: 'x.x.x.x.x.x.x.', oh: E14, rd: E14 });
      Object.assign(s.pad, { on: true, preset: 'comp', wave: 'gm_epiano1', cutoff: 2600, cutoffEnd: null, gain: .22, gainEnd: null, room: .5, move: 'fisso', drive: 0 }); }),
    makeScene('Fioritura', 8, { crash: true }, s => { soul(s, '4/4'); only(s, ['arp', 'drums', 'bass', 'hook', 'pad']);
      vibes(s, .32, { preset: 'su' }); sub(s, .6); celesta(s, 'anima', .5); strings(s, .2);
      softKit(s, { bd: 'x.......x.x.....', cp: E16, sd: '....x.......x...', hh: 'x.x.x.x.x.x.x.x.', oh: E16, rd: E16 }); }),
    makeScene('Silenzio', 2, { breath: true }, s => { soul(s, '4/4'); only(s, ['hook', 'pad']);
      celesta(s, 'segnale', .4, { mode: 'chromatic', delay: .7 }); strings(s, .2, { gainEnd: .05 }); }),
    makeScene('Ritorno', 8, { crash: true, fill: true }, s => { soul(s); only(s, ['arp', 'drums', 'bass', 'hook', 'pad']);
      vibes(s, .4); sub(s, .65); celesta(s, 'anima', .5); strings(s, .26);
      softKit(s, { bd: 'x.....x.x.....', cp: E14, sd: '....x.......x.', hh: 'xxxxxxxxxxxxxx', oh: E14, rd: E14 }, { grit: .45 }); }),
    makeScene('Dissolvenza', 4, { fade: 2 }, s => { soul(s, '4/4'); only(s, ['arp', 'texture', 'hook']);
      vibes(s, .4, { gainEnd: 0, cutoffEnd: 600 });
      Object.assign(s.texture, { on: true, sample: 'vinyl', rhythm: 'bar', grit: 0, gain: .3, gainEnd: .9, room: .3 });
      celesta(s, 'segnale', .3, { mode: 'chromatic', wave: 'sine', delay: .7, gainEnd: 0 }); }),
  ],
};

export const BUILTIN_TRACKS = [SOUL_TRACK, CLUB_TRACK, DCI_CHARGED_TRACK, ARCADE_TRACK, RUST_TRACK, METAL_TRACK, MELODIC_METAL_TRACK, PHONK_TRACK, METAL_FULL, MELODIC_METAL_FULL, PHONK_FULL, NEON_RUSH_TRACK, PROG_TRACK, LOFI_TRACK, GHOST_TRACK, NEON_TRACK, TEN_YEARS_TRACK, NEXT_CHAPTER_TRACK, DCI_TRACK, DCI_IGNITION_TRACK, DEMO_TRACK];
