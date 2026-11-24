// Built-in model probe (ai-assistant, task 1.1): does Chrome's Prompt API (LanguageModel, Gemini Nano) fit the Radio
// console and possibly Compose? Opened from the dev server with vite.local.config.mjs, which saves every POST to
// /__probe-results as notes/nano-probe-results-<run>.json. One click runs every test; partial results are saved
// after each step, so a crash still leaves data. No network besides localhost.
// Round 2 (probeVersion 2): enums for pattern names and track ids, an anyOf branch per command kind when the model
// takes it, 20 s per request, 10 new requests, a variance run, and Compose with an anyOf branch per track type.
// Round 3 (probeVersion 3, the default since the MVP; the page stays as a prompt bench): the app's real registry,
// prompt, schema and guards (src/ai/commands.js, src/ai/generate.js) on the radio requests of both rounds, scored on
// the commands the app would apply (pattern names matched, unknown ones rejected, "cannot" answered before the model).
// Round 4 (probeVersion 4, the default): round 3 plus the checks after the engine (D4 checks 4 to 6: the pattern the
// request names, the command the request names, spoken lines without the model); each request also records what the app
// does (applied, proposal, rejected, cannot) and the summary compares with the v3 run.
// Results: notes/nano-probe-results-v4-<time>.json. ?round2 runs round 2 as it was (with ?all its extra tests).

const $ = s => document.querySelector(s);
const ROUND2 = new URLSearchParams(location.search).has('round2');
const runId = `${ROUND2 ? 'v2' : 'v4'}-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}`;
const R = { runId, probeVersion: ROUND2 ? 2 : 4, started: new Date().toISOString(), finished: null, imports: {}, tests: {}, errors: [], log: [] };
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
    const [steering, validate, format, music, rack, registry, generate] = await Promise.all([
      import('/src/endless/steering.js'), import('/src/song/validate.js'), import('/src/song/format.js'), import('/src/music.js'), import('/src/song/rack.js'),
      import('/src/ai/commands.js'), import('/src/ai/generate.js'),
    ]);
    const song = await (await fetch('/songs/examples/02-bass-and-chords.json')).json();
    M = { steering, validate, format, music, rack, song, registry, generate };
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
const TRACK_IDS = TRACKS.map(t => t[0]);
const STATE = `Song on air: style berlin-techno, energy 3 of 5, part: build.\nPlaying tracks (id: instrument): ${TRACKS.map(([i, k]) => `${i}: ${k}`).join(', ')}.\nSaved patterns that fit: ${PATTERNS.join(', ')}.`;

// mode 'conditional': one schema branch per kind with only its arguments (anyOf); 'flat': one object with every argument,
// enums everywhere (round 1 had free strings for name and track)
function radioPrompt(mode = 'conditional') {
  const { COMMANDS, INSTRUMENTS, VARY_TYPES, KEY_MOVES, RISER_BARS, TREATMENTS } = M.steering;
  const kinds = Object.keys(COMMANDS).filter(k => !LEFT_OUT.includes(k));
  const system = [
    'You turn a listener\'s request into commands for the console of a live music radio. Answer only with JSON that matches the schema.',
    'Never invent a command, a track id or a pattern name. At most 4 commands, in the order asked. If nothing fits, answer "commands": [] and a short "note" that says what cannot be done.',
    'Commands (kind: what it does {arguments}):',
    ...kinds.map(k => `${k}: ${DESC[k] || k}`),
    `Arguments: part = ${[...INSTRUMENTS, 'riser'].join(', ')} (hook is the melody). type = ${VARY_TYPES.join(', ')}. treatment = ${[...TREATMENTS, 'auto'].join(', ')}. to = ${KEY_MOVES.join(', ')} (up and down: a fifth; relative: the relative major). bars = ${RISER_BARS.join(', ')}. dir = up, down. track = a playing track id. name = a saved pattern name from the list, exactly.`,
  ].join('\n');
  const E = list => ({ enum: list });
  const A = {
    part: E(INSTRUMENTS), lockPart: E([...INSTRUMENTS, 'riser']), type: E(VARY_TYPES), track: E(TRACK_IDS), name: E(PATTERNS), value: { type: 'number' },
    treatment: E([...TREATMENTS, 'auto']), to: E(KEY_MOVES), bars: E(RISER_BARS.map(String)), dir: E(['up', 'down']), text: { type: 'string', maxLength: 120 },
  };
  const SPEC = {
    more: { req: { part: A.part } }, less: { req: { part: A.part } }, 'lock-part': { req: { part: A.lockPart } }, 'unlock-part': { req: { part: A.lockPart } },
    riser: { opt: { bars: A.bars, dir: A.dir } }, pattern: { req: { name: A.name }, opt: { track: A.track } },
    voicing: { req: { type: A.type, treatment: A.treatment } }, vary: { req: { type: A.type } }, swap: { req: { type: A.type } },
    instrument: { opt: { track: A.track } }, key: { opt: { to: A.to } }, 'say-live': { req: { text: A.text } },
    volume: { req: { track: A.track, value: A.value } }, mute: { req: { track: A.track } }, unmute: { req: { track: A.track } }, lock: { req: { track: A.track } }, unlock: { req: { track: A.track } },
  };
  const plain = kinds.filter(k => !SPEC[k]), withArgs = kinds.filter(k => SPEC[k]);
  const branch = (kindEnum, s = {}) => ({ type: 'object', additionalProperties: false, required: ['kind', ...Object.keys(s.req || {})], properties: { kind: E(kindEnum), ...(s.req || {}), ...(s.opt || {}) } });
  const item = mode === 'conditional'
    ? { anyOf: [branch(plain), ...withArgs.map(k => branch([k], SPEC[k]))] }
    : { type: 'object', required: ['kind'], additionalProperties: false, properties: { kind: E(kinds), part: A.lockPart, type: A.type, track: A.track, name: A.name, value: A.value, treatment: A.treatment, to: A.to, bars: A.bars, dir: A.dir, text: A.text } };
  const schema = { type: 'object', required: ['commands'], additionalProperties: false, properties: { commands: { type: 'array', maxItems: 4, items: item }, note: { type: 'string', maxLength: 120 } } };
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
  return { mode, kinds, system, schema, examples, initialPrompts };
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
  // round 2
  { q: 'play Glass Arp', cat: 'pattern', exp: [[C('pattern', { name: 'Glass Arp' })]] },
  { q: 'put the Dark Choir Pad pattern in place of the pad', cat: 'pattern', exp: [[C('pattern', { name: 'Dark Choir Pad', track: 'pad' })]] },
  { q: 'add neon hook', cat: 'pattern', exp: [[C('pattern', { name: 'Neon Hook' })]] },
  { q: 'add my pattern Dusty Break', cat: 'pattern-near', exp: [[C('pattern', { name: 'Dusty Breaks' })]] },
  { q: 'use the tape chord pattern instead of the pad', cat: 'pattern-near', exp: [[C('pattern', { name: 'Tape Chords', track: 'pad' })]] },
  { q: 'add my saved pattern Sunset Lead', cat: 'pattern-unknown', exp: [[]] },
  { q: 'make it more intense', cat: 'vague', exp: [[C('energy-up')], [C('energy-up'), C('dirtier')], [C('more-complex')], [C('energy-up'), C('more-complex')]] },
  { q: 'give it some air', cat: 'vague', exp: [[C('more-space')], [C('brighter')], [C('less-complex')]] },
  { q: 'it is getting boring', cat: 'vague', exp: [[C('vary')], [C('swap')], [C('progression')], [C('energy-up')], [C('more-complex')], [C('instrument')]] },
  { q: 'make it warmer and softer', cat: 'vague', exp: [[C('darker'), C('cleaner')], [C('cleaner')], [C('darker')], [C('darker'), C('energy-down')]] },
];
// round 1 on the owner's Chrome (notes/nano-probe-results-2026-11-21T10-25-49.json), flat schema with free name and track
const ROUND1 = { 'more energy': 'exact', 'bring the energy down a bit': 'exact', 'add another bass': 'exact', 'take one arp away': 'exact', 'make it darker': 'exact', 'more reverb and delay please': 'exact', 'I want a dirtier sound': 'exact', 'go to the drop': 'exact', 'end the song': 'exact', 'change the chords': 'exact', 'move the key up a fifth': 'partial', 'new notes for the bass': 'exact', 'swap the lead for something else': 'exact', 'mute the hats': 'exact', 'set the pad volume to 30 percent': 'exact', 'lock the kick so the director leaves it alone': 'exact', 'put a riser before the next part': 'exact', 'the pad should play in thirds': 'partial', 'talk less please': 'exact', 'make it darker and calmer': 'partial', 'it feels too busy': 'exact', 'more energy and add a second arp': 'exact', 'simplify it and stay on this part a bit longer': 'exact', 'change the tempo to 140 bpm': 'exact', 'play the whole song backwards': 'exact', 'add my saved pattern Midnight Groove': 'invalid', 'replace the bass with the acid line pattern': 'invalid', 'add a spoken line: welcome to the night shift': 'exact', 'più energia e togli un basso': 'exact', 'rendilo più scuro': 'exact', 'vai al drop': 'exact' };
const ROUND1_SUMMARY = { english: { exact: 23, partial: 3, invalid: 2 }, italian: { exact: 3 }, latencyMs: { median: 1257 } };
// the hardest ones, run 3 times each for stability
const VARIANCE = ['move the key up a fifth', 'the pad should play in thirds', 'make it darker and calmer', 'add my saved pattern Midnight Groove', 'replace the bass with the acid line pattern', 'add my pattern Dusty Break', 'add my saved pattern Sunset Lead', 'it feels too busy', 'set the pad volume to 30 percent', 'make it warmer and softer'];

const norm = v => String(v ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
function cmdMatch(got, exp) {
  if (!got || got.kind !== exp.kind) return false;
  for (const [k, v] of Object.entries(exp)) {
    if (k === 'kind') continue;
    const g = got[k];
    if (k === 'text') { const a = norm(g), b = norm(v); if (!a || !(a.includes(b) || b.includes(a))) return false; }
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

const RADIO_MS = 20000;
async function radioBase(P) {
  const cr = await timed(() => create({ initialPrompts: P.initialPrompts }, `radio-${P.mode}`));
  return cr.ok ? { base: cr.value.s, ms: cr.value.ms } : { error: cr.error };
}
async function radioAsk(base, P, req) {
  const cl = await timed(() => base.clone());
  const sess = cl.ok ? cl.value : (await create({ initialPrompts: P.initialPrompts }, 'radio')).s;
  const r = await ask(sess, `${STATE}\nRequest: ${req.q}`, { responseConstraint: P.schema }, RADIO_MS);
  let json = null, parseError = null;
  if (r.ok) { try { json = JSON.parse(r.value); } catch (e) { parseError = String(e); } }
  const s = r.ok && json ? score(json, req.exp) : { grade: 'invalid' };
  const usageAfter = await usageOf(sess);
  try { sess.destroy(); } catch (e) { /* ignore */ }
  return { q: req.q, cat: req.cat, expected: req.exp, raw: r.ok ? r.value : undefined, json, parseError, error: r.error, cloneMs: cl.ms, cloneError: cl.error, ms: r.ms, usageAfter, validJson: !!json, ...s };
}
const countBy = (rows, k) => rows.reduce((o, x) => ((o[x[k]] = (o[x[k]] || 0) + 1), o), {});

// does the built-in model take anyOf branches in responseConstraint? one request decides the main schema
async function testSchemaSupport() {
  status('2 Schema support');
  const T = R.tests.schemaSupport = {};
  const P = radioPrompt('conditional');
  const b = await radioBase(P);
  if (b.error) { T.createError = b.error; T.conditional = false; log(`schema check: session failed ${b.error.name}: ${b.error.message}`, 'bad'); return; }
  const row = await radioAsk(b.base, P, RADIO_REQUESTS.find(x => x.q === 'mute the hats'));
  try { b.base.destroy(); } catch (e) { /* ignore */ }
  T.probe = row; T.conditional = row.validJson;
  log(`anyOf schema: ${T.conditional ? 'accepted' : `not usable (${row.error ? `${row.error.name}: ${row.error.message}` : row.parseError})`}; answer ${row.raw}`, T.conditional ? 'ok' : 'bad');
}

async function runRadio(key, mode) {
  const T = R.tests[key] = { mode };
  const P = radioPrompt(mode);
  T.prompt = { system: P.system, schema: P.schema, examples: P.examples, state: STATE, kinds: P.kinds, missingDesc: P.kinds.filter(k => !DESC[k]) };
  const b = await radioBase(P);
  if (b.error) { T.createError = b.error; log(`radio ${mode}: session failed ${b.error.name}: ${b.error.message}`, 'bad'); RADIO_REQUESTS.forEach(step); return null; }
  const base = b.base;
  T.createMs = b.ms; T.usageSystemAndExamples = await usageOf(base); T.window = ctxWindow(base);
  log(`radio ${mode}: base session ${T.createMs} ms, usage ${T.usageSystemAndExamples} of ${T.window}`);
  T.results = [];
  for (const req of RADIO_REQUESTS) {
    status(`Radio console (${mode}): ${T.results.length + 1}/${RADIO_REQUESTS.length}`);
    const row = await radioAsk(base, P, req);
    row.round1 = ROUND1[req.q];
    T.results.push(row);
    log(`${row.grade.padEnd(7)} ${row.ms} ms ${row.round1 ? `(r1 ${row.round1}) ` : '(new) '}"${req.q}" -> ${row.raw ?? `${row.error ? `${row.error.name}: ${row.error.message}` : row.parseError}`}`, row.grade === 'exact' ? 'ok' : row.grade === 'partial' ? '' : 'bad');
    step(); save();
  }
  const rows = T.results, old = rows.filter(x => x.round1), ms = rows.filter(x => !x.error).map(x => x.ms).sort((a, b) => a - b);
  const r1 = rows.filter(x => x.round1 && x.cat !== 'italian'), en = rows.filter(x => x.cat !== 'italian');
  T.summary = {
    sameRequestsAsRound1: { english: countBy(r1, 'grade'), italian: countBy(rows.filter(x => x.cat === 'italian'), 'grade'), round1: ROUND1_SUMMARY },
    allEnglish: countBy(en, 'grade'), total: rows.length, validJson: rows.filter(x => x.validJson).length,
    vsRound1: { better: old.filter(x => RANK[x.grade] > (RANK[x.round1] ?? -1)).map(x => x.q), worse: old.filter(x => (RANK[x.grade] ?? -1) < (RANK[x.round1] ?? -1)).map(x => x.q) },
    latencyMs: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1], min: ms[0] },
    byCategory: Object.fromEntries([...new Set(rows.map(x => x.cat))].map(c => [c, countBy(rows.filter(x => x.cat === c), 'grade')])),
  };
  log(`radio ${mode} summary: ${JSON.stringify(T.summary)}`, 'ok');
  return { base, P };
}

async function testVariance(ctx) {
  status('Variance');
  const T = R.tests.variance = { mode: ctx && ctx.P.mode, runs: 3, results: [] };
  if (!ctx) { T.skipped = 'no radio session'; VARIANCE.forEach(step); return; }
  for (const q of VARIANCE) {
    const req = RADIO_REQUESTS.find(x => x.q === q), tries = [];
    for (let i = 0; i < 3; i++) { status(`Variance: ${T.results.length + 1}/${VARIANCE.length}, try ${i + 1}`); const r = await radioAsk(ctx.base, ctx.P, req); tries.push({ grade: r.grade, raw: r.raw, ms: r.ms, error: r.error }); }
    const answers = new Set(tries.map(t => t.raw ?? `error ${t.error && t.error.name}`));
    const row = { q, tries, distinctAnswers: answers.size, grades: tries.map(t => t.grade), stable: answers.size === 1 };
    T.results.push(row);
    log(`variance ${row.stable ? 'stable  ' : 'UNSTABLE'} ${row.grades.join(',')} "${q}"${row.stable ? '' : ` -> ${[...answers].join(' | ')}`}`, row.stable ? 'ok' : 'bad');
    step(); save();
  }
  T.summary = { stable: T.results.filter(x => x.stable).length, of: T.results.length };
}

// ---------- test 4: Compose ----------

const TEXTURE_SAMPLES = ['vinyl', 'numbers', 'industrial', 'metal', 'glitch', 'space', 'wind'];
function composePrompt(mode = 'conditional') {
  const { KITS, BASS, ARPS, HOOKS, PADS, GUITAR_PATTERNS, TEX_RHYTHMS, WAVES, MODES, GUITAR_TYPES } = M.music, DEVICES = Object.keys(M.rack.DEVICES);
  const song = clone(M.song); delete song.style; delete song.tags; delete song.created; delete song.appVersion; delete song.look;
  const sections = song.sections.map(s => s.name);
  const P = { bass: Object.keys(BASS), arp: Object.keys(ARPS), hook: Object.keys(HOOKS), pad: Object.keys(PADS), guitar: Object.keys(GUITAR_PATTERNS) };
  const waves = WAVES.map(w => w[0]), synths = waves.slice(0, 5);
  const examples = [
    ['add claps on the off beats in the Chorus', { id: 'claps', name: 'Claps', type: 'drums', settings: { kit: 'RolandTR808', gain: 0.6, room: 0.3 }, patterns: { A: { rows: { cp: '..x...x...x...x.' } } }, clips: [{ section: 'Chorus', pattern: 'A' }] }],
    ['add a slow dark arp through the song', { id: 'arp-dark', name: 'Dark arp', type: 'arp', settings: { wave: 'triangle', gain: 0.3, cutoff: 1200, delay: 0.4 }, rack: [{ device: 'reverb', amount: 0.5, size: 0.7 }], patterns: { A: { preset: 'pedale', speed: '8' } }, clips: [{ section: 'Verse', pattern: 'A' }, { section: 'Chorus', pattern: 'A' }] }],
  ];
  const system = `You edit songs of a music app. A song is JSON: sections (timeline and harmony) and tracks. Answer with ONE new track as JSON matching the schema, nothing else.
Track: { "id" (lowercase, unique), "name", "type", "settings", "rack", "patterns": { "A": {...} }, "clips": [ { "section": "<section name>", "pattern": "A" } ] }. A track plays only inside its clips; one clip per section it plays in.
Pick the type from what is asked: any drum sound (kick, snare, clap, hats, ride) is a drums track; a bass line is bass; a melody is hook; held chords are pad; noise, crackle or ambience is texture.
Types:
- drums: settings kit, gain .9, cutoff (low-pass Hz), drive 0-4, room. Pattern "rows": bd kick, cp clap, sd snare, hh hat, oh open hat, rd ride; each 16 characters per bar, x plays, . rests ("x...x...x...x..." is four on the floor; "....x.......x..." is beats 2 and 4).
- bass: wave, gain .8, cutoff 700, move (fisso lento veloce), reso, drive. Pattern: preset, one word from: ${P.bass.join(' ')}.
- arp: wave, gain .4, cutoff 2400, delay .35. Pattern: preset (${P.arp.join(' ')}), speed "16" (fast) or "8" (slow).
- hook (melody): wave, mode (minor phrygian dorian mixolydian), octave "3" to "5", gain .3, cutoff 3000, delay .4. Pattern: preset (${P.hook.join(' ')}).
- pad: wave, gain .28, cutoff 1400, room .85. Pattern: preset (${P.pad.join(' ')}); it plays the section chords.
- guitar: type (clean crunch distorted metal muted), gain .5, cutoff 4200. Pattern: preset (${P.guitar.join(' ')}).
- texture: sample (${TEXTURE_SAMPLES.join(' ')}), gain .4, grit .7, room .6. Pattern: rhythm (bar euclid eighth sixteenth).
A preset is ONE word from its list. Common settings: gain 0-1 (keep new tracks modest), cutoff Hz (lower is darker), drive 0-4, room and delay 0-1. Synth waves: ${synths.join(' ')}; also General MIDI sounds like gm_tubular_bells, gm_celesta, gm_vibraphone, gm_marimba, gm_choir_aahs, gm_pad_warm.
Rack (effects after the instrument): device ${DEVICES.join(', ')}; values amount (0-1, distort 0-8), size, time (bar fraction), feedback, cutoff, reso, rate, depth, bits.
Sections of this song: ${sections.join(', ')}.
Examples:
${examples.map(([q, t]) => `Request: ${q}\n${JSON.stringify(t)}`).join('\n')}
The song now:
${JSON.stringify(song)}`;
  const str = n => ({ type: 'string', maxLength: n }), num = { type: 'number' }, E = l => ({ enum: l });
  const rack = { type: 'array', maxItems: 3, items: { type: 'object', required: ['device'], additionalProperties: false, properties: {
    device: E(DEVICES), amount: num, size: num, time: num, feedback: num, cutoff: num, reso: num, rate: num, depth: num, bits: num } } };
  const clips = { type: 'array', minItems: 1, maxItems: sections.length, items: { type: 'object', required: ['section', 'pattern'], additionalProperties: false, properties: { section: E(sections), pattern: E(['A']) } } };
  const obj = (props, req = []) => ({ type: 'object', additionalProperties: false, required: req, properties: props });
  const common = { gain: num, cutoff: num, drive: num, room: num, delay: num };
  const TYPES = {
    drums: { settings: { kit: E(KITS), grit: num, ...common }, pattern: obj({ rows: obj(Object.fromEntries(['bd', 'cp', 'sd', 'hh', 'oh', 'rd'].map(k => [k, str(16)]))) }, ['rows']) },
    bass: { settings: { wave: E(waves), move: E(['fisso', 'lento', 'veloce']), reso: num, ...common }, pattern: obj({ preset: E(P.bass) }, ['preset']) },
    arp: { settings: { wave: E(waves), move: E(['fisso', 'lento', 'veloce']), reso: num, ...common }, pattern: obj({ preset: E(P.arp), speed: E(['16', '8']) }, ['preset']) },
    hook: { settings: { wave: E(waves), mode: E(MODES.map(m => m[0]).slice(0, 4)), octave: E(['3', '4', '5']), ...common }, pattern: obj({ preset: E(P.hook) }, ['preset']) },
    pad: { settings: { wave: E(waves), move: E(['fisso', 'lento', 'veloce']), ...common }, pattern: obj({ preset: E(P.pad) }, ['preset']) },
    guitar: { settings: { type: E(Object.keys(GUITAR_TYPES)), ...common }, pattern: obj({ preset: E(P.guitar) }, ['preset']) },
    texture: { settings: { sample: E(TEXTURE_SAMPLES), grit: num, ...common }, pattern: obj({ rhythm: E(Object.keys(TEX_RHYTHMS)) }, ['rhythm']) },
  };
  const branch = (type, t) => obj({ id: str(24), name: str(40), type: E([type]), settings: obj(t.settings), rack, patterns: obj({ A: t.pattern }, ['A']), clips }, ['id', 'type', 'patterns', 'clips']);
  let schema;
  if (mode === 'conditional') schema = { anyOf: Object.entries(TYPES).map(([k, t]) => branch(k, t)) };
  else { // flat fallback: one object, the preset an enum of every list
    const allSettings = Object.assign({}, ...Object.values(TYPES).map(t => t.settings));
    schema = obj({ id: str(24), name: str(40), type: E(Object.keys(TYPES)), settings: obj(allSettings), rack, clips,
      patterns: obj({ A: obj({ preset: E([...new Set(Object.values(P).flat())]), speed: E(['16', '8']), rhythm: E(Object.keys(TEX_RHYTHMS)), rows: TYPES.drums.pattern.properties.rows }) }, ['A']) }, ['id', 'type', 'patterns', 'clips']);
  }
  return { mode, system, schema, song };
}
const rowsOf = t => (t.patterns && t.patterns.A && t.patterns.A.rows) || {};
const has = (s, re) => re.test(s || '');
const COMPOSE_REQUESTS = [
  { q: 'add a low slow dark kick with distorted rumble in the decay', type: 'drums', expect: t => ({ kick: has(rowsOf(t).bd, /x/), dark: (t.settings && t.settings.cutoff) < 4000 || (t.rack || []).some(d => d.device === 'lpf'), distorted: (t.rack || []).some(d => ['distort', 'shape', 'crush'].includes(d.device)) || (t.settings && t.settings.drive > 0) }) },
  { q: 'add a soft pad on the chords', type: 'pad', expect: t => ({ soft: !t.settings || t.settings.gain === undefined || t.settings.gain <= 0.35 }) },
  { q: 'add a fast acid arp in the Chorus only', type: 'arp', expect: t => ({ chorusOnly: (t.clips || []).length > 0 && t.clips.every(c => c.section === 'Chorus'), acid: t.patterns && t.patterns.A && t.patterns.A.preset === 'acid', fast: !t.patterns || !t.patterns.A || t.patterns.A.speed !== '8' }) },
  { q: 'add a dark melody that enters in the Chorus', type: 'hook', expect: t => ({ chorus: (t.clips || []).some(c => c.section === 'Chorus') }) },
  { q: 'add an open hi-hat track with a lot of reverb', type: 'drums', expect: t => ({ oh: has(rowsOf(t).oh, /x/), reverb: (t.settings && t.settings.room >= 0.5) || (t.rack || []).some(d => d.device === 'reverb') }) },
  { q: 'add vinyl crackle through the whole song', type: 'texture', expect: t => ({ vinyl: t.settings && t.settings.sample === 'vinyl', whole: (t.clips || []).length >= 2 }) },
  // round 2
  { q: 'add a four on the floor 909 kick', type: 'drums', expect: t => ({ fourOnFloor: /^x...x...x...x...$/.test(rowsOf(t).bd || ''), kit909: t.settings && t.settings.kit === 'RolandTR909' }) },
  { q: 'add a rolling sub bass in the Chorus', type: 'bass', expect: t => ({ preset: ['rolling', 'sub'].includes(t.patterns && t.patterns.A && t.patterns.A.preset), chorus: (t.clips || []).some(c => c.section === 'Chorus') }) },
  { q: 'add a sparse bell melody', type: 'hook', expect: t => ({ bell: /bell|celesta|vibraphone|marimba|sine|triangle/.test((t.settings && t.settings.wave) || '') }) },
  { q: 'add a pad that only plays in the Verse', type: 'pad', expect: t => ({ verseOnly: (t.clips || []).length > 0 && t.clips.every(c => c.section === 'Verse') }) },
  { q: 'add claps on 2 and 4', type: 'drums', expect: t => ({ claps24: /^....x.......x...$/.test(rowsOf(t).cp || ''), onlyClaps: Object.keys(rowsOf(t)).every(k => k === 'cp' || !/x/.test(rowsOf(t)[k])) }) },
  { q: 'add a noisy texture with lots of reverb', type: 'texture', expect: t => ({ reverb: (t.settings && t.settings.room >= 0.5) || (t.rack || []).some(d => d.device === 'reverb') }) },
];

async function testCompose() {
  status('Compose');
  const T = R.tests.compose = {};
  let P = composePrompt('conditional');
  T.prompt = { system: P.system, schema: P.schema };
  const c = await timed(() => create({ initialPrompts: [{ role: 'system', content: P.system }] }, 'compose'));
  if (!c.ok) { T.createError = c.error; log(`compose session failed: ${c.error.name}: ${c.error.message}`, 'bad'); COMPOSE_REQUESTS.forEach(step); return; }
  const base = c.value.s;
  T.createMs = c.value.ms; T.usageSystem = await usageOf(base); T.window = ctxWindow(base);
  log(`compose: system ${T.usageSystem} tokens of ${T.window}`);
  save();
  T.results = [];
  for (const req of COMPOSE_REQUESTS) {
    status(`Compose: ${T.results.length + 1}/${COMPOSE_REQUESTS.length}`);
    const cl = await timed(() => base.clone());
    const sess = cl.ok ? cl.value : base;
    let r = await ask(sess, `Request: ${req.q}`, { responseConstraint: P.schema }, 60000);
    // the anyOf schema refused: fall back to the flat one for the rest of the run
    if (!r.ok && P.mode === 'conditional' && ['NotSupportedError', 'TypeError', 'SyntaxError'].includes(r.error.name)) {
      T.conditionalError = r.error; P = composePrompt('flat'); T.fallback = 'flat'; log(`compose anyOf refused (${r.error.name}: ${r.error.message}); flat schema from now on`, 'bad');
      r = await ask(sess, `Request: ${req.q}`, { responseConstraint: P.schema }, 60000);
    }
    const row = { q: req.q, expectedType: req.type, schema: P.mode, ms: r.ms, raw: r.ok ? r.value : undefined, error: r.error };
    if (r.ok) {
      try {
        const track = JSON.parse(r.value); row.track = track; row.typeOk = track.type === req.type;
        const song = clone(P.song); song.tracks = song.tracks.filter(t => t.id !== track.id).concat(track);
        try { M.format.normalizeSong(song); row.normalizes = true; } catch (e) { row.normalizes = false; row.normalizeError = String(e); }
        const v = M.validate.validateSong(song); row.errors = v.errors; row.warnings = v.warnings; row.valid = v.errors.length === 0;
        row.idClash = M.song.tracks.some(t => t.id === track.id);
        row.checks = req.expect(track);
      } catch (e) { row.parseError = String(e); row.valid = false; }
    }
    T.results.push(row);
    log(`compose ${r.ok ? `${row.valid ? 'valid' : 'INVALID'} type ${row.typeOk ? 'ok' : `WRONG (${row.track && row.track.type})`}` : 'error'} ${r.ms} ms "${req.q}" ${row.checks ? JSON.stringify(row.checks) : ''} ${row.errors && row.errors.length ? JSON.stringify(row.errors.slice(0, 3)) : ''} ${r.ok ? '' : `${r.error.name}: ${r.error.message}`}`, row.valid && row.typeOk ? 'ok' : 'bad');
    if (cl.ok) try { sess.destroy(); } catch (e) { /* ignore */ }
    step(); save();
  }
  try { base.destroy(); } catch (e) { /* ignore */ }
  const rows = T.results, ms = rows.map(x => x.ms).sort((a, b) => a - b);
  T.summary = { valid: rows.filter(x => x.valid).length, typeOk: rows.filter(x => x.typeOk).length, validAndTypeOk: rows.filter(x => x.valid && x.typeOk).length, of: rows.length,
    allChecks: rows.filter(x => x.checks && Object.values(x.checks).every(Boolean)).length, latencyMs: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1] }, round1: { valid: 2, of: 6 } };
  log(`compose summary: ${JSON.stringify(T.summary)}`, 'ok');
}

// ---------- test 5: image input ----------

async function testImage() {
  status('Image input');
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
  status('Session reuse');
  const T = R.tests.reuse = {};
  const P = radioPrompt('flat');
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
  const t = now(); const f = await create({ initialPrompts: P.initialPrompts }, 'cold'); const fr = await ask(f.s, q(2), opts);
  T.coldCreatePlusPrompt = { createMs: f.ms, promptMs: fr.ms, totalMs: Math.round(now() - t) };
  try { f.s.destroy(); c.s.destroy(); } catch (e) { /* ignore */ }
  log(`reuse: ${JSON.stringify(T)}`);
}

// ---------- rounds 3 and 4: the app's registry, prompt, schema and guards ----------

// round 2 on the owner's Chrome (notes/nano-probe-results-v2-2026-11-21T10-39-42.json), anyOf schema, the grades of the
// requests that were not exact
const ROUND2_NOT_EXACT = { 'the pad should play in thirds': 'partial', 'make it darker and calmer': 'partial', 'simplify it and stay on this part a bit longer': 'partial', 'change the tempo to 140 bpm': 'wrong', 'replace the bass with the acid line pattern': 'partial', 'più energia e togli un basso': 'partial', 'add neon hook': 'wrong', 'add my saved pattern Sunset Lead': 'wrong', 'make it warmer and softer': 'wrong' };
const ROUND2_SUMMARY = { english: { exact: 30, partial: 4, wrong: 4 }, latencyMs: { median: 2254 } };
const V3_CTX = () => ({ tracks: TRACKS.map(([id, instrument]) => ({ id, name: id, instrument, type: instrument })), patterns: PATTERNS.map((name, i) => ({ id: `p${i}`, name, type: 'bass' })), lockedParts: [], lockedTracks: [], voiceHelper: true, why: () => null });
const V3_STATE = () => ({ style: 'berlin-techno', energy: '3 of 5', part: 'build', tracks: TRACKS.map(([id, instrument]) => ({ id, instrument })), patterns: PATTERNS, lockedParts: [], disabled: [] });
// the commands the app would apply, in the probe's expected form (a pattern by its matched name)
const applied = r => r.items.filter(it => it.cmd && !it.error && !it.why).map(it => ({ kind: it.kind, ...it.args, ...(it.kind === 'pattern' ? { name: it.cmd.item.name } : {}) }));

// v3 on the owner's Chrome (notes/nano-probe-results-v3-2026-11-23T23-44-19.json), the grades that were not exact
const V3_NOT_EXACT = { 'more energy': 'wrong', 'make it darker and calmer': 'partial', 'it feels too busy': 'wrong', 'simplify it and stay on this part a bit longer': 'partial', 'replace the bass with the acid line pattern': 'partial', 'add a spoken line: welcome to the night shift': 'wrong', 'play Glass Arp': 'partial', 'add neon hook': 'wrong', 'make it more intense': 'wrong', 'give it some air': 'partial', 'it is getting boring': 'wrong', 'make it warmer and softer': 'wrong' };
const V3_SUMMARY = { english: { exact: 26, partial: 5, wrong: 7 }, latencyMs: { median: 2462 } };

// what the app does with a request after every guard: applied (at once), proposal (shown first), rejected (nothing
// valid to apply), cannot (a note, nothing applies)
function appOutcome(pre, review, read) {
  if (pre.cannot || read.cannot) return 'cannot';
  if (pre.vague || (review && review.check)) return 'proposal';
  return read.items.some(it => it.cmd && !it.error && !it.why) ? 'applied' : 'rejected';
}

async function runRadioV3() {
  const T = R.tests.radioV4 = { mode: 'registry+checks' };
  const G = M.generate, Reg = M.registry, ctx = V3_CTX(), state = V3_STATE();
  const initial = G.initialPrompts(), schema = G.answerSchema(ctx);
  T.prompt = { initial, schema, state, registryVersion: Reg.REGISTRY_VERSION, sizeTokens: G.promptSize(state) };
  const cr = await timed(() => create({ initialPrompts: initial }, 'radio-v4'));
  if (!cr.ok) { T.createError = cr.error; log(`radio v4: session failed ${cr.error.name}: ${cr.error.message}`, 'bad'); RADIO_REQUESTS.forEach(step); return; }
  const base = cr.value.s;
  T.createMs = cr.value.ms; T.usageSystemAndExamples = await usageOf(base); T.window = ctxWindow(base);
  log(`radio v4: base session ${T.createMs} ms, usage ${T.usageSystemAndExamples} of ${T.window}, prompt ${T.prompt.sizeTokens} tokens`);
  T.results = [];
  for (const req of RADIO_REQUESTS) {
    status(`Radio console (v4): ${T.results.length + 1}/${RADIO_REQUESTS.length}`);
    const pre = Reg.precheck(req.q, ctx);
    let row;
    if (pre.cannot) row = { q: req.q, cat: req.cat, expected: req.exp, guard: 'cannot', note: pre.cannot, ms: 0, validJson: true, applied: [], app: 'cannot', ...score({ commands: [] }, req.exp) };
    else if (pre.say) {
      const json = Reg.directAnswer(req.q), read = Reg.readAnswer(json, ctx), app = applied(read);
      const rejected = read.items.filter(it => it.error).map(it => `${it.kind}: ${it.error} ${JSON.stringify(it.vars || {})}`);
      row = { q: req.q, cat: req.cat, expected: req.exp, guard: 'say', json, ms: 0, validJson: true, note: '', rejected, applied: app, app: appOutcome(pre, null, read), ...score({ commands: app }, req.exp) };
    } else {
      const cl = await timed(() => base.clone());
      const sess = cl.ok ? cl.value : (await create({ initialPrompts: initial }, 'radio')).s;
      const r = await ask(sess, G.requestText(state, req.q), { responseConstraint: schema }, RADIO_MS);
      let json = null, parseError = null;
      if (r.ok) { try { json = JSON.parse(r.value); } catch (e) { parseError = String(e); } }
      const review = json ? Reg.reviewAnswer(req.q, json, ctx) : null;
      const raw = json ? Reg.readAnswer(json, ctx) : { invalid: true, items: [] };
      const read = review ? Reg.readAnswer(review.json, ctx) : { invalid: true, items: [] };
      const app = read.invalid ? null : applied(read);
      const rejected = read.invalid ? [] : read.items.filter(it => it.error).map(it => `${it.kind}: ${it.error} ${JSON.stringify(it.vars || {})}`);
      const modelGrade = raw.invalid ? 'invalid' : score({ commands: applied(raw) }, req.exp).grade;
      row = { q: req.q, cat: req.cat, expected: req.exp, raw: r.ok ? r.value : undefined, json, parseError, error: r.error, ms: r.ms, validJson: !!json, note: read.note, cannot: !!read.cannot, check: review && review.check, fixed: review ? review.fixed : [], rejected, applied: app, modelGrade, app: read.invalid ? 'rejected' : appOutcome(pre, review, read), ...(app ? score({ commands: app }, req.exp) : { grade: 'invalid' }) };
      try { sess.destroy(); } catch (e) { /* ignore */ }
    }
    row.vague = !!pre.vague; row.v3 = V3_NOT_EXACT[req.q] || 'exact';
    T.results.push(row);
    const extra = [row.fixed && row.fixed.length ? `fixed: ${row.fixed.map(f => `${f.from} -> ${f.to}${f.unknown ? ' (not saved)' : ''}`).join('; ')}` : '', row.check ? `check: ${row.check}` : '', row.rejected && row.rejected.length ? `rejected: ${row.rejected.join('; ')}` : ''].filter(Boolean).join('  ');
    log(`${row.grade.padEnd(7)} ${row.app.padEnd(8)} ${row.ms} ms ${row.vague ? '[vague] ' : ''}${row.guard === 'cannot' ? '[cannot before the model] ' : row.guard === 'say' ? '[spoken line without the model] ' : ''}"${req.q}" -> ${row.raw ?? (row.json ? JSON.stringify(row.json) : row.note ?? '')}${extra ? `  ${extra}` : ''}`, row.grade === 'exact' ? 'ok' : row.grade === 'partial' ? '' : 'bad');
    step(); save();
  }
  try { base.destroy(); } catch (e) { /* ignore */ }
  const rows = T.results, en = rows.filter(x => x.cat !== 'italian'), ms = rows.filter(x => !x.error && x.ms).map(x => x.ms).sort((a, b) => a - b);
  T.summary = {
    allEnglish: countBy(en, 'grade'), italian: countBy(rows.filter(x => x.cat === 'italian'), 'grade'), total: rows.length, v3: V3_SUMMARY,
    modelAlone: countBy(en.filter(x => x.modelGrade), 'modelGrade'),
    app: countBy(rows, 'app'),
    appByRequest: Object.fromEntries(rows.map(x => [x.q, `${x.app} (${x.grade})`])),
    vsV3: { better: rows.filter(x => V3_NOT_EXACT[x.q] && x.grade === 'exact').map(x => x.q), worse: rows.filter(x => !V3_NOT_EXACT[x.q] && x.cat !== 'italian' && x.grade !== 'exact').map(x => x.q) },
    wrongButNotApplied: rows.filter(x => x.grade !== 'exact' && x.app !== 'applied').map(x => `${x.q}: ${x.app}`),
    wrongAndApplied: rows.filter(x => x.grade !== 'exact' && x.app === 'applied').map(x => x.q),
    cannotBeforeModel: rows.filter(x => x.guard === 'cannot').map(x => x.q), spokenWithoutModel: rows.filter(x => x.guard === 'say').map(x => x.q),
    flaggedVague: rows.filter(x => x.vague).map(x => x.q), checked: rows.filter(x => x.check).map(x => `${x.q}: ${x.check}`), fixedPatterns: rows.filter(x => (x.fixed || []).length).map(x => x.q),
    rejectedPatterns: rows.filter(x => (x.rejected || []).some(y => /pattern/.test(y))).map(x => x.q),
    latencyMs: { median: ms[Math.floor(ms.length / 2)], max: ms[ms.length - 1], min: ms[0] },
    byCategory: Object.fromEntries([...new Set(rows.map(x => x.cat))].map(c => [c, countBy(rows.filter(x => x.cat === c), 'grade')])),
  };
  log(`radio v4 summary: ${JSON.stringify(T.summary)}`, 'ok');
}

// ---------- run ----------

// round 2 by default: environment, schema check, radio (anyOf if accepted, then flat with enums for comparison), variance,
// compose. ?all adds round 1's context, image and reuse tests (already measured: window 9216, image ok, clone ~0 ms).
const ALL = new URLSearchParams(location.search).has('all');
async function runAll() {
  if (!ROUND2) return runV3();
  $('#run').disabled = true; $('#log').textContent = ''; stepsDone = 0;
  stepsTotal = 2 + 2 * RADIO_REQUESTS.length + VARIANCE.length + COMPOSE_REQUESTS.length + (ALL ? 3 : 0);
  await loading;
  log(`run ${runId} (probe v${R.probeVersion}) on ${location.origin}`);
  const guard = async (name, fn) => {
    const t = now();
    try { return await fn(); } catch (e) { R.tests[name] = { ...(R.tests[name] || {}), crashed: errInfo(e) }; log(`${name} crashed: ${e && e.name}: ${e && e.message}`, 'bad'); return undefined; }
    finally { (R.tests[name] = R.tests[name] || {}).totalMs = Math.round(now() - t); await save(); }
  };
  const go = await guard('environment', testEnvironment); step();
  if (go !== false && M) {
    if (ALL) { await guard('context', testContext); step(); }
    await guard('schemaSupport', testSchemaSupport); step();
    const conditional = R.tests.schemaSupport && R.tests.schemaSupport.conditional;
    const main = await guard('radio', () => runRadio('radio', conditional ? 'conditional' : 'flat'));
    let other = null;
    if (conditional) other = await guard('radioFlat', () => runRadio('radioFlat', 'flat'));
    else { R.tests.radioFlat = { skipped: 'the main run already used the flat schema' }; RADIO_REQUESTS.forEach(step); }
    await guard('variance', () => testVariance(main || other));
    for (const ctx of [main, other]) try { ctx && ctx.base.destroy(); } catch (e) { /* ignore */ }
    await guard('compose', testCompose);
    if (ALL) { await guard('image', testImage); step(); await guard('reuse', testReuse); step(); }
  } else if (!M) log('app modules missing: nothing more to test', 'bad');
  R.finished = new Date().toISOString();
  await save();
  $('#bar > div').style.width = '100%';
  status(R.savedTo ? `Done. Results saved to ${R.savedTo}` : 'Done, but the results could not be saved (see the log).');
  log(R.savedTo ? `saved to ${R.savedTo}` : 'not saved', R.savedTo ? 'ok' : 'bad');
  $('#run').disabled = false;
}

// round 4: environment, then the radio set with the app's registry, guards and checks (about 5 minutes)
async function runV3() {
  $('#run').disabled = true; $('#log').textContent = ''; stepsDone = 0;
  stepsTotal = 1 + RADIO_REQUESTS.length;
  await loading;
  log(`run ${runId} (probe v${R.probeVersion}, the app's registry, guards and checks after the model) on ${location.origin}`);
  const guard = async (name, fn) => { const t = now(); try { return await fn(); } catch (e) { R.tests[name] = { ...(R.tests[name] || {}), crashed: errInfo(e) }; log(`${name} crashed: ${e && e.name}: ${e && e.message}`, 'bad'); return undefined; } finally { (R.tests[name] = R.tests[name] || {}).totalMs = Math.round(now() - t); await save(); } };
  const go = await guard('environment', testEnvironment); step();
  if (go !== false && M) await guard('radioV4', runRadioV3);
  else if (!M) log('app modules missing: nothing more to test', 'bad');
  R.finished = new Date().toISOString();
  await save();
  $('#bar > div').style.width = '100%';
  status(R.savedTo ? `Done. Results saved to ${R.savedTo}` : 'Done, but the results could not be saved (see the log).');
  log(R.savedTo ? `saved to ${R.savedTo}` : 'not saved', R.savedTo ? 'ok' : 'bad');
  $('#run').disabled = false;
}

$('#run').addEventListener('click', runAll);
