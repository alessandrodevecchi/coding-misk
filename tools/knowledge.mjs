// Knowledge base generator (knowledge-base, #74, design D3 and D4). No browser.
//   npm run knowledge     rewrite the generated blocks of docs/knowledge/*.md
// A generated block sits between `<!-- generated:<name> -->` and `<!-- /generated -->`; everything outside the blocks is
// written by hand and kept. The blocks are read from the code as it is when this runs: style recipes, console commands,
// profile controls and presets, comment and technical function presets, growth shapes, helpers and the library, radio
// knobs, material sources, artists, the voice. Option texts come from the app's own help texts (src/i18n.js): English,
// with the Italian label in parentheses. Code examples are built from the example songs through the functions the app
// uses (compile, live code steps in the Live coder profile, the writer, steering). tools/check-knowledge.mjs imports
// generate() and lists() and compares in memory.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { COMMANDS, steerSong, applyBar, whyNot } from '../src/endless/steering.js';
import { CONTROLS, PROFILES, PROFILE_IDS, resolveProfile, growthRules } from '../src/live/profiles.js';
import { COMMENT_LEVELS, COMMENT_OPTIONS, COMMENT_PRESETS } from '../src/song/comments.js';
import { FUNCTION_LEVELS, FUNCTION_OPTIONS, FUNCTION_PRESETS, HELPERS, preludeText, expandLine } from '../src/song/writer.js';
import { LIBRARY } from '../src/song/functions.js';
import { OPENINGS, PACES, DEVELOPMENTS, DEFAULT_WEIGHTS, SHAPE_PARTS } from '../src/song/shapes.js';
import { OPTION_DEFAULTS, createSession } from '../src/endless/director.js';
import { TRANSITION_KINDS, HARMONY_MODES } from '../src/endless/artist.js';
import { PRESETS as COMPILATION_PRESETS } from '../src/endless/compilation.js';
import { SESSION_SOURCES } from '../src/material/index.js';
import { WAYS, NARRATOR_STYLES } from '../src/song/spoken.js';
import { SPEAKERS, BUILD_ACTIONS, buildSteps, stateAt } from '../src/song/build.js';
import { TYPES } from '../src/song/format.js';
import { IDEA_KINDS } from '../src/song/ideas.js';
import { KINDS as PATTERN_KINDS, KIND_TYPE, savedFromTrack, loopSong } from '../src/library/patterns.js';
import { compileSong } from '../src/song/compile.js';
import { crescendoSong } from '../src/song/crescendo.js';
import { liveCode } from '../src/live/live-code.js';
import { chainLines } from '../src/song/typing.js';
import { loadStyles } from './styles-dir.mjs';
import { loadArtists } from './artists-dir.mjs';
import { songFiles } from './songs-dir.mjs';
import { KEYS, MODES, PROGS, METERS, CHORDS, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, GUITAR_TYPES, GROOVES, TEX_RHYTHMS, TEXTURES, KITS, ROWS, WAVES, LOOKS, HIDDEN_LOOKS, kitRow } from '../src/music.js';
import { MODE_STEPS } from '../src/material/common.js';
import { SHAPES as ENERGY_SHAPES } from '../src/endless/recipe.js';
import { QUIRKS } from '../src/endless/quirks.js';
import { SYNTHS } from '../src/song/validate.js';
import { DEVICES } from '../src/song/rack.js';
import { MACHINES } from '../src/sounds/machines.js';
import { SOUNDFONT_FIX } from '../src/sounds/soundfont-fix.js';
import { SOUND_KINDS, FM_RANGES } from '../src/material/sound.js';
import { RULES, FAMILIES } from '../src/material/index.js';
import { VIEW_NAMES } from '../src/soul/data.js';
import { SHELLS } from '../src/soul/shells.js';
import { LAYOUTS, QUALITIES, CARDS, F_FORMATS, F_SHOWS, F_ASPECTS, F_CODE, F_FILES } from '../src/video/layout.js';
import { FORMATS as AUDIO_FORMATS, MP3_RATES } from '../src/export/encode.js';
import GM from '../node_modules/@strudel/soundfonts/gm.mjs';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DIR = path.join(ROOT, 'docs', 'knowledge');
const read = rel => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const json = rel => JSON.parse(read(rel));

// ---------- texts from src/i18n.js ----------
// setLang touches the page; a stub is enough in Node
globalThis.document ??= { documentElement: {} };
const i18n = await import('../src/i18n.js');
// a placeholder stays visible as [name]
const VARS = new Proxy({}, { get: (_, k) => (typeof k === 'string' ? `[${k}]` : undefined) });
// one line of text for a table cell: no tags, no line breaks, no pipes, no long dashes
const clean = s => String(s).replace(/<\/?[a-z]+>/gi, '').replace(/\s*\n\s*/g, ' ').replace(/\s+[—–]\s+/g, ': ').replace(/[—–]/g, '-').replace(/\|/g, '\\|').trim();
// the text of a key in a language, or null when the app has none
export function text(key, lang = 'en') {
  if (!key) return null;
  i18n.setLang(lang);
  const v = i18n.t(key, VARS);
  i18n.setLang('en');
  return v === key || !String(v).trim() ? null : clean(v);
}
// "English (it: Italian)": the English text with the Italian label
const both = (enKey, itKey = enKey) => {
  const en = text(enKey, 'en'), it = text(itKey, 'it');
  return en ? (it && it !== en ? `${en} (it: ${it})` : en) : null;
};
const code = v => `\`${v}\``;
const cell = v => (v === null || v === undefined ? '' : clean(v));
const table = (head, rows) => [`| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...rows.map(r => `| ${r.map(cell).join(' | ')} |`)].join('\n');
const NONE = 'no help text: described below';

// ---------- profile controls: the keys of their texts ----------
// a control missing here has no help text: the check then wants it described by hand in profiles.md
const CONTROL_TEXT = {
  build: { label: 'liveStyle', hint: 'liveStyleHint', value: v => ({ blocks: 'liveBlocks', crescendo: 'liveCrescendo' })[v] },
  growth: { label: 'growthLbl', hint: 'growthHint', value: v => `growth:${v}` },
  duration: { label: 'durLbl', hint: 'durHint', value: v => `dur:${v}` },
  narrated: { label: 'liveNarrated', hint: 'liveNarratedHint' },
  typing: { label: 'setTyping', hint: 'setTypingHint', value: v => `setTyping:${v}` },
  view: { label: 'liveCodeView', hint: 'liveCompactHint', value: v => ({ now: 'liveCodeNow', compact: 'liveCodeCompact', track: 'liveCodeTrack', sections: 'liveCodeSections' })[v] },
  gen: { label: 'liveGen', hint: 'liveGenHint', value: v => ({ standard: 'liveGenStandard', idiomatic: 'liveGenIdiomatic' })[v] },
  title: { label: 'liveTitle', hint: 'liveTitleHint' },
  highlights: { label: 'liveHl', hint: 'liveHlHint' },
  wrap: { label: 'liveWrap', hint: 'liveWrapHint' },
  typist: { label: 'liveHuman', hint: 'liveHumanHint' },
  mistakes: { label: 'liveMistakes', hint: 'liveMistakesHint' },
  ...Object.fromEntries(COMMENT_OPTIONS.concat('voice').map(k => [k, { label: `cOpt:${k}`, hint: `cOptHint:${k}` }])),
  ...Object.fromEntries(FUNCTION_OPTIONS.map(k => [k, { label: `fOpt:${k}`, hint: `fOptHint:${k}` }])),
  ...Object.fromEntries(Object.keys(SHAPE_PARTS).map(k => [k, { label: `${k}Lbl`, hint: `${k}Hint`, value: v => (v === 'auto' ? 'shapeAuto' : `${k}:${v}`) }])),
};
const controlHint = k => (CONTROL_TEXT[k] ? text(CONTROL_TEXT[k].hint) : null);
const valueText = (k, v) => {
  const key = CONTROL_TEXT[k] && CONTROL_TEXT[k].value && CONTROL_TEXT[k].value(v), en = key && text(key);
  return en ? `${code(v)} ${en}` : code(v);
};
const PROFILE_NAMES = Object.fromEntries(PROFILE_IDS.map(id => [id, text(`profile:${id}`) || id]));

// ---------- radio knobs: the keys of their texts ----------
const KNOB_TEXT = {
  chaos: ['radioChaos', 'tipChaos'], energy: ['radioEnergy', 'tipEnergy'], complexity: ['radioComplexity', 'tipComplexity'], talk: ['radioTalk', 'tipTalk'],
  transition: ['radioTransition', 'tipTransition'], harmony: ['radioHarmony', 'tipHarmony'], material: ['matSource', 'matSourceTip'], profile: ['radioProfile', 'radioProfileTip'],
};

// ---------- the example songs ----------
const EX = { ideas: 'songs/examples/04-ideas.json', material: 'songs/examples/05-material.json', voices: 'songs/examples/06-voices.json' };
const STYLES = loadStyles();
const STYLE_MAP = Object.fromEntries(STYLES.map(s => [s.id, s]));
// the Live coder build of a song, as the app makes it (the style recipes give the shape weights)
const builds = new Map();
function liveCoder(file) {
  if (builds.has(file)) return builds.get(file);
  const song = json(file), C = resolveProfile('switch');
  const b = crescendoSong(song, { narrated: C.narrated, rules: growthRules(C, { styles: STYLE_MAP }) });
  const lc = liveCode(b, C, { lang: () => 'en', files: () => ({}), cols: () => 0 });
  const bars = [...new Set([0, ...buildSteps(lc.build).map(x => x.at)])].sort((a, b) => a - b);
  const codes = bars.map(bar => lc.codeAt(bar));
  const out = { song, b, lc, bars, codes };
  builds.set(file, out);
  return out;
}
const patternChains = codeText => chainLines(codeText).filter(l => /^\s*[_S]?\$:/.test(l));
// the chain of a compiled song that plays a track in a section (by its lane name)
const chainOf = (codeText, analyze, lane) => patternChains(codeText).find(l => l.includes(`.analyze("${analyze}")`) && (!lane || l.includes(`.mask(${lane})`))) || null;
const jsBlock = s => ['```js', s.trimEnd(), '```'].join('\n');
const jsonBlock = o => ['```json', JSON.stringify(o), '```'].join('\n');
const jsonList = list => ['```json', '[', list.map(o => `  ${JSON.stringify(o)}`).join(',\n'), ']', '```'].join('\n');

// ---------- Strudel names the app writes ----------
// every name of every function the coverage counts as written: the catalog name, the spellings written (`as`) and the
// catalog synonyms (coverage.json keys by catalog name: ribbon written as rib, segment as seg)
export function usedStrudel() {
  const cov = json('docs/strudel/coverage.json').functions, fns = json('docs/strudel/functions.json').functions, out = new Set();
  for (const [k, c] of Object.entries(cov)) {
    out.add(k);
    for (const a of c.as || []) out.add(a);
    const f = fns.find(x => x.name === k);
    for (const s of (f && f.synonyms) || []) out.add(s);
  }
  return out;
}

// ---------- sounds: what ships and what is asked for ----------
const LOOK = Object.fromEntries(LOOKS.map(([k, n]) => [k, n]));
const nameOf = n => (n && typeof n === 'object' ? (n.it && n.it !== n.en ? `${n.en} (it: ${n.it})` : n.en) : String(n));
const SONG_FILES = () => songFiles(path.join(ROOT, 'songs')).filter(f => !f.includes(`${path.sep}endless${path.sep}`)).sort();
// KIT_MISSING is private to src/music.js: read from its source, so the list follows the code
const KIT_MISSING = (() => {
  const m = read('src/music.js').match(/const KIT_MISSING = (\{[^\n]*\});/);
  return m ? Function(`return ${m[1]}`)() : {};
})();
// the sample banks loaded when the app starts: Strudel's own (repl prebake) and the app's
function sampleBanks() {
  const pre = read('node_modules/@strudel/repl/prebake.mjs'), app = read('src/main.js');
  const vars = Object.fromEntries([...pre.matchAll(/const (\w+) = '([^']+)'/g)].map(m => [m[1], m[2]]));
  const fromPre = [...pre.matchAll(/^\s*samples\(`\$\{(\w+)\}\/([^`]+)`\)/gm)].map(m => `${vars[m[1]].replace('https://raw.githubusercontent.com/', 'github ')}/${m[2]}`);
  const fromApp = [...new Set([...app.matchAll(/(?:load|samples)\('((?:github:|\/samples\/)[^']+)'\)/g)].map(m => m[1]))];
  return { fromPre, fromApp };
}
// a sound name → its kind, when the app ships it (null: not shipped, or a sample only the browser can confirm)
const WAVE_IDS = WAVES.map(([k]) => k);
function soundKind(name) {
  if (SYNTHS.includes(name)) return 'synth';
  if (GM[name]) return 'soundfont';
  if (MACHINES.includes(name)) return 'drum machine';
  if (TEXTURES.includes(name) || WAVE_IDS.includes(name)) return 'sample';
  return null;
}
// every sound the styles and the songs name: name → { styles: Set, songs: Set }
function askedSounds() {
  const out = new Map(), add = (name, who, kind) => { if (!name) return; const e = out.get(name) || { styles: new Set(), songs: new Set() }; e[kind].add(who); out.set(name, e); };
  for (const s of STYLES) {
    for (const t of ['bass', 'arp', 'hook', 'pad']) for (const w of (s[t] && s[t].waves) || []) w.split(',').forEach(x => add(x, s.id, 'styles'));
    for (const g of (s.guitar && s.guitar.types) || []) GUITAR_TYPES[g][1].split(',').forEach(x => add(x, s.id, 'styles'));
    for (const k of (s.drums && s.drums.kits) || []) add(k, s.id, 'styles');
    for (const x of (s.texture && s.texture.samples) || []) add(x, s.id, 'styles');
  }
  for (const f of SONG_FILES()) {
    const song = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const t of song.tracks || []) {
      const st = t.settings || {};
      if (typeof st.wave === 'string') st.wave.split(',').forEach(x => add(x, song.id, 'songs'));
      if (typeof st.kit === 'string') add(st.kit, song.id, 'songs');
      if (typeof st.sample === 'string') add(st.sample, song.id, 'songs');
      if (t.type === 'guitar' && GUITAR_TYPES[st.type]) GUITAR_TYPES[st.type][1].split(',').forEach(x => add(x, song.id, 'songs'));
    }
  }
  return out;
}
const who = e => [e.styles.size ? `styles: ${[...e.styles].sort().join(', ')}` : '', e.songs.size ? `${e.songs.size} song${e.songs.size > 1 ? 's' : ''}` : ''].filter(Boolean).join('; ');
// the drum rows each kit is asked to play: styles (rows their grooves play), songs (rows with hits)
function askedRows() {
  const out = {}, add = (kit, row) => ((out[kit] ||= new Set()).add(row));
  for (const s of STYLES) for (const k of (s.drums && s.drums.kits) || []) for (const g of s.drums.grooves || []) for (const [row, steps] of Object.entries((GROOVES[g] || [])[1] || {})) if (steps.includes('x')) add(k, row);
  for (const f of SONG_FILES()) {
    const song = JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const t of song.tracks || []) if (t.type === 'drums') for (const p of Object.values(t.patterns || {})) {
      const kit = (t.settings && t.settings.kit) || 'RolandTR909';
      for (const [row, steps] of Object.entries(p.rows || {})) if (/x/.test(String(steps))) add(kit, row);
      for (const row of Object.keys((p.idea && p.idea.beat) || {})) if (row !== 'grid') add(kit, row);
    }
  }
  return out;
}

// ---------- levels ----------
function levelStats() {
  const snap = json('tests/snapshots/levels.json'), by = {};
  for (const scenes of Object.values(snap)) for (const sc of scenes) for (const [inst, v] of Object.entries(sc.levels || {})) (by[inst] ||= []).push(v);
  const med = a => { const s = a.slice().sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  return { songs: Object.keys(snap).length, rows: Object.entries(by).sort(([a], [b]) => a.localeCompare(b)).map(([k, a]) => [k, a.length, med(a), Math.max(...a)]) };
}
const constOf = (rel, name) => { const m = read(rel).match(new RegExp(`\\b${name}\\s*=\\s*([^,;\\n]+)`)); return m ? m[1].trim() : '?'; };

// ---------- checks ----------
// the header comment of a tool: its first sentences, without the usage lines
function headerOf(rel) {
  const lines = read(rel).split('\n'), out = [];
  for (const l of lines) {
    const m = l.match(/^\s*(?:\/\/|#|""")\s?(.*)$/);
    if (!m) break;
    if (/^(usage|  *npm run|  *node |\s*$)/i.test(m[1]) || /^\s+\S/.test(m[1])) { if (out.length) break; continue; }
    out.push(m[1]);
  }
  const s = out.join(' ').replace(/\s+/g, ' ').trim();
  const cut = s.length > 220 ? `${s.slice(0, 220).replace(/[ ,;:][^ ,;:]*$/, '')}…` : s;
  return cut;
}
function checkTools() {
  const pkg = json('package.json'), byFile = {};
  for (const [k, v] of Object.entries(pkg.scripts)) { const m = v.match(/(tools\/[\w.-]+)/); if (m && (k.startsWith('check:') || k.startsWith('snapshot:'))) byFile[m[1]] = k; }
  const files = fs.readdirSync(path.join(ROOT, 'tools')).filter(f => /^(check-|snapshot-)/.test(f)).sort().map(f => `tools/${f}`);
  return files.map(f => ({ file: f, script: byFile[f] || null, browser: /playwright/i.test(read(f)), about: headerOf(f) }));
}

// ---------- glossary ----------
const enBlock = () => { const s = read('src/i18n.js'); return s.slice(s.indexOf('\n  en: {')); };
const keysLike = re => [...new Set([...enBlock().matchAll(re)].map(m => m[1]))];
const GLOSSARY_EXTRA = ['radioArtist', 'radioCustom', 'artStyles', 'artQuirks', 'libKeys', 'libProgressions', 'libMeters', 'libShapes', 'libWords', 'favourites', 'handResume', 'handTag', 'ptSaveAs', 'player', 'compBtn', 'matSource'];
function glossary() {
  const groups = [
    ['Tabs', keysLike(/[\s,{]'?(tab[A-Z]\w*)'?:/g)],
    ['Profiles', PROFILE_IDS.map(id => `profile:${id}`)],
    ['Live build options', Object.values(CONTROL_TEXT).map(c => c.label)],
    ['Growth shape values', Object.entries(SHAPE_PARTS).flatMap(([p, l]) => l.map(v => `${p}:${v}`))],
    ['Radio', Object.values(KNOB_TEXT).map(([k]) => k).concat(TRANSITION_KINDS.map(k => `tx:${k}`), SESSION_SOURCES.map(s => `matShort:${s}`))],
    ['Console commands', Object.keys(COMMANDS).map(k => `steer:${k}`)],
    ['Voice', WAYS.map(w => `way:${w}`)],
    ['Other', GLOSSARY_EXTRA],
  ];
  const seen = new Set(), rows = [];
  for (const [g, keys] of groups) for (const k of keys) {
    const en = text(k, 'en'), it = text(k, 'it');
    if (!en || !it || /\[\w+\]/.test(en) || en.split(' ').length > 5 || seen.has(`${en}|${it}`)) continue;
    seen.add(`${en}|${it}`);
    rows.push([g, en, it, code(k)]);
  }
  return rows;
}

// ---------- status ----------
function openChanges() {
  const dir = path.join(ROOT, 'openspec', 'changes');
  return fs.readdirSync(dir).filter(d => d !== 'archive' && fs.existsSync(path.join(dir, d, 'tasks.md'))).sort().map(d => {
    const t = fs.readFileSync(path.join(dir, d, 'tasks.md'), 'utf8'), all = (t.match(/^\s*- \[[ x]\]/gm) || []).length, open = (t.match(/^\s*- \[ \]/gm) || []).length;
    return { id: d, all, open };
  });
}

// ---------- the blocks ----------
// note id → block name → generator
const BLOCKS = {
  'strudel-functions': {
    summary() {
      const fns = json('docs/strudel/functions.json').functions, n = Object.keys(json('docs/strudel/coverage.json').functions).length;
      return [`Functions in the shipped Strudel: ${fns.length}. Written by the app: ${n}. Never written: ${fns.length - n}.`].join('\n');
    },
    unused() {
      const v = json('docs/strudel/variety.json'), used = usedStrudel();
      const rows = Object.entries(v).filter(([k, x]) => x.useful && !used.has(k)).map(([k, x]) => `| \`${k}\` | ${x.note.replace(/\|/g, '\\|')} |`);
      return ['Useful for variety and not written yet by the app (a function written under any of its names counts as written):', '', '| Function | Why it is useful |', '| --- | --- |', ...rows].join('\n');
    },
    written() {
      const cov = json('docs/strudel/coverage.json').functions;
      // the catalog name, with the spellings the app writes when they differ (rib for ribbon)
      const names = Object.keys(cov).sort().map(k => { const as = (cov[k].as || []).filter(a => a !== k); return as.length ? `${code(k)} (as ${as.map(code).join(', ')})` : code(k); });
      return ['Written by the app today:', '', names.join(', ')].join('\n');
    },
  },
  strudel: {
    lessons() {
      const src = read('src/content.js'), body = src.slice(src.indexOf('export const LESSONS'), src.indexOf('];', src.indexOf('export const LESSONS')));
      const titles = [...body.matchAll(/^\s*en: \['([^']*)'/gm)].map(m => m[1]);
      const pkg = json('node_modules/@strudel/repl/package.json');
      return [`Strudel shipped with the app: \`@strudel/repl\` ${pkg.version}. In-app lessons (Groove Lab, tab Strudel lessons), in order:`, '', titles.map((t, i) => `${i + 1}. ${t}`).join('\n')].join('\n');
    },
    'example-compact-line'() {
      const { codes, lc } = liveCoder(EX.ideas), last = codes[codes.length - 1], line = chainOf(last, 'arp') || patternChains(last).find(l => l.includes('.arp(') || l.includes('voicing')) || patternChains(last)[0];
      const app = new Set([...HELPERS, ...Object.keys(lc.fns)]);
      const calls = [...new Set([...line.replace(/\/\/[^\n]*/g, '').matchAll(/(?:^|[^\w.])\.?([a-zA-Z_$][\w$]*)\(/g)].map(m => m[1]))];
      const rows = calls.map(n => [code(n), app.has(n) ? (lc.fns[n] && lc.fns[n].lib ? `app (library): ${lc.fns[n].chain.replace(/^\./, '')}` : 'app') : 'Strudel']);
      return ['The arpeggio of the Ideas example (`songs/examples/04-ideas.json`) at the last step of its Live coder build, compact code:', '', jsBlock(line), '', table(['Call', 'From'], rows)].join('\n');
    },
  },
  profiles: {
    profiles() {
      return table(['Profile id', 'Name', 'What it does'], PROFILE_IDS.map(id => [code(id), both(`profile:${id}`), text(`profileHint:${id}`) || '']));
    },
    'profile-controls'() {
      const rows = Object.entries(CONTROLS).map(([k, vals]) => [code(k), vals.map(v => valueText(k, v)).join(', '), ...PROFILE_IDS.map(id => code(PROFILES[id][k])), CONTROL_TEXT[k] && controlHint(k) ? `${both(CONTROL_TEXT[k].label)}: ${controlHint(k)}` : NONE]);
      return table(['Control', 'Values', ...PROFILE_IDS.map(id => PROFILE_NAMES[id]), 'What it does'], rows);
    },
  },
  'comments-and-functions': {
    'comment-presets'() {
      const rows = [...COMMENT_LEVELS.map(p => [code(p), both(`comments:${p}`), ...COMMENT_OPTIONS.map(o => (COMMENT_PRESETS[p][o] ? 'on' : 'off'))])];
      return [`${both('commentsLbl')}: ${text('commentsHint')}.`, '', table(['Preset', 'Name', ...COMMENT_OPTIONS.map(code)], rows), '', table(['Option', 'Name', 'What it shows'], COMMENT_OPTIONS.concat('voice').map(o => [code(o), both(`cOpt:${o}`), text(`cOptHint:${o}`) || NONE]))].join('\n');
    },
    'function-presets'() {
      const def = id => FUNCTION_LEVELS.find(p => FUNCTION_OPTIONS.every(o => FUNCTION_PRESETS[p][o] === PROFILES[id][o])) || 'custom';
      return [`${both('fnsLbl')}: ${text('fnsHint')}.`, '', table(['Preset', 'Name', ...FUNCTION_OPTIONS.map(code)], FUNCTION_LEVELS.map(p => [code(p), both(`fns:${p}`), ...FUNCTION_OPTIONS.map(o => (FUNCTION_PRESETS[p][o] ? 'on' : 'off'))])), '',
        `Default preset per profile: ${PROFILE_IDS.map(id => `${PROFILE_NAMES[id]} ${code(def(id))}`).join(', ')}.`, '',
        table(['Option', 'Name', 'What it does'], FUNCTION_OPTIONS.map(o => [code(o), both(`fOpt:${o}`), text(`fOptHint:${o}`) || NONE]))].join('\n');
    },
    helpers() {
      const lib = Object.fromEntries(LIBRARY.map(f => [f.name, f]));
      return table(['Function', 'Parameters', 'Stands for', 'What it does'], HELPERS.map(h => (lib[h] ? [code(h), lib[h].params.join(', '), code(lib[h].chain), `${lib[h].about.en} (it: ${lib[h].about.it})`] : [code(h), '', '', NONE])));
    },
    'example-song-function'() {
      const { lc, codes } = liveCoder(EX.material), own = Object.entries(lc.fns).filter(([, f]) => !f.lib).sort(([a, x], [b, y]) => y.params.length - x.params.length || a.localeCompare(b));
      for (const [name] of own) {
        for (let k = codes.length - 1; k >= 0; k--) {
          const line = patternChains(codes[k]).find(l => l.includes(`.${name}(`));
          if (!line) continue;
          const def = preludeText({}, { [name]: lc.fns[name] }).split('\n').find(l => l.startsWith(`register('${name}'`));
          return [`The Material example (\`songs/examples/05-material.json\`) in the Live coder profile folds a repeated chain into the song function \`${name}\`. The hidden code defines it:`, '', jsBlock(def), '', 'A line that calls it:', '', jsBlock(line), '', 'The same line with every function written out, as the check expands it:', '', jsBlock(expandLine(line, lc.fns))].join('\n');
        }
      }
      throw new Error('example-song-function: no song function in the Material example');
    },
  },
  'growth-shapes': {
    'growth-shapes'() {
      return Object.entries(SHAPE_PARTS).map(([part, list]) => [`**${both(`${part}Lbl`)}** (\`${part}\`): ${text(`${part}Hint`)}.`, '', table(['Value', 'Name', 'Default weight'], list.map(v => [code(v), both(`${part}:${v}`), String(DEFAULT_WEIGHTS[part][v] ?? 0)]))].join('\n')).join('\n\n');
    },
  },
  'live-build': {
    'build-actions'() { return `Step actions (\`BUILD_ACTIONS\`): ${BUILD_ACTIONS.map(code).join(', ')}.`; },
    'example-growth-step'() {
      const { b, bars, codes, lc } = liveCoder(EX.ideas), s = b.crescendo && b.crescendo.shape;
      // the first step that rewrites a line of a melodic track (not the drums), else the first that changes a line
      const diff = k => { const A = patternChains(codes[k - 1]), B = patternChains(codes[k]); return { out: A.filter(l => !B.includes(l)), inn: B.filter(l => !A.includes(l)) }; };
      const ks = codes.map((_, k) => k).slice(1);
      const k = ks.find(k => { const d = diff(k); return d.out.length && d.out.every(l => !l.includes('bank(')); }) ?? ks.find(k => diff(k).out.length);
      if (k === undefined) throw new Error('example-growth-step: no step rewrites a line');
      const { out, inn } = diff(k);
      const steps = buildSteps(lc.build).filter(x => x.at === bars[k]).map(({ i, ...x }) => x);
      return [`The Ideas example in the Live coder profile. Shape drawn: opening ${code(s.opening)}, pace ${code(s.pace)}, development ${code(s.development)} (from ${Object.entries(s.from).map(([p, f]) => `${p} ${f}`).join(', ')}).`, '',
        `The pattern lines that the step at bar ${bars[k]} rewrites, before:`, '', jsBlock(out.join('\n')), '', 'After:', '', jsBlock(inn.join('\n') || '// (taken out)'), '',
        'The steps at that bar:', '', jsonList(steps)].join('\n');
    },
  },
  songs: {
    'track-types'() { return `Track types (\`TYPES\` in \`src/song/format.js\`): ${TYPES.map(code).join(', ')}.`; },
  },
  ideas: {
    'idea-fields'() { return table(['Track type', 'Idea fields'], Object.entries(IDEA_KINDS).map(([t, f]) => [code(t), f.map(code).join(', ')])); },
    'example-idea'() {
      const song = json(EX.ideas), compiled = compileSong(song), bass = song.tracks.find(t => t.id === 'bass'), drums = song.tracks.find(t => t.id === 'drums');
      const shared = Object.keys(song.shared || {}).map(k => compiled.split('\n').find(l => l.startsWith(`const ${k} =`))).filter(Boolean);
      const drumLines = patternChains(compiled).filter(l => l.includes('.mask(section2)') && l.includes('bank("')).slice(0, 4);
      return ['From the Ideas example (`songs/examples/04-ideas.json`). The bass pattern as an idea, on the shared line `bline`:', '', jsonBlock(bass.patterns.A), '', 'The compiled code (Classic view, first section):', '', jsBlock([...shared, chainOf(compiled, 'bass', 'section1')].join('\n')), '',
        'The drums of the second section as a beat idea:', '', jsonBlock(drums.patterns.B), '', jsBlock(drumLines.join('\n'))].join('\n');
    },
  },
  patterns: {
    'pattern-kinds'() { return table(['Kind', 'Track type'], PATTERN_KINDS.map(k => [code(k), code(KIND_TYPE[k])])); },
    'example-pattern'() {
      const song = json(EX.ideas), tr = song.tracks.find(t => t.id === 'arp'), item = savedFromTrack(song, tr, 'A', { now: new Date('2026-10-19T00:00:00Z') });
      const loop = loopSong(item), codeText = compileSong(loop), line = chainOf(codeText, 'arp');
      const { name, kind, type, pattern, sound, context } = item;
      return ['Save as pattern on the arpeggio of the Ideas example gives this pattern (main fields):', '', jsonBlock({ name, kind, type, pattern, sound, context }), '', 'Its loop in the Patterns tab (4 bars, compiled):', '', jsBlock(line)].join('\n');
    },
  },
  material: {
    'material-sources'() { return [`${both('matSource')}: ${text('matSourceTip')} ${text('matVariedTip') || ''}`.trim(), '', table(['Source', 'Name'], SESSION_SOURCES.map(s => [code(s), both(`matShort:${s}`)]))].join('\n'); },
  },
  styles: {
    styles() {
      const rows = STYLES.slice().sort((a, b) => a.id.localeCompare(b.id)).map(s => [code(s.id), `${s.name.en}${s.name.it !== s.name.en ? ` (it: ${s.name.it})` : ''}`, s.genre || '', s.family ? code(s.family) : '', s.profile ? code(s.profile) : '', Array.isArray(s.tempo) ? `${s.tempo[0]}-${s.tempo[1]}` : '']);
      const fams = [...new Set(STYLES.map(s => s.family).filter(Boolean))].sort();
      return [table(['Style id', 'Name', 'Genre', 'Family', 'Profile', 'BPM'], rows), '', `Families: ${fams.map(f => `${code(f)} (${STYLES.filter(s => s.family === f).map(s => s.id).sort().join(', ')})`).join('; ') || 'none'}.`].join('\n');
    },
    'style-descriptions'() {
      const rows = STYLES.slice().sort((a, b) => a.id.localeCompare(b.id)).map(s => [code(s.id), s.description || '', (s.keys || []).join(' '), (s.progressions || []).map(code).join(', '), (s.meters || ['4/4']).join(' ')]);
      return table(['Style', 'Description (the recipe\'s own words)', 'Keys', 'Progressions', 'Meters'], rows);
    },
  },
  artists: {
    artists() { return table(['Artist id', 'Name', 'Styles (weight)'], loadArtists().map(a => [code(a.id), a.name, Object.entries(a.styles || {}).map(([s, w]) => `${s} ${w}`).join(', ')])); },
  },
  radio: {
    'radio-knobs'() {
      return table(['Option', 'Name', 'Default', 'What it does'], Object.entries(OPTION_DEFAULTS).map(([k, v]) => [code(k), KNOB_TEXT[k] ? both(KNOB_TEXT[k][0]) : '', code(v), (KNOB_TEXT[k] && text(KNOB_TEXT[k][1])) || NONE]));
    },
    transitions() {
      return [table(['Transition', 'Name'], TRANSITION_KINDS.map(k => [code(k), both(`tx:${k}`)])), '', `Harmony modes: ${HARMONY_MODES.map(h => `${code(h)} ${both(`harmony:${h}`)}`).join(', ')}.`].join('\n');
    },
    'compilation-presets'() {
      const r = p => Object.entries(p.ranges).map(([k, [a, b]]) => `${k} ${a}-${b}`).join(', ');
      return [`${both('compBtn')}: ${text('compTip')}.`, '', table(['Preset', 'Name', 'Movement', 'Genres', 'Knob ranges'], Object.entries(COMPILATION_PRESETS).map(([id, p]) => [code(id), both(`compP_${id}`), code(p.movement), p.genres ? p.genres.join(', ') : 'all', r(p)]))].join('\n');
    },
  },
  'radio-commands': {
    commands() {
      const when = c => (c.bar ? 'next bar' : c.structural ? 'next double phrase' : 'next phrase');
      return table(['Command', 'Group', 'Applies at', 'Button', 'What it does'], Object.entries(COMMANDS).map(([k, c]) => [code(k), c.group, when(c), both(`steer:${k}`) || '', text(`steerTip:${k}`) || NONE]));
    },
    'example-command'() {
      const ses = createSession(STYLES, 'knowledge'), g = ses.next({ styles: ['berlin-techno'] }), type = 'bass';
      const cmd = { kind: 'vary', type, at: applyBar('vary', 16, g.plan) }, why = whyNot(cmd, g.song, g.plan, 16, 0, g.opts);
      if (why) throw new Error(`example-command: vary cannot apply (${why})`);
      const r = steerSong({ song: g.song, plan: g.plan, opts: g.opts, commands: [cmd], seed: 'knowledge', n: 0 });
      const old = new Set(g.song.build.map(s => JSON.stringify(s))), added = r.song.build.filter(s => !old.has(JSON.stringify(s)));
      let start = 0, k = 0;
      for (const [i, s] of r.song.sections.entries()) { if (cmd.at >= start && cmd.at < start + s.bars) k = i + 1; start += s.bars; }
      const line = song => chainOf(compileSong(stateAt(song, cmd.at + 1).song), type, `section${k}`);
      return [`A radio session with seed \`knowledge\` in \`berlin-techno\`, first song. The listener presses Vary on the bass at bar 16; it applies at bar ${cmd.at}, the next phrase.`, '',
        'The step it adds to the song:', '', jsonList(added), '', `The bass in section ${k} before:`, '', jsBlock(line(g.song) || '// no bass line'), '', 'After:', '', jsBlock(line(r.song) || '// no bass line')].join('\n');
    },
  },
  voice: {
    'spoken-ways'() { return table(['Way', 'Name'], WAYS.map(w => [code(w), both(`way:${w}`)])); },
  },
  narrator: {
    narrator() { return [`Narrator styles: ${NARRATOR_STYLES.map(code).join(', ')}.`, '', `Speakers (\`SPEAKERS\`): ${SPEAKERS.map(code).join(', ')}.`].join('\n'); },
  },
  sounds: {
    synths() {
      return [`Synths built into Strudel, accepted as \`wave\` (\`SYNTHS\` in \`src/song/validate.js\`): ${SYNTHS.map(code).join(', ')}.`, '',
        `The sound menus of Compose (\`WAVES\` in \`src/music.js\`): ${WAVES.map(([k, n]) => `${code(k)} ${nameOf(n)}`).join(', ')}.`].join('\n');
    },
    soundfonts() {
      const names = Object.keys(GM).sort(), asked = askedSounds();
      return [`General MIDI soundfonts in the shipped \`@strudel/soundfonts\`: ${names.length}. A name in **bold** is used by a style, a song or a Compose menu.`, '',
        names.map(n => (asked.has(n) || WAVE_IDS.includes(n) ? `**${n}**` : n)).join(', ')].join('\n');
    },
    'drum-machines'() {
      return [`Drum machines (\`MACHINES\` in \`src/sounds/machines.js\`, the tidal-drum-machines bank): ${MACHINES.length}. The Compose kit menu (\`KITS\`): ${KITS.map(code).join(', ')}.`, '',
        MACHINES.join(', '), '', `Drum rows of the step sequencer (\`ROWS\`): ${ROWS.map(([id, label]) => `${code(id)} ${label}`).join(', ')}. Ideas and grooves can also play \`rim\`, \`lt\`, \`mt\`, \`ht\`, \`cr\`.`, '',
        'Rows a kit does not have (`KIT_MISSING` in `src/music.js`); the row plays the nearest sound the kit has:', '',
        table(['Kit', 'Missing rows', 'Plays instead'], Object.entries(KIT_MISSING).map(([k, rows]) => [code(k), rows.map(code).join(', '), rows.map(r => `${r} → ${kitRow(k, r)}`).join(', ')]))].join('\n');
    },
    samples() {
      const { fromPre, fromApp } = sampleBanks();
      return [`Sample banks loaded at start by Strudel: ${fromPre.map(code).join(', ')}. Loaded by the app: ${fromApp.map(code).join(', ')}.`, '',
        `Texture samples (\`TEXTURES\`, from dirt-samples; \`vinyl\` is synthetic crackle): ${TEXTURES.map(code).join(', ')}.`].join('\n');
    },
    'fm-and-guitars'() {
      return [`Sound kinds of the material generator (\`SOUND_KINDS\`): ${SOUND_KINDS.map(code).join(', ')}. FM ranges (\`FM_RANGES\`): ${Object.entries(FM_RANGES).map(([k, v]) => `${k} ${Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number' && !['harmonicity'].includes(k) ? `${v[0]}-${v[1]}` : v.join('/')}`).join('; ')}.`, '',
        table(['Guitar type', 'Name', 'Layered sounds', 'Base drive', 'High-pass'], Object.entries(GUITAR_TYPES).map(([k, v]) => [code(k), nameOf(v[0]), v[1].split(',').map(code).join(' + '), String(v[2]), String(v[3])]))].join('\n');
    },
    asked() {
      const by = {};
      for (const [n, e] of [...askedSounds()].sort(([a], [b]) => a.localeCompare(b))) (by[soundKind(n) || 'not shipped'] ||= []).push(`${code(n)} (${who(e)})`);
      return Object.entries(by).sort(([a], [b]) => a.localeCompare(b)).map(([k, l]) => `- **${k}**: ${l.join(', ')}.`).join('\n');
    },
    missing() {
      const lost = [...askedSounds()].filter(([n]) => !soundKind(n)).map(([n, e]) => `- ${code(n)}: not a synth, soundfont, drum machine or known sample (${who(e)}).`);
      const rows = askedRows(), holes = [];
      for (const [kit, set] of Object.entries(rows).sort()) for (const r of [...set].sort()) if ((KIT_MISSING[kit] || []).includes(r)) holes.push(`- ${code(kit)} has no ${code(r)}: plays ${code(kitRow(kit, r))}.`);
      const broken = SOUNDFONT_FIX.map(x => `- ${code(x.name)} font ${x.font}${x.low !== undefined ? ` notes ${x.low}-${x.high}` : ''} is broken in the library: plays font ${x.use}.`);
      return ['Sounds asked for and not shipped:', '', lost.length ? lost.join('\n') : '- none: every sound a style or a song names is shipped.', '',
        'Drum rows asked for that a kit does not have:', '', holes.length ? holes.join('\n') : '- none.', '',
        'Soundfont parts that are broken upstream (`SOUNDFONT_FIX`, played from a stand-in by the sound guard):', '', broken.join('\n')].join('\n');
    },
  },
  'sound-and-levels': {
    'rack-devices'() {
      const arg = ([n, k, d, a, b]) => (k === 'choice' ? `${n} ${a.join('/')} (${d})` : `${n} ${a}-${b} (${d})`);
      return table(['Device', 'Name', 'Kind', 'Arguments: range (default)'], Object.entries(DEVICES).map(([k, d]) => [code(k), nameOf(d.label), d.kind, d.args.map(arg).join('; ')]));
    },
    levels() {
      const { songs, rows } = levelStats();
      return [`Peak levels per instrument in \`tests/snapshots/levels.json\` (${songs} built-in songs, every section): how many sections, median and highest peak. A line above 1.0 is a warning (above its style's \`headroom\`); the master output and exported files above 1.0 clip and fail the checks.`, '',
        table(['Instrument', 'Sections', 'Median peak', 'Highest peak'], rows.map(([k, n, m, x]) => [code(k), String(n), String(m), String(x)])), '',
        `Snapshot tolerance (\`tools/snapshot-levels.cjs\`): ${constOf('tools/snapshot-levels.cjs', 'TOL')} absolute, floor ${constOf('tools/snapshot-levels.cjs', 'FLOOR')}, per instrument ${constOf('tools/snapshot-levels.cjs', 'TOL_OF')}; \`fx\` is recorded, not compared. Master level: \`MASTER = ${constOf('src/main.js', 'MASTER')}\` in \`src/main.js\`.`].join('\n');
    },
  },
  'music-engine': {
    keys() {
      return [`Keys (\`KEYS\`, everything is written in A and transposed): ${KEYS.map(([k, s, n]) => `${code(k)} (${s >= 0 ? '+' : ''}${s}, it: ${n.it})`).join(', ')}.`, '',
        table(['Mode', 'Name', 'Scale steps (semitones)'], MODES.map(([k, n]) => [code(k), nameOf(n), MODE_STEPS[k] ? MODE_STEPS[k].join(' ') : 'semitones: numbers are half steps'])), '',
        `Meters (\`METERS\`, sixteenth steps per bar): ${METERS.map(([m, n]) => `${code(m)} ${n}`).join(', ')}.`, '',
        `Chord names (\`CHORDS\`, in A minor): ${Object.keys(CHORDS).map(code).join(', ')}.`].join('\n');
    },
    progressions() {
      return table(['Progression', 'Name', 'Chords (in A, one per bar)'], Object.entries(PROGS).map(([k, [n, ch]]) => [code(k), nameOf(n), ch.join(' ')]));
    },
    presets() {
      const kinds = [['bass', 'BASS', BASS], ['arp', 'ARPS', ARPS], ['hook', 'HOOKS', HOOKS], ['pad', 'PADS', PADS], ['guitar', 'GUITAR_PATTERNS', GUITAR_PATTERNS], ['drums', 'GROOVES', GROOVES], ['texture', 'TEX_RHYTHMS', TEX_RHYTHMS]];
      return table(['Track type', 'Table', 'Presets'], kinds.map(([t, name, tab]) => [code(t), code(name), Object.entries(tab).map(([k, v]) => `${code(k)} ${nameOf(v[0])}`).join(', ')]));
    },
    'energy-shapes'() {
      return [`Energy shapes of a song (\`SHAPES\` in \`src/endless/recipe.js\`): ${ENERGY_SHAPES.map(code).join(', ')}.`, '',
        `Artist quirks (\`QUIRKS\`): ${Object.keys(QUIRKS).map(code).join(', ')}.`, '',
        `Generator rules (\`RULES\`): ${Object.entries(RULES).map(([k, l]) => `${k}: ${l.map(code).join(', ')}`).join('; ')}. Groove families: ${FAMILIES.map(code).join(', ')}.`].join('\n');
    },
  },
  visuals: {
    looks() {
      return [`Stage visuals (\`LOOKS\` in \`src/music.js\`): ${LOOKS.map(([k, n]) => `${code(k)} ${nameOf(n)}${HIDDEN_LOOKS.includes(k) ? ' (hidden)' : ''}`).join(', ')}.`, '',
        `Soul views (\`VIEW_NAMES\` in \`src/soul/data.js\`): ${Object.entries(VIEW_NAMES).map(([k, n]) => `${code(k)} ${n}`).join(', ')}.`, '',
        `Soul display shells (\`SHELLS\` in \`src/soul/shells.js\`): ${SHELLS.map(s => `${code(s.id)} ${s.name || ''}`.trim()).join(', ')}.`].join('\n');
    },
    'video-options'() {
      return [`Video layouts (\`LAYOUTS\`): ${LAYOUTS.map(code).join(', ')}. Qualities: ${Object.keys(QUALITIES).map(code).join(', ')}. Title card: ${CARDS.map(code).join(', ')}.`, '',
        `Fragments: formats ${Object.keys(F_FORMATS).map(code).join(', ')}; show ${F_SHOWS.map(code).join(', ')}; aspect ${F_ASPECTS.map(code).join(', ')}; code mode ${F_CODE.map(code).join(', ')}; files ${F_FILES.map(code).join(', ')}.`, '',
        `Audio formats (\`src/export/encode.js\`): ${AUDIO_FORMATS.map(code).join(', ')}; MP3 at ${MP3_RATES.join(' or ')} kbps.`].join('\n');
    },
  },
  checks: {
    checks() {
      return table(['Tool', 'npm script', 'Needs', 'What it covers'], checkTools().map(c => [code(c.file), c.script ? code(`npm run ${c.script}`) : '', c.browser ? 'dev server, Chrome' : 'Node', c.about]));
    },
    fixtures() {
      const fx = fs.readdirSync(path.join(ROOT, 'tools', 'fixtures')).sort().map(f => `tools/fixtures/${f}`);
      const sn = fs.readdirSync(path.join(ROOT, 'tests', 'snapshots')).sort().map(f => `tests/snapshots/${f}`);
      return `Fixtures and snapshots in the repo: ${[...fx, ...sn].map(code).join(', ')}.`;
    },
  },
  glossary: {
    glossary() { return table(['Area', 'English', 'Italian', 'Key'], glossary()); },
  },
  status: {
    changes() {
      const all = openChanges(), open = all.filter(c => c.open), done = all.filter(c => !c.open);
      return [`OpenSpec changes not archived: ${all.length}. With open tasks: ${open.length}. All tasks ticked, waiting to be archived: ${done.length}.`, '',
        table(['Change', 'Open tasks', 'Tasks'], open.map(c => [`[${c.id}](../../openspec/changes/${c.id}/tasks.md)`, String(c.open), String(c.all)])), '',
        `Ticked and not archived: ${done.map(c => code(c.id)).join(', ')}.`].join('\n');
    },
  },
};

// every block: { note, name, text }
export function generate() {
  const out = [];
  for (const [note, blocks] of Object.entries(BLOCKS)) for (const [name, fn] of Object.entries(blocks)) out.push({ note, name, text: fn().trimEnd() });
  return out;
}

// the lists the check wants covered: { list, note, items: [{ id, described }] }; described: the generated block gives
// it a text from the app, else the note must describe it by hand (its id in backticks outside the generated blocks)
export function lists() {
  const has = k => !!text(k);
  return [
    { list: 'style', note: 'styles', items: STYLES.map(s => ({ id: s.id, described: !!(s.name && s.genre) })) },
    { list: 'console command', note: 'radio-commands', items: Object.keys(COMMANDS).map(k => ({ id: k, described: has(`steerTip:${k}`) })) },
    { list: 'profile', note: 'profiles', items: PROFILE_IDS.map(id => ({ id, described: has(`profileHint:${id}`) })) },
    { list: 'profile control', note: 'profiles', items: Object.keys(CONTROLS).map(k => ({ id: k, described: !!controlHint(k) })) },
    { list: 'comment option', note: 'comments-and-functions', items: COMMENT_OPTIONS.concat('voice').map(o => ({ id: o, described: has(`cOptHint:${o}`) })) },
    { list: 'technical function option', note: 'comments-and-functions', items: FUNCTION_OPTIONS.map(o => ({ id: o, described: has(`fOptHint:${o}`) })) },
    { list: 'technical functions preset', note: 'comments-and-functions', items: FUNCTION_LEVELS.map(p => ({ id: p, described: has(`fns:${p}`) })) },
    { list: 'helper', note: 'comments-and-functions', items: HELPERS.map(h => ({ id: h, described: LIBRARY.some(f => f.name === h) })) },
    { list: 'growth opening', note: 'growth-shapes', items: OPENINGS.map(v => ({ id: v, described: has(`opening:${v}`) })) },
    { list: 'growth pace', note: 'growth-shapes', items: PACES.map(v => ({ id: v, described: has(`pace:${v}`) })) },
    { list: 'growth development', note: 'growth-shapes', items: DEVELOPMENTS.map(v => ({ id: v, described: has(`development:${v}`) })) },
    { list: 'radio option', note: 'radio', items: Object.keys(OPTION_DEFAULTS).map(k => ({ id: k, described: !!(KNOB_TEXT[k] && has(KNOB_TEXT[k][1])) })) },
    { list: 'transition', note: 'radio', items: TRANSITION_KINDS.map(k => ({ id: k, described: false })) },
    { list: 'compilation preset', note: 'radio', items: Object.keys(COMPILATION_PRESETS).map(k => ({ id: k, described: true })) },
    { list: 'material source', note: 'material', items: SESSION_SOURCES.map(s => ({ id: s, described: false })) },
    { list: 'voice way', note: 'voice', items: WAYS.map(w => ({ id: w, described: false })) },
    { list: 'narrator style', note: 'narrator', items: NARRATOR_STYLES.map(s => ({ id: s, described: false })) },
    { list: 'track type', note: 'songs', items: TYPES.map(t => ({ id: t, described: false })) },
    { list: 'build action', note: 'live-build', items: BUILD_ACTIONS.map(a => ({ id: a, described: false })) },
    { list: 'idea field', note: 'ideas', items: [...new Set(Object.values(IDEA_KINDS).flat())].map(f => ({ id: f, described: false })) },
    { list: 'artist', note: 'artists', items: loadArtists().map(a => ({ id: a.id, described: true })) },
    { list: 'style description', note: 'styles', items: STYLES.map(s => ({ id: s.id, described: !!s.description })) },
    { list: 'rack device', note: 'sound-and-levels', items: Object.keys(DEVICES).map(k => ({ id: k, described: !!DEVICES[k].label })) },
    { list: 'drum machine of the kit menu', note: 'sounds', items: KITS.map(k => ({ id: k, described: true })) },
    { list: 'texture sample', note: 'sounds', items: TEXTURES.map(k => ({ id: k, described: true })) },
    { list: 'progression', note: 'music-engine', items: Object.keys(PROGS).map(k => ({ id: k, described: true })) },
    { list: 'mode', note: 'music-engine', items: MODES.map(([k]) => ({ id: k, described: true })) },
    { list: 'meter', note: 'music-engine', items: METERS.map(([k]) => ({ id: k, described: true })) },
    { list: 'energy shape', note: 'music-engine', items: ENERGY_SHAPES.map(k => ({ id: k, described: true })) },
    { list: 'look', note: 'visuals', items: LOOKS.map(([k]) => ({ id: k, described: true })) },
    { list: 'video layout', note: 'visuals', items: LAYOUTS.map(k => ({ id: k, described: true })) },
    { list: 'check tool', note: 'checks', items: checkTools().map(c => ({ id: c.file, described: !!c.about })) },
  ];
}

// ---------- blocks in a note ----------
export const BLOCK_RE = /<!-- generated:([\w-]+) -->\n[\s\S]*?<!-- \/generated -->/g;
export const blockNames = textOfNote => [...textOfNote.matchAll(BLOCK_RE)].map(m => m[1]);
// the note with its blocks replaced (fresh: name → text); problems: names in the note with no generator
export function applyBlocks(textOfNote, fresh) {
  return textOfNote.replace(BLOCK_RE, (all, name) => (name in fresh ? `<!-- generated:${name} -->\n${fresh[name]}\n<!-- /generated -->` : all));
}
// the text of a note without its generated blocks
export const handText = textOfNote => textOfNote.replace(BLOCK_RE, '');
export const notePath = id => path.join(DIR, `${id}.md`);

// write every note's blocks → { written: [ids], problems: [text] }
export function writeAll() {
  const byNote = {}, problems = [];
  for (const b of generate()) (byNote[b.note] ||= {})[b.name] = b.text;
  const written = [];
  for (const [note, fresh] of Object.entries(byNote)) {
    const file = notePath(note);
    if (!fs.existsSync(file)) { problems.push(`${note}.md does not exist (blocks ${Object.keys(fresh).join(', ')})`); continue; }
    const cur = fs.readFileSync(file, 'utf8'), names = blockNames(cur);
    for (const n of Object.keys(fresh)) if (!names.includes(n)) problems.push(`${note}.md has no marker for block "${n}": add <!-- generated:${n} --> and <!-- /generated -->`);
    for (const n of names) if (!(n in fresh)) problems.push(`${note}.md has a block "${n}" that nothing generates`);
    const next = applyBlocks(cur, fresh);
    if (next !== cur) { fs.writeFileSync(file, next); written.push(note); }
  }
  return { written, problems };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { written, problems } = writeAll();
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(`${written.length ? `wrote ${written.map(n => `${n}.md`).join(', ')}` : 'every generated block is up to date'}${problems.length ? `; ${problems.length} problems` : ''}`);
  process.exit(problems.length ? 1 : 0);
}
