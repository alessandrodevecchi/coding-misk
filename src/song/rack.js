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
  pan: { kind: 'sound', label: { en: 'Pan', it: 'Panorama' }, args: [['position', 'num', 0.5, 0, 1, 0.05], ['motion', 'choice', 'fixed', ['fixed', 'slow', 'fast']]],
    code: a => a.motion === 'fixed' ? `.pan(${f(a.position)})` : `.pan(sine.slow(${a.motion === 'slow' ? 8 : 1}))` },
};

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
}
