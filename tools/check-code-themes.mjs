// Code themes data check (code-themes): every role of every theme filled, the contrast of every text role against
// the ground (4.5:1, 7:1 for the high contrast themes, Neon on every look in both app themes), the dimmed text of
// muted lines, the curated Strudel themes against the installed @strudel/codemirror files, Automatic's table (with
// the light app theme's hook), settings and font sizes. No browser.
//   npm run check:code-themes            exit 1 on a failure
//   npm run check:code-themes -- --table print the contrast table
import fs from 'node:fs';
import { THEMES, OWN_IDS, STRUDEL_IDS, HIGH_CONTRAST, TEXT_ROLES, AUTO, autoTheme, resolveTheme, neonRoles, contrast, over, codeThemeSettings, CT_DEFAULTS, fontPx, FONTS, SIZES, MUTED_TEXT, parseColor, appRoles } from '../src/code-themes/themes.js';

const problems = [], table = process.argv.includes('--table');
const fail = m => problems.push(m);
const ROLES = ['bg', 'caret', 'selection', 'gutter', 'outline', 'flash', 'line', ...TEXT_ROLES];
const fmt = x => x.toFixed(1);

// ---------- the look tokens from src/style.css ----------
const css = fs.readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const decl = body => Object.fromEntries([...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));
const rootBody = /:root\s*\{([^}]*)\}/.exec(css)[1], root = decl(rootBody);
const looks = Object.fromEntries([...css.matchAll(/:root\[data-look="([\w-]+)"\]\s*\{([^}]*)\}/g)].map(m => [m[1], decl(m[2])]));
const hw = decl(/:root\[data-ui="hw"\]\s*\{([^}]*)\}/.exec(css)[1]);
if (Object.keys(looks).length < 5) fail(`only ${Object.keys(looks).length} looks read from src/style.css`);
// (the hardware rule comes after the looks in the file: it wins where both set a token)
const tokensOf = (look, ui) => { const t = { ...root, ...looks[look], ...(ui === 'hw' ? hw : {}) }; return { bg: t.bg, ink: t.ink, muted: t.muted, a1: t.a1, a2: t.a2, s3: t.s3 }; };

// ---------- roles and contrast ----------
function measure(label, id, R, min) {
  for (const k of ROLES) if (!R[k] || !parseColor(R[k])) fail(`${label}: role ${k} missing or not a colour (${R[k]})`);
  for (const k of ['ink', 'a1', 'a2', 'muted']) if (!R.widget || !parseColor(R.widget[k])) fail(`${label}: widget role ${k} missing`);
  const c = Object.fromEntries(TEXT_ROLES.map(k => [k, contrast(R[k], R.bg)]));
  const low = TEXT_ROLES.reduce((a, k) => (c[k] < c[a] ? k : a), 'text');
  for (const k of TEXT_ROLES) if (c[k] < min) fail(`${label}: ${k} ${R[k]} on ${R.bg} is ${fmt(c[k])}:1, under ${min}:1`);
  // the dimmed text of a muted line: the text role at MUTED_TEXT over the ground, still readable
  const dimmed = contrast(over(R.text, R.bg, MUTED_TEXT), R.bg);
  if (dimmed < 3) fail(`${label}: dimmed text of a muted line is ${fmt(dimmed)}:1, under 3:1`);
  // the playing-note outline and the flash must show on the ground
  if (contrast(R.outline, R.bg) < 3) fail(`${label}: playing-note outline ${fmt(contrast(R.outline, R.bg))}:1, under 3:1`);
  if (contrast(over(R.flash, R.bg), R.bg) < 1.15) fail(`${label}: the flash does not show on the ground`);
  if (table) console.log(`${label.padEnd(34)} lowest ${low.padEnd(8)} ${fmt(c[low]).padStart(5)}:1   text ${fmt(c.text).padStart(5)}   comment ${fmt(c.comment).padStart(5)}   dimmed text ${fmt(dimmed).padStart(5)}`);
  return c[low];
}
const lowest = {};
for (const id of OWN_IDS) {
  const min = HIGH_CONTRAST.includes(id) ? 7 : 4.5;
  if (id === 'neon') {
    // Neon on every look, in the neon and the hardware app theme
    for (const ui of ['neon', 'hw']) for (const look of Object.keys(looks)) lowest[`neon/${ui}/${look}`] = measure(`neon (${ui}, ${look})`, id, neonRoles(tokensOf(look, ui)), min);
  } else lowest[id] = measure(id, id, THEMES[id].roles, min);
}
// Strudel's themes: text and comment at 4.5:1, except the legacy default (kept as the panel's look of before)
for (const id of STRUDEL_IDS) {
  const R = THEMES[id].roles;
  for (const k of ROLES) if (!R[k] || !parseColor(R[k])) fail(`${id}: role ${k} missing`);
  const t = contrast(R.text, R.bg), cm = contrast(R.comment, R.bg);
  if (!R.legacy && (t < 4.5 || cm < 4.5)) fail(`${id}: text ${fmt(t)}:1, comment ${fmt(cm)}:1, under 4.5:1`);
  if (R.legacy && t < 4.5) fail(`${id}: text ${fmt(t)}:1`);
  if (table) console.log(`${(id + (R.legacy ? ' (legacy)' : '')).padEnd(34)} text ${fmt(t).padStart(5)}   comment ${fmt(cm).padStart(5)}`);
}

// ---------- the curated Strudel themes against the installed files ----------
const dir = new URL('../node_modules/@strudel/codemirror/', import.meta.url);
if (fs.existsSync(dir)) {
  const reg = fs.readFileSync(new URL('themes.mjs', dir), 'utf8');
  for (const id of STRUDEL_IDS) {
    const m = new RegExp(`import ${id}, \\{ settings as \\w+ \\} from '\\./themes/([\\w-]+)\\.mjs'`).exec(reg);
    if (!m || !new RegExp(`^\\s*${id},`, 'm').test(reg)) { fail(`${id} is not registered in @strudel/codemirror/themes.mjs`); continue; }
    const src = fs.readFileSync(new URL(`themes/${m[1]}.mjs`, dir), 'utf8');
    const vars = Object.fromEntries([...src.matchAll(/let (\w+) = '([^']+)'/g)].map(x => [x[1], x[2]]));
    const val = k => { const x = new RegExp(`^\\s*${k}: ([^,]+),`, 'm').exec(src.slice(src.indexOf('settings'))); if (!x) return null; const v = x[1].trim(); return /^'.*'$/.test(v) ? v.slice(1, -1) : vars[v] || v; };
    for (const [k, role] of [['background', 'bg'], ['foreground', 'text'], ['caret', 'caret']]) {
      const v = val(k), want = THEMES[id].roles[role];
      if (v && parseColor(v) && over(v, '#000000') !== over(want, '#000000')) fail(`${id}: ${k} is ${v} in Strudel, ${want} here`);
    }
  }
} else console.log('(no node_modules/@strudel/codemirror: Strudel files not compared)');

// ---------- Automatic, the light hook, settings, fonts ----------
if (autoTheme('neon') !== 'neon' || autoTheme('hw') !== 'amber') fail('Automatic: neon → Neon and hw → Amber');
if (AUTO.light !== 'contrast-light' || resolveTheme(CT_DEFAULTS, 'light').id !== 'contrast-light') fail('Automatic: the light app theme (data-ui="light") must give Light high contrast');
if (autoTheme('unknown') !== 'neon') fail('Automatic: an unknown app theme falls back to Neon');
if (resolveTheme({ ...CT_DEFAULTS, theme: 'terminal' }, 'hw').id !== 'terminal') fail('a chosen theme must not follow the app theme');
for (const id of Object.keys(AUTO).map(k => AUTO[k])) if (!THEMES[id]) fail(`Automatic maps to an unknown theme ${id}`);
const S0 = codeThemeSettings(null);
if (JSON.stringify(S0) !== JSON.stringify(CT_DEFAULTS)) fail('settings: defaults');
if (codeThemeSettings({ theme: 'nope', font: 'x', size: 'huge', dim: 'yes' }).theme !== 'auto') fail('settings: unknown theme dropped');
if (codeThemeSettings({ theme: 'teletext', dim: false }).dim !== false || codeThemeSettings({ theme: 'teletext' }).theme !== 'teletext') fail('settings: kept values');
if (fontPx(S0) !== 14 || fontPx(S0, true) !== 16) fail(`fonts: Medium is 14 px, 16 in the full view (got ${fontPx(S0)}, ${fontPx(S0, true)})`);
if (fontPx({ font: 'vt323', size: 'medium' }) <= 14) fail('fonts: VT323 drawn larger');
for (const k of Object.keys(FONTS)) if (!FONTS[k].family.includes('monospace')) fail(`font ${k} has no monospace fallback`);
if (Object.keys(SIZES).join() !== 'small,medium,large') fail('sizes: Small, Medium, Large');
// the app theme roles for videos keep today's colours
const P = { panel: '#160f26', line: '#3a2a5c', ink: '#f3ecff', muted: '#a597c7', a1: '#ff4fa3', a2: '#ffb347' }, A = appRoles(P);
if (A.bg !== P.panel || A.comment !== P.muted || A.string !== P.a2 || A.number !== P.a1 || A.call !== P.a1 || A.variable !== P.ink) fail('app theme roles for videos must keep today\'s colours');

const n = OWN_IDS.length + STRUDEL_IDS.length;
if (problems.length) { console.log(problems.map(p => `✗ ${p}`).join('\n')); console.log(`code themes: ${problems.length} problem(s)`); process.exit(1); }
console.log(`code themes: ok (${n} themes, Neon on ${Object.keys(looks).length} looks × 2 app themes; lowest text role ${fmt(Math.min(...Object.values(lowest)))}:1)`);
