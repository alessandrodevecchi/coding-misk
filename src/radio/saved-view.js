// The radio console's saved patterns among many (saved-patterns-list, #83): search, instrument, "Fit this song",
// style and sort, and the groups by instrument. Pure, no DOM: the console renders what savedView returns and
// `npm run check:patterns` checks it in Node.
import { fold } from '../library/song-filter.js';
import { patternPart } from '../endless/steering.js';

// up to this many fitting patterns the panel looks as before: no toolbar, no groups (D3)
export const SAVED_TOOLBAR = 8;
// patterns shown per instrument group before "Show all (n)"
export const SAVED_GROUP = 4;
// "saved" is the default: the order the Patterns tab lists the saved patterns in, the order they were saved (owner's
// answer to Q3); then most recent, most used, name, closest tempo
export const SAVED_SORTS = ['saved', 'recent', 'used', 'name', 'tempo'];
// the console's instrument order (ARR_ROWS of the radio): the groups follow it
export const SAVED_ORDER = ['kick', 'beat', 'bass', 'texture', 'arp', 'hook', 'guitar', 'pad'];
// a saved tempo within this ratio of the song's fits (the console's tempo hint uses the same)
export const TEMPO_FIT = 1.5;
export const VIEW_DEFAULT = Object.freeze({ inst: 'all', fit: false, style: 'all', sort: 'saved', closed: [] });

// a stored view read back safely (coding-misk-radio-saved-view)
export function cleanView(v) {
  const o = v && typeof v === 'object' ? v : {};
  return {
    inst: typeof o.inst === 'string' && o.inst ? o.inst : 'all',
    fit: o.fit === true,
    style: typeof o.style === 'string' && o.style ? o.style : 'all',
    sort: SAVED_SORTS.includes(o.sort) ? o.sort : 'saved',
    closed: Array.isArray(o.closed) ? [...new Set(o.closed.filter(x => typeof x === 'string'))] : [],
  };
}
const own = x => (Array.isArray(x.styles) ? x.styles : []).filter(s => s && s !== 'any');
const bpmOf = x => Number((x.context || {}).bpm) || 0;
// the later of the last use and the save date (ISO strings compare as text)
const recentOf = x => [x.lastUsed, x.created].filter(s => typeof s === 'string').sort().pop() || '';
// a saved pattern fits the song: tagged with one of the song's styles or with none, and its tempo within 1.5 times
// (a pattern with no tempo saved passes the tempo test)
export function fitsSong(x, song = {}) {
  const tags = own(x), styles = song.styles || [];
  if (tags.length && !tags.some(s => styles.includes(s))) return false;
  const b = bpmOf(x), now = Number(song.bpm) || 0;
  return !b || !now || (b / now <= TEMPO_FIT && now / b <= TEMPO_FIT);
}

// patterns: the saved patterns that fit the song on air, in the order they were saved; view: the panel's state
// ({ inst, fit, style, sort, closed, q }); song: { styles, bpm }; names: { inst(part), style(id) } for the search in
// the page's language. Returns { total, toolbar, grouped, items, groups, counts, styles, shown, filtered }:
// items in the chosen order (all instruments when grouped), groups [{ inst, n, items (first 4), open }], counts per
// instrument (with the search and the other filters), the styles the patterns name, whether a filter is set.
export function savedView(patterns, view = {}, song = {}, names = {}) {
  const v = { ...cleanView(view), q: String(view.q || '') };
  const instName = names.inst || (p => p), styleName = names.style || (s => s);
  const list = (patterns || []).map((x, i) => ({ x, i, part: patternPart(x) }));
  const total = list.length, toolbar = total > SAVED_TOOLBAR;
  const words = fold(v.q).split(/\s+/).filter(Boolean);
  const hay = r => fold([r.x.name, r.x.id, r.part, instName(r.part), r.x.kind, r.x.type, ...own(r.x), ...own(r.x).map(styleName)].join(' '));
  const pass = r => (!words.length || words.every(w => hay(r).includes(w))) && (!v.fit || fitsSong(r.x, song)) && (v.style === 'all' || own(r.x).includes(v.style));
  // without the toolbar nothing filters (8 patterns or fewer: as before)
  const base = toolbar ? list.filter(pass) : list;
  const counts = {};
  for (const r of base) counts[r.part] = (counts[r.part] || 0) + 1;
  const inst = toolbar && v.inst !== 'all' ? v.inst : 'all';
  const kept = inst === 'all' ? base : base.filter(r => r.part === inst);
  const songBpm = Number(song.bpm) || 0, dist = x => { const b = bpmOf(x); return b && songBpm ? Math.abs(Math.log(b / songBpm)) : Infinity; };
  const byRecent = (a, b) => recentOf(b.x).localeCompare(recentOf(a.x)) || b.i - a.i;
  const cmp = {
    saved: (a, b) => a.i - b.i,
    recent: byRecent,
    used: (a, b) => (Number(b.x.uses) || 0) - (Number(a.x.uses) || 0) || byRecent(a, b),
    name: (a, b) => fold(a.x.name || a.x.id).localeCompare(fold(b.x.name || b.x.id), undefined, { numeric: true }) || a.i - b.i,
    tempo: (a, b) => dist(a.x) - dist(b.x) || a.i - b.i,
  }[toolbar ? v.sort : 'saved'];
  const items = kept.slice().sort(cmp);
  const filtered = toolbar && (!!words.length || v.fit || v.style !== 'all' || inst !== 'all');
  // grouped: no search, no filter, the default sort (D2)
  const grouped = toolbar && !filtered && v.sort === 'saved';
  const parts = [...SAVED_ORDER.filter(p => counts[p]), ...Object.keys(counts).filter(p => !SAVED_ORDER.includes(p))];
  const groups = grouped ? parts.map(p => { const all = items.filter(r => r.part === p); return { inst: p, n: all.length, open: !v.closed.includes(p), items: all.slice(0, SAVED_GROUP).map(r => r.x) }; }) : [];
  const styles = [...new Set(list.flatMap(r => own(r.x)))];
  return { total, toolbar, grouped, filtered, inst, items: items.map(r => r.x), groups, counts, parts, styles, shown: items.length };
}

// days between a use (ISO) and now, for "used 4 times · 5 days ago"
export function daysAgo(iso, now = new Date()) {
  const t = Date.parse(iso || '');
  if (!Number.isFinite(t)) return null;
  const day = d => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.max(0, Math.round((day(now) - day(new Date(t))) / 86400000));
}
