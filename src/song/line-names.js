// Line names (line-names, #82): the label at the start of a pattern line, `$:` (Strudel's anonymous pattern) or the
// instrument's name (`kick:`, `bass2:`). Both play the same events: Strudel turns a label into `.p(name)`, and only
// three things about a name change what plays (Strudel 1.2.6, src/repl.mjs of @strudel/core):
// - a name that starts or ends with `_` is muted (`_kick:`, as `_$:`);
// - a name longer than one character that starts with a capital S is played alone (`Skick:`, as `S$:`), so a name
//   written as `Snare:` would silence every other line: the names here are lower case;
// - two lines with the same name keep only the last one (`$:` lines are numbered by Strudel, names are not), so the
//   names of a code are made unique in order: `kick`, `kick2`, `kick3`.
// A name is a JavaScript label: letters and digits, starting with a letter, never a reserved word.
// The code is written with `$:` everywhere; nameLines() is the last step before it is shown and evaluated, and every
// reader of the code (mute, solo, the typing, the widgets, the video) reads both forms through LINE and the helpers.
// Pure text in, text out.
import { hashString } from '../endless/random.js';

// the setting (a code option, stored with the song's configuration): Random per song, always `$:`, always the names
export const LINE_NAME_MODES = ['random', 'dollar', 'names'];
// a pattern line: optional indent, `_` (muted) or `S` (alone), then `$` or a lower-case name, then `:` and a space
export const LINE = /^\s*[_S]?(?:\$|[a-z][a-z0-9]*):(?=\s|$)/;
// a muted pattern line, and the label with the spaces after it
export const MUTED_LINE = /^\s*_(?:\$|[a-z][a-z0-9]*):(?=\s|$)/;
export const LABEL_SPACE = /^\s*[_S]?(?:\$|[a-z][a-z0-9]*):\s*/;
const LABEL = /^(\s*)([_S]?)(\$|[a-z][a-z0-9]*):(?=\s|$)/;
const LABEL_ALL = /^(\s*)([_S]?)(\$|[a-z][a-z0-9]*):(?=\s|$)/gm;
export const isLine = l => LINE.test(l);
export const isMuted = l => { const m = LABEL.exec(l); return !!m && m[2] === '_'; };
export const isAlone = l => { const m = LABEL.exec(l); return !!m && m[2] === 'S'; };
// whether a code has a pattern line that plays alone
export const hasAlone = code => /^\s*S(?:\$|[a-z][a-z0-9]*):(?=\s|$)/m.test(code);
// the label of a line: { indent, mark ('', '_' or 'S'), name ('$' or the name), length (of the label with its colon) }
export function labelOf(l) {
  const m = LABEL.exec(l);
  return m ? { indent: m[1], mark: m[2], name: m[3], length: m[0].length } : null;
}
// a line with another mark ('' plays, '_' muted, 'S' alone), its name kept
export const withMark = (l, mark) => l.replace(LABEL, (_, sp, __, name) => `${sp}${mark}${name}:`);
export const muteLine = l => withMark(l, '_');
export const unmuteLine = l => (isMuted(l) ? withMark(l, '') : l);
// the line without its label and the spaces after it
export const stripLabel = l => l.replace(LABEL, '').replace(/^\s+/, '');
// every label of a code back to `$:`, marks kept (keys that must not depend on the names)
export const toDollar = code => String(code).replace(LABEL_ALL, (_, sp, mark) => `${sp}${mark}$:`);

const RESERVED = new Set(['await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package', 'private', 'protected', 'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield', 'arguments', 'eval', 'undefined']);
// a word made a safe name: lower case letters and digits, starting with a letter, not a reserved word, at most 12
// characters; '' when nothing is left
export function safeName(word) {
  const w = String(word || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').replace(/^[0-9]+/, '').slice(0, 12);
  return !w || RESERVED.has(w) ? '' : w;
}
// the instrument of a pattern line (its whole chain): the visual it lights (`.analyze("kick")`, `.chan("kick")`), the
// voice for spoken samples, else the track of its header, else `line`
const CRASH = /\bs\(\s*["']cr["']/;
export function baseName(chain, header = '') {
  if (/\bsay_/.test(chain)) return 'voice';
  const m = chain.match(/\.(?:analyze|chan)\(\s*["']([\w-]+)["']\s*\)/);
  // (`fx` lights a crash, a texture or a riser alike: the crash is named by its sample, the others by their track's
  // type, the last part of the header)
  const type = safeName(header.split(' · ').pop());
  if (m) { const v = safeName(m[1]); if (v === 'fx' && CRASH.test(chain)) return 'crash'; if (v === 'fx' && type && type !== 'drums') return type; if (v) return v; }
  return safeName(header.split(' · ')[0]) || 'line';
}
// the code with its pattern lines named: `$:` → `kick:`, `_$:` → `_kick:`, `S$:` → `Skick:`; a name already written
// stays (and counts for the next ones). Names are unique in the order of the lines.
export function nameLines(code) {
  const lines = String(code).split('\n'), used = new Map(), taken = new Set();
  for (const l of lines) { const lb = labelOf(l); if (lb && lb.name !== '$') taken.add(lb.name); }
  let header = '';
  const unique = base => {
    let k = used.get(base) || 0, name;
    do { k++; name = k === 1 ? base : `${base}${k}`; } while (taken.has(name));
    used.set(base, k); taken.add(name);
    return name;
  };
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^\/\/ =+ (.+?) =+$/);
    if (h) { header = h[1]; continue; }
    const lb = labelOf(lines[i]);
    if (!lb || lb.name !== '$') continue;
    // the chain: the line and its continuation lines (indented, not a label, not a comment)
    let chain = lines[i];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]) && !LINE.test(lines[j]) && !/^\s*\/\//.test(lines[j]); j++) chain += `\n${lines[j]}`;
    // (`$: silence`, the placeholder of an empty code, stays as it is)
    if (/^\s*\$:\s*silence\s*$/.test(lines[i])) continue;
    const name = unique(baseName(chain, header));
    lines[i] = `${lb.indent}${lb.mark}${name}:${lines[i].slice(lb.length)}`;
  }
  return lines.join('\n');
}
// the form of a song's lines from the setting: 'dollar' or 'names'. Random is drawn from the song's id (or title), so
// the same song always looks the same; a song can carry its own choice (`lineNames`).
export function lineNamesOf(setting, song = {}) {
  if (song && (song.lineNames === 'dollar' || song.lineNames === 'names')) return song.lineNames;
  if (setting === 'dollar' || setting === 'names') return setting;
  if (setting !== 'random') return 'dollar';
  return hashString(`line-names\u0000${(song && (song.id || song.title)) || ''}`) % 2 ? 'names' : 'dollar';
}
// the code in the form of the setting
export const writeLineNames = (code, form) => (form === 'names' ? nameLines(code) : code);
