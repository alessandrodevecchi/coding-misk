// Contrast check of the light app theme's tokens (light-theme), no browser: reads src/theme-light.css and, for the base
// set and every look, checks body text (7:1), muted, accent and warning text (4.5:1), text on an accent fill (4.5:1)
// and the borders of controls (3:1) against the grounds they sit on; the --dk-* tokens must equal neon's values of
// each look in src/style.css, so the stage, the video and the Neon code theme do not change in LIGHT.
// Usage: node --no-warnings tools/check-light-theme.mjs [--table]
import fs from 'node:fs';

const table = process.argv.includes('--table');
const light = fs.readFileSync(new URL('../src/theme-light.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const style = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
let failed = 0;
const check = (ok, name, extra = '') => { if (!ok || table) console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${extra ? ` (${extra})` : ''}`); if (!ok) failed++; };

// the custom properties of the rule with exactly this selector
const vars = (css, sel) => {
  const out = {};
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) if (m[1].trim() === sel) for (const [, k, v] of m[2].matchAll(/--([\w-]+)\s*:\s*([^;]+);?/g)) out[k] = v.trim();
  return out;
};
const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const lum = c => { const [r, g, b] = hex(c).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const isHex = v => /^#[0-9a-f]{3,6}$/i.test(v || '');

const LOOKS = ['palco', 'studio', 'edgerunners', 'pixel', 'montagne', 'spazio', 'sonar'];
const base = vars(light, ':root[data-ui="light"]');
const neonBase = vars(style, ':root');
check(isHex(base.bg) && isHex(base.ink), 'the light base set is read', Object.keys(base).length + ' tokens');

const pairs = (T, where) => {
  const grounds = { bg: T.bg, panel: T.panel, panel2: T.panel2 };
  const need = (fg, name, min, on = grounds) => { for (const [g, c] of Object.entries(on)) { const r = ratio(fg, c); check(r >= min, `${where}: ${name} on ${g}`, `${r.toFixed(2)}:1, at least ${min}`); } };
  need(T.ink, 'ink', 7);
  need(T.muted, 'muted', 4.5);
  need(T.a1, 'accent a1', 4.5);
  need(T.a2, 'accent a2', 4.5);
  // pressed buttons: the ground's colour or white on the accent
  for (const a of ['a1', 'a2']) { const r1 = ratio(T.bg, T[a]), r2 = ratio(T['on-accent'], T[a]); check(r1 >= 4.5 && r2 >= 4.5, `${where}: text on a ${a} fill`, `ground ${r1.toFixed(2)}:1, white ${r2.toFixed(2)}:1`); }
};
const T0 = { ...base };
pairs(T0, 'base');
// warning, record, session and section colours used as text
for (const k of ['danger', 'rec', 'info', 'charge', 's1', 's2', 's3', 's4']) for (const g of ['bg', 'panel', 'panel2']) { const r = ratio(base[k], base[g]); check(r >= 4.5, `base: ${k} on ${g}`, `${r.toFixed(2)}:1`); }
for (const k of ['s2', 's3']) { const r = ratio(base['on-accent'], base[k]); check(r >= 4.5, `base: text on a ${k} fill (mute, solo)`, `${r.toFixed(2)}:1`); }
for (const k of ['ctl-line', 'chip-line']) for (const g of ['bg', 'panel', 'panel2']) { const r = ratio(base[k], base[g]); check(r >= 3, `base: ${k} on ${g} (controls)`, `${r.toFixed(2)}:1`); }
// the radio's lanes
for (const lane of ['density', 'brightness', 'tension', 'voice']) {
  const m = new RegExp(`\\[data-lane="${lane}"\\]\\s*\\{\\s*--lane:\\s*(#[0-9a-f]+)`, 'i').exec(light);
  check(!!m, `lane ${lane} has a light colour`);
  if (m) for (const g of ['panel', 'bg']) { const r = ratio(m[1], base[g]); check(r >= 4.5, `lane ${lane} on ${g}`, `${r.toFixed(2)}:1`); }
}
// the dark tokens equal neon's
const DK = { bg: 'bg', panel: 'panel', panel2: 'panel2', line: 'line', ink: 'ink', muted: 'muted', a1: 'a1', a2: 'a2', s3: 's3' };
for (const [k, n] of Object.entries(DK)) check(base[`dk-${k}`] === neonBase[n], `base: --dk-${k} equals neon's --${n}`, `${base[`dk-${k}`]} vs ${neonBase[n]}`);
for (const look of LOOKS) {
  const L = vars(light, `:root[data-ui="light"][data-look="${look}"]`), N = { ...neonBase, ...vars(style, `:root[data-look="${look}"]`) };
  check(isHex(L.a1) && isHex(L.a2), `${look}: a light accent pair`);
  pairs({ ...base, ...L }, look);
  for (const k of ['bg', 'panel', 'panel2', 'line', 'muted', 'a1', 'a2']) check((L[`dk-${k}`] || base[`dk-${k}`]) === N[k], `${look}: --dk-${k} equals neon's`, `${L[`dk-${k}`]} vs ${N[k]}`);
}
console.log(failed ? `${failed} failed` : 'light theme tokens: all passed');
process.exit(failed ? 1 : 0);
