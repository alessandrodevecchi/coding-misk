// My phrases in the page (my-phrases D3, D4, D6): the collection and its settings in the browser storage, the save
// policy with its toasts, the temporary samples of unsaved lines, the use counts and what the narrator and the radio
// may draw. The pure parts are in phrases.js, mine.js and samples.js.
import { PHRASES_KEY, SETTINGS_KEY, readStore, readSettings, addPhrase, editPhrase, deletePhrase, restorePhrase, countUses, find, textIn, textError, SHARE, TEMP_MS, textsOf } from './phrases.js';
import { mineSnapshot, idsSaid } from './mine.js';
import { saySlug } from '../song/build.js';

// store: { get, set }; toast(msg, actions, { ms, onTimeout }); t: strings; getLang(); helper(): whether the voice
// helper runs; onChange(what): 'items' | 'settings'
export function createPhrases({ store, t, toast, getLang, helper = () => false, onChange = () => {} }) {
  let S = readStore(store.get(PHRASES_KEY, null));
  let cfg = readSettings(store.get(SETTINGS_KEY, null));
  const listeners = new Set();
  const emit = what => { onChange(what); for (const f of listeners) { try { f(what); } catch (e) { /* a listener's error stays its own */ } } };
  const save = (next, what = 'items') => { S = next; store.set(PHRASES_KEY, S); emit(what); };
  // the samples of a phrase are no longer temporary (D6: saved later)
  const keepFiles = p => { if (!helper()) return; const protect = textsOf(p).map(([l, x]) => `${l}|${saySlug(x)}`); fetch('/voice/keep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ protect }) }).catch(() => {}); };
  const add = (input, o = {}) => { const r = addPhrase(S, input, o); if (r.error) return r; save(r.store); if (r.added) keepFiles(r.phrase); return r; };
  const remove = id => { const i = S.items.findIndex(p => p.id === id), r = deletePhrase(S, id); if (r.removed) save(r.store); return { ...r, at: i }; };
  const quote = x => (x.length > 40 ? `${x.slice(0, 38)}…` : x);

  // A line the user wrote (D3): input { text, lang, kind, tag, styles, source, from }; o.msg: the edit's own message
  // (Compose), o.undo: the edit's Undo, which then also removes a phrase the edit created; o.use: the line plays now.
  // → 'saved' | 'asked' | 'known' | 'never' | 'invalid'
  function offer(input, { msg = '', undo = null, use = false } = {}) {
    const text = String((input && input.text) || '').trim().replace(/\s+/g, ' ');
    const plain = () => { if (msg) toast(msg, undo ? [{ label: t('vinstUndo'), run: undo }] : []); };
    if (!text || textError(text)) { plain(); return 'invalid'; }
    const it = { ...input, text };
    // a line already in the collection only adds a use, with no toast of its own
    if (find(S, it.kind, it.lang, text)) { add(it, { use: true }); plain(); return 'known'; }
    if (cfg.save === 'never') { plain(); return 'never'; }
    const head = msg ? `${msg} · ` : '';
    if (cfg.save === 'always') {
      const r = add(it, { use });
      if (r.error) { plain(); return 'invalid'; }
      const id = r.phrase.id;
      const both = () => { remove(id); if (undo) undo(); };
      toast(`${head}${t('phSaved')}`, [{ label: t(undo ? 'vinstUndo' : 'phUndoSave'), run: undo ? both : () => remove(id) }]);
      return 'saved';
    }
    // ask: a toast that never blocks; no answer in 10 seconds counts as No
    const yes = () => add(it, { use });
    toast(`${head}${t('phAsk', { text: quote(text) })}`, [
      { label: t('phAskSave'), run: yes },
      { label: t('phAskNo'), run: () => {} },
      { label: t('phAskAlways'), run: () => { setSettings({ save: 'always' }); yes(); } },
      ...(undo ? [{ label: t('vinstUndo'), run: undo }] : []),
    ], { ms: 10000 });
    return 'asked';
  }
  function setSettings(patch) { cfg = readSettings({ ...cfg, ...patch }); store.set(SETTINGS_KEY, cfg); emit('settings'); }

  return {
    get items() { return S.items; },
    get settings() { return cfg; },
    get share() { return SHARE[cfg.share]; },
    on(f) { listeners.add(f); return () => listeners.delete(f); },
    reload() { S = readStore(store.get(PHRASES_KEY, null)); cfg = readSettings(store.get(SETTINGS_KEY, null)); emit('items'); },
    setSettings,
    offer,
    add,
    remove,
    restore(p, at) { save(restorePhrase(S, p, at)); },
    edit(id, patch) { const r = editPhrase(S, id, patch); if (!r.error) { save(r.store); keepFiles(r.phrase); } return r; },
    isSaved: (text, lang, kind = 'voice') => !!find(S, kind, lang, text),
    // use counts (D4): a song that says them is played; texts: the lines the song says
    countPlayed(texts, lang = getLang()) { const ids = idsSaid(texts, S.items, lang); if (ids.length) save(countUses(S, ids), 'uses'); return ids; },
    // what the radio records in a new session, and what Compose's narrator draws from
    snapshot: (lang = getLang()) => mineSnapshot(S.items, SHARE[cfg.share], lang),
    composeSource: (own, lang = getLang()) => (SHARE[cfg.share] > 0 ? { share: SHARE[cfg.share], lang, list: S.items.filter(p => p.on !== false && textIn(p, lang)), own } : null),
    // the lifetime of a temporary sample in ms (D6)
    tempMs: () => TEMP_MS[cfg.temp],
  };
}
