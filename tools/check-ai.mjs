// The Radio console assistant without a browser (ai-assistant D3, D4, D12): the prompt's size and content for a song
// with eight playing tracks, the answer schema (note first and required, one branch per entry, no list of pattern
// names), the three guards (pattern names exact, near, unknown and ambiguous; the "cannot" list; vague and precise
// requests) and the validator on fixture answers with a fake console (good, partly wrong, unknown kinds, bad tracks,
// values out of range, invalid JSON, a disabled command, apply through the buttons' paths in order), and the checks after
// the engine (D4 checks 4 to 6) on the three probe v3 failures with the model's answers from its log, plus the v3 answers
// that were right (none may turn into a proposal).
//   npm run check:ai
import { ENTRIES, matchPattern, precheck, readAnswer, applyItems, reviewAnswer, directAnswer } from '../src/ai/commands.js';
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

// ---------- checks after the engine (D4 checks 4 to 6, probe v3) ----------
expect(ip.some(x => x.role === 'user' && x.content === 'Request: more energy') && ip.some(x => x.role === 'assistant' && /"kind":"say-live"/.test(x.content)), 'the examples have no "more energy" or no spoken line');
// what the app does with a request and the model's answer: { mode: 'now' | 'ask', calls, items }
const flow = (q, json, c = ctx) => {
  calls.length = 0;
  const pre = precheck(q, c);
  if (pre.cannot) return { mode: 'cannot', calls: [], items: [] };
  if (pre.say) { const r = readAnswer(directAnswer(q), c); applyItems(r.items, api); return { mode: 'direct', calls: [...calls], items: r.items }; }
  const rv = reviewAnswer(q, json, c), r = readAnswer(rv.json, c);
  if (pre.vague || rv.check) return { mode: 'ask', check: rv.check, calls: [], items: r.items };
  applyItems(r.items, api);
  return { mode: 'now', calls: [...calls], items: r.items };
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
{ // v3 23:58:21 "more energy" -> more pad, brighter
  const f = flow('more energy', { note: '', commands: [{ kind: 'more', part: 'pad' }, { kind: 'brighter' }] });
  expect(f.mode === 'ask' && f.check === 'words' && !f.calls.length, `"more energy" answered "+ Pad, Brighter" is applied (${f.mode})`);
}
{ // v3 23:59:31 "play Glass Arp" -> Rolling Sub on the bass
  const f = flow('play Glass Arp', { note: '', commands: [{ kind: 'pattern', name: 'Rolling Sub', track: 'bass' }] });
  expect(f.mode === 'now' && same(f.calls, [['pattern', 'new', 'Glass Arp', '']]), `"play Glass Arp" answered "Rolling Sub": ${f.mode} ${JSON.stringify(f.calls)}`);
}
{ // v3 23:59:18 "replace the bass with the acid line pattern" -> Rolling Sub on the bass
  const f = flow('replace the bass with the acid line pattern', { note: '', commands: [{ kind: 'pattern', name: 'Rolling Sub', track: 'bass' }] });
  expect(f.mode === 'now' && same(f.calls, [['pattern', 'replace', 'Acid Line 303', 'bass']]), `"replace the bass with the acid line pattern" answered "Rolling Sub": ${f.mode} ${JSON.stringify(f.calls)}`);
}
{ // v3 23:59:21 "add a spoken line: welcome to the night shift" -> refused by the model
  const f = flow('add a spoken line: welcome to the night shift', { note: 'Adding a spoken line is not possible.', commands: [] });
  expect(f.mode === 'direct' && same(f.calls, [['say', 'welcome to the night shift']]), `the spoken line: ${f.mode} ${JSON.stringify(f.calls)}`);
  for (const [q, text] of [['say "we go faster now"', 'we go faster now'], ['announce: next up, the night shift', 'next up, the night shift'], ['speak this line “good night”', 'good night']]) {
    const g = flow(q, null);
    expect(g.mode === 'direct' && same(g.calls, [['say', text]]), `"${q}": ${g.mode} ${JSON.stringify(g.calls)}`);
  }
  const long = flow('say: one two three four five six seven eight nine ten eleven twelve thirteen', null);
  expect(long.mode === 'direct' && !long.calls.length && long.items[0].error === 'too-long', 'a spoken line of 13 words is not refused as too long');
  const mute = flow('add a spoken line: hello', null, { ...ctx, voiceHelper: false });
  expect(!mute.calls.length && mute.items[0].error === 'no-voice-helper', 'a spoken line without the voice helper is not refused');
  expect(!precheck('say something nice', ctx).say && !precheck('make the bass line darker', ctx).say, 'a request without a colon or quotes is answered without the engine');
}
{ // a pattern the listener does not have, while the model picks an existing one
  const f = flow('add my saved pattern Sunset Lead', { note: '', commands: [{ kind: 'pattern', name: 'Rolling Sub' }] });
  expect(f.mode === 'now' && !f.calls.length && f.items[0].error === 'no-pattern' && f.items[0].vars.name === 'Sunset Lead', `"Sunset Lead" answered "Rolling Sub": ${JSON.stringify(f.items.map(x => x.error || x.cmd))}`);
}
{ // a pattern the request does not name at all
  const f = flow('add a new groove', { note: '', commands: [{ kind: 'pattern', name: 'Midnight Groove' }] });
  expect(f.mode === 'ask' && f.check === 'pattern', `a pattern the request does not name is applied (${f.mode})`);
}
{ // a saved pattern named in full, answered without a pattern (v3 23:59:36 "add neon hook" -> + Hook)
  const f = flow('add neon hook', { note: '', commands: [{ kind: 'more', part: 'hook' }] });
  expect(f.mode === 'ask' && f.check === 'words', `"add neon hook" answered "+ Hook" is applied (${f.mode})`);
}
// no regression: the v3 answers that were right stay applied at once (near names, two-step, single), Italian stays vague
for (const [q, json, want] of [
  ['add my pattern Dusty Break', { note: '', commands: [{ kind: 'pattern', name: 'Dusty Break', track: 'arp' }] }, [['pattern', 'replace', 'Dusty Breaks', 'arp']]],
  ['use the tape chord pattern instead of the pad', { note: '', commands: [{ kind: 'pattern', name: 'Tape Chord', track: 'pad' }] }, [['pattern', 'replace', 'Tape Chords', 'pad']]],
  ['add my saved pattern Midnight Groove', { note: '', commands: [{ kind: 'pattern', name: 'Midnight Groove', track: 'bass' }] }, [['pattern', 'replace', 'Midnight Groove', 'bass']]],
  ['put the Dark Choir Pad pattern in place of the pad', { note: '', commands: [{ kind: 'pattern', name: 'Dark Choir Pad', track: 'pad' }] }, [['pattern', 'replace', 'Dark Choir Pad', 'pad']]],
  ['more energy and add a second arp', { note: '', commands: [{ kind: 'more', part: 'arp' }, { kind: 'energy-up' }] }, [['pend', 'more', 'arp'], ['command', 'energy-up']]],
  ['simplify it and stay on this part a bit longer', { note: '', commands: [{ kind: 'stay' }] }, [['command', 'stay']]],
  ['make it darker and calmer', { note: '', commands: [{ kind: 'darker' }] }, [['command', 'darker']]],
  ['bring the energy down a bit', { note: '', commands: [{ kind: 'energy-down' }] }, [['command', 'energy-down']]],
  ['take one arp away', { note: '', commands: [{ kind: 'less', part: 'arp' }] }, [['pend', 'less', 'arp']]],
  ['lock the kick so the director leaves it alone', { note: '', commands: [{ kind: 'lock-part', part: 'hook' }] }, [['pendLock', 'p.hook', 'lock-part']]],
  ['put a riser before the next part', { note: 'riser added', commands: [{ kind: 'riser' }] }, [['command', 'riser']]],
  ['the pad should play in thirds', { note: '', commands: [{ kind: 'voicing', type: 'pad', treatment: 'thirds' }] }, [['command', 'voicing']]],
  ['set the pad volume to 30 percent', { note: '', commands: [{ kind: 'volume', track: 'pad', value: 0.3 }] }, [['command', 'volume']]],
  ['swap the lead for something else', { note: '', commands: [{ kind: 'swap', type: 'lead' }] }, [['command', 'swap']]],
  ['remove the hats', { note: '', commands: [{ kind: 'mute', track: 'hats' }] }, [['command', 'mute']]],
  ['change the bass line', { note: '', commands: [{ kind: 'vary', type: 'bass' }] }, [['command', 'vary']]],
  ['vai al drop', { note: '', commands: [{ kind: 'drop' }] }, []], // applied at once, struck by the console's reason (no-drop)
]) {
  const f = flow(q, json);
  expect(f.mode === 'now' && same(f.calls, want), `"${q}": ${f.mode}${f.check ? ` (${f.check})` : ''} ${JSON.stringify(f.calls)} instead of applied ${JSON.stringify(want)}`);
}
for (const [q, json] of [['più energia e togli un basso', { note: '', commands: [{ kind: 'energy-up' }, { kind: 'less', part: 'bass' }] }], ['rendilo più scuro', { note: '', commands: [{ kind: 'darker' }] }]]) {
  const f = flow(q, json);
  expect(f.mode === 'ask' && !f.check && f.items.every(x => x.cmd), `Italian "${q}": ${f.mode} ${f.check || ''}`);
}

for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    ai: prompt ${size} tokens with 8 tracks, schema, pattern names, cannot, vague, validator and apply, checks after the engine`);
process.exit(problems.length ? 1 : 0);
