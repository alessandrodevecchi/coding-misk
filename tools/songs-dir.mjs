// JSON song files under a directory (recursive), without songs/index.json (the library order).
import fs from 'node:fs';
import path from 'node:path';

export function songFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...songFiles(p));
    else if (e.name.endsWith('.json') && e.name !== 'index.json') out.push(p);
  }
  return out;
}
