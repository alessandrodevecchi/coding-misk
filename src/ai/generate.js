// Everything an engine or an agent sees of the Radio console, generated from the command registry (ai-assistant D0, D3):
// the built-in model's system prompt, initial prompts and answer schema, the text of one request, the tool definitions
// of the online engines, the MCP tools (#26) and docs/AGENT-API.md. No DOM: Node checks and the probe bench import it.
import { ENTRIES, LEFT_OUT, CANNOT, PATTERN_MATCH, REGISTRY_VERSION, SUPPORT } from './commands.js';

// the arguments of an entry for one request: `fill` arguments get the request's values (track: the playing ids); an
// entry whose filled argument is required and has no value is left out of the schema
function argsFor(e, ctx) {
  const props = {}, req = [...e.args.required];
  for (const [k, s] of Object.entries(e.args.properties)) {
    const { description, ...rest } = s;
    if (e.fill && e.fill[k] === 'tracks' && ctx) {
      const ids = (ctx.tracks || []).map(x => x.id);
      if (!ids.length) { if (req.includes(k)) return null; continue; }
      props[k] = { type: 'string', enum: ids };
    } else props[k] = rest;
  }
  return { props, req };
}

const argText = e => {
  const ks = Object.keys(e.args.properties);
  return ks.length ? ` {${ks.map(k => (e.args.required.includes(k) ? k : `${k}?`)).join(', ')}}` : '';
};

// the answer schema (D3): note first and required, commands with one anyOf branch per entry, kinds without arguments in
// one shared branch; pattern names free text (D4 guard 1)
export function answerSchema(ctx = null) {
  const plain = [], branches = [];
  for (const e of ENTRIES) {
    const a = argsFor(e, ctx);
    if (!a) continue;
    if (!Object.keys(a.props).length) { plain.push(e.kind); continue; }
    branches.push({ type: 'object', required: ['kind', ...a.req], additionalProperties: false, properties: { kind: { enum: [e.kind] }, ...a.props } });
  }
  const shared = { type: 'object', required: ['kind'], additionalProperties: false, properties: { kind: { enum: plain } } };
  return {
    type: 'object', required: ['note', 'commands'], additionalProperties: false,
    properties: {
      note: { type: 'string', maxLength: 120 },
      commands: { type: 'array', maxItems: 4, items: { anyOf: [shared, ...branches] } },
    },
  };
}

const argLists = () => {
  const seen = new Map();
  for (const e of ENTRIES) for (const [k, s] of Object.entries(e.args.properties)) if (s.enum && !seen.has(k)) seen.set(k, `${k} = ${s.enum.join(', ')}`);
  return [...seen.values()];
};

// the seven examples of the system prompt (D3): one of them a request the console cannot do; "more energy" and the
// spoken line from probe v3 (D4 checks 5 and 6)
export const EXAMPLES = [
  ['more energy', { note: '', commands: [{ kind: 'energy-up' }] }],
  ['add a second pad and make it brighter', { note: '', commands: [{ kind: 'more', part: 'pad' }, { kind: 'brighter' }] }],
  ['turn the bass down to half', { note: '', commands: [{ kind: 'volume', track: 'bass', value: 0.5 }] }],
  ['vary the arp', { note: '', commands: [{ kind: 'vary', type: 'arp' }] }],
  ['make it faster', { note: 'The console cannot change the tempo.', commands: [] }],
  ['use my Rolling Sub pattern instead of the bass', { note: '', commands: [{ kind: 'pattern', name: 'Rolling Sub', track: 'bass' }] }],
  ['add a spoken line: stay with us', { note: '', commands: [{ kind: 'say-live', text: 'stay with us' }] }],
];

// the system prompt (D3): role, one line per entry, argument lists, rules
export function systemPrompt({ descriptions = true, kinds = null } = {}) {
  const list = ENTRIES.filter(e => !kinds || kinds.includes(e.kind));
  return [
    "You turn a listener's request into commands for the console of a live music radio. Answer only with JSON that matches the schema.",
    'Never invent a command or a track id. At most 4 commands, in the order asked.',
    'If the console cannot do what is asked, answer "commands": [] and a short "note" that says what cannot be done. Otherwise "note" is "".',
    "If the request names a saved pattern, use kind pattern and copy the name as the listener wrote it, even when it is not in the list.",
    'Commands (kind: what it does {arguments}):',
    ...list.map(e => `${e.kind}${descriptions ? `: ${e.description}` : ''}${argText(e)}`),
    `Arguments: ${argLists().join('. ')}. track = a playing track id. name = a saved pattern name.`,
  ].join('\n');
}

// the initial prompts of the built-in model's base session: the system prompt and the examples as turns
export function initialPrompts(opts = {}) {
  const n = opts.examples ?? EXAMPLES.length;
  const out = [{ role: 'system', content: systemPrompt(opts) }];
  for (const [q, a] of EXAMPLES.slice(0, n)) out.push({ role: 'user', content: `Request: ${q}` }, { role: 'assistant', content: JSON.stringify(a) });
  return out;
}

// the text of one request (D3): the song on air, the playing tracks, the fitting saved patterns, the request
// state: { style, energy, part, tracks: [{ id, instrument }], lockedParts, patterns: [names], disabled: [kind: reason] }
export function requestText(state, request) {
  const lines = [];
  lines.push(`Song on air: style ${state.style || '?'}${state.energy !== undefined ? `, energy ${state.energy}` : ''}${state.part ? `, part: ${state.part}` : ''}.`);
  lines.push(`Playing tracks (id: instrument): ${(state.tracks || []).map(x => `${x.id}: ${x.instrument || x.type}`).join(', ') || 'none'}.`);
  if ((state.lockedParts || []).length) lines.push(`Locked instruments: ${state.lockedParts.join(', ')}.`);
  lines.push(`Saved patterns that fit: ${(state.patterns || []).slice(0, 20).join(', ') || 'none'}.`);
  if ((state.disabled || []).length) lines.push(`Not possible now: ${state.disabled.join(', ')}.`);
  lines.push(`Request: ${request}`);
  return lines.join('\n');
}

// tokens counted as characters / 4 (D3: the check's limit)
export const tokensOf = s => Math.ceil(String(s).length / 4);
export function promptSize(state, request = 'make it darker and add an arp', opts = {}) {
  const ip = initialPrompts(opts);
  return tokensOf(ip.map(x => x.content).join('\n')) + tokensOf(requestText(state, request));
}

// the prompt shortened to fit a window (D3): examples down to 2, then without descriptions
export function fitPrompt(window, state, request) {
  const steps = [{}, { examples: 4 }, { examples: 2 }, { examples: 2, descriptions: false }];
  for (const o of steps) if (promptSize(state, request, o) + tokensOf(JSON.stringify(answerSchema(state))) < window * 0.8) return o;
  return steps[steps.length - 1];
}

// tool definitions for the online engines (stage 2): one tool per entry, its arguments as the input schema
export function toolDefinitions() {
  return ENTRIES.map(e => ({ name: `console_${e.kind.replace(/-/g, '_')}`, description: e.description, input_schema: { type: 'object', properties: e.args.properties, required: e.args.required, additionalProperties: false } }));
}
// the MCP server's tools (#26): the same definitions with MCP's field names
export function mcpTools() {
  return toolDefinitions().map(t => ({ name: t.name, description: t.description, inputSchema: t.input_schema }));
}

// docs/AGENT-API.md, written by npm run agent-api and compared by npm run check:agent-api
export function agentApiDoc() {
  const md = [];
  md.push('# Agent API: the Radio console', '');
  md.push('<!-- Generated by `npm run agent-api` from `src/ai/commands.js`. Do not edit by hand: `npm run check:agent-api` fails when this file is stale. -->', '');
  md.push(`Registry version ${REGISTRY_VERSION}. Every command an AI engine or an agent may give the Radio console, with its arguments. The built-in model's prompt and answer schema, the online engines' tool definitions and the MCP tools are generated from the same registry (OpenSpec change \`ai-assistant\`, D0).`, '');
  md.push('## How a command is applied', '');
  md.push('Each command is validated with the console\'s own rules (the reason a button shows in its tooltip) and applied through the same code path as the console button: it waits for its boundary in the queue and can be cancelled like a press. Nothing bypasses the console.', '');
  md.push('## Answer format', '');
  md.push('An engine answers with one JSON object: `note` (required, first: empty when the console can do the request, else one short sentence of what it cannot do) and `commands` (at most 4, in the order asked). Each command is an object with `kind` and only that kind\'s arguments. `track` is always one of the ids of the playing tracks the request lists.', '');
  md.push('```json', JSON.stringify({ note: '', commands: [{ kind: 'more', part: 'arp' }, { kind: 'darker' }] }), '```', '');
  md.push('## Commands', '');
  md.push('| Kind | Button | What it does | Arguments |', '| --- | --- | --- | --- |');
  const argCell = e => Object.entries(e.args.properties).map(([k, s]) => `\`${k}\`${e.args.required.includes(k) ? '' : ' (optional)'}: ${s.enum ? s.enum.map(v => `\`${v}\``).join(', ') : s.type}${s.description ? `, ${s.description}` : ''}`).join('; ') || 'none';
  for (const e of ENTRIES) md.push(`| \`${e.kind}\` | ${e.button} | ${e.description} | ${argCell(e).replace(/\|/g, '\\|')} |`);
  md.push('');
  md.push('## Left out', '');
  for (const [k, why] of Object.entries(LEFT_OUT)) md.push(`- \`${k}\`: ${why}.`);
  md.push('');
  md.push('## Guards', '');
  md.push(`- **Pattern names.** \`name\` is free text. The app matches it against the saved patterns that fit the song: case, accents, punctuation and filler words ignored, exact first, then a fuzzy score per word with a threshold of ${PATTERN_MATCH.threshold}. No match, or two matches within ${PATTERN_MATCH.tie}, is rejected with a clear message.`);
  md.push(`- **Cannot.** These requests are answered "cannot" before any engine is asked: ${CANNOT.map(c => c.note.replace(/^The console cannot /, '').replace(/\.$/, '')).join('; ')}.`);
  md.push('- **Vague requests.** A request that names no command word, instrument, playing track or saved pattern is shown as a proposal before anything applies.');
  md.push(`- **The pattern the request names.** A \`pattern\` command is kept when at least ${Math.round(SUPPORT * 100)} % of its name's words appear in the request. Otherwise the app uses the saved pattern the request itself names (in quotes, after or before "pattern", or every word of a name), rejects the request's name when no saved pattern matches it, or shows the answer as a proposal.`);
  md.push('- **The command the request names.** When the request uses a word that belongs to exactly one command and the answer has neither that command nor a close one, or the request names a saved pattern in full and the answer has no pattern, the answer is shown as a proposal.');
  md.push('- **Spoken lines.** A request to say, speak or announce a line, with the line after a colon or in quotes, becomes `say-live` with that line without asking an engine.', '');
  md.push('## Tools', '');
  md.push(`Online engines get one tool per command, named \`console_<kind>\` with \`-\` as \`_\` (for example \`console_energy_up\`), whose input schema is the command's arguments. The MCP server's tools have the same names, descriptions and schemas (\`inputSchema\`).`, '');
  return md.join('\n');
}
