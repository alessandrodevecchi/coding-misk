// The Radio console assistant without a browser (ai-assistant D3, D4, D12): the prompt's size and content for a song
// with eight playing tracks, the answer schema (note first and required, one branch per entry, no list of pattern
// names), the three guards (pattern names exact, near, unknown and ambiguous; the "cannot" list; vague and precise
// requests) and the validator on fixture answers with a fake console (good, partly wrong, unknown kinds, bad tracks,
// values out of range, invalid JSON, a disabled command, apply through the buttons' paths in order), and the checks after
// the engine (D4 checks 4 to 6) on the three probe v3 failures with the model's answers from its log, plus the v3 answers
// that were right (none may turn into a proposal); check 7 on the v4 "cannot" answer to "go to the drop" (now asked as "go to the drop part"),
// with the "cannot" answers that stay and the v4 answers that were right; check 8: requests for the drop answered Drop
// without the engine (#25), struck with no drop left, and the requests that still reach the engine.
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
  if (pre.say || pre.direct) { const r = readAnswer(directAnswer(q), c); applyItems(r.items, api); return { mode: 'direct', calls: [...calls], items: r.items }; }
  if (json === 'no-engine') throw new Error(`flow: "${q}" asked the engine`);
  const rv = reviewAnswer(q, json, c), r = readAnswer(rv.json, c);
  if (r.cannot) return { mode: 'model-cannot', note: r.note, calls: [], items: [] };
  if (pre.vague || rv.check) return { mode: 'ask', check: rv.check, note: r.note, calls: [], items: r.items };
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
]) {
  const f = flow(q, json);
  expect(f.mode === 'now' && same(f.calls, want), `"${q}": ${f.mode}${f.check ? ` (${f.check})` : ''} ${JSON.stringify(f.calls)} instead of applied ${JSON.stringify(want)}`);
}
for (const [q, json] of [['più energia e togli un basso', { note: '', commands: [{ kind: 'energy-up' }, { kind: 'less', part: 'bass' }] }], ['rendilo più scuro', { note: '', commands: [{ kind: 'darker' }] }]]) {
  const f = flow(q, json);
  expect(f.mode === 'ask' && !f.check && f.items.every(x => x.cmd), `Italian "${q}": ${f.mode} ${f.check || ''}`);
}

// ---------- check 7: a "cannot" answer to a request that names one command (probe v4) ----------
{ // v4 00:47:37 "go to the drop" -> {"note":"The console cannot change the tempo.","commands":[]}
  const v4 = { note: 'The console cannot change the tempo.', commands: [] };
  // (since check 8 "go to the drop" itself never reaches the engine: a request with one word more does)
  const f = flow('go to the drop part', v4, { ...ctx, why: () => null });
  expect(f.mode === 'ask' && f.check === 'cannot' && !f.note && f.items.length === 1 && f.items[0].kind === 'drop' && f.items[0].cmd && !f.items[0].why, `"go to the drop part" answered "cannot": ${f.mode} ${f.check || ''} ${JSON.stringify(f.items.map(x => x.kind))} note "${f.note || ''}"`);
  // the console's own reason still strikes the proposed chip (drop disabled in this fake console)
  const g = flow('go to the drop part', v4);
  expect(g.mode === 'ask' && g.items[0].why === 'no-drop', `"go to the drop part" proposed while the drop is disabled: ${g.mode} ${g.items[0] && g.items[0].why}`);
  expect(reviewAnswer('go to the drop', v4, ctx).json !== v4 && v4.commands.length === 0, 'the model answer is changed in place');
  for (const [q, c] of [['jump to the drop section now', 'drop'], ['end the song', 'end'], ['change the chords', 'progression'], ['make it darker', 'darker'], ['talk less please', 'talk-less']]) {
    const h = flow(q, { note: 'The console cannot do that.', commands: [] }, { ...ctx, why: () => null });
    expect(h.mode === 'ask' && h.check === 'cannot' && h.items.length === 1 && h.items[0].kind === c, `"${q}" answered "cannot": ${h.mode} ${JSON.stringify(h.items.map(x => x.kind))} instead of a proposal of ${c}`);
  }
}
// the "cannot" stays: vague requests (v4 log), two commands named, a command that needs an argument, the list before the
// engine, Italian (no English command words), a request that names no command
for (const [q, json, want] of [
  ['it feels too busy', { note: 'The console cannot directly influence the overall perceived volume or energy of the song.', commands: [] }, 'model-cannot'],
  ['give it some air', { note: 'Adding air to the existing sound is not possible.', commands: [] }, 'model-cannot'],
  ['make it darker and go to the drop', { note: 'no', commands: [] }, 'model-cannot'],
  ['drop one bass', { note: 'no', commands: [] }, 'model-cannot'],
  ['mute the hats', { note: 'no', commands: [] }, 'model-cannot'],
  ['add another bass', { note: 'no', commands: [] }, 'model-cannot'],
  ['new notes for the bass', { note: 'no', commands: [] }, 'model-cannot'],
  ['play Glass Arp', { note: 'no', commands: [] }, 'model-cannot'],
  ['rendilo più scuro', { note: 'no', commands: [] }, 'model-cannot'],
  ['change the tempo to 140 bpm', { note: 'x', commands: [{ kind: 'drop' }] }, 'cannot'],
  ['play the whole song backwards', { note: 'x', commands: [{ kind: 'drop' }] }, 'cannot'],
  ['go faster to the drop', { note: 'x', commands: [{ kind: 'drop' }] }, 'cannot'],
]) {
  const f = flow(q, json);
  expect(f.mode === want, `"${q}" answered "cannot": ${f.mode}${f.check ? ` (${f.check})` : ''} instead of ${want}`);
}
// no regression: the v4 answers that were right stay applied at once, with no proposal
for (const [q, json, want] of [
  ['more energy', { note: '', commands: [{ kind: 'energy-up' }] }, [['command', 'energy-up']]],
  ['add another bass', { note: '', commands: [{ kind: 'more', part: 'bass' }] }, [['pend', 'more', 'bass']]],
  ['make it darker', { note: '', commands: [{ kind: 'darker' }] }, [['command', 'darker']]],
  ['more reverb and delay please', { note: '', commands: [{ kind: 'more-space' }] }, [['command', 'more-space']]],
  ['I want a dirtier sound', { note: '', commands: [{ kind: 'dirtier' }] }, [['command', 'dirtier']]],
  ['end the song', { note: 'End of the song.', commands: [{ kind: 'end' }] }, [['command', 'end']]],
  ['change the chords', { note: '', commands: [{ kind: 'progression' }] }, [['command', 'progression']]],
  ['move the key up a fifth', { note: '', commands: [{ kind: 'key', to: 'up' }] }, [['command', 'key']]],
  ['new notes for the bass', { note: 'Adding new notes for the bass', commands: [{ kind: 'vary', type: 'bass' }] }, [['command', 'vary']]],
  ['mute the hats', { note: '', commands: [{ kind: 'mute', track: 'hats' }] }, [['command', 'mute']]],
  ['lock the kick so the director leaves it alone', { note: '', commands: [{ kind: 'lock-part', part: 'kick' }] }, []], // kick already locked in this fake console: struck, not a proposal
  ['talk less please', { note: '', commands: [{ kind: 'talk-less' }] }, [['command', 'talk-less']]],
  ['more energy and add a second arp', { note: '', commands: [{ kind: 'energy-up' }, { kind: 'more', part: 'arp' }] }, [['command', 'energy-up'], ['pend', 'more', 'arp']]],
  ['play Glass Arp', { note: '', commands: [{ kind: 'pattern', name: 'Glass Arp' }] }, [['pattern', 'new', 'Glass Arp', '']]],
  ['add my saved pattern Midnight Groove', { note: '', commands: [{ kind: 'pattern', name: 'Midnight Groove', track: 'bass' }] }, [['pattern', 'replace', 'Midnight Groove', 'bass']]],
]) {
  const f = flow(q, json, { ...ctx, why: c => (c.kind === 'less' && c.part === 'guitar' ? 'not-playing' : null) });
  expect(f.mode === 'now' && same(f.calls, want), `v4 "${q}": ${f.mode}${f.check ? ` (${f.check})` : ''} ${JSON.stringify(f.calls)} instead of applied ${JSON.stringify(want)}`);
}

// ---------- check 8: a request for the drop is Drop without the engine (#25) ----------
// in one test "go to the drop" came back as "+ Pad, Brighter": the drop phrases never reach the engine
for (const q of ['go to the drop', 'Go to the drop!', 'GO TO THE DROP', 'drop', 'the drop', 'Drop!', 'skip to the drop', 'jump to the drop', 'jump straight to the drop please', 'take me to the drop', "let's go to the drop", 'go to the drop now', 'go to the dorp', 'go to the drip', 'vai al drop', 'Vai al drop!', 'salta al drop', 'al drop', 'vai subito al drop', 'dai, salta al drop', 'portaci al drop per favore']) {
  const pre = precheck(q, ctx);
  expect(pre.direct === 'drop' && pre.vague === false && !pre.cannot, `"${q}" is not a direct drop request (${JSON.stringify(pre)})`);
  const d = directAnswer(q);
  expect(d && same(d.commands, [{ kind: 'drop' }]), `"${q}": the direct answer is ${JSON.stringify(d)}`);
  // the same command the model's right answer gives: applied through the button's path when a drop is ahead
  const f = flow(q, 'no-engine', { ...ctx, why: () => null });
  expect(f.mode === 'direct' && same(f.calls, [['command', 'drop']]) && f.items[0].cmd && f.items[0].cmd.kind === 'drop', `"${q}" with a drop ahead: ${f.mode} ${JSON.stringify(f.calls)}`);
  // no drop in the rest of the song: the console's own reason (steerWhy:no-drop), nothing applied
  const g = flow(q, 'no-engine');
  expect(g.mode === 'direct' && !g.calls.length && g.items[0].why === 'no-drop', `"${q}" with no drop ahead: ${g.mode} ${JSON.stringify(g.calls)} ${g.items[0] && g.items[0].why}`);
}
{ // the old "+ Pad, Brighter" answer to "go to the drop" is never read: the engine is not asked
  const f = flow('go to the drop', { note: '', commands: [{ kind: 'more', part: 'pad' }, { kind: 'brighter' }] }, { ...ctx, why: () => null });
  expect(f.mode === 'direct' && same(f.calls, [['command', 'drop']]), `"go to the drop" answered "+ Pad, Brighter": ${f.mode} ${JSON.stringify(f.calls)}`);
}
// not a request for the drop alone: the engine (or the other guards) decide
for (const q of ['drop the bass', 'drop one bass', 'drop it', 'make it darker and go to the drop', 'go to the drop part', 'go faster to the drop', 'drip', 'dorp', 'stop', 'say: go to the drop', 'what is a drop', 'no drop please']) {
  expect(!precheck(q, ctx).direct && !(directAnswer(q) && directAnswer(q).commands[0].kind === 'drop'), `"${q}" is taken as a direct drop request`);
}
expect(precheck('go faster to the drop', ctx).cannot, '"go faster to the drop" is no longer answered "cannot" before the engine');
expect(same(directAnswer('say: go to the drop').commands, [{ kind: 'say-live', text: 'go to the drop' }]), 'a spoken line about the drop is not a spoken line');

for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    ai: prompt ${size} tokens with 8 tracks, schema, pattern names, cannot, vague, validator and apply, checks after the engine, the cannot guard, the direct drop`);
process.exit(problems.length ? 1 : 0);
