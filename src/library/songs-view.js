// The Songs tab view (#34): search bar, filter chips, favourites and sorting above the song cards.
// The cards are rendered by the app; this module filters and orders them, and keeps the view and the
// favourites in browser storage. Filtering logic: song-filter.js.
import { GENRES } from '../song/format.js';
import { KINDS, SORTS, cleanView, songEntry, filterSongs } from './song-filter.js';

const VIEW_KEY = 'coding-misk-songs-view';
const STAR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5l1.9 4.2 4.6.5-3.4 3.1.9 4.5L8 11.5 4 13.8l.9-4.5L1.5 6.2l4.6-.5z"/></svg>';

// bar: the element for the toolbar; list: the cards container; styles(): every style (built-in and the user's)
// onChange(): called after the view changed (for the player bar's previous and next)
// playlists: the playlist store (#36; favourites are its first list); onPlayList(listId): "Play playlist"
export function createSongsView({ bar, list, t, tx, esc, store, styles, playlists, toast = () => {}, onPlayList = () => {}, onChange = () => {} }) {
  let view = cleanView(store.get(VIEW_KEY, null));
  if (!playlists.get(view.list)) view.list = 'all';
  const listName = l => (l.id === 'favourites' ? t('favourites') : l.name);
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
    entries = songs.map((s, i) => songEntry(s, i, n, playlists.favourites.songs));
  }
  // a picked playlist: its songs only, in its order (the default order), then search and filters
  const visible = () => {
    const pl = view.list !== 'all' && playlists.get(view.list);
    if (!pl) return filterSongs(entries, view);
    const at = new Map(pl.songs.map((id, i) => [id, i]));
    return filterSongs(entries.filter(e => at.has(e.id)).map(e => ({ ...e, index: at.get(e.id) })), view);
  };

  // toolbar: search, sort, favourites, chips for genre, kind and style
  function renderBar() {
    const allStyles = styles().slice().sort((a, b) => tx(a.name).localeCompare(tx(b.name)));
    view.styles = view.styles.filter(id => allStyles.some(r => r.id === id) || entries.some(e => e.styles.includes(id)));
    const chip = (group, val, label) => `<button class="chip small" data-f="${group}" data-v="${esc(val)}" aria-pressed="${view[group].includes(val)}">${esc(label)}</button>`;
    const used = new Set(entries.flatMap(e => e.genres));
    if (!playlists.get(view.list)) view.list = 'all';
    const lists = [{ id: 'all' }, ...playlists.all];
    bar.innerHTML = `
      <div class="sv-row">
        <input type="search" class="sv-q" id="sv-q" value="${esc(view.q)}" placeholder="${esc(t('songSearch'))}" aria-label="${esc(t('songSearchAria'))}" autocomplete="off" data-no-knob>
        <label class="sv-sort"><span>${esc(t('sortLbl'))}</span><select id="sv-sort" data-no-knob>${SORTS.map(s => `<option value="${s}"${view.sort === s ? ' selected' : ''}>${esc(t(`sort:${s}`))}</option>`).join('')}</select></label>
        <span class="hand-from sv-fav"><button class="led" id="sv-fav" aria-pressed="${view.favOnly}" aria-labelledby="sv-fav-lbl"></button><span id="sv-fav-lbl">${esc(t('fFav'))}</span></span>
      </div>
      <div class="sv-row sv-lists"><label class="sv-sort"><span class="lbl">${esc(t('playlistsLbl'))}</span><select id="sv-list" data-no-knob>${lists.map(l => `<option value="${esc(l.id)}"${view.list === l.id ? ' selected' : ''}>${esc(l.id === 'all' ? t('allSongs') : `${listName(l)} (${l.songs.length})`)}</option>`).join('')}</select></label>${view.list !== 'all' ? `<button class="btn primary sv-play-list" data-play-list="${esc(view.list)}">${esc(t('playPlaylist'))}</button>` : ''}</div>
      <div class="sv-group"><span class="lbl">${esc(t('fGenres'))}</span><div class="chips">${GENRES.filter(g => used.has(g) || view.genres.includes(g)).map(g => chip('genres', g, t(`g:${g}`))).join('')}</div></div>
      <div class="sv-group"><span class="lbl">${esc(t('fKinds'))}</span><div class="chips">${KINDS.map(k => chip('kinds', k, t(`k:${k}`))).join('')}</div></div>
      <details class="sv-group sv-styles"${stylesOpen || view.styles.length ? ' open' : ''}><summary class="lbl">${esc(t('fStyles'))}${view.styles.length ? ` (${view.styles.length})` : ''}</summary><div class="chips">${allStyles.map(r => chip('styles', r.id, tx(r.name))).join('')}</div></details>
      <p class="sv-legend"><span class="lbl">${esc(t('legend'))}</span> <span class="tag-chip genre">${esc(t('tagGenre'))}</span> <span class="tag-chip style">${esc(t('tagStyleShort'))}</span> <span class="tag-chip free">#${esc(t('tagFree').toLowerCase())}</span> <span class="muted">${esc(t('legendHint'))}</span></p>
      <p class="sv-count" aria-live="polite"><span id="sv-n"></span> <button class="btn sv-clear" id="sv-clear" hidden>${esc(t('clearFilters'))}</button></p>`;
  }

  // hide and reorder the existing cards, without rebuilding them
  function apply() {
    const shown = visible(), cards = new Map([...list.querySelectorAll('[data-song-id]')].map(el => [el.dataset.songId, el]));
    const ids = new Set(shown.map(e => e.id));
    for (const e of shown) { const el = cards.get(e.id); if (el) list.insertBefore(el, list.querySelector('.sv-none')); }
    for (const [id, el] of cards) el.hidden = !ids.has(id);
    const filtered = view.q || view.genres.length || view.styles.length || view.kinds.length || view.favOnly || view.list !== 'all';
    const n = bar.querySelector('#sv-n'), clear = bar.querySelector('#sv-clear');
    const pl = view.list !== 'all' && playlists.get(view.list);
    if (n) n.textContent = t('songCount', { n: shown.length, total: pl ? pl.songs.length : entries.length });
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
  bar.addEventListener('change', e => {
    if (e.target.id === 'sv-sort') { view.sort = e.target.value; save(); apply(); }
    if (e.target.id === 'sv-list') { view.list = e.target.value; save(); renderBar(); apply(); }
  });
  bar.addEventListener('toggle', e => { if (e.target.classList && e.target.classList.contains('sv-styles')) stylesOpen = e.target.open; }, true);
  bar.addEventListener('click', e => {
    const play = e.target.closest('[data-play-list]');
    if (play) { const ids = visible().map(x => x.id); onPlayList(play.dataset.playList, ids); return; }
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
  list.addEventListener('click', e => {
    if (e.target.closest('[data-sv-clear]')) return clearAll();
    // a tag on a card filters by it: genre and style add their chip, a free tag goes in the search
    const tag = e.target.closest('[data-tag-f]');
    if (!tag) return;
    const g = tag.dataset.tagF, v = tag.dataset.v;
    if (g === 'q') view.q = v;
    else if (!view[g].includes(v)) view[g] = [...view[g], v];
    save(); renderBar(); apply();
    bar.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  const isFav = id => playlists.isFav(id);
  function toggleFav(id) {
    const on = playlists.toggleFav(id);
    const en = entries.find(x => x.id === id); if (en) en.fav = on;
    if (view.favOnly || view.list === 'favourites') apply();
    const opt = bar.querySelector('#sv-list option[value="favourites"]'); if (opt) opt.textContent = `${listName(playlists.favourites)} (${playlists.favourites.songs.length})`;
    return on;
  }
  const starButton = id => `<button class="star" data-star="${esc(id)}" aria-pressed="${isFav(id)}" aria-label="${esc(t(isFav(id) ? 'favRemove' : 'favAdd'))}" title="${esc(t(isFav(id) ? 'favRemove' : 'favAdd'))}">${STAR}</button>`;

  // tags of a card: genres (accent colour), then the styles whose name says more than their genre
  // (Berlin techno under Techno; a "Trance" style under the Trance genre is not repeated), then free tags (#).
  // The tooltip tells what each chip is.
  function tagsHtml(song) {
    const e = songEntry(song, 0, names()), n = names();
    const same = id => { const nm = styleName(id), g = n.genreOf(id); return nm && g && e.genres.includes(g) && nm.toLowerCase() === t(`g:${g}`).toLowerCase(); };
    const tip = (kind, extra = '') => ` title="${esc(t(kind))}${extra ? `: ${esc(extra)}` : ''}"`;
    return [
      ...e.genres.map(g => { const st = e.styles.filter(id => same(id) && n.genreOf(id) === g); return `<button class="tag-chip genre" data-tag-f="genres" data-v="${g}"${tip(st.length ? 'tagGenreStyle' : 'tagGenre')}>${esc(t(`g:${g}`))}</button>`; }),
      ...e.styles.filter(id => !same(id)).map(id => { const nm = styleName(id), g = n.genreOf(id); return `<button class="tag-chip style${nm ? '' : ' unknown'}" data-tag-f="styles" data-v="${esc(id)}"${tip('tagStyle', g ? t(`g:${g}`) : '')}>${esc(nm || id)}</button>`; }),
      ...e.free.map(f => `<button class="tag-chip free" data-tag-f="q" data-v="${esc(f)}"${tip('tagFree')}>#${esc(f)}</button>`),
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

  // "+ Playlist" on a card: a dropdown of the playlists (a tick where the song already is) or a new one, then Add
  const NEW = '__new';
  function playlistMenu(songId) {
    const first = playlists.all.find(l => !l.songs.includes(songId));
    return `<div class="sv-pl-menu" data-pl-for="${esc(songId)}">
      <select data-pl-pick aria-label="${esc(t('addToPlaylist'))}" data-no-knob>
        ${playlists.all.map(l => `<option value="${esc(l.id)}"${first && first.id === l.id ? ' selected' : ''}>${l.songs.includes(songId) ? '✓ ' : ''}${esc(listName(l))}</option>`).join('')}
        <option value="${NEW}"${first ? '' : ' selected'}>${esc(t('newPlaylist'))}…</option>
      </select>
      <input type="text" data-pl-name placeholder="${esc(t('newPlaylistName'))}" aria-label="${esc(t('newPlaylistName'))}" data-no-knob${first ? ' hidden' : ''}>
      <button class="btn primary" data-pl-confirm>${esc(t('plAdd'))}</button>
    </div>`;
  }
  list.addEventListener('change', e => {
    if (!e.target.matches('[data-pl-pick]')) return;
    const input = e.target.closest('.sv-pl-menu').querySelector('[data-pl-name]');
    input.hidden = e.target.value !== NEW;
    if (!input.hidden) input.focus();
  });
  list.addEventListener('click', e => {
    if (!e.target.closest('[data-pl-confirm]')) return;
    const menu = e.target.closest('.sv-pl-menu'), songId = menu.dataset.plFor, pick = menu.querySelector('[data-pl-pick]').value;
    if (pick === NEW) {
      const input = menu.querySelector('[data-pl-name]'), name = input.value.trim();
      if (!name) { input.focus(); return; }
      const l = playlists.create(name, [songId]);
      toast(t('plAdded', { name: l.name }));
    } else {
      const l = playlists.get(pick), name = listName(l);
      if (l.songs.includes(songId)) { toast(t('plAlready', { name })); return; }
      if (l.id === 'favourites') toggleFav(songId); else playlists.add(l.id, songId);
      toast(t('plAdded', { name }));
    }
    menu.remove();
    const card = list.querySelector(`[data-song-id="${CSS.escape(songId)}"]`);
    if (card) { const star = card.querySelector('[data-star]'); if (star) star.setAttribute('aria-pressed', isFav(songId)); const b = card.querySelector('[data-act="playlist"]'); if (b) b.setAttribute('aria-expanded', 'false'); }
    renderBar(); apply();
  });
  list.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-pl-name]')) e.target.closest('.sv-pl-menu').querySelector('[data-pl-confirm]').click(); });

  // ids of the visible songs in order, for the player bar
  const order = () => visible().map(e => e.id);
  return { setSongs, renderBar, apply, order, isFav, toggleFav, starButton, tagsHtml, tagsPanel, playlistMenu, listName, get view() { return view; } };
}
