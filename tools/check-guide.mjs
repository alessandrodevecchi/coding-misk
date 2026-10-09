// Checks that the Guide (#48, src/guide.js) covers the app: every tab in the page has a card (or an exemption with
// a reason), every console command is named in the Radio card, every guide text has English and Italian, and the
// interface strings have the same keys in both languages. It never runs in the app or the build.
//   npm run check:guide      exit 1 and name what is missing
import fs from 'node:fs';
import { GUIDE, GUIDE_EXEMPT } from '../src/guide.js';
import { COMMANDS } from '../src/endless/steering.js';

const problems = [];
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const tabs = [...new Set([...html.matchAll(/data-tab="([\w-]+)"/g), ...html.matchAll(/<section id="tab-([\w-]+)"/g)].map(m => m[1]))];
for (const tab of tabs) if (!GUIDE.some(c => c.tab === tab) && !GUIDE_EXEMPT[tab]) problems.push(`tab "${tab}" has no guide card (add one to src/guide.js, or an exemption with a reason)`);
for (const [k, why] of Object.entries(GUIDE_EXEMPT)) if (!why) problems.push(`exemption "${k}" has no reason`);

const radio = GUIDE.find(c => c.id === 'radio');
const named = new Set((radio && radio.parts || []).flatMap(p => p.commands || []));
for (const kind of Object.keys(COMMANDS)) if (!named.has(kind)) problems.push(`console command "${kind}" is not in the Radio card (add it to a part's commands and explain it)`);

// every text: { en, it }, both filled
const texts = (o, path) => {
  for (const [k, v] of Object.entries(o)) {
    if (v && typeof v === 'object' && !Array.isArray(v) && ('en' in v || 'it' in v)) { for (const l of ['en', 'it']) if (!v[l] || !String(v[l]).trim()) problems.push(`${path}.${k} has no ${l === 'en' ? 'English' : 'Italian'} text`); }
    else if (Array.isArray(v)) v.forEach((x, i) => x && typeof x === 'object' && texts(x, `${path}.${k}[${i}]`));
  }
};
const ids = new Set();
for (const c of GUIDE) {
  if (ids.has(c.id)) problems.push(`card id "${c.id}" is used twice`);
  ids.add(c.id);
  for (const f of ['title', 'what', 'how']) if (!c[f]) problems.push(`card "${c.id}" has no ${f}`);
  if (!c.show) problems.push(`card "${c.id}" has nothing to show`);
  texts(c, c.id);
}

// interface strings: same keys in Italian and English
const src = fs.readFileSync(new URL('../src/i18n.js', import.meta.url), 'utf8');
const keysOf = part => new Set([...part.matchAll(/(?:^|[\s,{])'?([\w:-]+)'?: (?=['`])/gm)].map(m => m[1]));
const it = keysOf(src.slice(src.indexOf('  it: {'), src.indexOf('  en: {'))), en = keysOf(src.slice(src.indexOf('  en: {'), src.indexOf('\n};')));
for (const k of it) if (!en.has(k)) problems.push(`interface string "${k}" has no English text`);
for (const k of en) if (!it.has(k)) problems.push(`interface string "${k}" has no Italian text`);

for (const p of problems) console.log(`FAIL  ${p}`);
console.log(problems.length ? `${problems.length} problems` : `ok    guide: ${GUIDE.length} cards cover ${tabs.length} tabs and ${Object.keys(COMMANDS).length} console commands; strings match in both languages`);
process.exit(problems.length ? 1 : 0);
