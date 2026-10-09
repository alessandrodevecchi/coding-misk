// The Genres tab of the Groove Lab (#43): each genre with its styles, how many songs it has, the artists who
// like it, and ways to hear it: the radio in its styles, or the Songs tab filtered on it.
import { GENRES } from '../song/format.js';

// styles(): every style; songs(): [{ genres }]; artists(): usable artists
// onRadio(styleIds), onSongs(genre), onStyle(styleId), face(artist) → portrait url
export function createGenresTab({ root, t, tx, esc, styles, songs, artists, onRadio, onSongs, onStyle, face }) {
  const genreOfStyle = r => (GENRES.includes(r.genre) ? r.genre : 'experimental');
  function render() {
    if (root.hidden) return;
    const all = styles(), list = songs(), arts = artists();
    const cards = GENRES.map(g => {
      const st = all.filter(r => genreOfStyle(r) === g).sort((a, b) => tx(a.name).localeCompare(tx(b.name)));
      const n = list.filter(s => s.genres.includes(g)).length;
      // an artist likes a genre through the weights of its styles in that genre
      const fans = arts.map(a => ({ a, w: st.reduce((x, r) => x + ((a.styles || {})[r.id] || 0), 0) })).filter(x => x.w > 0).sort((x, y) => y.w - x.w);
      if (!st.length && !n) return '';
      return `<article class="card genre-card" data-genre="${g}">
        <h3>${esc(t(`g:${g}`))}</h3>
        <p class="muted small">${esc(t('genreCount', { styles: st.length, songs: n }))}</p>
        ${st.length ? `<div class="chips">${st.map(r => `<button class="chip small" data-genre-style="${esc(r.id)}" title="${esc(r.description || '')}">${esc(tx(r.name))}</button>`).join('')}</div>` : `<p class="muted small">${esc(t('genreNoStyle'))}</p>`}
        ${fans.length ? `<div class="genre-fans">${fans.slice(0, 4).map(({ a }) => `<span class="genre-fan" title="${esc(a.name)}"><img class="portrait tiny" src="${face(a)}" alt=""> ${esc(a.name)}</span>`).join('')}</div>` : ''}
        <div class="actions">
          ${st.length ? `<button class="btn primary" data-genre-radio="${g}">${esc(t('genreRadio'))}</button>` : ''}
          ${n ? `<button class="btn" data-genre-songs="${g}">${esc(t('genreSongs', { n }))}</button>` : ''}
        </div>
      </article>`;
    }).join('');
    root.innerHTML = `<p class="intro">${esc(t('genresIntro'))}</p><div class="genre-grid">${cards}</div>`;
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.genreStyle) return onStyle(b.dataset.genreStyle);
    if (b.dataset.genreSongs) return onSongs(b.dataset.genreSongs);
    if (b.dataset.genreRadio) { const g = b.dataset.genreRadio; return onRadio(styles().filter(r => genreOfStyle(r) === g).map(r => r.id)); }
  });
  return { render };
}
