// Style recipe files in styles/ (one JSON per recipe), for the command line tools.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STYLES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'styles');
export const styleFiles = (dir = STYLES_DIR) => fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => path.join(dir, f));
// every recipe in the folder, parsed (not validated)
export const loadStyles = (dir = STYLES_DIR) => styleFiles(dir).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
