// Built-in model probe (ai-assistant, task 1.1): does Chrome's Prompt API (LanguageModel, Gemini Nano) fit the Radio
// console and possibly Compose? Opened from the dev server with vite.local.config.mjs, which saves every POST to
// /__probe-results as notes/nano-probe-results-<run>.json. One click runs every test; partial results are saved
// after each step, so a crash still leaves data. No network besides localhost.

const $ = s => document.querySelector(s);
const runId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const R = { runId, probeVersion: 1, started: new Date().toISOString(), finished: null, imports: {}, tests: {}, errors: [], log: [] };
const now = () => performance.now();
const clone = o => JSON.parse(JSON.stringify(o));

// ---------- page and saving ----------

function log(msg, cls = '') {
  const line = `${new Date().toISOString().slice(11, 19)} ${msg}`;
  R.log.push(line);
  const div = document.createElement('div');
  div.textContent = line; if (cls) div.className = cls;
  $('#log').appendChild(div); $('#log').scrollTop = 1e9;
}
const status = t => { $('#status').textContent = t; };
let stepsDone = 0, stepsTotal = 1;
const step = () => { stepsDone++; $('#bar > div').style.width = `${Math.min(100, 100 * stepsDone / stepsTotal)}%`; };

let saving = Promise.resolve();
function save() {
  saving = saving.then(async () => {
    try {
      const r = await fetch('/__probe-results', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(R) });
      const j = await r.json();
      if (j.ok) R.savedTo = j.file; else log(`save refused: ${j.error}`, 'bad');
    } catch (e) { log(`save failed: ${e}`, 'bad'); }
  });
  return saving;
}

const errInfo = e => (e == null ? null : {
  name: e.name, message: e.message, code: e.code, ctor: e.constructor && e.constructor.name,
  requested: e.requested, contextWindow: e.contextWindow, quota: e.quota, string: String(e),
});
async function timed(fn) {
  const t = now();
  try { const value = await fn(); return { ok: true, ms: Math.round(now() - t), value }; }
  catch (e) { return { ok: false, ms: Math.round(now() - t), error: errInfo(e) }; }
}
function deadline(ms) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(new DOMException(`probe timeout after ${ms} ms`, 'TimeoutError')), ms);
  return { signal: c.signal, done: () => clearTimeout(id) };
}
addEventListener('error', e => { R.errors.push({ type: 'error', message: e.message, at: `${e.filename}:${e.lineno}` }); save(); });
addEventListener('unhandledrejection', e => { R.errors.push({ type: 'rejection', error: errInfo(e.reason) }); save(); });

// ---------- app modules (loaded at page load, so the click keeps its user activation) ----------

let M = null;
const loading = (async () => {
  try {
    const [steering, validate, format, music, rack] = await Promise.all([
      import('/src/endless/steering.js'), import('/src/song/validate.js'), import('/src/song/format.js'), import('/src/music.js'), import('/src/song/rack.js'),
    ]);
    const song = await (await fetch('/songs/examples/02-bass-and-chords.json')).json();
    M = { steering, validate, format, music, rack, song };
    R.imports = { ok: true, commands: Object.keys(steering.COMMANDS) };
  } catch (e) { R.imports = { ok: false, error: errInfo(e) }; log(`app modules failed to load: ${e}`, 'bad'); }
})();

// ---------- Prompt API, current names first, old names detected ----------

const LM = () => globalThis.LanguageModel || (globalThis.ai && globalThis.ai.languageModel) || null;
const LANG = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
const ctxWindow = s => s.contextWindow ?? s.inputQuota ?? s.maxTokens;
const ctxUsage = s => s.contextUsage ?? s.inputUsage ?? s.tokensSoFar;
async function measure(s, input, opts) {
  if (typeof s.measureContextUsage === 'function') return s.measureContextUsage(input, opts);
  if (typeof s.measureInputUsage === 'function') return s.measureInputUsage(input, opts);
  if (typeof s.countPromptTokens === 'function') return s.countPromptTokens(input);
  throw new Error('no measure function on the session');
}
const canMeasure = s => ['measureContextUsage', 'measureInputUsage', 'countPromptTokens'].some(k => typeof s[k] === 'function');
const apiShape = () => {
  const L = LM();
  return {
    LanguageModel: typeof globalThis.LanguageModel, windowAi: typeof globalThis.ai, aiLanguageModel: typeof (globalThis.ai && globalThis.ai.languageModel),
    availability: typeof (L && L.availability), capabilities: typeof (L && L.capabilities), params: typeof (L && L.params), create: typeof (L && L.create),
  };
};
const sessionShape = s => ({
  contextWindow: s.contextWindow, inputQuota: s.inputQuota, maxTokens: s.maxTokens, contextUsage: s.contextUsage, inputUsage: s.inputUsage,
  measureContextUsage: typeof s.measureContextUsage, measureInputUsage: typeof s.measureInputUsage, countPromptTokens: typeof s.countPromptTokens,
  clone: typeof s.clone, destroy: typeof s.destroy, prompt: typeof s.prompt, promptStreaming: typeof s.promptStreaming, append: typeof s.append,
  oncontextoverflow: 'oncontextoverflow' in s, onquotaoverflow: 'onquotaoverflow' in s, topK: s.topK, temperature: s.temperature,
});
let langFallback = false;
async function create(opts = {}, label = '') {
  const L = LM();
  const monitor = m => m.addEventListener('downloadprogress', e => log(`download ${label} ${Math.round(100 * (e.loaded ?? 0))}%`));
  const t = now();
  try {
    const s = await L.create({ ...(langFallback ? {} : LANG), ...opts, monitor });
    return { s, ms: Math.round(now() - t) };
  } catch (e) {
    if (langFallback || opts.expectedInputs || !['TypeError', 'NotSupportedError'].includes(e && e.name)) throw e;
    // an old build that does not know expectedInputs/expectedOutputs: try once without, and remember
    log(`create with languages failed (${e.name}: ${e.message}); retrying without`, 'bad');
    R.createLanguageError = errInfo(e); langFallback = true;
    const s = await L.create({ ...opts, monitor });
    return { s, ms: Math.round(now() - t) };
  }
}
async function ask(session, input, opts = {}, ms = 90000) {
  const d = deadline(ms);
  const r = await timed(() => session.prompt(input, { ...opts, signal: d.signal }));
  d.done();
  return r;
}
async function usageOf(s) { try { return ctxUsage(s); } catch (e) { return null; } }

// ---------- test 1: environment ----------

async function testEnvironment() {
  status('1/6 Environment');
  const T = R.tests.environment = {
    userAgent: navigator.userAgent, isSecureContext, origin: location.origin, hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory, userActivation: navigator.userActivation && navigator.userActivation.isActive, api: apiShape(),
  };
  try { T.uaData = await navigator.userAgentData.getHighEntropyValues(['fullVersionList', 'platform', 'platformVersion', 'architecture', 'model']); } catch (e) { T.uaData = errInfo(e); }
  const L = LM();
  if (!L) { T.missing = true; log('LanguageModel is missing in this browser: nothing more to test.', 'bad'); return false; }
  T.availability = {};
  const variants = {
    none: undefined, textEn: LANG, textIt: { expectedInputs: [{ type: 'text', languages: ['it'] }], expectedOutputs: [{ type: 'text', languages: ['it'] }] },
    image: { expectedInputs: [{ type: 'image' }] }, audio: { expectedInputs: [{ type: 'audio' }] },
  };
  for (const [k, o] of Object.entries(variants)) {
    if (typeof L.availability === 'function') T.availability[k] = await timed(() => (o ? L.availability(o) : L.availability()));
    else if (typeof L.capabilities === 'function') { T.availability[k] = await timed(async () => { const c = await L.capabilities(); return { available: c.available, defaultTopK: c.defaultTopK, maxTopK: c.maxTopK }; }); break; }
  }
  if (typeof L.params === 'function') T.params = await timed(() => L.params());
  log(`availability: ${Object.entries(T.availability).map(([k, v]) => `${k}=${v.ok ? JSON.stringify(v.value) : v.error.name}`).join(', ')}`);
  const base = T.availability.none || T.availability.textEn;
  if (base && base.ok && base.value === 'unavailable') { log('The model reports unavailable: stopping.', 'bad'); return false; }
  return true;
}

// ---------- test 2: context window ----------

const PARA = ['The bass line walks down the minor scale while the kick keeps a steady four on the floor.', 'A pad opens slowly, the filter rising over eight bars before the drop.', 'Hats ride the off beat; a clap lands on two and four with a short room.', 'The arpeggio climbs through the chord tones, then falls back an octave.', 'A riser builds tension, white noise sweeping up into the next section.'];
const filler = chars => { let s = '', i = 0; while (s.length < chars) { s += `${i + 1}. ${PARA[i % PARA.length]} `; i++; } return s.slice(0, chars); };
const ASK = '\n\nIgnore the text above. Reply with the single word OK.';

async function testContext() {
  status('2/6 Context window');
  const T = R.tests.context = {};
  const { s, ms } = await create({}, 'bare');
  T.createMs = ms; T.session = sessionShape(s); T.window = ctxWindow(s); T.usageEmpty = await usageOf(s);
  log(`context window ${T.window}, usage empty ${T.usageEmpty}, measure: ${canMeasure(s)}`);
  T.samples = {};
  if (canMeasure(s)) {
    const samples = {
      hello: 'Hello', sentence: PARA[0], italian: 'Il basso scende lungo la scala minore mentre la cassa tiene un quattro dritto.',
      json: '{"commands":[{"kind":"more","part":"bass"},{"kind":"darker"}]}', filler4000: filler(4000), song: JSON.stringify(M ? M.song : {}),
    };
    for (const [k, v] of Object.entries(samples)) { const r = await timed(() => measure(s, v)); T.samples[k] = { chars: v.length, tokens: r.ok ? r.value : null, error: r.error, charsPerToken: r.ok && r.value ? +(v.length / r.value).toFixed(2) : null }; }
    log(`tokens: ${Object.entries(T.samples).map(([k, v]) => `${k} ${v.tokens} (${v.charsPerToken} c/t)`).join(', ')}`);
  }
  save();
  const win = Number.isFinite(T.window) ? T.window : 32768;
  // largest accepted prompt: binary search on the filler length, with measure when it exists (no generation)
  const ratio = (T.samples.filler4000 && T.samples.filler4000.charsPerToken) || 4;
  if (canMeasure(s)) {
    let lo = 0, hi = Math.ceil(win * ratio * 1.3), it = 0;
    while (hi - lo > 40 && it++ < 30) { const mid = Math.floor((lo + hi) / 2); const r = await timed(() => measure(s, filler(mid) + ASK)); if (r.ok && r.value <= win) lo = mid; else hi = mid; }
    T.measureFit = { chars: lo, tokens: (await timed(() => measure(s, filler(lo) + ASK))).value, iterations: it };
  }
  // real prompts at about 1k, 3k and the largest, each in a clone so turns never pile up; then one over the limit
  const charsFor = tok => Math.max(0, Math.floor(tok * ratio) - ASK.length);
  const maxChars = T.measureFit ? T.measureFit.chars : charsFor(win - 64);
  const points = [['1k', charsFor(1000)], ['3k', charsFor(3000)], ['max-minus-256', Math.max(0, maxChars - Math.round(256 * ratio))], ['max', maxChars], ['over', maxChars + Math.round(300 * ratio)]];
  T.prompts = [];
  for (const [label, chars] of points) {
    if (label !== 'over' && label !== 'max' && label !== 'max-minus-256' && chars > maxChars) continue;
    const c = await timed(() => s.clone());
    const sess = c.ok ? c.value : (await create({}, label)).s;
    let tokens = null; if (canMeasure(sess)) { const m = await timed(() => measure(sess, filler(chars) + ASK)); tokens = m.ok ? m.value : null; }
    const r = await ask(sess, filler(chars) + ASK, {}, 180000);
    const row = { label, chars, tokens, ok: r.ok, ms: r.ms, reply: r.ok ? String(r.value).slice(0, 120) : undefined, error: r.error, usageAfter: await usageOf(sess) };
    T.prompts.push(row);
    log(`prompt ${label}: ${tokens} tokens, ${r.ok ? `${r.ms} ms, "${row.reply}"` : `${r.error.name}: ${r.error.message}`}`, r.ok ? '' : 'bad');
    try { sess.destroy(); } catch (e) { /* ignore */ }
    save();
  }
  // without measure: real-prompt binary search, few steps (an overflow fails fast)
  if (!canMeasure(s)) {
    let lo = 0, hi = Math.ceil(win * 4 * 1.3), it = 0;
    while (hi - lo > 400 && it++ < 7) { const mid = Math.floor((lo + hi) / 2); const sess = (await create({}, 'search')).s; const r = await ask(sess, filler(mid) + ASK, {}, 180000); try { sess.destroy(); } catch (e) { /* ignore */ } if (r.ok) lo = mid; else { hi = mid; T.overflowError = r.error; } }
    T.promptFit = { chars: lo, iterations: it };
  }
  // the overflow event names: append a big text to a session that already holds a turn
  T.overflowEvent = await (async () => {
    const sess = (await create({}, 'overflow')).s; const seen = [];
    sess.addEventListener && ['contextoverflow', 'quotaoverflow'].forEach(n => sess.addEventListener(n, () => seen.push(n)));
    const a = await ask(sess, filler(charsFor(Math.round(win * 0.55))) + ASK, {}, 180000);
    const b = await ask(sess, filler(charsFor(Math.round(win * 0.55))) + ASK, {}, 180000);
    const out = { first: { ok: a.ok, ms: a.ms, error: a.error }, second: { ok: b.ok, ms: b.ms, error: b.error }, events: seen, usageAfter: await usageOf(sess) };
    try { sess.destroy(); } catch (e) { /* ignore */ }
    return out;
  })();
  log(`overflow events: ${JSON.stringify(T.overflowEvent.events)}`);
  try { s.destroy(); } catch (e) { /* ignore */ }
}

// ---------- test 3: Radio console ----------

const LEFT_OUT = ['add', 'remove', 'voice', 'voice-sound', 'curve', 'curve-reset'];
const DESC = {
  'energy-up': 'raise the energy of the rest of the song', 'energy-down': 'lower the energy of the rest of the song',
  'more-complex': 'more tracks at once', 'less-complex': 'fewer tracks at once (simpler)',
  more: 'one more track of an instrument {part}', less: 'one fewer track of an instrument {part}',
  'lock-part': 'the director stops changing an instrument {part}', 'unlock-part': 'the director may change the instrument {part} again',
  riser: 'a rising noise sweep into the next part change {bars?, dir?}',
  pattern: 'one of the listener\'s saved patterns {name}; without {track} as a new track, with {track} in place of that playing track',
  voicing: 'how a part sits on the chords {type, treatment}', vary: 'new notes for a part {type}', swap: 'another ready-made part for {type}',
  darker: 'close the filters', brighter: 'open the filters', dirtier: 'more drive and distortion', cleaner: 'less drive and fewer effects', 'more-space': 'more delay and reverb',
  instrument: 'another sound for the leading instrument, or for {track}', progression: 'other chords (chord progression)', key: 'change key {to}',
  'talk-more': 'the narrator comments more', 'talk-less': 'the narrator comments less', 'say-live': 'the voice track speaks a line {text}, at most 120 characters',
  drop: 'jump to the drop', stay: 'repeat the part playing once more', extend: 'make the song longer before its ending', end: 'go to the outro and end the song',
  volume: 'set the volume of {track}, {value} from 0 to 1.5 (1 is normal)', mute: 'mute {track}', unmute: '{track} plays again', lock: 'the director stops changing {track}', unlock: 'the director may change {track} again',
};
const PATTERNS = ['Midnight Groove', 'Acid Line 303', 'Rolling Sub', 'Glass Arp', 'Broken Hats', 'Warehouse Kick', 'Dark Choir Pad', 'Neon Hook', 'Tape Chords', 'Dusty Breaks'];
const TRACKS = [['kick', 'kick'], ['hats', 'beat'], ['bass', 'bass'], ['arp', 'arp'], ['lead', 'hook'], ['pad', 'pad']];
const STATE = `Song on air: style berlin-techno, energy 3 of 5, part: build.\nPlaying tracks (id: instrument): ${TRACKS.map(([i, k]) => `${i}: ${k}`).join(', ')}.\nSaved patterns that fit: ${PATTERNS.join(', ')}.`;

function radioPrompt() {
  const { COMMANDS, INSTRUMENTS, VARY_TYPES, KEY_MOVES, RISER_BARS, TREATMENTS } = M.steering;
  const kinds = Object.keys(COMMANDS).filter(k => !LEFT_OUT.includes(k));
  const system = [
    'You turn a listener\'s request into commands for the console of a live music radio. Answer only with JSON that matches the schema.',
    'Never invent a command or a track id. At most 4 commands, in the order asked. If nothing fits, answer "commands": [] and a short "note" that says what cannot be done.',
    'Commands (kind: what it does {arguments}):',
    ...kinds.map(k => `${k}: ${DESC[k] || k}`),
    `Arguments: part = ${[...INSTRUMENTS, 'riser'].join(', ')} (hook is the melody). type = ${VARY_TYPES.join(', ')}. treatment = ${[...TREATMENTS, 'auto'].join(', ')}. to = ${KEY_MOVES.join(', ')} (up and down: a fifth; relative: the relative major). bars = ${RISER_BARS.join(', ')}. dir = up, down. track = a playing track id.`,
  ].join('\n');
  const schema = {
    type: 'object', required: ['commands'],
    properties: {
      commands: { type: 'array', maxItems: 4, items: { type: 'object', required: ['kind'], properties: {
        kind: { enum: kinds }, part: { enum: [...INSTRUMENTS, 'riser'] }, type: { enum: VARY_TYPES }, track: { type: 'string' }, name: { type: 'string', maxLength: 60 },
        value: { type: 'number' }, treatment: { type: 'string' }, to: { type: 'string' }, bars: { type: 'string' }, dir: { enum: ['up', 'down'] }, text: { type: 'string', maxLength: 120 },
      } } },
      note: { type: 'string', maxLength: 120 },
    },
  };
  const examples = [
    ['a bit more energy', { commands: [{ kind: 'energy-up' }] }],
    ['add a second pad and make it brighter', { commands: [{ kind: 'more', part: 'pad' }, { kind: 'brighter' }] }],
    ['turn the bass down to half', { commands: [{ kind: 'volume', track: 'bass', value: 0.5 }] }],
    ['vary the arp', { commands: [{ kind: 'vary', type: 'arp' }] }],
    ['make it faster', { commands: [], note: 'The console cannot change the tempo.' }],
    ['use my Rolling Sub pattern instead of the bass', { commands: [{ kind: 'pattern', name: 'Rolling Sub', track: 'bass' }] }],
  ];
  const initialPrompts = [{ role: 'system', content: system }];
  for (const [q, a] of examples) { initialPrompts.push({ role: 'user', content: `Request: ${q}` }, { role: 'assistant', content: JSON.stringify(a) }); }
  return { kinds, system, schema, examples, initialPrompts };
}

// expected answers, written before the run: a list of acceptable command lists (order not required)
const C = (kind, o = {}) => ({ kind, ...o });
const RADIO_REQUESTS = [
  { q: 'more energy', cat: 'single', exp: [[C('energy-up')]] },
  { q: 'bring the energy down a bit', cat: 'single', exp: [[C('energy-down')]] },
  { q: 'add another bass', cat: 'single', exp: [[C('more', { part: 'bass' })]] },
  { q: 'take one arp away', cat: 'single', exp: [[C('less', { part: 'arp' })]] },
  { q: 'make it darker', cat: 'single', exp: [[C('darker')]] },
  { q: 'more reverb and delay please', cat: 'single', exp: [[C('more-space')]] },
  { q: 'I want a dirtier sound', cat: 'single', exp: [[C('dirtier')]] },
  { q: 'go to the drop', cat: 'single', exp: [[C('drop')]] },
  { q: 'end the song', cat: 'single', exp: [[C('end')]] },
  { q: 'change the chords', cat: 'single', exp: [[C('progression')]] },
  { q: 'move the key up a fifth', cat: 'single', exp: [[C('key', { to: 'up' })]] },
  { q: 'new notes for the bass', cat: 'single', exp: [[C('vary', { type: 'bass' })]] },
  { q: 'swap the lead for something else', cat: 'single', exp: [[C('swap', { type: 'lead' })]] },
  { q: 'mute the hats', cat: 'single', exp: [[C('mute', { track: 'hats' })]] },
  { q: 'set the pad volume to 30 percent', cat: 'single', exp: [[C('volume', { track: 'pad', value: 0.3 })]] },
  { q: 'lock the kick so the director leaves it alone', cat: 'single', exp: [[C('lock-part', { part: 'kick' })], [C('lock', { track: 'kick' })]] },
  { q: 'put a riser before the next part', cat: 'single', exp: [[C('riser')]] },
  { q: 'the pad should play in thirds', cat: 'single', exp: [[C('voicing', { type: 'pad', treatment: 'thirds' })]] },
  { q: 'talk less please', cat: 'single', exp: [[C('talk-less')]] },
  { q: 'make it darker and calmer', cat: 'vague', exp: [[C('darker'), C('energy-down')]] },
  { q: 'it feels too busy', cat: 'vague', exp: [[C('less-complex')], [C('energy-down')]] },
  { q: 'more energy and add a second arp', cat: 'two-step', exp: [[C('energy-up'), C('more', { part: 'arp' })]] },
  { q: 'simplify it and stay on this part a bit longer', cat: 'two-step', exp: [[C('less-complex'), C('stay')]] },
  { q: 'change the tempo to 140 bpm', cat: 'impossible', exp: [[]] },
  { q: 'play the whole song backwards', cat: 'impossible', exp: [[]] },
  { q: 'add my saved pattern Midnight Groove', cat: 'pattern', exp: [[C('pattern', { name: 'Midnight Groove' })]] },
  { q: 'replace the bass with the acid line pattern', cat: 'pattern', exp: [[C('pattern', { name: 'Acid Line 303', track: 'bass' })]] },
  { q: 'add a spoken line: welcome to the night shift', cat: 'say', exp: [[C('say-live', { text: 'welcome to the night shift' })]] },
  { q: 'più energia e togli un basso', cat: 'italian', exp: [[C('energy-up'), C('less', { part: 'bass' })]] },
  { q: 'rendilo più scuro', cat: 'italian', exp: [[C('darker')]] },
  { q: 'vai al drop', cat: 'italian', exp: [[C('drop')]] },
];

const norm = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
function cmdMatch(got, exp) {
  if (!got || got.kind !== exp.kind) return false;
  for (const [k, v] of Object.entries(exp)) {
    if (k === 'kind') continue;
    const g = got[k];
    if (k === 'name' || k === 'text') { const a = norm(g), b = norm(v); if (!a || !(a.includes(b) || b.includes(a))) return false; }
    else if (k === 'value') { if (typeof g !== 'number' || Math.abs(g - v) > 0.051) return false; }
    else if (norm(g) !== norm(v)) return false;
  }
  return true;
}
function scoreOne(got, exp) {
  const used = new Set(); let matched = 0, kindsMatched = 0;
  for (const e of exp) { const i = got.findIndex((g, j) => !used.has(j) && cmdMatch(g, e)); if (i >= 0) { used.add(i); matched++; } }
  for (const e of exp) if (got.some(g => g && g.kind === e.kind)) kindsMatched++;
  const extras = got.length - matched;
  const inOrder = matched === exp.length && exp.every((e, i) => cmdMatch(got[i], e));
  const grade = exp.length === 0 ? (got.length === 0 ? 'exact' : 'wrong') : matched === exp.length && extras === 0 ? 'exact' : matched > 0 || kindsMatched > 0 ? 'partial' : 'wrong';
  return { grade, matched, kindsMatched, extras, inOrder };
}
const RANK = { exact: 2, partial: 1, wrong: 0 };
function score(answer, options) {
  const got = answer && Array.isArray(answer.commands) ? answer.commands : null;
  if (!got) return { grade: 'invalid' };
  return options.map(o => scoreOne(got, o)).sort((a, b) => RANK[b.grade] - RANK[a.grade] || b.matched - a.matched)[0];
}

let radioBase = null;
async function testRadio() {
  status('3/6 Radio console');
  const T = R.tests.radio = {};
  const P = radioPrompt();
  T.prompt = { system: P.system, schema: P.schema, examples: P.examples, state: STATE, kinds: P.kinds, missingDesc: P.kinds.filter(k => !DESC[k]) };
  const cr = await timed(() => create({ initialPrompts: P.initialPrompts }, 'radio'));
  if (!cr.ok) { T.createError = cr.error; log(`radio session failed: ${cr.error.name}: ${cr.error.message}`, 'bad'); RADIO_REQUESTS.forEach(step); return; }
  const c = cr.value, base = c.s;
  T.createMs = c.ms; T.usageSystemAndExamples = await usageOf(base); T.window = ctxWindow(base);
  if (canMeasure(base)) {
    const m = async (x, o) => { const r = await timed(() => measure(base, x, o)); return r.ok ? r.value : r.error; };
    T.tokens = { system: await m(P.system), state: await m(STATE), requestWithSchema: await m(`${STATE}\nRequest: make it darker`, { responseConstraint: P.schema }), requestNoSchema: await m(`${STATE}\nRequest: make it darker`), requestSchemaOmitted: await m(`${STATE}\nRequest: make it darker`, { responseConstraint: P.schema, omitResponseConstraintInput: true }) };
  }
  log(`radio base session: ${T.createMs} ms, usage ${T.usageSystemAndExamples} of ${T.window}; tokens ${JSON.stringify(T.tokens || {})}`);
  save();
  T.results = [];
  for (const req of RADIO_REQUESTS) {
    status(`3/6 Radio console: ${T.results.length + 1}/${RADIO_REQUESTS.length}`);
    const cl = await timed(() => base.clone());
    const sess = cl.ok ? cl.value : (await create({ initialPrompts: P.initialPrompts }, 'radio')).s;
    const r = await ask(sess, `${STATE}\nRequest: ${req.q}`, { responseConstraint: P.schema }, 60000);
    let json = null, parseError = null;
    if (r.ok) { try { json = JSON.parse(r.value); } catch (e) { parseError = String(e); } }
    const s = r.ok && json ? score(json, req.exp) : { grade: 'invalid' };
    const badKinds = json && Array.isArray(json.commands) ? json.commands.filter(x => !P.kinds.includes(x && x.kind)).map(x => x && x.kind) : [];
    const row = { q: req.q, cat: req.cat, expected: req.exp, raw: r.ok ? r.value : undefined, json, parseError, error: r.error, cloneMs: cl.ms, cloneError: cl.error, ms: r.ms, usageAfter: await usageOf(sess), validJson: !!json, badKinds, ...s };
    T.results.push(row);
    log(`${row.grade.padEnd(7)} ${r.ms} ms  "${req.q}" -> ${r.ok ? r.value : `${r.error.name}: ${r.error.message}`}`, row.grade === 'exact' ? 'ok' : row.grade === 'partial' ? '' : 'bad');
    try { sess.destroy(); } catch (e) { /* ignore */ }
    step(); save();
  }
  // one request with the schema kept out of the context
  const sess = (await timed(() => base.clone())).value;
  if (sess) { const r = await ask(sess, `${STATE}\nRequest: make it darker and calmer`, { responseConstraint: P.schema, omitResponseConstraintInput: true }, 60000); T.omitSchemaTry = { ok: r.ok, ms: r.ms, raw: r.value, error: r.error }; try { sess.destroy(); } catch (e) { /* ignore */ } }
  const by = (k, rows = T.results) => rows.reduce((o, x) => ((o[x[k]] = (o[x[k]] || 0) + 1), o), {});
  const en = T.results.filter(x => x.cat !== 'italian'), ms = T.results.filter(x => x.ok !== false).map(x => x.ms).sort((a, b) => a - b);
  T.summary = { english: by('grade', en), italian: by('grade', T.results.filter(x => x.cat === 'italian')), validJson: T.results.filter(x => x.validJson).length, total: T.results.length,
    latencyMs: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1], min: ms[0] }, byCategory: Object.fromEntries([...new Set(T.results.map(x => x.cat))].map(c => [c, by('grade', T.results.filter(x => x.cat === c))])) };
  log(`radio summary: ${JSON.stringify(T.summary)}`, 'ok');
  radioBase = base;
}

// ---------- test 4: Compose ----------

function composePrompt() {
  const { KITS } = M.music, DEVICES = Object.keys(M.rack.DEVICES);
  const song = clone(M.song); delete song.style; delete song.tags; delete song.created; delete song.appVersion; delete song.look;
  const sections = song.sections.map(s => s.name);
  const system = `You edit songs of a music app. A song is JSON: sections (timeline and harmony) and tracks. Answer with ONE new track as JSON matching the schema, nothing else.
Track: { "id" (lowercase, unique), "name", "type", "settings", "rack", "patterns": { "A": {...} }, "clips": [ { "section": "<section name>", "pattern": "A" } ] }. A track plays only inside its clips.
Types and settings (defaults):
- drums: kit (${KITS.slice(0, 6).join(', ')}...), gain .9, cutoff 20000 (low-pass Hz), drive 0 (0-4), grit 0 (bit crush). Pattern: "rows" with bd kick, cp clap, sd snare, hh hat, oh open hat, rd ride; each 16 characters, x plays, . rests. Example {"rows":{"bd":"x...x...x...x..."}}.
- bass: wave sawtooth, gain .8, cutoff 700, move lento (fisso, lento, veloce), reso 8, drive 0. Pattern: preset (rolling offbeat rumble galoppo ottavi walking sub pumping), notes = 16 chord tones per bar (0 root, 1 third, 2 fifth, 3 top, ~ rest).
- arp: wave supersaw, gain .4, cutoff 2400, delay .35. Pattern: preset (su sugiu pulsar pedale spezzato acid), speed "16" or "8", notes like bass.
- hook (melody): wave square, mode minor (minor phrygian dorian mixolydian), octave "4" ("3"-"5"), gain .3, cutoff 3000, delay .4. Pattern: preset (richiamo discesa eco ostinato domanda neon cyber), notes = 8 scale degrees per bar (0 key note, 7 octave, ~ rest).
- pad: wave supersaw, gain .28, cutoff 1400, room .85. Pattern: preset (pad stab pump sidechain staccato synco), plays the section chords.
- guitar: type distorted (clean crunch distorted metal muted), gain .5, cutoff 4200. Pattern: preset (power8 chug gallop riff held).
- texture: sample (vinyl numbers industrial metal glitch space wind), gain .4, grit .7, room .6. Pattern: rhythm (bar euclid eighth sixteenth).
Common settings: gain 0-1, cutoff Hz (lower is darker), drive 0-4, room and delay 0-1. wave: sawtooth supersaw square triangle sine.
Rack (effects after the instrument, in order): device ${DEVICES.join(', ')}; values: amount (0-1, distort 0-8), size, time (bar fraction, .125 an 8th), feedback, cutoff, reso, rate, depth, bits.
Sections of this song: ${sections.join(', ')}. Keep gains modest; a new track must not overpower the mix.
The song now:
${JSON.stringify(song)}`;
  const str = (n) => ({ type: 'string', maxLength: n });
  const schema = {
    type: 'object', required: ['id', 'type', 'patterns', 'clips'], additionalProperties: false,
    properties: {
      id: str(24), name: str(40), type: { enum: ['drums', 'bass', 'guitar', 'arp', 'hook', 'pad', 'texture'] },
      settings: { type: 'object', additionalProperties: false, properties: {
        kit: { enum: KITS }, wave: { enum: ['sawtooth', 'supersaw', 'square', 'triangle', 'sine'] }, gain: { type: 'number' }, cutoff: { type: 'number' }, drive: { type: 'number' },
        room: { type: 'number' }, delay: { type: 'number' }, reso: { type: 'number' }, grit: { type: 'number' }, move: { enum: ['fisso', 'lento', 'veloce'] },
        octave: { enum: ['3', '4', '5'] }, mode: { enum: ['minor', 'phrygian', 'dorian', 'mixolydian'] }, type: { enum: ['clean', 'crunch', 'distorted', 'metal', 'muted'] },
        sample: { enum: ['vinyl', 'numbers', 'industrial', 'metal', 'glitch', 'space', 'wind'] },
      } },
      rack: { type: 'array', maxItems: 4, items: { type: 'object', required: ['device'], additionalProperties: false, properties: {
        device: { enum: DEVICES }, amount: { type: 'number' }, size: { type: 'number' }, time: { type: 'number' }, feedback: { type: 'number' }, cutoff: { type: 'number' }, reso: { type: 'number' }, rate: { type: 'number' }, depth: { type: 'number' }, bits: { type: 'number' },
      } } },
      patterns: { type: 'object', required: ['A'], additionalProperties: false, properties: { A: { type: 'object', additionalProperties: false, properties: {
        preset: str(20), rows: { type: 'object', additionalProperties: false, properties: Object.fromEntries(['bd', 'cp', 'sd', 'hh', 'oh', 'rd'].map(k => [k, str(16)])) },
        notes: str(80), speed: { enum: ['16', '8'] }, rhythm: { enum: ['bar', 'euclid', 'eighth', 'sixteenth'] },
      } } } },
      clips: { type: 'array', minItems: 1, maxItems: 4, items: { type: 'object', required: ['section', 'pattern'], additionalProperties: false, properties: { section: { enum: sections }, pattern: { enum: ['A'] } } } },
    },
  };
  return { system, schema, song };
}
const COMPOSE_REQUESTS = [
  { q: 'add a low slow dark kick with distorted rumble in the decay', expect: t => ({ drums: t.type === 'drums', kick: !!(t.patterns && t.patterns.A && t.patterns.A.rows && /x/.test(t.patterns.A.rows.bd || '')), dark: (t.settings && t.settings.cutoff) < 4000 || (t.rack || []).some(d => d.device === 'lpf'), distorted: (t.rack || []).some(d => ['distort', 'shape', 'crush'].includes(d.device)) || (t.settings && t.settings.drive > 0) }) },
  { q: 'add a soft pad on the chords', expect: t => ({ pad: t.type === 'pad', soft: !t.settings || t.settings.gain === undefined || t.settings.gain <= 0.35 }) },
  { q: 'add a fast acid arp in the Chorus only', expect: t => ({ arp: t.type === 'arp', chorusOnly: (t.clips || []).length > 0 && t.clips.every(c => c.section === 'Chorus'), fast: !t.patterns || !t.patterns.A || t.patterns.A.speed !== '8' }) },
  { q: 'add a dark melody that enters in the Chorus', expect: t => ({ hook: t.type === 'hook', chorus: (t.clips || []).some(c => c.section === 'Chorus') }) },
  { q: 'add an open hi-hat track with a lot of reverb', expect: t => ({ drums: t.type === 'drums', oh: !!(t.patterns && t.patterns.A && t.patterns.A.rows && /x/.test(t.patterns.A.rows.oh || '')), reverb: (t.settings && t.settings.room >= 0.5) || (t.rack || []).some(d => d.device === 'reverb') }) },
  { q: 'add vinyl crackle through the whole song', expect: t => ({ texture: t.type === 'texture', vinyl: t.settings && t.settings.sample === 'vinyl', whole: (t.clips || []).length >= 2 }) },
];

async function testCompose() {
  status('4/6 Compose');
  const T = R.tests.compose = {};
  const P = composePrompt();
  T.prompt = { system: P.system, schema: P.schema };
  const c = await timed(() => create({ initialPrompts: [{ role: 'system', content: P.system }] }, 'compose'));
  if (!c.ok) { T.fits = false; T.createError = c.error; log(`compose session failed: ${c.error.name}: ${c.error.message}`, 'bad'); COMPOSE_REQUESTS.forEach(step); return; }
  const base = c.value.s;
  T.createMs = c.value.ms; T.usageSystem = await usageOf(base); T.window = ctxWindow(base);
  if (canMeasure(base)) { const r = await timed(() => measure(base, `Request: ${COMPOSE_REQUESTS[0].q}`, { responseConstraint: P.schema })); T.requestWithSchemaTokens = r.ok ? r.value : r.error; }
  const need = (T.usageSystem || 0) + (typeof T.requestWithSchemaTokens === 'number' ? T.requestWithSchemaTokens : 0) + 400;
  T.fits = !Number.isFinite(T.window) || need <= T.window; T.tokensNeeded = need;
  log(`compose: system ${T.usageSystem} tokens, request+schema ${T.requestWithSchemaTokens}, window ${T.window}, fits ${T.fits}`);
  save();
  T.results = [];
  for (const req of COMPOSE_REQUESTS) {
    status(`4/6 Compose: ${T.results.length + 1}/${COMPOSE_REQUESTS.length}`);
    const cl = await timed(() => base.clone());
    const sess = cl.ok ? cl.value : base;
    const r = await ask(sess, `Request: ${req.q}`, { responseConstraint: P.schema }, 150000);
    const row = { q: req.q, ms: r.ms, raw: r.ok ? r.value : undefined, error: r.error };
    if (r.ok) {
      try {
        const track = JSON.parse(r.value); row.track = track;
        const song = clone(P.song); song.tracks = song.tracks.filter(t => t.id !== track.id).concat(track);
        try { M.format.normalizeSong(song); row.normalizes = true; } catch (e) { row.normalizes = false; row.normalizeError = String(e); }
        const v = M.validate.validateSong(song); row.errors = v.errors; row.warnings = v.warnings; row.valid = v.errors.length === 0;
        row.idClash = M.song.tracks.some(t => t.id === track.id);
        row.checks = req.expect(track);
      } catch (e) { row.parseError = String(e); row.valid = false; }
    }
    T.results.push(row);
    log(`compose ${r.ok ? (row.valid ? 'valid' : 'INVALID') : 'error'} ${r.ms} ms "${req.q}" ${row.checks ? JSON.stringify(row.checks) : ''} ${row.errors && row.errors.length ? JSON.stringify(row.errors.slice(0, 3)) : ''} ${r.ok ? '' : `${r.error.name}: ${r.error.message}`}`, row.valid ? 'ok' : 'bad');
    if (cl.ok) try { sess.destroy(); } catch (e) { /* ignore */ }
    step(); save();
  }
  try { base.destroy(); } catch (e) { /* ignore */ }
}

// ---------- test 5: image input ----------

async function testImage() {
  status('5/6 Image input');
  const T = R.tests.image = {};
  const L = LM();
  const a = R.tests.environment.availability && R.tests.environment.availability.image;
  T.availability = a ? a.value : null;
  if (!a || !a.ok || a.value !== 'available') { T.skipped = `availability ${a && a.ok ? a.value : 'error'}`; log(`image skipped: ${T.skipped}`); return; }
  const cv = document.createElement('canvas'); cv.width = 160; cv.height = 80;
  const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 160, 80); g.fillStyle = '#000'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('47', 80, 42);
  const c = await timed(() => L.create({ expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }], expectedOutputs: LANG.expectedOutputs }));
  if (!c.ok) { T.createError = c.error; log(`image session failed: ${c.error.name}: ${c.error.message}`, 'bad'); return; }
  const s = c.value; T.createMs = c.ms;
  const msg = [{ role: 'user', content: [{ type: 'text', value: 'What number is written in this image? Reply with the digits only.' }, { type: 'image', value: cv }] }];
  if (canMeasure(s)) { const m = await timed(() => measure(s, msg)); T.tokens = m.ok ? m.value : m.error; }
  const r = await ask(s, msg, {}, 90000);
  T.result = { ok: r.ok, ms: r.ms, reply: r.value, error: r.error, correct: r.ok && String(r.value).includes('47') };
  log(`image: ${r.ok ? `"${r.value}" in ${r.ms} ms` : `${r.error.name}: ${r.error.message}`}`, T.result.correct ? 'ok' : 'bad');
  try { s.destroy(); } catch (e) { /* ignore */ }
}

// ---------- test 6: session reuse ----------

async function testReuse() {
  status('6/6 Session reuse');
  const T = R.tests.reuse = {};
  const P = radioPrompt();
  const q = n => `${STATE}\nRequest: ${['make it darker', 'add another pad', 'go to the drop', 'more energy'][n]}`;
  const opts = { responseConstraint: P.schema };
  const cr = await timed(() => create({ initialPrompts: P.initialPrompts }, 'reuse'));
  if (!cr.ok) { T.createError = cr.error; log(`reuse session failed: ${cr.error.name}: ${cr.error.message}`, 'bad'); return; }
  const c = cr.value;
  T.createMs = c.ms; T.usageAfterCreate = await usageOf(c.s);
  const c1 = await timed(() => c.s.clone()); T.clone1Ms = c1.ms; T.clone1Error = c1.error;
  if (c1.ok) { const r = await ask(c1.value, q(0), opts); T.firstPromptOnClone = { ms: r.ms, ok: r.ok, error: r.error }; const r2 = await ask(c1.value, q(1), opts); T.secondPromptSameClone = { ms: r2.ms, ok: r2.ok, usageAfter: await usageOf(c1.value) }; try { c1.value.destroy(); } catch (e) { /* ignore */ } }
  const c2 = await timed(() => c.s.clone()); T.clone2Ms = c2.ms;
  if (c2.ok) { const r = await ask(c2.value, q(2), opts); T.promptOnSecondClone = { ms: r.ms, ok: r.ok }; try { c2.value.destroy(); } catch (e) { /* ignore */ } }
  const r = await ask(c.s, q(3), opts); T.promptOnBase = { ms: r.ms, ok: r.ok, usageAfter: await usageOf(c.s) };
  // cold path for comparison: a fresh session with the system prompt for every request
  const t = now(); const f = await create({ initialPrompts: P.initialPrompts }, 'cold'); const fr = await ask(f.s, q(2), opts);
  T.coldCreatePlusPrompt = { createMs: f.ms, promptMs: fr.ms, totalMs: Math.round(now() - t) };
  try { f.s.destroy(); c.s.destroy(); } catch (e) { /* ignore */ }
  log(`reuse: ${JSON.stringify(T)}`);
}

// ---------- run ----------

async function runAll() {
  $('#run').disabled = true; $('#log').textContent = ''; stepsDone = 0;
  stepsTotal = 4 + RADIO_REQUESTS.length + COMPOSE_REQUESTS.length;
  await loading;
  log(`run ${runId} on ${location.origin}`);
  const tests = [['environment', testEnvironment], ['context', testContext], ['radio', testRadio], ['compose', testCompose], ['image', testImage], ['reuse', testReuse]];
  for (const [name, fn] of tests) {
    if ((name !== 'environment') && !M) { log(`${name} skipped: app modules missing`, 'bad'); continue; }
    const t = now();
    try {
      const go = await fn();
      if (name === 'environment') { step(); if (go === false) break; }
      else if (!['radio', 'compose'].includes(name)) step();
    } catch (e) {
      R.tests[name] = { ...(R.tests[name] || {}), crashed: errInfo(e) };
      log(`${name} crashed: ${e && e.name}: ${e && e.message}`, 'bad');
    }
    (R.tests[name] = R.tests[name] || {}).totalMs = Math.round(now() - t);
    await save();
  }
  try { radioBase && radioBase.destroy(); } catch (e) { /* ignore */ }
  R.finished = new Date().toISOString();
  await save();
  $('#bar > div').style.width = '100%';
  status(R.savedTo ? `Done. Results saved to ${R.savedTo}` : 'Done, but the results could not be saved (see the log).');
  log(R.savedTo ? `saved to ${R.savedTo}` : 'not saved', R.savedTo ? 'ok' : 'bad');
  $('#run').disabled = false;
}

$('#run').addEventListener('click', runAll);
