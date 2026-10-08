// The Songs tab view (#34): search bar, filter chips, favourites and sorting above the song cards.
// The cards are rendered by the app; this module filters and orders them, and keeps the view and the
// favourites in browser storage. Filtering logic: song-filter.js.
import { GENRES } from '../song/format.js';
import { KINDS, SORTS, cleanView, songEntry, filterSongs } from './song-filter.js';

const VIEW_KEY = 'coding-misk-songs-view', FAV_KEY = 'coding-misk-favourites';
const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1.9 4.5L8 11.5 4 13.8l.9-4.5L1.5 6.2l4.6-.5z"/></svg>';

// bar: the element for the toolbar; list: the cards container; styles(): every style (built-in and the user's)
// onChange(): called after the view changed (for the player bar's previous and next)
export function createSongsView({ bar, list, t, tx, esc, store, styles, onChange = () => {} }) {
  let favs = store.get(FAV_KEY, []);
  if (!Array.isArray(favs)) favs = [];
  let view = cleanView(store.get(VIEW_KEY, null));
  let entries = [], timer = 0, stylesOpen = false;

  const styleById = () => Object.fromEntries(styles().map(r => [r.id, r]));
  // names used by search and labels; a style without a genre counts as experimental
  const names = () => {
    const by = styleById();
    return {
      style: id => (by[id] && by[id].name ? Object.values(by[id].name) : []),
      genre: g => [t(`g:${g}`), g.replace(/-/g, ' ')],
      genreOf: id => (by[id] ? (GENRES.includes(by[id].genre) ? by[id].genre : 'experimental') : null),
    };
  };
  const styleName = id => { const r = styleById()[id]; return r && r.name ? tx(r.name) : null; };
  const save = () => store.set(VIEW_KEY, view);

  // songs: [{ id, title, style, tags, origin, code, build, mine, bpm, seconds }] in default order
  function setSongs(songs) {
    const n = names();
    entries = songs.map((s, i) => songEntry(s, i, n, favs));
  }
  const visible = () => filterSongs(entries, view);

  // toolbar: search, sort, favourites, chips for genre, kind and style
  function renderBar() {
    const allStyles = styles().slice().sort((a, b) => tx(a.name).localeCompare(tx(b.name)));
    view.styles = view.styles.filter(id => allStyles.some(r => r.id === id) || entries.some(e => e.styles.includes(id)));
    const chip = (group, val, label) => `<button class="chip small" data-f="${group}" data-v="${esc(val)}" aria-pressed="${view[group].includes(val)}">${esc(label)}</button>`;
    const used = new Set(entries.flatMap(e => e.genres));
    bar.innerHTML = `
      <div class="sv-row">
        <input type="search" class="sv-q" id="sv-q" value="${esc(view.q)}" placeholder="${esc(t('songSearch'))}" aria-label="${esc(t('songSearchAria'))}" autocomplete="off" data-no-knob>
        <label class="sv-sort"><span>${esc(t('sortLbl'))}</span><select id="sv-sort" data-no-knob>${SORTS.map(s => `<option value="${s}"${view.sort === s ? ' selected' : ''}>${esc(t(`sort:${s}`))}</option>`).join('')}</select></label>
        <span class="hand-from sv-fav"><button class="led" id="sv-fav" aria-pressed="${view.favOnly}" aria-labelledby="sv-fav-lbl"></button><span id="sv-fav-lbl">${esc(t('fFav'))}</span></span>
      </div>
      <div class="sv-group"><span class="lbl">${esc(t('fGenres'))}</span><div class="chips">${GENRES.filter(g => used.has(g) || view.genres.includes(g)).map(g => chip('genres', g, t(`g:${g}`))).join('')}</div></div>
      <div class="sv-group"><span class="lbl">${esc(t('fKinds'))}</span><div class="chips">${KINDS.map(k => chip('kinds', k, t(`k:${k}`))).join('')}</div></div>
      <details class="sv-group sv-styles"${stylesOpen || view.styles.length ? ' open' : ''}><summary class="lbl">${esc(t('fStyles'))}${view.styles.length ? ` (${view.styles.length})` : ''}</summary><div class="chips">${allStyles.map(r => chip('styles', r.id, tx(r.name))).join('')}</div></details>
      <p class="sv-count" aria-live="polite"><span id="sv-n"></span> <button class="btn sv-clear" id="sv-clear" hidden>${esc(t('clearFilters'))}</button></p>`;
  }

  // hide and reorder the existing cards, without rebuilding them
  function apply() {
    const shown = visible(), cards = new Map([...list.querySelectorAll('[data-song-id]')].map(el => [el.dataset.songId, el]));
    const ids = new Set(shown.map(e => e.id));
    for (const e of shown) { const el = cards.get(e.id); if (el) list.insertBefore(el, list.querySelector('.sv-none')); }
    for (const [id, el] of cards) el.hidden = !ids.has(id);
    const filtered = view.q || view.genres.length || view.styles.length || view.kinds.length || view.favOnly;
    const n = bar.querySelector('#sv-n'), clear = bar.querySelector('#sv-clear');
    if (n) n.textContent = t('songCount', { n: shown.length, total: entries.length });
    if (clear) clear.hidden = !filtered;
    let none = list.querySelector('.sv-none');
    if (!none) { none = document.createElement('div'); none.className = 'sv-none note'; list.append(none); }
    none.hidden = shown.length > 0;
    none.innerHTML = `${esc(t('songNone'))} <button class="btn" data-sv-clear>${esc(t('clearFilters'))}</button>`;
    onChange();
  }

  const clearAll = () => { view = cleanView(null); save(); renderBar(); apply(); };
  bar.addEventListener('input', e => {
    if (e.target.id !== 'sv-q') return;
    clearTimeout(timer);
    timer = setTimeout(() => { view.q = e.target.value; save(); apply(); }, 120);
  });
  bar.addEventListener('change', e => { if (e.target.id === 'sv-sort') { view.sort = e.target.value; save(); apply(); } });
  bar.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('sv-styles')) stylesOpen = e.target.open; }, true);
  bar.addEventListener('click', e => {
    const c = e.target.closest('[data-f]');
    if (c) {
      const g = c.dataset.f, v = c.dataset.v, on = view[g].includes(v);
      view[g] = on ? view[g].filter(x => x !== v) : [...view[g], v];
      c.setAttribute('aria-pressed', !on); save(); apply();
      return;
    }
    if (e.target.closest('#sv-fav')) { view.favOnly = !view.favOnly; e.target.closest('#sv-fav').setAttribute('aria-pressed', view.favOnly); save(); apply(); return; }
    if (e.target.closest('#sv-fav-lbl')) { bar.querySelector('#sv-fav').click(); return; }
    if (e.target.closest('#sv-clear')) clearAll();
  });
  list.addEventListener('click', e => { if (e.target.closest('[data-sv-clear]')) clearAll(); });

  const isFav = id => favs.includes(id);
  function toggleFav(id) {
    favs = isFav(id) ? favs.filter(x => x !== id) : [...favs, id];
    store.set(FAV_KEY, favs);
    const en = entries.find(x => x.id === id); if (en) en.fav = isFav(id);
    if (view.favOnly) apply();
    return isFav(id);
  }
  const starButton = id => `<button class="star" data-star="${esc(id)}" aria-pressed="${isFav(id)}" aria-label="${esc(t(isFav(id) ? 'favRemove' : 'favAdd'))}" title="${esc(t(isFav(id) ? 'favRemove' : 'favAdd'))}">${STAR}</button>`;

  // tags of a card: genres, then styles with their current names (an unknown style shows its id, dimmed), then free tags
  function tagsHtml(song) {
    const e = songEntry(song, 0, names());
    return [
      ...e.genres.map(g => `<span class="tag-chip genre">${esc(t(`g:${g}`))}</span>`),
      ...e.styles.map(id => { const nm = styleName(id); return `<span class="tag-chip style${nm ? '' : ' unknown'}">${esc(nm || id)}</span>`; }),
      ...e.free.map(f => `<span class="tag-chip free">#${esc(f)}</span>`),
    ].join(' ');
  }

  // the tag editor of one of the user's songs
  function tagsPanel(song) {
    const tags = song.tags || {}, mine = new Set(tags.genres || []), st = new Set(tags.styles || []);
    const allStyles = styles().slice().sort((a, b) => tx(a.name).localeCompare(tx(b.name)));
    return `<div class="sv-tags-panel" data-tags-for="${esc(song.id)}">
      <div class="sv-group"><span class="lbl">${esc(t('fGenres'))}</span><div class="chips">${GENRES.map(g => `<button class="chip small" data-tg="genres" data-v="${g}" aria-pressed="${mine.has(g)}">${esc(t(`g:${g}`))}</button>`).join('')}</div></div>
      <div class="sv-group"><span class="lbl">${esc(t('fStyles'))}</span><div class="chips">${allStyles.map(r => `<button class="chip small" data-tg="styles" data-v="${esc(r.id)}" aria-pressed="${st.has(r.id)}">${esc(tx(r.name))}</button>`).join('')}</div></div>
      <label class="sv-group"><span class="lbl">${esc(t('tagsFree'))}</span><input type="text" data-tg-free value="${esc((tags.free || []).join(', '))}" placeholder="${esc(t('tagsFreeHint'))}" data-no-knob></label>
      <button class="btn primary" data-tags-done>${esc(t('tagsDone'))}</button>
    </div>`;
  }

  // ids of the visible songs in order, for the player bar
  const order = () => visible().map(e => e.id);
  return { setSongs, renderBar, apply, order, isFav, toggleFav, starButton, tagsHtml, tagsPanel, get view() { return view; } };
}
