// Stylised instrument drawings in SVG (no third-party images), shown as pixel art in the sound browser
const W = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">${body}</svg>`;
const rect = (x, y, w, h, f, r = 2, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f}" ${extra}/>`;
const knob = (x, y, r, f = '#ddd') => `<circle cx="${x}" cy="${y}" r="${r}" fill="#222" stroke="#000"/><circle cx="${x}" cy="${y}" r="${r * .7}" fill="${f}"/><line x1="${x}" y1="${y}" x2="${x}" y2="${y - r * .7}" stroke="#222" stroke-width="1"/>`;
// Drum machines: each model gets an archetype (its layout) plus its colours and name.
// tr: Roland TR (knobs + 16 coloured step keys) · pads: rubber pads + display · mpc: 4x4 pads + LCD
// linn: wood sides + faders · keys: keyboard instrument · rack: rack or desktop module · vintage: wood cabinet, rhythm tabs
// handheld: small box · hex: hexagonal pads · modular: patch panels with cables · box: generic
const M = {
  RolandTR808: ['tr', { body: '#2b2b2b', top: '#d9d4c7', keys: ['#e8452c', '#f39c27', '#f5dc3a', '#f2efe6'], knobs: 16 }, 'TR-808'],
  RolandTR909: ['tr', { body: '#9ea2a6', top: '#d0d3d6', keys: ['#3a3a3a', '#3a3a3a', '#3a3a3a', '#f08a24'], knobs: 18 }, 'TR-909'],
  RolandTR606: ['tr', { body: '#d8d6d0', top: '#d8d6d0', keys: ['#c4372f', '#c4372f', '#c4372f', '#c4372f'], knobs: 8 }, 'TR-606'],
  RolandTR707: ['tr', { body: '#e9e6dc', top: '#e9e6dc', keys: ['#4a4a4a', '#4a4a4a', '#4a4a4a', '#4a4a4a'], faders: 10, lcd: true }, 'TR-707'],
  RolandTR727: ['tr', { body: '#e9e6dc', top: '#e9e6dc', keys: ['#d1873a', '#d1873a', '#4a4a4a', '#4a4a4a'], faders: 10, lcd: true }, 'TR-727'],
  RolandTR505: ['pads', { body: '#e6e3da', pad: '#9a9a9a', lcd: '#9fbf8a', cols: 8, rows: 2 }, 'TR-505'],
  RolandTR626: ['pads', { body: '#2b2b2e', pad: '#8a8a8a', lcd: '#9fbf8a', cols: 8, rows: 2 }, 'TR-626'],
  RolandR8: ['pads', { body: '#b9bcc0', pad: '#4a4c50', lcd: '#9fbf8a', cols: 4, rows: 4, sliders: 4 }, 'R-8'],
  RolandCompurhythm78: ['vintage', { wood: '#6e4325', panel: '#c9c1ad', tabs: ['#e8452c', '#f39c27', '#f5dc3a', '#e8e1d0'] }, 'CR-78'],
  RolandCompurhythm1000: ['vintage', { wood: '#5a3a22', panel: '#2b2b2b', tabs: ['#e8e1d0', '#e8e1d0', '#e8452c', '#e8e1d0'] }, 'CR-1000'],
  RolandCompurhythm8000: ['vintage', { wood: '#7a5a34', panel: '#d9d0b8', tabs: ['#e8452c', '#f39c27', '#f5dc3a', '#5da0d0'] }, 'CR-8000'],
  RolandMC202: ['keys', { body: '#3c4a5a', keys: 24, knobs: 8, accent: '#5da0d0' }, 'MC-202'],
  RolandMC303: ['pads', { body: '#c8c9cc', pad: '#e8e8e8', lcd: '#d84a3a', cols: 8, rows: 1, knobs: 6 }, 'MC-303'],
  RolandSH09: ['keys', { body: '#1f1f22', keys: 32, knobs: 10, accent: '#e8452c' }, 'SH-09'],
  RolandD70: ['keys', { body: '#202024', keys: 56, knobs: 0, lcd: true, accent: '#7ab0e0' }, 'D-70'],
  RolandS50: ['keys', { body: '#202024', keys: 48, knobs: 0, lcd: true, accent: '#7ab0e0' }, 'S-50'],
  RolandSystem100: ['modular', { body: '#2a2a2c', panel: '#b9b5a8', cables: ['#e8452c', '#f5dc3a', '#5da0d0'] }, 'System-100'],
  RolandJD990: ['rack', { body: '#1e1f22', lcd: '#9fe06b', u: 2, knobs: 6 }, 'JD-990'],
  RolandD110: ['rack', { body: '#1e1f22', lcd: '#9fe06b', u: 1, knobs: 2 }, 'D-110'],
  RolandMT32: ['rack', { body: '#2a2a2d', lcd: '#e84a3a', u: 2, knobs: 1, desktop: true }, 'MT-32'],
  RolandDDR30: ['rack', { body: '#2a2a2d', lcd: '#e84a3a', u: 1, knobs: 8 }, 'DDR-30'],
  BossDR55: ['handheld', { body: '#202020', keys: '#d93a2e', lcd: false }, 'DR-55'],
  BossDR110: ['handheld', { body: '#d7d3c8', keys: '#3b3b3b', lcd: true }, 'DR-110'],
  BossDR220: ['pads', { body: '#2c2c2e', pad: '#5c5c60', lcd: '#9fbf8a', cols: 6, rows: 2 }, 'DR-220'],
  BossDR550: ['pads', { body: '#202022', pad: '#d93a2e', lcd: '#9fbf8a', cols: 6, rows: 2 }, 'DR-550'],
  KorgMinipops: ['vintage', { wood: '#5a3a22', panel: '#c9c4b6', tabs: ['#e8e1d0', '#e8e1d0', '#e8e1d0', '#e8e1d0'] }, 'Mini Pops'],
  KorgKR55: ['vintage', { wood: '#3a3a3a', panel: '#bdb6a3', tabs: ['#2b2b2b', '#2b2b2b', '#d9822b', '#3b8a4c'] }, 'KR-55'],
  KorgKPR77: ['handheld', { body: '#1d1d1f', keys: '#c33', lcd: true }, 'KPR-77'],
  KorgDDM110: ['pads', { body: '#1d1d1f', pad: '#c8c8c8', lcd: '#d84a3a', cols: 6, rows: 2 }, 'DDM-110'],
  KorgKRZ: ['keys', { body: '#1d1d1f', keys: 40, knobs: 4, accent: '#c33' }, 'KRZ'],
  KorgM1: ['keys', { body: '#1d1d1f', keys: 56, knobs: 0, lcd: true, accent: '#c33' }, 'M1'],
  KorgPoly800: ['keys', { body: '#1d1d1f', keys: 40, knobs: 0, lcd: false, accent: '#3ab0c8', stripe: true }, 'Poly-800'],
  KorgT3: ['keys', { body: '#2a2a2d', keys: 56, knobs: 0, lcd: true, accent: '#c33' }, 'T3'],
  YamahaRX5: ['pads', { body: '#2a2d33', pad: '#7a7d84', lcd: '#9fbf8a', cols: 6, rows: 2, sliders: 0 }, 'RX5'],
  YamahaRX21: ['pads', { body: '#2a2d33', pad: '#c8c8c8', lcd: '#9fbf8a', cols: 5, rows: 2 }, 'RX21'],
  YamahaRY30: ['pads', { body: '#232428', pad: '#6a6c72', lcd: '#9fbf8a', cols: 6, rows: 2, sliders: 2 }, 'RY30'],
  YamahaRM50: ['rack', { body: '#202226', lcd: '#9fe06b', u: 1, knobs: 4 }, 'RM50'],
  YamahaTG33: ['rack', { body: '#2a2d33', lcd: '#9fe06b', u: 2, knobs: 2, desktop: true, joystick: true }, 'TG33'],
  CasioRZ1: ['pads', { body: '#1e1e20', pad: '#5ab8d8', lcd: '#9fbf8a', cols: 6, rows: 2 }, 'RZ-1'],
  CasioSK1: ['keys', { body: '#1e1e20', keys: 32, knobs: 0, accent: '#f0c040', speaker: true }, 'SK-1'],
  CasioVL1: ['keys', { body: '#efede6', keys: 29, knobs: 0, lcd: true, accent: '#d9822b', speaker: true, mini: true }, 'VL-1'],
  AkaiMPC60: ['mpc', { body: '#cfcac0', pad: '#8d8a84', lcd: '#4d6b3c' }, 'MPC60'],
  AkaiLinn: ['mpc', { body: '#cfcac0', pad: '#8d8a84', lcd: '#4d6b3c' }, 'Linn MPC60'],
  MPC1000: ['mpc', { body: '#2c2e33', pad: '#5a5d63', lcd: '#7fb0d8' }, 'MPC1000'],
  AkaiXR10: ['pads', { body: '#e2ddd0', pad: '#7d7a72', lcd: '#4d6b3c', cols: 6, rows: 2 }, 'XR10'],
  EmuSP12: ['mpc', { body: '#2c3446', pad: '#c8ccd4', lcd: '#7fb0d8', faders: 8 }, 'SP-12'],
  EmuDrumulator: ['pads', { body: '#3a3f4a', pad: '#5ab8d8', lcd: '#d84a3a', cols: 8, rows: 1 }, 'Drumulator'],
  EmuModular: ['modular', { body: '#1e1e20', panel: '#2f3238', cables: ['#e8452c', '#5da0d0', '#f5dc3a'] }, 'E-mu Modular'],
  LinnDrum: ['linn', { panel: '#1c1c1c', keys: '#e5e5e5' }, 'LinnDrum'],
  LinnLM1: ['linn', { panel: '#2a1d16', keys: '#d6402e' }, 'LM-1'],
  LinnLM2: ['linn', { panel: '#1c1c1c', keys: '#e5e5e5' }, 'LM-2'],
  Linn9000: ['mpc', { body: '#3a302c', pad: '#d8d2c8', lcd: '#9fbf8a', faders: 10 }, 'Linn 9000'],
  OberheimDMX: ['pads', { body: '#1f2024', pad: '#3a6ea8', lcd: '#d84a3a', cols: 8, rows: 2, sliders: 8 }, 'DMX'],
  SequentialCircuitsDrumtracks: ['pads', { body: '#232325', pad: '#e8dfc8', lcd: '#d84a3a', cols: 6, rows: 2, wood: true }, 'Drumtraks'],
  SequentialCircuitsTom: ['pads', { body: '#232325', pad: '#c8c8c8', lcd: '#d84a3a', cols: 6, rows: 2 }, 'TOM'],
  SimmonsSDS5: ['hex', { body: '#1a1a1c', pad: '#2f2f33', rim: '#d93a2e' }, 'SDS-V'],
  SimmonsSDS400: ['hex', { body: '#1a1a1c', pad: '#2f2f33', rim: '#e0e0e0' }, 'SDS 400'],
  MoogConcertMateMG1: ['keys', { body: '#1a1a1c', keys: 32, knobs: 10, accent: '#d84a3a' }, 'MG-1'],
  RhodesPolaris: ['keys', { body: '#2a1a12', keys: 56, knobs: 6, accent: '#d9822b' }, 'Polaris'],
  SergeModular: ['modular', { body: '#111', panel: '#1f2a44', cables: ['#e8452c', '#f5dc3a', '#e0e0e0'] }, 'Serge'],
  DoepferMS404: ['rack', { body: '#c9ccd1', lcd: false, u: 1, knobs: 12 }, 'MS-404'],
  MFB512: ['handheld', { body: '#d9d7d0', keys: '#2b2b2b', lcd: false, knobs: 6 }, 'MFB-512'],
  RhythmAce: ['vintage', { wood: '#1f1f1f', panel: '#2b2b2b', tabs: ['#e8e1d0', '#e8e1d0', '#e8e1d0', '#e8a93a'] }, 'Rhythm Ace'],
  UnivoxMicroRhythmer12: ['vintage', { wood: '#2b2b2b', panel: '#b8b2a2', tabs: ['#e8e1d0', '#e8e1d0', '#e8e1d0', '#e8e1d0'] }, 'Micro Rhythmer'],
  SakataDPM48: ['pads', { body: '#2a2a2d', pad: '#8a8a8a', lcd: '#9fbf8a', cols: 8, rows: 1 }, 'DPM-48'],
  SoundmastersR88: ['handheld', { body: '#202022', keys: '#e8a93a', lcd: false }, 'SR-88'],
  ViscoSpaceDrum: ['vintage', { wood: '#3a3a40', panel: '#c0c4c8', tabs: ['#5da0d0', '#5da0d0', '#e8e1d0', '#e8e1d0'] }, 'Space Drum'],
  XdrumLM8953: ['pads', { body: '#1f2226', pad: '#d8d8d8', lcd: '#9fbf8a', cols: 8, rows: 1 }, 'LM-8953'],
  AJKPercusyn: ['handheld', { body: '#2a2f3a', keys: '#5ab8d8', lcd: false, knobs: 8 }, 'Percusyn'],
};
const T = (x, y, txt, fill, size = 8, anchor = 'end') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Chakra Petch, sans-serif" font-size="${size}" font-weight="700" fill="${fill}">${txt}</text>`;
const light = c => /^#(?:[c-f]|[89ab][89a-f])/i.test(c);
const ARCH = {
  tr: (d, l) => { let s = rect(2, 6, 156, 72, d.body, 6, 'stroke="#000"'); if (d.top !== d.body) s += rect(6, 10, 148, 30, d.top, 3); if (d.lcd) s += rect(12, 16, 36, 13, '#7fa36b', 2); for (let k = 0; k < (d.knobs || 0); k++) s += knob(14 + (k % 12) * 11.5, 20 + Math.floor(k / 12) * 12, 3.6); for (let f = 0; f < (d.faders || 0); f++) s += rect(58 + f * 9, 15, 3, 22, '#777', 1) + rect(56 + f * 9, 20 + (f * 7 % 12), 7, 4, '#eee', 1); for (let i = 0; i < 16; i++) s += rect(9 + i * 9.1, 56, 7, 12, d.keys[Math.floor(i / 4)], 1.5, 'stroke="#111" stroke-width=".5"'); return s + T(150, 50, l, light(d.top) ? '#222' : '#eee'); },
  pads: (d, l) => { let s = rect(2, 8, 156, 70, d.body, 5, 'stroke="#000"'); if (d.wood) s = rect(0, 6, 160, 74, '#7a4a28', 6) + rect(6, 8, 148, 70, d.body, 3); s += rect(10, 14, 50, 14, d.lcd, 2); const cols = d.cols, rows = d.rows, w = Math.min(14, 136 / cols - 3); for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) s += rect(12 + c * (w + 3), 58 - (rows - 1 - r) * (w * .8 + 3), w, w * .8, d.pad, 2, 'stroke="#000" stroke-width=".5"'); for (let k = 0; k < (d.sliders || 0); k++) s += rect(70 + k * 9, 14, 3, 18, '#888', 1) + rect(68 + k * 9, 20, 7, 4, '#ddd', 1); for (let k = 0; k < (d.knobs || 0); k++) s += knob(76 + k * 12, 22, 4); return s + T(150, 26, l, light(d.body) ? '#222' : '#eee'); },
  mpc: (d, l) => { let s = rect(2, 4, 156, 76, d.body, 5, 'stroke="#000"'); s += rect(10, 12, 62, 20, d.lcd, 2); for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += rect(94 + c * 15, 34 + r * 11, 12, 9, d.pad, 2, 'stroke="#000" stroke-width=".5"'); for (let f = 0; f < (d.faders || 2); f++) s += rect(12 + f * 8, 42, 3, 28, '#777', 1) + rect(10 + f * 8, 50 + (f * 5 % 14), 7, 4, '#eee', 1); return s + T(150, 18, l, light(d.body) ? '#222' : '#eee'); },
  linn: (d, l) => { let s = rect(0, 4, 160, 76, '#7a4a28', 7) + rect(9, 8, 142, 68, d.panel, 3); for (let f = 0; f < 15; f++) s += rect(15 + f * 8.5, 16, 3, 22, '#bbb', 1) + rect(13 + f * 8.5, 22 + (f * 7 % 12), 7, 4, '#eee', 1); for (let i = 0; i < 15; i++) s += rect(14 + i * 8.6, 48, 6.5, 6, d.keys, 1) + rect(14 + i * 8.6, 58, 6.5, 6, d.keys, 1); return s + T(148, 74, l, '#e8452c'); },
  keys: (d, l) => { const n = d.keys, w = 146 / n; let s = rect(2, d.mini ? 26 : 18, 156, d.mini ? 46 : 58, d.body, 5, 'stroke="#000"'); if (d.stripe) s += rect(2, 34, 156, 3, d.accent, 0); if (d.lcd) s += rect(60, d.mini ? 30 : 22, 40, 10, '#7fa36b', 2); if (d.speaker) s += Array.from({ length: 5 }, (_, i) => rect(8, (d.mini ? 30 : 22) + i * 3, 30, 1.5, '#111', 0)).join(''); for (let k = 0; k < (d.knobs || 0); k++) s += knob(14 + k * 11, 28, 3.6, d.accent); for (let i = 0; i < n; i++) s += rect(7 + i * w, d.mini ? 52 : 46, w - .8, d.mini ? 16 : 26, '#f4f0e6', .8); for (let i = 0; i < n; i++) if ([1, 3, 6, 8, 10].includes(i % 12) && i < n - 1) s += rect(7 + i * w + w * .55, d.mini ? 52 : 46, w * .8, d.mini ? 9 : 15, '#111', .6); return s + T(152, d.mini ? 42 : 32, l, light(d.body) ? '#333' : d.accent || '#eee'); },
  rack: (d, l) => { const h = d.u === 1 ? 26 : 44, y = d.desktop ? 30 : 42 - h / 2; let s = d.desktop ? `<path d="M6 ${y + h + 8} L14 ${y} L146 ${y} L154 ${y + h + 8}Z" fill="${d.body}" stroke="#000"/>` : rect(2, y, 156, h, d.body, 2, 'stroke="#000"') + rect(4, y + 3, 6, h - 6, '#555', 1) + rect(150, y + 3, 6, h - 6, '#555', 1); if (d.lcd) s += rect(22, y + 6, 46, Math.min(14, h - 12), d.lcd, 2); for (let k = 0; k < (d.knobs || 0); k++) s += knob((d.lcd ? 80 : 20) + k * (d.lcd ? 10 : 10.5), y + h / 2, 3.5); if (d.joystick) s += `<circle cx="128" cy="${y + 14}" r="6" fill="#111"/><rect x="127" y="${y + 2}" width="2" height="12" fill="#999"/>`; return s + T(146, y + h - 4, l, light(d.body) ? '#333' : '#ddd', 7); },
  vintage: (d, l) => { let s = rect(0, 10, 160, 66, d.wood, 6) + rect(8, 16, 144, 54, d.panel, 3); for (let i = 0; i < 12; i++) s += rect(14 + i * 11, 22, 9, 16, d.tabs[Math.floor(i / 3)], 1.5, 'stroke="#000" stroke-width=".5"'); for (let k = 0; k < 6; k++) s += knob(20 + k * 22, 52, 5); return s + T(148, 66, l, light(d.panel) ? '#222' : '#ddd'); },
  handheld: (d, l) => { let s = rect(30, 8, 100, 70, d.body, 6, 'stroke="#000"'); if (d.lcd) s += rect(40, 16, 46, 14, '#7fa36b', 2); for (let k = 0; k < (d.knobs || 3); k++) s += knob(98 + (k % 3) * 11, 20 + Math.floor(k / 3) * 11, 3.6); for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) s += rect(38 + c * 14, 46 + r * 13, 10, 9, d.keys, 2); return s + T(124, 74, l, light(d.body) ? '#222' : '#eee', 7); },
  hex: (d, l) => { const hexa = (cx, cy, r) => `<polygon points="${Array.from({ length: 6 }, (_, i) => `${cx + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)},${cy + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)}`).join(' ')}" fill="${d.pad}" stroke="${d.rim}" stroke-width="2"/>`; return hexa(40, 52, 22) + hexa(80, 34, 20) + hexa(120, 52, 22) + hexa(80, 70, 12) + T(156, 14, l, '#ddd'); },
  modular: (d, l) => { let s = rect(2, 6, 156, 72, d.body, 3, 'stroke="#000"'); for (let m = 0; m < 6; m++) { s += rect(6 + m * 25, 10, 23, 64, d.panel, 1); for (let k = 0; k < 3; k++) s += knob(17 + m * 25, 20 + k * 14, 4); for (let j = 0; j < 2; j++) s += `<circle cx="${12 + m * 25 + j * 10}" cy="66" r="2.5" fill="#111"/>`; } for (let c = 0; c < 3; c++) s += `<path d="M${14 + c * 40} 66 Q ${40 + c * 30} ${92} ${60 + c * 35} 66" fill="none" stroke="${d.cables[c]}" stroke-width="2.5"/>`; return s + T(154, 9, l, '#ddd', 7); },
  box: (d, l) => rect(2, 10, 156, 64, '#2e2e33', 6) + T(150, 40, l, '#ddd'),
};
export function drumMachine(name) {
  const [arch, d, label] = M[name] || ['box', {}, name];
  return W(160, 84, ARCH[arch](d, label));
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
  Ensemble: () => W(120, 84, [18, 48, 78].map(x => `<path d="M${x + 6} 18 C${x} 18 ${x - 2} 28 ${x + 2} 32 C${x - 4} 36 ${x - 4} 50 ${x + 2} 54 C${x - 2} 58 ${x} 70 ${x + 10} 70 C${x + 20} 70 ${x + 22} 58 ${x + 18} 54 C${x + 24} 50 ${x + 24} 36 ${x + 18} 32 C${x + 22} 28 ${x + 20} 18 ${x + 14} 18Z" fill="#9b4a1c" stroke="#000"/>`).join('')),
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
// one picture per group (machine, family, kind), so groups do not all look alike
const SYNTH_GROUP = {
  Oscillators: () => synth('sawtooth'),
  Noise: () => W(120, 84, `<path d="M6 42 ${Array.from({ length: 54 }, (_, i) => `L${8 + i * 2} ${42 + Math.sin(i * 12.9898) * 43758 % 1 * 30 - 15}`).join(' ')}" fill="none" stroke="#a98bff" stroke-width="2"/>`),
  ZzFX: () => W(120, 84, `${rect(28, 18, 64, 50, '#2f2f44', 4, 'stroke="#000"')}${rect(34, 24, 52, 24, '#7fd0a0', 2)}${[0, 1, 2, 3].map(i => rect(38 + i * 12, 54, 8, 8, ['#e8452c', '#f5dc3a', '#5da0d0', '#3dffb0'][i], 2)).join('')}<path d="M40 40 L46 32 L52 40 L58 30 L64 40 L70 34 L76 40" fill="none" stroke="#173" stroke-width="2"/>`),
  'GM leads': () => W(120, 84, `${rect(6, 30, 108, 40, '#26262c', 4, 'stroke="#000"')}${Array.from({ length: 14 }, (_, i) => rect(10 + i * 7.3, 48, 6.6, 20, '#f4f0e6', 1)).join('')}<path d="M70 6 L58 28 L68 28 L60 46 L82 20 L72 20 L80 6Z" fill="${a1}"/>`),
  'GM pads': () => W(120, 84, `<path d="M20 52 C14 52 12 40 22 38 C22 26 40 24 44 32 C50 20 72 22 72 36 C86 32 94 44 86 52Z" fill="${a2}" opacity=".85"/><path d="M10 66 Q30 58 50 66 T90 66 T120 66" fill="none" stroke="${a2}" stroke-width="2"/>`),
  'GM effects': () => W(120, 84, [[30, 30, 10], [70, 22, 7], [88, 50, 12], [48, 58, 6]].map(([x, y, r]) => `<path d="M${x} ${y - r} L${x + r * .3} ${y - r * .3} L${x + r} ${y} L${x + r * .3} ${y + r * .3} L${x} ${y + r} L${x - r * .3} ${y + r * .3} L${x - r} ${y} L${x - r * .3} ${y - r * .3}Z" fill="#f5dc3a"/>`).join('')),
};
const SAMPLE_GROUP = {
  Drums: () => GENERIC.drumkit(),
  Breaks: () => W(120, 84, `<circle cx="60" cy="42" r="34" fill="#111" stroke="#333"/>${[28, 22, 16].map(r => `<circle cx="60" cy="42" r="${r}" fill="none" stroke="#2a2a2a"/>`).join('')}<circle cx="60" cy="42" r="10" fill="${a1}"/><circle cx="60" cy="42" r="2" fill="#000"/>`),
  Bass: () => W(120, 84, `${rect(30, 8, 60, 70, '#1d1d1f', 4, 'stroke="#000"')}<circle cx="60" cy="52" r="20" fill="#333" stroke="#000"/><circle cx="60" cy="52" r="8" fill="#555"/><circle cx="60" cy="22" r="8" fill="#333"/>`),
  Melodic: () => W(120, 84, `<path d="M44 62 L44 22 L84 14 L84 54" fill="none" stroke="${a2}" stroke-width="4"/><ellipse cx="38" cy="62" rx="9" ry="7" fill="${a2}"/><ellipse cx="78" cy="54" rx="9" ry="7" fill="${a2}"/>`),
  Voices: () => FAMILY.Voices(),
  'Glitch & electro': () => W(120, 84, `${rect(20, 14, 80, 56, '#14141a', 4, 'stroke="#555"')}${[0, 1, 2, 3, 4, 5].map(i => rect(24 + (i * 37 % 40), 18 + i * 8, 30 + (i * 13 % 30), 5, ['#ff2e88', '#00e5ff', '#f5dc3a'][i % 3], 0)).join('')}`),
  'Nature & space': () => W(120, 84, `<circle cx="88" cy="22" r="10" fill="#f5dc3a"/><path d="M10 74 L40 30 L58 54 L72 38 L110 74Z" fill="#3b8a4c"/><path d="M30 26 q6 -6 12 0 q6 -6 12 0" fill="none" stroke="#ddd" stroke-width="2"/>`),
  Misc: () => GENERIC.folder(),
};
const ACOUSTIC_GROUP = {
  Percussion: () => W(120, 84, `<path d="M40 20 L36 72 L64 72 L60 20Z" fill="#b5743a" stroke="#000"/><ellipse cx="50" cy="20" rx="10" ry="4" fill="#e8e1d0" stroke="#000"/><path d="M70 30 L66 72 L92 72 L88 30Z" fill="#9b5a2a" stroke="#000"/><ellipse cx="79" cy="30" rx="9" ry="3.5" fill="#e8e1d0" stroke="#000"/>`),
  'Mallets & bells': () => FAMILY.Mallets(),
  'Keys & organs': () => W(120, 84, `<path d="M10 40 L70 40 C100 40 110 50 110 60 L110 70 L10 70Z" fill="#141414" stroke="#444"/>${Array.from({ length: 12 }, (_, i) => rect(14 + i * 5, 58, 4.4, 10, '#f4f0e6', .6)).join('')}`),
  Strings: () => W(120, 84, `<path d="M30 76 L30 10 C60 10 90 40 96 76Z" fill="none" stroke="#c98a3a" stroke-width="4"/>${Array.from({ length: 8 }, (_, i) => `<line x1="${34 + i * 7}" y1="${14 + i * 3}" x2="${34 + i * 7}" y2="76" stroke="#ddd" stroke-width="1"/>`).join('')}`),
  Winds: () => W(120, 84, `${rect(16, 36, 90, 10, '#c98a3a', 5, 'stroke="#5a3a1a"')}${[36, 48, 60, 72, 84].map(x => `<circle cx="${x}" cy="41" r="2.4" fill="#3a2410"/>`).join('')}`),
  Mridangam: () => W(120, 84, `<path d="M20 42 C20 22 100 22 100 42 C100 62 20 62 20 42Z" fill="#8a4a20" stroke="#000"/><ellipse cx="20" cy="42" rx="6" ry="14" fill="#e8e1d0" stroke="#000"/><ellipse cx="100" cy="42" rx="7" ry="16" fill="#3a2a1a" stroke="#000"/>`),
};
export function groupArt(cat, group, first) {
  if (cat === 'drums') return drumMachine(group);
  if (cat === 'synths') return (SYNTH_GROUP[group] || (() => synth('sine')))();
  if (cat === 'samples') return (SAMPLE_GROUP[group] || SAMPLE_GROUP.Misc)();
  if (cat === 'acoustic') return (ACOUSTIC_GROUP[group] || ACOUSTIC_GROUP.Percussion)();
  if (cat === 'instruments') return FAMILY.Ensemble && group === 'Ensemble' ? FAMILY.Ensemble() : instrument(group, first ? first.name : '');
  return GENERIC.folder();
}
// drawing for a catalogue item
export function artFor(item) {
  if (item.cat === 'drums') return drumMachine(item.group);
  if (item.cat === 'instruments') return instrument(item.group, item.name);
  if (item.cat === 'synths') return item.group.startsWith('GM') ? SYNTH_GROUP[item.group]() : synth(item.name);
  if (item.cat === 'yours') return GENERIC.folder();
  if (item.cat === 'acoustic') return groupArt('acoustic', item.group);
  if (item.cat === 'samples') return groupArt('samples', item.group);
  if (false) return /piano/.test(item.name) ? GENERIC.piano() : /drum|snare|tom|cymbal|timpani|tamb|bongo|conga|clap|shaker|block|bell|gong|tabla|mrid/.test(item.name + item.group) ? FAMILY.Percussion() : /harp|guitar|banjo|sitar|zither/.test(item.name) ? FAMILY.World() : /flute|recorder|ocarina|whistle/.test(item.name) ? FAMILY.Pipes() : FAMILY.Mallets();
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
