// Line names (line-names, #82): the label at the start of a pattern line, `$:` (Strudel's anonymous pattern) or the
// instrument's name (`kick:`, `bass2:`). Both play the same events: Strudel turns a label into `.p(name)`, and only
// three things about a name change what plays (Strudel 1.2.6, src/repl.mjs of @strudel/core):
// - a name that starts or ends with `_` is muted (`_kick:`, as `_$:`);
// - a name longer than one character that starts with a capital S is played alone (`Skick:`, as `S$:`), so a name
//   written as `Snare:` would silence every other line: the names here never start with a capital (owner's rule:
//   lower case, camelCase for several words, `openHat`);
// - two lines with the same name keep only the last one (`$:` lines are numbered by Strudel, names are not), so the
//   names of a code are made unique in order: `kick`, `kick2`, `kick3`.
// A name is a JavaScript label: letters and digits, starting with a letter, never a reserved word.
// The code is written with `$:` everywhere; nameLines() is the last step before it is shown and evaluated, and every
// reader of the code (mute, solo, the typing, the widgets, the video) reads both forms through LINE and the helpers.
// Pure text in, text out.
import { hashString } from '../endless/random.js';

// the setting (a code option, stored with the song's configuration): Random per song, always `$:`, always the names
export const LINE_NAME_MODES = ['random', 'dollar', 'names'];
// the style of the names (owner, 12 November): the instrument a line plays (`kick`, `snare`, `hats`, the default) or
// the track it belongs to (`drums`, `drums2`, `drums3`)
export const LINE_NAME_STYLES = ['instrument', 'track'];
// a pattern line: optional indent, `_` (muted) or `S` (alone), then `$` or a lower-case name, then `:` and a space
export const LINE = /^\s*[_S]?(?:\$|[a-z][A-Za-z0-9]*):(?=\s|$)/;
// a muted pattern line, and the label with the spaces after it
export const MUTED_LINE = /^\s*_(?:\$|[a-z][A-Za-z0-9]*):(?=\s|$)/;
export const LABEL_SPACE = /^\s*[_S]?(?:\$|[a-z][A-Za-z0-9]*):\s*/;
const LABEL = /^(\s*)([_S]?)(\$|[a-z][A-Za-z0-9]*):(?=\s|$)/;
const LABEL_ALL = /^(\s*)([_S]?)(\$|[a-z][A-Za-z0-9]*):(?=\s|$)/gm;
export const isLine = l => LINE.test(l);
// a Path's line (sound-modulation D14): Strudel's constant sound `one` played into a bus, no instrument of its own; the
// code widgets, line names, level and opening readers skip it, and its haps light no instrument
export const PATH_LINE = /\.s\(\s*["']one["']\s*\)\.bus\(\d+\)/;
export const isPathLine = l => PATH_LINE.test(l);
export const isPathHap = v => !!v && v.s === 'one' && v.bus !== undefined;
export const isMuted = l => { const m = LABEL.exec(l); return !!m && m[2] === '_'; };
export const isAlone = l => { const m = LABEL.exec(l); return !!m && m[2] === 'S'; };
// whether a code has a pattern line that plays alone
export const hasAlone = code => /^\s*S(?:\$|[a-z][A-Za-z0-9]*):(?=\s|$)/m.test(code);
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
// a word made a safe name (owner's rule, 12 November): never a capital first letter; one word in lower case, several in
// camelCase (`open hat`, `Open-Hat`, `openHat` → `openHat`; `Synth Bass` → `synthBass`), letters and digits only,
// starting with a letter, not a reserved word, at most 16 characters; '' when nothing is left
export function safeName(word) {
  const plain = String(word || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // the words: runs of letters and digits, split again where a lower-case letter or a digit meets a capital
  const words = plain.split(/[^A-Za-z0-9]+/).flatMap(w => w.split(/(?<=[a-z0-9])(?=[A-Z])/)).filter(Boolean);
  const w = words.map((x, i) => (i ? x[0].toUpperCase() + x.slice(1).toLowerCase() : x.toLowerCase())).join('').replace(/^[0-9]+/, '');
  const name = w ? w[0].toLowerCase() + w.slice(1, 16) : '';
  return !name || RESERVED.has(name) ? '' : name;
}
// the instrument of a pattern line (its whole chain): the visual it lights (`.analyze("kick")`, `.chan("kick")`), the
// voice for spoken samples, else the track of its header, else `line`
const CRASH = /\bs\(\s*["']cr["']/;
export function baseName(chain, header = '', hints = null) {
  if (/\bsay_/.test(chain)) return 'voice';
  const m = chain.match(/\.(?:analyze|chan)\(\s*["']([\w-]+)["']\s*\)/);
  // (a track's own line name, nameHints: the visual it alone lights takes that name, `hook` → `lead`)
  if (m && hints && hints[m[1]]) return hints[m[1]];
  // (`fx` lights a crash, a texture or a riser alike: the crash is named by its sample, the others by their track's
  // type, the last part of the header)
  const type = safeName(header.split(' · ').pop());
  if (m) { const v = safeName(m[1]); if (v === 'fx' && CRASH.test(chain)) return 'crash'; if (v === 'fx' && type && type !== 'drums') return type; if (v) return v; }
  return safeName(header.split(' · ')[0]) || 'line';
}
// the header of each pattern line of a code (`Drums · drums`), '' before any header: the tracks of a code whose
// comments took the headers out are read from the same code before the comments (nameLines' `headers`)
export function headersOf(code) {
  const out = [];
  let header = '';
  for (const l of String(code).split('\n')) {
    const h = l.match(/^\/\/ =+ (.+?) =+$/);
    if (h) header = h[1];
    else if (LINE.test(l)) out.push(header);
  }
  return out;
}
// the track name of a header: its first part (`Drums · drums` → `drums`), '' when none
const trackName = header => safeName(String(header || '').split(' · ')[0]);
// the code with its pattern lines named: `$:` → `kick:`, `_$:` → `_kick:`, `S$:` → `Skick:`; a name already written
// stays (and counts for the next ones). Names are unique in the order of the lines. opts: { hints (nameHints of the
// song), style ('instrument' or 'track'), headers (the header of each pattern line when the code has none, headersOf) }
export function nameLines(code, { hints = null, style = 'instrument', headers = null } = {}) {
  const lines = String(code).split('\n'), used = new Map(), taken = new Set();
  for (const l of lines) { const lb = labelOf(l); if (lb && lb.name !== '$') taken.add(lb.name); }
  let header = '', k = -1;
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
    if (lb) k++;
    if (!lb || lb.name !== '$') continue;
    // the chain: the line and its continuation lines (indented, not a label, not a comment)
    let chain = lines[i];
    for (let j = i + 1; j < lines.length && /^\s+\S/.test(lines[j]) && !LINE.test(lines[j]) && !/^\s*\/\//.test(lines[j]); j++) chain += `\n${lines[j]}`;
    // (`$: silence`, the placeholder of an empty code, stays as it is)
    if (/^\s*\$:\s*silence\s*$/.test(lines[i])) continue;
    const head = header || (headers && headers[k]) || '';
    // (a Path's line: `<track>Path`, so it never takes the name of the line it moves)
    const name = unique(isPathLine(chain) ? `${trackName(head) || 'track'}Path` : (style === 'track' && !/\bsay_/.test(chain) && trackName(head)) || baseName(chain, head, hints));
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
// the names some tracks ask for (`lineName`, a safe name): { visual: name } for each such track that is the only one
// of its song to light its visual (the Decode tab's Lead lights the hook visual and is named `lead`); null when none
export function nameHints(song) {
  const tracks = (song && song.tracks) || [], out = {};
  for (const tr of tracks) {
    const name = safeName(tr.lineName), v = tr.settings && tr.settings.visual;
    if (!name || !v) continue;
    if (tracks.filter(x => x.settings && x.settings.visual === v).length === 1) out[v] = name;
  }
  return Object.keys(out).length ? out : null;
}
// the code in the form of the setting (opts: nameLines' options)
export const writeLineNames = (code, form, opts = {}) => (form === 'names' ? nameLines(code, opts) : code);
