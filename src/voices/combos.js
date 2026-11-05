// Allowed speaker and voice style pairs (voice-style-combos, #82): src/voices/combos.json lists, per language and per
// speaker ("default" is the default voice of the language: Samantha in English, Alice in Italian), the voice styles an
// automatic draw may use. A character of VOICE_CHARACTERS is allowed when the style of the same name is. No entry (for a
// speaker, a language or the whole file) allows every style; "clear" is always allowed. Manual choices are never
// restricted: the pickers only mark a pair that is not listed. Pure: the app and the Node checks read the same file.
import COMBOS from './combos.json' with { type: 'json' };
import { VOICE_STYLE_IDS, VOICE_CHARACTERS } from '../song/format.js';
import { SPEAKERS, speaks, speakerId } from '../song/build.js';

export const COMBOS_FORMAT = 1;
// the languages with speakers (the app languages): a draw is bound by every one of them (D2)
export const COMBO_LANGS = ['en', 'it'];
export const COMBOS_FILE = COMBOS;

let table = COMBOS;
// the table the draws read; a check swaps in a narrowed one and puts the old one back (returns the old one)
export function setCombos(next) {
  const old = table;
  table = next && typeof next === 'object' ? next : COMBOS;
  return old;
}
export const combos = () => table;

const withClear = list => VOICE_STYLE_IDS.filter(id => id === 'clear' || list.includes(id));
// the styles allowed for the voice heard for `speaker` in `lang`: the speaker when it speaks the language, else the
// default voice of the language; always with "clear", in the order of VOICE_STYLE_IDS
export function allowedStyles(speaker, lang, t = table) {
  const s = speakerId(speaker), key = s && speaks(lang, s) ? s : 'default';
  const list = t && t[lang] && t[lang][key];
  return Array.isArray(list) ? withClear(list) : VOICE_STYLE_IDS.slice();
}
// the styles an automatic draw may give `speaker`: allowed in every language where the song can be heard (a speaker
// that does not speak Italian is heard as Alice there, so it is also bound by it.default)
export function allowedForDraw(speaker, t = table) {
  const lists = COMBO_LANGS.map(l => allowedStyles(speaker, l, t));
  return VOICE_STYLE_IDS.filter(id => lists.every(x => x.includes(id)));
}
// the characters of VOICE_CHARACTERS a draw may give `speaker` (those whose style is allowed), in their order
export const allowedCharacters = (speaker, t = table) => { const ok = allowedForDraw(speaker, t); return Object.keys(VOICE_CHARACTERS).filter(c => ok.includes(c)); };
export const isAllowed = (speaker, style, lang, t = table) => allowedStyles(speaker, lang, t).includes(style);

// errors and warnings of a combos file (check:voice-combos, D7): { errors: [...], warnings: [...] }
export function combosErrors(json) {
  const errors = [], warnings = [];
  if (!json || typeof json !== 'object' || Array.isArray(json)) return { errors: ['the file is not a JSON object'], warnings };
  if (json.format !== COMBOS_FORMAT) errors.push(`format: ${JSON.stringify(json.format)}, expected ${COMBOS_FORMAT}`);
  for (const [lang, speakers] of Object.entries(json)) {
    if (lang === 'format') continue;
    if (!COMBO_LANGS.includes(lang)) { errors.push(`${lang}: unknown language (one of ${COMBO_LANGS.join(', ')})`); continue; }
    if (!speakers || typeof speakers !== 'object' || Array.isArray(speakers)) { errors.push(`${lang}: an object of speaker ids`); continue; }
    for (const [sp, list] of Object.entries(speakers)) {
      const at = `${lang}.${sp}`;
      if (sp !== 'default') {
        if (!SPEAKERS.includes(sp)) { errors.push(`${at}: unknown speaker "${sp}" (default or one of ${SPEAKERS.join(', ')})`); continue; }
        if (!speaks(lang, sp)) { errors.push(`${at}: ${sp} does not speak "${lang}" (it plays as the default voice there: use ${lang}.default)`); continue; }
      }
      if (!Array.isArray(list)) { errors.push(`${at}: a list of style ids`); continue; }
      const seen = new Set();
      for (const id of list) {
        if (!VOICE_STYLE_IDS.includes(id)) errors.push(`${at}: unknown style ${JSON.stringify(id)} (one of ${VOICE_STYLE_IDS.join(', ')})`);
        else if (seen.has(id)) errors.push(`${at}: duplicate style "${id}"`);
        seen.add(id);
      }
      if (!list.length) warnings.push(`${at}: empty list (only "clear" will be drawn)`);
      else if (list.every(id => id === 'clear')) warnings.push(`${at}: only "clear" (no character will be drawn)`);
    }
  }
  return { errors, warnings };
}
