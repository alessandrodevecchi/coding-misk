// Track rack: an ordered chain of devices added after the instrument, each one a Strudel function.
// A device in a song: { "device": "echo", "count": 3, "time": 0.125, "feedback": 0.5 } (missing values take the defaults; "on": false bypasses it).
const f = n => String(Math.round(n * 1000) / 1000);
const MELODIC = ['bass', 'guitar', 'arp', 'hook', 'pad', 'code'];

// args: [name, kind, default, min, max, step] or [name, 'choice', default, [values]]
export const DEVICES = {
  // note devices: change what is played
  echo: { kind: 'note', label: { en: 'Echo', it: 'Eco' }, args: [['count', 'num', 3, 2, 8, 1], ['time', 'choice', 0.125, [0.0625, 0.125, 0.1875, 0.25, 0.375, 0.5]], ['feedback', 'num', 0.5, 0, 0.95, 0.05]],
    code: a => `.echo(${f(a.count)}, ${f(a.time)}, ${f(a.feedback)})` },
  off: { kind: 'note', label: { en: 'Offset copy', it: 'Copia sfasata' }, args: [['time', 'choice', 0.125, [0.0625, 0.125, 0.1875, 0.25, 0.375]], ['semitones', 'num', 12, -24, 24, 1]],
    code: (a, type) => `.off(${f(a.time)}, x => x${MELODIC.includes(type) && a.semitones ? `.add(note(${f(a.semitones)}))` : ''})` },
  ply: { kind: 'note', label: { en: 'Repeat notes', it: 'Ripeti le note' }, args: [['times', 'num', 2, 2, 4, 1]], code: a => `.ply(${f(a.times)})` },
  degrade: { kind: 'note', label: { en: 'Random drop', it: 'Togli a caso' }, args: [['amount', 'num', 0.3, 0, 0.9, 0.05]], code: a => `.degradeBy(${f(a.amount)})` },
  rev: { kind: 'note', label: { en: 'Reverse each bar', it: 'Al contrario' }, args: [], code: () => '.rev()' },
  jux: { kind: 'note', label: { en: 'Stereo reverse', it: 'Stereo al contrario' }, args: [], code: () => '.jux(rev)' },
  // a held chord or note sampled in steps (growth-shapes: seg(16) turns a held pad into a sixteenth rhythm)
  seg: { kind: 'note', label: { en: 'Steps', it: 'Passi' }, args: [['steps', 'choice', 16, [4, 8, 16]]], code: a => `.seg(${f(a.steps)})` },
  // sound devices: change how it sounds
  delay: { kind: 'sound', label: { en: 'Delay', it: 'Delay' }, args: [['amount', 'num', 0.4, 0, 1, 0.05], ['time', 'choice', 0.1875, [0.0625, 0.125, 0.1875, 0.25, 0.375, 0.5]], ['feedback', 'num', 0.45, 0, 0.9, 0.05]],
    code: a => `.delay(${f(a.amount)}).delaysync(${f(a.time)}).delayfeedback(${f(a.feedback)})` },
  reverb: { kind: 'sound', label: { en: 'Reverb', it: 'Riverbero' }, args: [['amount', 'num', 0.4, 0, 1, 0.05], ['size', 'num', 0.6, 0, 1, 0.05]], code: a => `.room(${f(a.amount)}).roomsize(${f(a.size)})` },
  distort: { kind: 'sound', label: { en: 'Distortion', it: 'Distorsione' }, args: [['amount', 'num', 2, 0, 8, 0.1]], code: a => `.distort(${f(a.amount)})` },
  shape: { kind: 'sound', label: { en: 'Saturation', it: 'Saturazione' }, args: [['amount', 'num', 0.4, 0, 0.95, 0.05]], code: a => `.shape(${f(a.amount)})` },
  crush: { kind: 'sound', label: { en: 'Bit crush', it: 'Bit crush' }, args: [['bits', 'num', 6, 1, 16, 1]], code: a => `.crush(${f(a.bits)})` },
  coarse: { kind: 'sound', label: { en: 'Sample rate', it: 'Campionamento basso' }, args: [['amount', 'num', 8, 1, 32, 1]], code: a => `.coarse(${f(a.amount)})` },
  phaser: { kind: 'sound', label: { en: 'Phaser', it: 'Phaser' }, args: [['rate', 'num', 1, 0.1, 8, 0.1], ['depth', 'num', 0.6, 0, 1, 0.05]], code: a => `.phaser(${f(a.rate)}).phaserdepth(${f(a.depth)})` },
  tremolo: { kind: 'sound', label: { en: 'Tremolo', it: 'Tremolo' }, args: [['rate', 'num', 8, 1, 32, 1], ['depth', 'num', 0.7, 0, 1, 0.05]], code: a => `.tremolosync(${f(a.rate)}).tremolodepth(${f(a.depth)})` },
  vowel: { kind: 'sound', label: { en: 'Vowel filter', it: 'Filtro vocale' }, args: [['vowel', 'choice', 'a', ['a', 'e', 'i', 'o', 'u']]], code: a => `.vowel("${a.vowel}")` },
  hpf: { kind: 'sound', label: { en: 'High-pass', it: 'Passa-alto' }, args: [['cutoff', 'num', 400, 20, 8000, 10], ['reso', 'num', 0, 0, 20, 1]], code: a => `.hpf(${f(a.cutoff)})${a.reso ? `.hpq(${f(a.reso)})` : ''}` },
  lpf: { kind: 'sound', label: { en: 'Low-pass', it: 'Passa-basso' }, args: [['cutoff', 'num', 2000, 100, 18000, 10], ['reso', 'num', 0, 0, 20, 1]], code: a => `.lpf(${f(a.cutoff)})${a.reso ? `.lpq(${f(a.reso)})` : ''}` },
  // FM (material-generator D9): two operators at most, no feedback; the second one is off at index 0
  fm: { kind: 'sound', label: { en: 'FM', it: 'FM' }, args: [['index', 'num', 1, 0, 4, 0.05], ['harmonicity', 'choice', 1, [0.5, 0.505, 1, 1.005, 1.01, 1.015, 1.02, 1.41, 2, 2.01, 2.76, 3, 3.5, 4]], ['wave', 'choice', 'sine', ['sine', 'triangle', 'square', 'sawtooth', 'pink', 'brown']],
    ['decay', 'num', 0.3, 0.05, 1, 0.05], ['sustain', 'num', 0.5, 0, 1, 0.05], ['index2', 'num', 0, 0, 3, 0.05], ['harmonicity2', 'num', 1, 1, 10, 0.5]],
    code: a => `.fm(${f(a.index)}).fmh(${f(a.harmonicity)})${a.wave !== 'sine' ? `.fmwave("${a.wave}")` : ''}.fmdecay(${f(a.decay)}).fmsustain(${f(a.sustain)})${a.index2 > 0 ? `.fm2(${f(a.index2)}).fmh2(${f(a.harmonicity2)})` : ''}` },
  // FM-like colour for any sound, samples and voices included (fm-like-effects, #90)
  // Fold (D1, D2): superdough's distortion with a fold curve, and the level after it (foldLevel): a line never goes
  // above its own peak or the usual peak of its track type. It shares the distort stage with Distortion: the later
  // device wins.
  fold: { kind: 'sound', label: { en: 'Fold', it: 'Piega' }, args: [['amount', 'num', 1.5, 0.1, 3, 0.05], ['curve', 'choice', 'sharp', ['sharp', 'soft'], { sharp: { en: 'Sharp', it: 'Spigolosa' }, soft: { en: 'Soft', it: 'Morbida' } }]],
    code: (a, type) => `.distort(${f(a.amount)}).distorttype("${a.curve === 'soft' ? 'sinefold' : 'fold'}").distortvol(${f(foldLevel(a.amount, a.curve, type))})` },
  // Ring, on trial (D3): the sound times 1 - amount + amount·sin(2π·freq·t), a Kabelsalat effect through K (one worklet
  // per note); never above the input
  ring: { kind: 'sound', label: { en: 'Ring (trial)', it: 'Ring (prova)' }, args: [['freq', 'num', 220, 30, 2000, 10], ['amount', 'num', 0.8, 0, 1, 0.05]],
    code: a => `.K(audioin().mul(sine(${f(a.freq)}).mul(${f(a.amount)}).add(${f(1 - a.amount)})).out())` },
  pan: { kind: 'sound', label: { en: 'Pan', it: 'Panorama' }, args: [['position', 'num', 0.5, 0, 1, 0.05], ['motion', 'choice', 'fixed', ['fixed', 'slow', 'fast']]],
    code: a => a.motion === 'fixed' ? `.pan(${f(a.position)})` : `.pan(sine.slow(${a.motion === 'slow' ? 8 : 1}))` },
};

// the level after a fold (fm-like-effects D2). The fold's slope at zero is g = 1 + k/2 with k = expm1(amount)
// (superdough's distort), times π/2 for the soft curve (sinefold), and the fold never leaves -1…1. With the level
// max(1/g, P), P the usual peak of the track type, a sample x comes out at most max(|x|, P): a line below the fold
// keeps its level (1/g), a folded one comes out near the usual peak of its type instead of far below it.
// P: the level targets (docs/knowledge/sound-and-levels.md: kick and leads around 0.5, pads and arps 0.1 to 0.3)
export const FOLD_PEAK = { drums: 0.45, bass: 0.35, guitar: 0.4, voice: 0.35, spoken: 0.35, hook: 0.2, pad: 0.2, arp: 0.18, code: 0.3, texture: 0.15, riser: 0.1 };
export const foldGain = (amount, curve = 'sharp') => (1 + Math.expm1(amount) / 2) * (curve === 'soft' ? Math.PI / 2 : 1);
export const foldLevel = (amount, curve = 'sharp', type) => Math.floor(1000 * Math.max(1 / foldGain(amount, curve), FOLD_PEAK[type] ?? 0.2)) / 1000;
// the label of a choice value in a language (the value itself when the device names none)
export const choiceLabel = (arg, v, lang) => (arg[4] && arg[4][v] ? arg[4][v][lang] || arg[4][v].en : String(v));

// values of a device, defaults filled in
export const deviceArgs = dev => {
  const spec = DEVICES[dev.device]; if (!spec) return {};
  return Object.fromEntries(spec.args.map(([name, , def]) => [name, dev[name] ?? def]));
};
export const newDevice = name => ({ device: name, ...deviceArgs({ device: name }) });
// code of the whole chain for a track type
export const rackCode = (rack, type) => (rack || []).filter(d => d && d.on !== false && DEVICES[d.device]).map(d => DEVICES[d.device].code(deviceArgs(d), type)).join('');

export function checkRack(rack, p, err, warn) {
  if (!Array.isArray(rack)) { err(p, 'an array of devices, for example [{ "device": "delay", "amount": 0.4 }]'); return; }
  rack.forEach((d, i) => {
    const dp = `${p}[${i}]`;
    if (!d || typeof d !== 'object' || !DEVICES[d.device]) { err(`${dp}.device`, `one of ${Object.keys(DEVICES).join(', ')}`); return; }
    const spec = DEVICES[d.device];
    for (const [k, v] of Object.entries(d)) {
      if (k === 'device' || k === 'on') continue;
      const a = spec.args.find(x => x[0] === k);
      if (!a) { warn(`${dp}.${k}`, `unknown value for ${d.device}; values: ${spec.args.map(x => x[0]).join(', ') || 'none'}`); continue; }
      if (a[1] === 'choice' && !a[3].includes(v)) err(`${dp}.${k}`, `one of ${a[3].join(', ')}`);
      if (a[1] === 'num' && (typeof v !== 'number' || v < a[3] || v > a[4])) err(`${dp}.${k}`, `a number from ${a[3]} to ${a[4]}`);
    }
  });
  // Fold and Distortion write the same Strudel stage (distort): only the later one is heard (fm-like-effects D2)
  const on = rack.map((d, i) => [d, i]).filter(([d]) => d && d.on !== false && (d.device === 'fold' || d.device === 'distort'));
  if (on.some(([d]) => d.device === 'fold') && on.some(([d]) => d.device === 'distort')) warn(p, `fold and distort share one distortion stage: only the later one (${on[on.length - 1][0].device}) is heard`);
}
