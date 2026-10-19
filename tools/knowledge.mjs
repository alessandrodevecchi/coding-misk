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
  transition: ['radioTransition', 'tipTransition'], harmony: ['radioHarmony', 'tipHarmony'], material: ['matSource', 'matSourceTip'],
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

// ---------- the blocks ----------
// note id → block name → generator
const BLOCKS = {
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
