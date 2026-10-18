// Style recipe files in styles/ (one JSON per recipe), for the command line tools.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { recipeOrder } from '../src/endless/recipe.js';

export const STYLES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles');
// (in the order the styles had before renames, clear-names, so seeded draws over the list stay the same)
export const styleFiles = (dir = STYLES_DIR) => fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort((a, b) => recipeOrder(a.slice(0, -5)).localeCompare(recipeOrder(b.slice(0, -5)))).map(f => path.join(dir, f));
// every recipe in the folder, parsed (not validated)
export const loadStyles = (dir = STYLES_DIR) => styleFiles(dir).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
