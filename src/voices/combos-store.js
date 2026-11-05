// The user's overrides of the allowed voice styles (voice-combos-ui D1): the Voices tab grid writes them under
// coding-misk-voice-combos (format 1, the shape of combos.json, only the speakers changed), and the module table of
// combos.js becomes the effective one (the file with those entries replaced) at start and on every change. A bad
// stored value never throws: normalizeOverrides keeps what is valid, the rest follows the file.
// store: { get(k, d), set(k, v), remove(k) } (main.js). Fires `combos-changed` on globalThis after a change.
import { COMBOS_KEY, COMBOS_FILE, COMBO_LANGS, normalizeOverrides, effectiveCombos, entryOf, setCombos } from './combos.js';
import { speaks } from '../song/build.js';

// the entries a voice card edits (D2): a speaker its own language(s), the default voice the "default" entry of each
export const entriesOf = speaker => (speaker ? COMBO_LANGS.filter(l => speaks(l, speaker)).map(l => [l, speaker]) : COMBO_LANGS.map(l => [l, 'default']));

export function createCombosStore(store) {
  const read = () => normalizeOverrides(store.get(COMBOS_KEY, null));
  const apply = () => setCombos(effectiveCombos(COMBOS_FILE, read()));
  const write = o => {
    const clean = normalizeOverrides(o);
    if (COMBO_LANGS.some(l => clean[l])) store.set(COMBOS_KEY, clean); else store.remove(COMBOS_KEY);
    apply();
    try { globalThis.dispatchEvent && globalThis.dispatchEvent(new Event('combos-changed')); } catch (e) { /* no events */ }
  };
  apply();
  return {
    overrides: read,
    apply,
    // whether the voice has an override in any of the entries its card edits
    has: speaker => { const o = read(); return entriesOf(speaker).some(([l, k]) => o[l] && o[l][k]); },
    // the voice's list in each entry its card edits, set to `list` (an entry equal to the default is dropped)
    set(speaker, list) {
      const o = read();
      for (const [l, k] of entriesOf(speaker)) (o[l] = o[l] || {})[k] = list.slice();
      write(o);
    },
    // the committed defaults again for this voice only
    reset(speaker) {
      const o = read();
      for (const [l, k] of entriesOf(speaker)) if (o[l]) delete o[l][k];
      write(o);
    },
    // the committed list of an entry (for the changed mark)
    fileEntry: (lang, key) => entryOf(COMBOS_FILE, lang, key),
  };
}
