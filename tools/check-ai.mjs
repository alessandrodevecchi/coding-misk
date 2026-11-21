// The Radio console assistant without a browser (ai-assistant D3, D4, D12): the prompt's size and content for a song
// with eight playing tracks, the answer schema (note first and required, one branch per entry, no list of pattern
// names), the three guards (pattern names exact, near, unknown and ambiguous; the "cannot" list; vague and precise
// requests) and the validator on fixture answers with a fake console (good, partly wrong, unknown kinds, bad tracks,
// values out of range, invalid JSON, a disabled command, apply through the buttons' paths in order).
//   npm run check:ai
import { ENTRIES, matchPattern, precheck, readAnswer, applyItems } from '../src/ai/commands.js';
import { answerSchema, systemPrompt, initialPrompts, requestText, promptSize, fitPrompt } from '../src/ai/generate.js';

const problems = [];
const expect = (ok, msg) => { if (!ok) problems.push(msg); };

// a song with eight playing tracks and ten saved patterns (the probe's names)
const TRACKS = [['kick', 'kick'], ['hats', 'beat'], ['bass', 'bass'], ['arp', 'arp'], ['lead', 'hook'], ['pad', 'pad'], ['guitar', 'guitar'], ['noise', 'texture']].map(([id, instrument]) => ({ id, name: id, instrument, type: instrument }));
const NAMES = ['Midnight Groove', 'Acid Line 303', 'Rolling Sub', 'Glass Arp', 'Broken Hats', 'Warehouse Kick', 'Dark Choir Pad', 'Neon Hook', 'Tape Chords', 'Dusty Breaks'];
const PATTERNS = NAMES.map((name, i) => ({ id: `p${i}`, name, type: 'bass' }));
const disabledNow = new Set(['drop']);
const ctx = { tracks: TRACKS, patterns: PATTERNS, lockedParts: ['kick'], lockedTracks: ['bass'], voiceHelper: true, why: c => (disabledNow.has(c.kind) ? 'no-drop' : c.kind === 'less' && c.part === 'guitar' ? 'not-playing' : null) };
const state = { style: 'Berlin techno', part: 'Build', tracks: TRACKS.map(x => ({ id: x.id, instrument: x.instrument })), patterns: NAMES, lockedParts: ['kick'], disabled: ['drop (no-drop)'] };

// ---------- prompt ----------
const size = promptSize(state);
expect(size < 2000, `the prompt takes ${size} tokens (characters / 4), more than 2000`);
const sys = systemPrompt();
for (const e of ENTRIES) expect(sys.includes(`${e.kind}: `), `the system prompt has no line for "${e.kind}"`);
expect(/commands": \[\]/.test(sys) && /note/.test(sys), 'the system prompt does not explain the "cannot" answer');
const ip = initialPrompts();
expect(ip.some(x => x.role === 'assistant' && /"commands":\[\]/.test(x.content) && /cannot/.test(x.content)), 'no example answers "cannot"');
const req = requestText(state, 'more energy');
for (const n of NAMES) expect(req.includes(n), `the request text does not list the saved pattern "${n}"`);
expect(req.includes('lead: hook'), 'the request text does not list the playing tracks with their instruments');
expect(fitPrompt(9216, state, 'x').examples === undefined, 'the prompt is shortened in a window of 9216 tokens');
expect(fitPrompt(1500, state, 'x').examples === 2, 'the prompt is not shortened in a small window');

// ---------- schema ----------
const schema = answerSchema(ctx);
expect(schema.required.join() === 'note,commands' && Object.keys(schema.properties)[0] === 'note', 'the schema does not ask for note first');
const branches = schema.properties.commands.items.anyOf;
const pat = branches.find(b => b.properties.kind.enum.includes('pattern'));
expect(pat && pat.properties.name.type === 'string' && !pat.properties.name.enum, 'the pattern name is not free text (D4 guard 1)');
expect(pat && pat.properties.track.enum.join() === TRACKS.map(x => x.id).join(), 'track ids are not the playing ids');
expect(!answerSchema({ tracks: [] }).properties.commands.items.anyOf.some(b => b.properties.kind.enum.includes('mute')), 'mute is offered with no track playing');
expect(branches.every(b => b.additionalProperties === false), 'a branch takes arguments of other kinds');

// ---------- guard 1: pattern names ----------
const name = (q, want) => { const m = matchPattern(q, PATTERNS); const got = m.item ? m.item.name : m.error === 'which-pattern' ? `which:${m.vars.a}|${m.vars.b}` : null; expect(got === want, `pattern "${q}": ${got} instead of ${want}`); };
name('Midnight Groove', 'Midnight Groove');
name('midnight groove', 'Midnight Groove');
name('my saved pattern Glass Arp', 'Glass Arp');
name('neon hook', 'Neon Hook');
name('acid line', 'Acid Line 303');
name('Dusty Break', 'Dusty Breaks');
name('tape chord', 'Tape Chords');
name('Sunset Lead', null);
name('', null);
name('Tape', 'Tape Chords');
{
  const two = [...PATTERNS, { id: 'px', name: 'Tape Stabs', type: 'pad' }];
  const m = matchPattern('tape', two);
  expect(m.error === 'which-pattern', `"tape" between Tape Chords and Tape Stabs is not ambiguous (${m.item && m.item.name})`);
  const e = matchPattern('Tape Chords', two);
  expect(e.item && e.item.name === 'Tape Chords', 'an exact name loses to a near one');
}

// ---------- guard 2: cannot ----------
for (const q of ['change the tempo to 140 bpm', 'make it faster', 'play it in 7/8', 'play the whole song backwards']) expect(precheck(q, ctx).cannot, `"${q}" is not answered "cannot" before the engine`);
for (const q of ['more energy', 'make it darker', 'add my saved pattern Midnight Groove']) expect(!precheck(q, ctx).cannot, `"${q}" is answered "cannot"`);
{
  const r = readAnswer({ note: 'The console cannot change the tempo.', commands: [] }, ctx);
  expect(r.cannot && r.note && !r.items.length, 'an empty answer with a note is not the "cannot" answer');
}

// ---------- guard 3: vague ----------
for (const q of ['it is getting boring', 'give it some air', 'make it warmer and softer', 'make it more intense', 'it feels too busy']) expect(precheck(q, ctx).vague === true, `"${q}" is not flagged vague`);
for (const q of ['more energy', 'make it darker and calmer', 'mute the hats', 'add another bass', 'put Glass Arp in', 'set the pad volume to 30 percent', 'go to the drop', 'add a spoken line: welcome to the night shift']) expect(precheck(q, ctx).vague === false, `"${q}" is flagged vague`);

// ---------- validator and apply ----------
const calls = [];
const api = {
  command: c => { calls.push(['command', c.kind]); return true; }, pend: (k, p) => { calls.push(['pend', k, p]); return true; },
  pendLock: (key, kind) => { calls.push(['pendLock', key, kind]); return true; }, pattern: c => { calls.push(['pattern', c.mode, c.item.name, c.target || '']); return true; }, say: t => { calls.push(['say', t]); return true; },
};
const run = (json) => { calls.length = 0; const r = readAnswer(json, ctx); if (!r.invalid) applyItems(r.items, api); return r; };
{
  const r = run({ note: '', commands: [{ kind: 'darker' }, { kind: 'energy-down' }, { kind: 'more', part: 'arp' }] });
  expect(JSON.stringify(calls) === JSON.stringify([['command', 'darker'], ['command', 'energy-down'], ['pend', 'more', 'arp']]), `three commands applied as ${JSON.stringify(calls)}`);
  expect(r.items.every(x => x.applied), 'a valid command is not marked applied');
}
{
  const r = run({ note: '', commands: [{ kind: 'mute', track: 'nope' }, { kind: 'mute', track: 'hats' }, { kind: 'teleport' }, { kind: 'volume', track: 'pad', value: 3 }] });
  expect(r.items[0].error === 'no-track' && r.items[2].error === 'unknown-kind' && r.items[3].error === 'bad-arg', `bad answers: ${r.items.map(x => x.error || 'ok')}`);
  expect(JSON.stringify(calls) === JSON.stringify([['command', 'mute']]), `only the good command applies: ${JSON.stringify(calls)}`);
}
{
  const r = run({ note: '', commands: [{ kind: 'drop' }, { kind: 'less', part: 'guitar' }, { kind: 'stay' }] });
  expect(r.items[0].why === 'no-drop' && r.items[1].why === 'not-playing' && !calls.some(c => c[1] === 'drop'), 'a disabled command is applied or has no reason');
  expect(calls.length === 1 && calls[0][1] === 'stay', 'the other commands of an answer with a disabled one do not apply');
}
{
  run({ note: '', commands: [{ kind: 'pattern', name: 'acid line', track: 'bass' }, { kind: 'pattern', name: 'Sunset Lead' }, { kind: 'pattern', name: 'Glass Arp' }] });
  expect(JSON.stringify(calls) === JSON.stringify([['pattern', 'replace', 'Acid Line 303', 'bass'], ['pattern', 'new', 'Glass Arp', '']]), `patterns applied as ${JSON.stringify(calls)}`);
}
{
  const r = run({ note: '', commands: [{ kind: 'lock-part', part: 'kick' }, { kind: 'lock-part', part: 'bass' }, { kind: 'unlock', track: 'bass' }, { kind: 'lock', track: 'bass' }] });
  expect(r.items[0].error === 'already-locked' && r.items[3].error === 'already-locked', 'a lock of what is locked is not refused');
  expect(JSON.stringify(calls) === JSON.stringify([['pendLock', 'p.bass', 'lock-part'], ['pendLock', 't.bass', 'unlock']]), `locks applied as ${JSON.stringify(calls)}`);
}
{
  run({ note: '', commands: [{ kind: 'say-live', text: 'welcome to the night shift' }, { kind: 'say-live', text: 'one two three four five six seven eight nine ten eleven twelve thirteen' }] });
  expect(JSON.stringify(calls) === JSON.stringify([['say', 'welcome to the night shift']]), `spoken lines applied as ${JSON.stringify(calls)}`);
}
{
  run({ note: '', commands: [{ kind: 'riser', bars: '4', dir: 'down' }, { kind: 'key', to: 'up' }, { kind: 'voicing', type: 'pad', treatment: 'thirds' }, { kind: 'vary', type: 'bass' }, { kind: 'swap', type: 'lead' }] });
  expect(calls.length === 4, `riser, key, voicing, vary (four of five, at most 4 commands): ${JSON.stringify(calls)}`);
}
for (const bad of [null, 'text', {}, { commands: 'x' }]) expect(readAnswer(bad, ctx).invalid, `an invalid answer (${JSON.stringify(bad)}) is not refused`);

for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    ai: prompt ${size} tokens with 8 tracks, schema, pattern names, cannot, vague, validator and apply`);
process.exit(problems.length ? 1 : 0);
