// The Playlists tab (#36): every playlist with its songs; create, rename, delete, reorder (drag or up and down),
// remove, play from a song, export and import. The store and the queue live in playlists.js.
import { FAV_ID, exportPlaylist, importPlaylist } from './playlists.js';
import { downloadJson, pickJsonFiles } from './library.js';
import { VIDEO } from '../icons.js';

// songs(): the library as [{ id, title, kind, seconds }]; play(listId, ids, startId): start a playlist;
// userSong(id): the user's song with that id or null; addSongs(list): add imported user songs to the library, returns a map old → new id
export function createPlaylistsTab({ root, t, esc, clock, playlists, songs, play, userSong, addSongs, newSongId, confirmTwice, toast, onChange = () => {}, freeze = () => {}, video = () => {}, sessionOf = () => null }) {
  let open = FAV_ID, drag = null;
  const name = l => (l.id === FAV_ID ? t('favourites') : l.name);
  const byId = () => new Map(songs().map(s => [s.id, s]));
  const length = (l, map) => l.songs.reduce((a, id) => a + ((map.get(id) || {}).seconds || 0), 0);

  function render() {
    if (root.hidden) return;
    const map = byId(), lists = playlists.all, cur = playlists.get(open) || lists[0];
    open = cur.id;
    const rows = cur.songs.map((id, i) => {
      const s = map.get(id);
      return `<li class="pl-row${s ? '' : ' missing'}" draggable="true" data-i="${i}" title="${esc(t('plDrag'))}">
        <span class="pl-grip" aria-hidden="true">⋮⋮</span>
        <span class="pl-n">${i + 1}</span>
        <span class="pl-title">${s ? esc(s.title) : `<span class="muted">${esc(id)} · ${esc(t('plMissing'))}</span>`}</span>
        ${s && s.kind === 'session' ? `<span class="badge kind-session" title="${esc(t('plSession'))}">📻 ${esc(s.frozen ? t('plFrozen') : t('plSession'))}</span><span class="pl-len">${esc(t(s.count === 1 ? 'plSessionLen1' : 'plSessionLen', { n: s.count }))}${s.old ? ` <span class="pl-old" title="${esc(t('plSessionOldTip'))}">⚠ ${esc(t('plSessionOld'))}</span>` : ''}</span>`
          : s ? `<span class="badge kind-${s.kind}">${esc(t(`k:${s.kind}`))}</span><span class="pl-len">${clock(s.seconds)}</span>` : '<span></span><span></span>'}
        <span class="pl-acts">
          ${s ? `<button class="mini" data-pl-from="${i}" title="${esc(t('plPlayFrom'))}" aria-label="${esc(t('plPlayFrom'))}">▶</button>` : ''}
          ${s && s.kind === 'session' ? `<button class="mini" data-pl-video="${esc(id)}" title="${esc(t('plVideoTip'))}" aria-label="${esc(t('plVideoTip'))}">${VIDEO}</button>` : ''}
          ${s && s.kind === 'session' && !s.frozen ? `<button class="mini" data-pl-freeze="${esc(id)}" title="${esc(t('plFreezeTip'))}" aria-label="${esc(t('plFreeze'))}">❄</button>` : ''}
          <button class="mini" data-pl-up="${i}" title="${esc(t('plUp'))}" aria-label="${esc(t('plUp'))}"${i ? '' : ' disabled'}>↑</button>
          <button class="mini" data-pl-down="${i}" title="${esc(t('plDown'))}" aria-label="${esc(t('plDown'))}"${i < cur.songs.length - 1 ? '' : ' disabled'}>↓</button>
          <button class="mini" data-pl-rm="${i}" title="${esc(t('plRemove'))}" aria-label="${esc(t('plRemove'))}">✕</button>
        </span>
      </li>`;
    }).join('');
    root.innerHTML = `
      <p class="intro">${esc(t('plIntro'))}</p>
      <div class="pl-tools"><button class="btn" id="pl-new">${esc(t('plNew'))}</button><button class="btn" id="pl-import">${esc(t('plImport'))}</button></div>
      <div class="pl-layout">
        <div class="pl-lists">${lists.map(l => `<button class="card pl-card" data-pl-open="${esc(l.id)}" aria-pressed="${l.id === open}">
          <strong>${l.id === FAV_ID ? '★ ' : ''}${esc(name(l))}</strong><span class="muted">${esc(t('plSongs', { n: l.songs.length, time: clock(length(l, map)) }))}</span></button>`).join('')}</div>
        <div class="card pl-open">
          <div class="pl-head">
            ${cur.id === FAV_ID ? `<h3>★ ${esc(name(cur))}</h3>` : `<input class="pl-name" id="pl-name" value="${esc(cur.name)}" aria-label="${esc(t('plRename'))}" data-no-knob>`}
            <span class="muted">${esc(t('plSongs', { n: cur.songs.length, time: clock(length(cur, map)) }))}</span>
            <span class="pl-head-acts">
              <button class="btn primary" id="pl-play"${cur.songs.some(id => map.has(id)) ? '' : ' disabled'}>${esc(t('plPlay'))}</button>
              <button class="btn" id="pl-export">${esc(t('plExport'))}</button>
              ${cur.id === FAV_ID ? '' : `<button class="btn danger" id="pl-delete">${esc(t('plDelete'))}</button>`}
            </span>
          </div>
          ${rows ? `<ol class="pl-rows">${rows}</ol>` : `<p class="note">${esc(t('plNone'))}</p>`}
        </div>
      </div>`;
  }
  const changed = () => { render(); onChange(); };

  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const cur = playlists.get(open);
    if (b.dataset.plOpen) { open = b.dataset.plOpen; render(); return; }
    if (b.id === 'pl-new') { const l = playlists.create(t('newPlaylist')); open = l.id; changed(); const f = root.querySelector('#pl-name'); if (f) { f.focus(); f.select(); } return; }
    if (b.id === 'pl-play') return play(cur.id, cur.songs.slice());
    if (b.dataset.plFrom !== undefined) return play(cur.id, cur.songs.slice(), cur.songs[+b.dataset.plFrom]);
    if (b.dataset.plUp !== undefined) { const i = +b.dataset.plUp; playlists.move(cur.id, i, i - 1); return changed(); }
    if (b.dataset.plDown !== undefined) { const i = +b.dataset.plDown; playlists.move(cur.id, i, i + 1); return changed(); }
    if (b.dataset.plRm !== undefined) { playlists.removeAt(cur.id, +b.dataset.plRm); return changed(); }
    if (b.dataset.plFreeze) { freeze(b.dataset.plFreeze); return changed(); }
    if (b.dataset.plVideo) return video(b.dataset.plVideo);
    if (b.id === 'pl-delete') {
      if (!confirmTwice(`pl-del-${cur.id}`, t('plDeleteConfirm'))) return;
      playlists.remove(cur.id); open = FAV_ID; toast(t('plDeleted')); return changed();
    }
    if (b.id === 'pl-export') return downloadJson(`playlist-${(name(cur) || 'playlist').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, exportPlaylist(cur, userSong, t('favourites'), sessionOf));
    if (b.id === 'pl-import') {
      return pickJsonFiles((data, file) => {
        const r = importPlaylist(data, userSong, newSongId);
        if (!data || r.error) { toast(t('plImportBad')); return; }
        addSongs(r.add);
        const l = playlists.create(r.name, r.songs, r.sessions);
        open = l.id; toast(t('plImported', { name: l.name })); changed();
      });
    }
  });
  root.addEventListener('change', e => {
    if (e.target.id !== 'pl-name') return;
    if (playlists.rename(open, e.target.value)) changed(); else render();
  });
  root.addEventListener('keydown', e => { if (e.target.id === 'pl-name' && e.key === 'Enter') e.target.blur(); });
  // drag and drop reorder (desktop); up and down buttons everywhere
  root.addEventListener('dragstart', e => { const li = e.target.closest('.pl-row'); if (!li) return; drag = +li.dataset.i; li.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(drag)); } catch (err) {} });
  root.addEventListener('dragover', e => { const li = e.target.closest('.pl-row'); if (li && drag !== null) { e.preventDefault(); root.querySelectorAll('.pl-row.over').forEach(x => x.classList.remove('over')); li.classList.add('over'); } });
  root.addEventListener('drop', e => {
    const li = e.target.closest('.pl-row'); if (!li || drag === null) return;
    e.preventDefault();
    playlists.move(open, drag, +li.dataset.i); drag = null; changed();
  });
  root.addEventListener('dragend', () => { drag = null; root.querySelectorAll('.pl-row').forEach(x => x.classList.remove('dragging', 'over')); });

  return { render, openList: id => { open = id; render(); } };
}
