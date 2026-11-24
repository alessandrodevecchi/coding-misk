// The command registry of the Radio console (ai-assistant D0): every console command is in the registry or left out with
// a reason; every entry has a kind of COMMANDS, a button label, a description, an argument schema with typed
// properties, words, map and apply; the prompt, the answer schema, the tool definitions and the MCP tools build; and
// docs/AGENT-API.md is the same as `npm run agent-api` writes. No browser.
//   npm run check:agent-api
import fs from 'node:fs';
import { registryProblems, ENTRIES } from '../src/ai/commands.js';
import { agentApiDoc, answerSchema, systemPrompt, initialPrompts, toolDefinitions, mcpTools } from '../src/ai/generate.js';

const problems = registryProblems();
try {
  const schema = answerSchema({ tracks: [{ id: 'bass', instrument: 'bass' }] });
  if (schema.required[0] !== 'note') problems.push('the answer schema does not ask for note first');
  const kinds = schema.properties.commands.items.anyOf.flatMap(b => b.properties.kind.enum);
  for (const e of ENTRIES) if (!kinds.includes(e.kind)) problems.push(`the answer schema has no branch for "${e.kind}"`);
  if (!systemPrompt().length || initialPrompts().length < 3) problems.push('the system prompt or the initial prompts are empty');
  const tools = toolDefinitions(), mcp = mcpTools();
  if (tools.length !== ENTRIES.length || mcp.length !== ENTRIES.length) problems.push('tools and entries differ in number');
  for (const t of tools) if (!/^[a-zA-Z0-9_-]{1,64}$/.test(t.name)) problems.push(`tool name "${t.name}" is not a valid tool name`);
} catch (e) { problems.push(`the generators failed: ${e.message}`); }

const file = new URL('../docs/AGENT-API.md', import.meta.url);
const want = agentApiDoc(), have = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
if (have === null) problems.push('docs/AGENT-API.md is missing (npm run agent-api)');
else if (have !== want) problems.push('docs/AGENT-API.md is stale (npm run agent-api)');

for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    agent api: ${ENTRIES.length} commands in the registry, schema, prompt, ${ENTRIES.length} tools, docs/AGENT-API.md current`);
process.exit(problems.length ? 1 : 0);
