// Code themes (code-themes): the colours and the font of the code, in the code panel and in the code drawn in videos.
// Pure data and colour maths, checked in Node by tools/check-code-themes.mjs; the browser side is install.js.
//
// A theme is a set of roles (design D2): ground, text and the syntax roles (comment, string, number, label, keyword,
// variable, method, punctuation), caret, selection, line numbers (gutter), the playing-note outline, the evaluation
// flash, the video border (line) and the widget colours (ink, accent, second accent, muted). Every role is a
// resolved colour, so the editor, the widgets and the canvas of the videos read the same values.

export const CT_KEY = 'coding-misk-code-theme';
// theme: 'auto' or a theme id; font: a FONTS key; size: a SIZES key; dim: the text of muted `_$:` lines at about 55 %
// (owner's answer to Q7: an option, on by default)
export const CT_DEFAULTS = { theme: 'auto', font: 'jetbrains', size: 'medium', dim: true };
// the opacity of the text of a muted line, in the panel and in videos
export const MUTED_TEXT = 0.55;

// Automatic (D4): one table keyed by the app theme (`data-ui`). `light` is the hook for the light app theme
// (`light-theme`, built after this change): setting data-ui="light" is enough for the code to follow.
export const AUTO = { neon: 'neon', hw: 'amber', light: 'contrast-light' };
export const autoTheme = ui => AUTO[ui] || AUTO.neon;

// fonts (D5): all loaded by the Google Fonts stylesheet in index.html, except the system monospace. scale: VT323 is
// drawn small for its size, so it gets a larger size in the panel
export const FONTS = {
  jetbrains: { name: 'JetBrains Mono', family: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace', scale: 1 },
  sharetech: { name: 'Share Tech Mono', family: '"Share Tech Mono", ui-monospace, SFMono-Regular, Menlo, monospace', scale: 1 },
  vt323: { name: 'VT323', family: '"VT323", ui-monospace, SFMono-Regular, Menlo, monospace', scale: 1.3 },
  system: { name: { en: 'System monospace', it: 'Monospace di sistema' }, family: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', scale: 1 },
};
// sizes in the panel (px); the full view of the code takes the next step
export const SIZES = { small: 13, medium: 14, large: 16 };
const FULL = { small: 14, medium: 16, large: 18 };
export function fontPx(S, full = false) {
  const f = FONTS[S.font] || FONTS.jetbrains;
  return Math.round((full ? FULL : SIZES)[S.size] * f.scale);
}

// the settings as stored, with the defaults filled in and unknown values dropped
export function codeThemeSettings(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    theme: o.theme === 'auto' || THEMES[o.theme] ? o.theme : CT_DEFAULTS.theme,
    font: FONTS[o.font] ? o.font : CT_DEFAULTS.font,
    size: SIZES[o.size] ? o.size : CT_DEFAULTS.size,
    dim: typeof o.dim === 'boolean' ? o.dim : CT_DEFAULTS.dim,
  };
}

// ---------- colours ----------
const NAMED = { white: '#ffffff', black: '#000000', red: '#ff0000', transparent: '#00000000' };
// '#rgb', '#rrggbb', '#rrggbbaa', 'rgb(…)', 'rgba(…)' or a few names → [r, g, b, a] (0..255, a 0..1)
export function parseColor(c) {
  c = String(c || '').trim().toLowerCase();
  if (NAMED[c]) c = NAMED[c];
  let m;
  if ((m = /^#([0-9a-f]{3,8})$/.exec(c))) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    const n = k => parseInt(h.slice(k, k + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  if ((m = /^rgba?\(([^)]+)\)$/.exec(c))) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
  }
  return null;
}
const hex2 = x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
export const toHex = ([r, g, b]) => `#${hex2(r)}${hex2(g)}${hex2(b)}`;
// a over b with a's own alpha (and an extra opacity k) → opaque hex
export function over(a, b, k = 1) {
  const A = parseColor(a), B = parseColor(b);
  if (!A || !B) return a;
  const t = A[3] * k;
  return toHex([0, 1, 2].map(i => A[i] * t + B[i] * (1 - t)));
}
// t of a, 1 - t of b → opaque hex
export const mix = (a, b, t) => { const A = parseColor(a), B = parseColor(b); return toHex([0, 1, 2].map(i => A[i] * t + B[i] * (1 - t))); };
export const alpha = (c, a) => { const A = parseColor(c); return `rgba(${A[0]}, ${A[1]}, ${A[2]}, ${a})`; };
const lum = c => { const A = parseColor(c); return [0, 1, 2].map(i => { const v = A[i] / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
// WCAG contrast of a colour (blended on the ground when it has an alpha) against the ground
export function contrast(fg, bg) {
  const a = lum(over(fg, bg)), b = lum(over(bg, '#000000'));
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// the text roles measured for contrast (spec: Readable contrast)
export const TEXT_ROLES = ['text', 'comment', 'string', 'number', 'label', 'keyword', 'variable', 'method', 'punct'];

// ---------- our themes (D3) ----------
// Neon reads the look's tokens (resolved colours: bg, ink, muted, a1, a2, s3), so one theme serves every look
export function neonRoles(tok) {
  const bg = mix(tok.bg, '#000000', 0.75);
  return {
    bg, text: tok.ink, comment: tok.muted, string: tok.a2, number: tok.s3, label: tok.a1, keyword: tok.a1, variable: tok.a1,
    method: mix(tok.a1, tok.ink, 0.4), punct: mix(tok.muted, bg, 0.85),
    caret: tok.a2, selection: alpha(tok.a1, 0.3), gutter: mix(tok.muted, bg, 0.6), outline: tok.ink, flash: alpha(tok.a1, 0.28), line: mix(tok.muted, bg, 0.35),
    widget: { ink: tok.ink, a1: tok.a1, a2: tok.a2, muted: tok.muted },
  };
}
// the tokens of the neon app theme without a look (src/style.css :root), for the data check and as a fallback
export const NEON_TOKENS = { bg: '#0d0818', ink: '#f3ecff', muted: '#a597c7', a1: '#ff4fa3', a2: '#ffb347', s3: '#ffd23d' };

const OWN = {
  amber: {
    bg: '#140e04', text: '#ffb347', comment: '#a88048', string: '#ffd9a0', number: '#fff1d6', label: '#ff8a3d', keyword: '#ff8a3d', variable: '#ff8a3d',
    method: '#ffc46b', punct: '#b08a4a', caret: '#ffe2b0', selection: 'rgba(255, 179, 71, 0.25)', gutter: '#8c6a35', outline: '#ffe2b0', flash: 'rgba(255, 179, 71, 0.28)', line: '#4a3514',
    glow: '0 0 6px rgba(255, 170, 40, 0.35)', widget: { ink: '#ffb347', a1: '#ff8a3d', a2: '#ffd9a0', muted: '#a88048' },
  },
  terminal: {
    bg: '#0b0d10', text: '#d0d6e0', comment: '#7a828e', string: '#5af78e', number: '#f3f99d', label: '#ff6ac1', keyword: '#ff6ac1', variable: '#9aedfe',
    method: '#57c7ff', punct: '#8b93a1', caret: '#5af78e', selection: 'rgba(87, 199, 255, 0.25)', gutter: '#5c6370', outline: '#d0d6e0', flash: 'rgba(87, 199, 255, 0.25)', line: '#2a2f38',
    widget: { ink: '#d0d6e0', a1: '#57c7ff', a2: '#ff6ac1', muted: '#7a828e' },
  },
  'contrast-dark': {
    bg: '#000000', text: '#ffffff', comment: '#c8c8c8', string: '#5ce1ff', number: '#ff9de6', label: '#ffe500', keyword: '#ffe500', variable: '#ffe500',
    method: '#ffffff', punct: '#d6d6d6', caret: '#ffe500', selection: 'rgba(255, 255, 255, 0.3)', gutter: '#bdbdbd', outline: '#ffffff', flash: 'rgba(255, 229, 0, 0.3)', line: '#5a5a5a',
    widget: { ink: '#ffffff', a1: '#ffe500', a2: '#5ce1ff', muted: '#9e9e9e' },
  },
  // white ground: never reads the app tokens, so it stays readable with any light app theme (light-theme)
  'contrast-light': {
    light: true,
    bg: '#ffffff', text: '#000000', comment: '#4d4d4d', string: '#003d99', number: '#a0004a', label: '#6a00b0', keyword: '#6a00b0', variable: '#6a00b0',
    method: '#000000', punct: '#333333', caret: '#000000', selection: '#b3d7ff', gutter: '#595959', outline: '#000000', flash: 'rgba(106, 0, 176, 0.22)', line: '#8a8a8a',
    widget: { ink: '#000000', a1: '#6a00b0', a2: '#003d99', muted: '#6b6b6b' },
  },
};

// ---------- Strudel's built-in themes, curated (Q2) ----------
// installed with the editor's own setTheme(name); the roles below are copied from @strudel/codemirror 1.3.0
// (themes/*.mjs) for the widgets, the videos and the contrast check, which compares them with the installed files.
// Offered only with text and comment at 4.5:1 or more, except Strudel's default theme, kept as the panel's look of
// before (its comments are 4.4:1). greenText is left out: its comments are 3.4:1.
const STRUDEL = {
  strudelTheme: {
    legacy: true,
    bg: '#222222', text: '#ffffff', comment: '#7d8799', string: '#c3e88d', number: '#c3e88d', label: '#89ddff', keyword: '#c792ea', variable: '#c792ea',
    method: '#c792ea', punct: '#82aaff', caret: '#ffcc00', selection: 'rgba(128, 203, 196, 0.5)', gutter: '#8a919966', outline: '#ffffff', flash: 'rgba(255, 255, 255, 0.4)', line: '#444444',
    widget: { ink: '#ffffff', a1: '#89ddff', a2: '#c792ea', muted: '#7d8799' },
  },
  teletext: {
    bg: '#000000', text: '#6edee4', comment: '#f8fc55', string: '#ffffff', number: '#ffffff', label: '#ffffff', keyword: '#6edee4', variable: '#6edee4',
    method: '#6edee4', punct: '#f8fc55', caret: '#ff0000', selection: '#f8fc55', gutter: '#8a919966', outline: '#6edee4', flash: 'rgba(255, 255, 255, 0.4)', line: '#3a3a3a',
    widget: { ink: '#6edee4', a1: '#f8fc55', a2: '#ffffff', muted: '#8a9199' },
  },
  blackscreen: {
    bg: '#000000', text: '#ffffff', comment: '#ffffff', string: '#ffffff', number: '#ffffff', label: '#ffffff', keyword: '#ffffff', variable: '#ffffff',
    method: '#ffffff', punct: '#ffffff', caret: '#ffffff', selection: '#ffffff20', gutter: '#8a919966', outline: '#ffffff', flash: 'rgba(255, 255, 255, 0.4)', line: '#3a3a3a',
    widget: { ink: '#ffffff', a1: '#ffffff', a2: '#bdbdbd', muted: '#8a9199' },
  },
  whitescreen: {
    light: true,
    bg: '#ffffff', text: '#000000', comment: '#000000', string: '#000000', number: '#000000', label: '#000000', keyword: '#000000', variable: '#000000',
    method: '#000000', punct: '#000000', caret: '#000000', selection: 'rgba(128, 203, 196, 0.5)', gutter: '#000000', outline: '#000000', flash: 'rgba(0, 0, 0, 0.18)', line: '#8a8a8a',
    widget: { ink: '#000000', a1: '#000000', a2: '#444444', muted: '#6b6b6b' },
  },
  bluescreen: {
    bg: '#051db5', text: '#ffffff', comment: '#ffffff', string: '#ffffff', number: '#ffffff', label: '#ffffff', keyword: '#ffffff', variable: '#ffffff',
    method: '#ffffff', punct: '#ffffff', caret: '#ffffff', selection: 'rgba(128, 203, 196, 0.5)', gutter: '#8a919966', outline: '#ffffff', flash: 'rgba(255, 255, 255, 0.4)', line: '#6f80e0',
    widget: { ink: '#ffffff', a1: '#ffffff', a2: '#c6cdf5', muted: '#9aa6e8' },
  },
};

// every theme: { id, kind: 'own' | 'strudel', name: { en, it } | string, light, roles (null for Neon: from the look) }
const NAMES = {
  neon: { en: 'Neon', it: 'Neon' }, amber: { en: 'Amber', it: 'Ambra' }, terminal: { en: 'Terminal', it: 'Terminale' },
  'contrast-dark': { en: 'High contrast dark', it: 'Alto contrasto scuro' }, 'contrast-light': { en: 'Light high contrast', it: 'Chiaro alto contrasto' },
};
export const OWN_IDS = ['neon', 'amber', 'terminal', 'contrast-dark', 'contrast-light'];
export const STRUDEL_IDS = Object.keys(STRUDEL);
export const THEMES = Object.fromEntries([
  ...OWN_IDS.map(id => [id, { id, kind: 'own', name: NAMES[id], light: !!(OWN[id] && OWN[id].light), roles: OWN[id] || null }]),
  ...STRUDEL_IDS.map(id => [id, { id, kind: 'strudel', name: id, light: !!STRUDEL[id].light, roles: STRUDEL[id] }]),
]);
// the high contrast themes: every text role at 7:1 or more
export const HIGH_CONTRAST = ['contrast-dark', 'contrast-light'];

export const themeName = (id, lang = 'en') => { const T = THEMES[id]; if (!T) return id; return typeof T.name === 'string' ? T.name : T.name[lang] || T.name.en; };
export const fontName = (k, lang = 'en') => { const f = FONTS[k] || FONTS.jetbrains; return typeof f.name === 'string' ? f.name : f.name[lang] || f.name.en; };

// the theme in use: settings, the app theme (data-ui) and the look's resolved tokens (for Neon) → { id, auto, theme,
// roles } with every role an opaque or rgba colour
export function resolveTheme(S, ui = 'neon', tokens = NEON_TOKENS) {
  const auto = S.theme === 'auto', id = auto ? autoTheme(ui) : S.theme, T = THEMES[id] || THEMES.neon;
  const roles = T.id === 'neon' ? neonRoles({ ...NEON_TOKENS, ...tokens }) : T.roles;
  // line numbers with an alpha, blended on the ground (canvas and contrast read opaque colours)
  return { id: T.id, auto, theme: T, light: T.light, roles: { ...roles, gutter: over(roles.gutter, roles.bg) } };
}

// the roles the video draws with when "Code colours" is the app theme (D8): today's colours, from the app tokens
// P: { panel, line, ink, muted, a1, a2 }
export function appRoles(P) {
  return {
    bg: P.panel, text: P.ink, comment: P.muted, string: P.a2, number: P.a1, label: P.ink, keyword: P.a2, variable: P.ink, call: P.a1, prop: P.ink, name: P.ink,
    method: P.a1, punct: P.muted, caret: P.a1, line: P.line, head: P.muted, widget: { ink: P.ink, a1: P.a1, a2: P.a2, muted: P.muted },
  };
}
