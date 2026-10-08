// Artist files in artists/ (one JSON per artist), for the command line tools.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ARTISTS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'artists');
export const artistFiles = (dir = ARTISTS_DIR) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => path.join(dir, f)) : []);
export const loadArtists = (dir = ARTISTS_DIR) => artistFiles(dir).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
// an artist by id (artists/) or by file path
export function findArtist(ref) {
  if (fs.existsSync(ref) && ref.endsWith('.json')) return JSON.parse(fs.readFileSync(ref, 'utf8'));
  return loadArtists().find(a => a.id === ref) || null;
}
