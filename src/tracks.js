// Brani a scene inclusi nell'app. Ognuno si apre e si modifica nell'arrangiatore.
// Ghost Protocol e Neon Ascent sono la versione a scene dei brani scritti a mano in patterns/:
// stessa struttura, stesse idee di transizione, con gli strumenti dell'arrangiatore.
import { makeScene, GROOVES, DEMO_TRACK } from './music.js';

const E16 = '................';
const steps = (s, rows) => { for (const [id, st] of Object.entries(rows)) s.drums.rows[id].steps = st; };
const only = (s, keep) => { for (const c of ['drums', 'bass', 'arp', 'hook', 'pad', 'texture', 'riser']) s[c].on = keep.includes(c); };
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

export const BUILTIN_TRACKS = [GHOST_TRACK, NEON_TRACK, DEMO_TRACK];
