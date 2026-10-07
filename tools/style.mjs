// Command line for style recipes (docs/STYLES.md).
//   node tools/style.mjs validate [file.json|dir …]   default styles/; errors and warnings with JSON paths; exit 1 on errors
//   node tools/style.mjs list                         recipes in styles/ (id, names, tempo, parts)
// Run with `node --no-warnings` to hide Node's experimental localStorage warning.
import fs from 'node:fs';
import path from 'node:path';
import { loadStyles, styleFiles, STYLES_DIR } from './styles-dir.mjs';
import { validateRecipe, partsOf } from '../src/endless/recipe.js';

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'validate') {
  const files = (args.length ? args : [STYLES_DIR]).flatMap(a => fs.statSync(a).isDirectory() ? styleFiles(a) : [a]);
  let bad = 0;
  for (const file of files) {
    const f = path.relative(process.cwd(), file);
    let r;
    try { r = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.log(`${f}: error   (file): ${e.message}`); bad++; continue; }
    const { errors, warnings } = validateRecipe(r);
    for (const e of errors) console.log(`${f}: error   ${e.path || '(recipe)'}: ${e.msg}`);
    for (const w of warnings) console.log(`${f}: warning ${w.path || '(recipe)'}: ${w.msg}`);
    if (!errors.length && !warnings.length) console.log(`${f}: ok`);
    if (errors.length) bad++;
  }
  console.log(`${files.length - bad} of ${files.length} recipes valid`);
  process.exit(bad ? 1 : 0);
} else if (cmd === 'list') {
  for (const r of loadStyles()) console.log(`${r.id.padEnd(16)} ${r.name.en} / ${r.name.it} · ${r.tempo.join('-')} BPM · ${partsOf(r).join(' ')}`);
} else {
  console.log('usage: node tools/style.mjs validate [file|dir …] | list');
  process.exit(cmd ? 1 : 0);
}
