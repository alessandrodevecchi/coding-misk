// docs/AGENT-API.md from the command registry (ai-assistant D0).
//   npm run agent-api          write docs/AGENT-API.md
import fs from 'node:fs';
import { agentApiDoc } from '../src/ai/generate.js';

const file = new URL('../docs/AGENT-API.md', import.meta.url);
fs.writeFileSync(file, agentApiDoc());
console.log('wrote docs/AGENT-API.md');
