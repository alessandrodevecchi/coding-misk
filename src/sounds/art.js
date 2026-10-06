// Stylised instrument drawings in SVG (no third-party images), shown as pixel art in the sound browser
const W = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${body}</svg>`;
const rect = (x, y, w, h, f, r = 2, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra}/>`;
const knob = (x, y, r, f = '#ddd') => `<circle cx="${x}" cy="${y}" r="${r}" fill="#222" stroke="#000"/><circle cx="${x}" cy="${y}" r="${r * .7}" fill="${f}"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - r * .7}" stroke="#222" stroke-width="1"/>`;
// drum machines: body colour, step key colours, layout
const DM = {
  RolandTR808: { body: '#2b2b2b', top: '#d9d4c7', keys: ['#e8452c', '#f39c27', '#f5dc3a', '#f2efe6'], knobs: 16, label: 'TR-808' },
  RolandTR909: { body: '#9ea2a6', top: '#d0d3d6', keys: ['#3a3a3a', '#3a3a3a', '#3a3a3a', '#f08a24'], knobs: 18, label: 'TR-909' },
  RolandTR707: { body: '#2f3133', top: '#2f3133', keys: ['#c9c9c9', '#c9c9c9', '#c9c9c9', '#c9c9c9'], knobs: 0, lcd: true, label: 'TR-707' },
  RolandTR606: { body: '#d8d6d0', top: '#d8d6d0', keys: ['#c4372f', '#c4372f', '#c4372f', '#c4372f'], knobs: 8, label: 'TR-606' },
  LinnDrum: { body: '#3a2c22', top: '#1c1c1c', keys: ['#e5e5e5', '#e5e5e5', '#e5e5e5', '#e5e5e5'], knobs: 0, faders: 15, wood: true, label: 'LinnDrum' },
  AkaiMPC60: { body: '#cfcac0', top: '#cfcac0', pads: true, lcd: true, label: 'MPC60' },
};
const brand = n => /^Roland/.test(n) ? { body: '#3a3c40', key: '#d9d9d9' } : /^Korg/.test(n) ? { body: '#1d1d1f', key: '#c33' } : /^Yamaha/.test(n) ? { body: '#2a2d33', key: '#bbb' } : /^Casio/.test(n) ? { body: '#c8c8c8', key: '#444' } : /^Boss/.test(n) ? { body: '#202020', key: '#e33' } : /^Akai/.test(n) ? { body: '#cfcac0', key: '#555' } : { body: '#2e2e33', key: '#aaa' };
export function drumMachine(name) {
  const d = DM[name] || { ...brand(name), keys: Array(4).fill(brand(name).key), knobs: 6, label: name.replace(/^(Roland|Korg|Yamaha|Casio|Boss|Akai|Alesis|Emu|Linn|Oberheim)/, '$1 ') };
  let s = rect(2, 6, 156, 72, d.body, 6, 'stroke="#000"');
  if (d.wood) s = rect(0, 4, 160, 76, '#7a4a28', 7) + rect(8, 8, 144, 68, d.top, 3);
  else if (d.top !== d.body) s += rect(6, 10, 148, 30, d.top, 3);
  if (d.pads) { for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += rect(92 + c * 15, 22 + r * 13, 12, 10, '#5c5c5c', 2); s += rect(10, 16, 70, 18, '#4d6b3c', 2) + rect(10, 44, 70, 6, '#888', 1) + rect(10, 56, 70, 6, '#888', 1); }
  else {
    if (d.lcd) s += rect(12, 16, 40, 14, '#7fa36b', 2);
    for (let k = 0; k < (d.knobs || 0); k++) s += knob(14 + (k % 12) * 11.5, 20 + Math.floor(k / 12) * 12, 3.6);
    for (let f = 0; f < (d.faders || 0); f++) s += rect(14 + f * 9, 16, 3, 20, '#bbb', 1) + rect(12 + f * 9, 22 + (f * 7 % 12), 7, 4, '#eee', 1);
    for (let i = 0; i < 16; i++) s += rect(9 + i * 9.1, 56, 7, 12, d.keys[Math.floor(i / 4)], 1.5, 'stroke="#111" stroke-width=".5"');
  }
  s += `<text x="150" y="${d.pads ? 72 : 50}" text-anchor="end" font-family="Chakra Petch, sans-serif" font-size="9" font-weight="700" fill="${d.top === '#d9d4c7' || d.body === '#9ea2a6' || d.body === '#d8d6d0' || d.body === '#cfcac0' || d.body === '#c8c8c8' ? '#222' : '#eee'}">${d.label}</text>`;
  return W(160, 84, s);
}
// General MIDI families: one drawing per family, tinted
const ink = '#f3ecff', a1 = '#ff2e88', a2 = '#00e5ff';
const FAMILY = {
  Guitars: (n) => /acoustic|nylon|steel/.test(n) ? W(120, 84, `<path d="M20 52 C20 30 48 28 56 40 C64 30 84 34 82 52 C84 72 58 78 52 66 C44 78 18 72 20 52Z" fill="#c8893f" stroke="#000"/><circle cx="54" cy="52" r="7" fill="#2a1a0a"/><rect x="80" y="47" width="34" height="6" fill="#5a3a1a"/><rect x="108" y="44" width="10" height="12" rx="2" fill="#3a2410"/>`)
    : W(120, 84, `<path d="M18 50 C14 32 34 28 40 38 C46 30 58 30 60 40 C70 36 74 48 64 54 C70 62 62 74 50 68 C40 76 20 70 18 50Z" fill="${/distortion|overdriven/.test(n) ? '#b3122e' : /jazz/.test(n) ? '#c98a3a' : '#2e6fd6'}" stroke="#000"/><rect x="30" y="46" width="22" height="4" fill="#111"/><rect x="30" y="54" width="22" height="4" fill="#111"/><rect x="62" y="47" width="46" height="5" fill="#d9b27a"/><path d="M106 44 l12 -3 l0 12 l-12 -2Z" fill="#d9b27a"/>`),
  Basses: () => W(120, 84, `<path d="M14 52 C10 34 30 32 36 42 C44 34 56 36 56 46 C62 52 58 66 46 64 C36 74 16 70 14 52Z" fill="#1f1f1f" stroke="#555"/><rect x="24" y="49" width="18" height="6" fill="#444"/><rect x="56" y="48" width="56" height="5" fill="#c99a5f"/><rect x="108" y="44" width="10" height="13" rx="2" fill="#222"/>`),
  Keys: () => W(120, 84, `${rect(6, 30, 108, 40, '#1b1b1d', 4, 'stroke="#000"')}${Array.from({ length: 14 }, (_, i) => rect(10 + i * 7.3, 46, 6.6, 22, '#f4f0e6', 1)).join('')}${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(i => rect(14.5 + i * 7.3, 46, 4, 13, '#111', 1)).join('')}${rect(10, 34, 40, 6, a1, 2)}`),
  Organs: () => W(120, 84, `${rect(6, 22, 108, 50, '#5a2e1a', 4)}${Array.from({ length: 9 }, (_, i) => rect(16 + i * 10, 26, 6, 14 + (i * 5 % 9), ['#7a4a2a', '#111', '#f4f0e6'][i % 3], 1)).join('')}${Array.from({ length: 14 }, (_, i) => rect(10 + i * 7.3, 50, 6.6, 18, '#f4f0e6', 1)).join('')}`),
  Strings: () => W(120, 84, `<path d="M44 14 C36 14 34 26 40 32 C30 36 30 52 40 56 C32 62 34 76 50 76 C66 76 68 62 60 56 C70 52 70 36 60 32 C66 26 64 14 56 14Z" fill="#9b4a1c" stroke="#000"/><rect x="48" y="2" width="4" height="40" fill="#222"/><line x1="40" y1="64" x2="104" y2="10" stroke="${ink}" stroke-width="1.5"/>`),
  Voices: () => W(120, 84, `<rect x="48" y="10" width="24" height="40" rx="12" fill="#888" stroke="#000"/>${Array.from({ length: 5 }, (_, i) => `<line x1="50" y1="${18 + i * 6}" x2="70" y2="${18 + i * 6}" stroke="#555"/>`).join('')}<path d="M38 40 C38 62 82 62 82 40" fill="none" stroke="${ink}" stroke-width="2"/><rect x="58" y="58" width="4" height="16" fill="${ink}"/>`),
  Brass: () => W(120, 84, `<path d="M10 44 L64 40 C78 40 84 26 100 18 L104 66 C88 58 78 48 64 48 L10 46Z" fill="#e0b13a" stroke="#7a5a10"/>${[40, 48, 56].map(x => rect(x, 30, 4, 12, '#c99a2a', 1)).join('')}`),
  Reeds: () => W(120, 84, `<path d="M30 10 L40 10 L46 50 C48 66 70 70 76 56 L80 46 L88 50 L82 64 C72 84 40 80 36 54Z" fill="#d9a42e" stroke="#7a5a10"/>${[22, 30, 38, 46].map(y => `<circle cx="42" cy="${y}" r="2.5" fill="#7a5a10"/>`).join('')}`),
  Pipes: () => W(120, 84, `${rect(8, 38, 104, 8, '#cfd3d8', 4, 'stroke="#555"')}${[30, 44, 58, 72, 86].map(x => `<circle cx="${x}" cy="42" r="2.2" fill="#555"/>`).join('')}`),
  Mallets: () => W(120, 84, Array.from({ length: 8 }, (_, i) => rect(10 + i * 13, 20 + i * 3, 10, 50 - i * 5, i % 2 ? '#b5743a' : '#c98a4a', 2)).join('')),
  Percussion: () => W(120, 84, `<ellipse cx="60" cy="30" rx="38" ry="10" fill="#e8e1d0" stroke="#000"/><path d="M22 30 L22 62 C22 76 98 76 98 62 L98 30" fill="#b3122e" stroke="#000"/><ellipse cx="60" cy="30" rx="38" ry="10" fill="#e8e1d0" stroke="#000"/>`),
  World: () => W(120, 84, `<ellipse cx="34" cy="56" rx="22" ry="18" fill="#a0602a" stroke="#000"/><rect x="50" y="52" width="64" height="6" fill="#6a3c18"/><circle cx="34" cy="56" r="6" fill="#3a1e08"/>`),
  'Synth leads': () => synthArt(a1), 'Synth pads': () => synthArt(a2), 'Synth FX': () => synthArt('#a98bff'),
  Effects: () => W(120, 84, `<path d="M8 42 Q20 10 32 42 T56 42 T80 42 T104 42" fill="none" stroke="${a2}" stroke-width="3"/>`),
};
function synthArt(c) { return W(120, 84, `${rect(6, 24, 108, 48, '#26262c', 4, 'stroke="#000"')}${Array.from({ length: 8 }, (_, i) => knob(16 + i * 12, 34, 4, c)).join('')}${Array.from({ length: 14 }, (_, i) => rect(10 + i * 7.3, 48, 6.6, 20, '#f4f0e6', 1)).join('')}${[0, 1, 3, 4, 5, 7, 8, 10, 11, 12].map(i => rect(14.5 + i * 7.3, 48, 4, 12, '#111', 1)).join('')}`); }
export const instrument = (family, name) => (FAMILY[family] || FAMILY.Effects)(name);
// built-in synths: the waveform itself
const WAVE = { sawtooth: 'M8 60 L40 20 L40 60 L72 20 L72 60 L104 20 L104 60', square: 'M8 60 L8 20 L36 20 L36 60 L64 60 L64 20 L92 20 L92 60 L112 60', triangle: 'M8 60 L28 20 L48 60 L68 20 L88 60 L108 20', sine: 'M8 40 Q22 6 36 40 T64 40 T92 40 T120 40', supersaw: 'M8 60 L40 20 L40 60 L72 20 L72 60 L104 20 L104 60 M12 62 L44 24 L44 62 L76 24 L76 62 L108 24' };
export const synth = name => W(120, 84, `<path d="${WAVE[name] || 'M8 40 ' + Array.from({ length: 24 }, (_, i) => `L${12 + i * 4.3} ${40 + Math.sin(i * 7.3) * 18}`).join(' ')}" fill="none" stroke="${a1}" stroke-width="3" stroke-linejoin="round"/>`);

// samples, acoustic instruments, your own files: small drawings by kind
const GENERIC = {
  drumkit: () => W(120, 84, `<ellipse cx="40" cy="58" rx="22" ry="16" fill="#b3122e" stroke="#000"/><ellipse cx="40" cy="50" rx="22" ry="8" fill="#e8e1d0" stroke="#000"/><ellipse cx="86" cy="40" rx="16" ry="5" fill="#e0b13a" stroke="#7a5a10"/><line x1="86" y1="40" x2="86" y2="76" stroke="#999" stroke-width="2"/><ellipse cx="74" cy="62" rx="12" ry="8" fill="#b3122e" stroke="#000"/>`),
  voice: () => FAMILY.Voices(),
  wave: () => FAMILY.Effects(),
  folder: () => W(120, 84, `<path d="M18 26 L46 26 L52 32 L102 32 L102 70 L18 70Z" fill="#e0b13a" stroke="#7a5a10"/><path d="M30 52 Q40 36 50 52 T70 52 T90 52" fill="none" stroke="#2a1a0a" stroke-width="3"/>`),
  piano: () => FAMILY.Keys(),
};
// drawing for a catalogue item
export function artFor(item) {
  if (item.cat === 'drums') return drumMachine(item.group);
  if (item.cat === 'instruments') return instrument(item.group, item.name);
  if (item.cat === 'synths') return synth(item.name);
  if (item.cat === 'yours') return GENERIC.folder();
  if (item.cat === 'acoustic') return /piano/.test(item.name) ? GENERIC.piano() : /drum|snare|tom|cymbal|timpani|tamb|bongo|conga|clap|shaker|block|bell|gong|tabla|mrid/.test(item.name + item.group) ? FAMILY.Percussion() : /harp|guitar|banjo|sitar|zither/.test(item.name) ? FAMILY.World() : /flute|recorder|ocarina|whistle/.test(item.name) ? FAMILY.Pipes() : FAMILY.Mallets();
  if (/bd|kick|sd|snare|hh|hat|cp|clap|drum|perc|break|amen|909|808|gabba|tabla|rm|rs|tom|cym|cr\b|ride/.test(item.name)) return GENERIC.drumkit();
  if (/speech|voice|vox|yeah|alphabet|num|diphone|mouth|baa|hmm|speak|sing|choir/.test(item.name)) return GENERIC.voice();
  return GENERIC.wave();
}
// pixel art: rasterise the drawing on a tiny canvas once, keep the result as a data URL
const cache = new Map();
export function pixelArt(key, svg, w = 40) {
  const id = `${key}@${w}`;
  if (cache.has(id)) return cache.get(id);
  const p = new Promise(res => {
    const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/), h = Math.max(1, Math.round(w * (vb ? vb[2] / vb[1] : .7)));
    const img = new Image();
    img.onload = () => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, w, h); res(c.toDataURL()); };
    img.onerror = () => res('');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  cache.set(id, p);
  return p;
}
