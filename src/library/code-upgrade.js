// Hand-coded code saved before song-functions (song-functions, D6): the library's versions (codeSongs), the edited
// code (code[id]) and the versions in the trash get the new helper names once (upgradeCode in src/song/writer.js).
// A version carries codeVersion 2 after the update, the library too (for code[id] of the hand-written songs), so code
// written later with Strudel's own .drive() is never rewritten. Pure: checked in Node by tools/check-functions.mjs.
import { upgradeCode, CODE_VERSION } from '../song/writer.js';

const done = x => x && (x.codeVersion || 1) >= CODE_VERSION;
// the library with every old code updated, or the same object when nothing was old
export function upgradeLibrary(lib) {
  if (!lib || typeof lib !== 'object') return lib;
  const versions = Array.isArray(lib.codeSongs) ? lib.codeSongs : [], old = !done(lib);
  const todo = versions.filter(v => v && !done(v)), trash = Array.isArray(lib.trash) ? lib.trash : [];
  const oldTrash = trash.filter(e => e && e.kind === 'version' && e.song && !done(e.song));
  if (!old && !todo.length && !oldTrash.length) return lib;
  const ids = new Set(todo.map(v => v.id)), code = { ...(lib.code || {}) };
  // the edited code: of an old version, or of a hand-written song when the library itself is old
  for (const id of Object.keys(code)) if (ids.has(id) || (old && !versions.some(v => v && v.id === id))) code[id] = upgradeCode(code[id]);
  return {
    ...lib,
    codeVersion: CODE_VERSION,
    code,
    codeSongs: versions.map(v => (v && !done(v) ? { ...v, ...(typeof v.code === 'string' ? { code: upgradeCode(v.code) } : {}), codeVersion: CODE_VERSION } : v)),
    ...(trash.length ? { trash: trash.map(e => (oldTrash.includes(e) ? { ...e, song: { ...e.song, ...(typeof e.song.code === 'string' ? { code: upgradeCode(e.song.code) } : {}), codeVersion: CODE_VERSION } } : e)) } : {}),
  };
}
