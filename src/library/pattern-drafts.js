// New parts of the Patterns tab (pattern-followups D2, #72): parts made with New stay in this browser under
// "New, not saved" until they are saved or discarded, across tab changes and reloads, and go into the backup. At most
// DRAFT_CAP are kept: the oldest goes when a new one comes. Pure, with no imports: the Patterns tab, the backup and
// `npm run check:patterns` (Node) use the same functions.
//
// A draft: { id ("d-<time in base 36>"), kind, type, name, pattern, sound, context, styles, seed, why, energy, at (ISO
// time, newest first) }.
export const DRAFTS_KEY = 'coding-misk-pattern-drafts';
export const DRAFT_CAP = 30;

const validDraft = d => !!(d && typeof d === 'object' && typeof d.id === 'string' && d.pattern && typeof d.pattern === 'object' && typeof d.kind === 'string');
// newest first, at most DRAFT_CAP; returns { list, dropped }
export function capDrafts(list) {
  const all = (Array.isArray(list) ? list : []).filter(validDraft).slice().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  return { list: all.slice(0, DRAFT_CAP), dropped: Math.max(0, all.length - DRAFT_CAP) };
}
// the backup's drafts merged into the current ones by id (the backup's copy wins), newest kept
export function mergeDrafts(cur, incoming) {
  const out = (Array.isArray(cur) ? cur : []).filter(validDraft).slice();
  for (const d of Array.isArray(incoming) ? incoming : []) {
    if (!validDraft(d)) continue;
    const i = out.findIndex(x => x.id === d.id);
    if (i >= 0) out[i] = d; else out.push(d);
  }
  return capDrafts(out).list;
}
// a free id: "d-<time in base 36>", with a suffix when two are made in the same millisecond
function newDraftId(list, now) {
  const base = `d-${now.toString(36)}`, ids = new Set(list.map(d => d.id));
  let id = base;
  for (let n = 2; ids.has(id); n++) id = `${base}-${n}`;
  return id;
}
// the store over the app's browser storage ({ get, set })
export function draftStore(store) {
  const read = () => capDrafts(store.get(DRAFTS_KEY, [])).list;
  const write = list => store.set(DRAFTS_KEY, list);
  return {
    list: () => read(),
    get: id => read().find(d => d.id === id) || null,
    // → { item, dropped (how many old drafts went to keep the cap) }
    add(d, now = new Date()) {
      const cur = read(), at = d.at && !cur.some(x => x.at === d.at) ? d.at : now.toISOString();
      const item = { ...JSON.parse(JSON.stringify(d)), id: newDraftId(cur, now.getTime()), at };
      const r = capDrafts([item, ...cur]);
      write(r.list);
      return { item, dropped: r.dropped };
    },
    update(id, patch) { write(read().map(d => (d.id === id ? { ...d, ...patch, id } : d))); },
    remove(id) { write(read().filter(d => d.id !== id)); },
    clear() { write([]); },
  };
}
