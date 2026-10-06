// Sound browser (Sounds tab): search, categories, groups, three views (cards, list, pads) and an inspector.
// Pictures: pixel art drawn from src/sounds/art.js everywhere, a free photo in the inspector when one exists.
import { CATEGORIES, buildCatalog, auditionCode, usageCode, grooveCode, machineLabel, prettyName } from './catalog.js';
import { artFor, pixelArt } from './art.js';
import { PHOTOS } from './photos.js';

const PAD_KEYS = '1234qwerasdfzxcv';
const PAGE = { cards: 48, list: 150 };

export function createSoundBrowser({ root, store, t, tx, esc, getCustom, play, stop, useSound, toast }) {
  const st = { cat: 'drums', group: 'RolandTR909', q: '', view: store.get('coding-misk-snd-view', 'cards'), sel: null, mode: 'auto', limit: 0, page: 0, favs: new Set(store.get('coding-misk-favs', [])) };
  let items = [], byKey = new Map(), lastSize = 0;
  const refresh = () => {
    const map = globalThis.soundMap && globalThis.soundMap.get ? globalThis.soundMap.get() : {};
    const size = Object.keys(map).length;
    if (size === lastSize) return false;
    lastSize = size; items = buildCatalog(map, getCustom()); byKey = new Map(items.map(x => [x.key, x]));
    return true;
  };
  // the catalogue grows while sample banks load: re-read it until it stops changing
  let quiet = 0;
  const poll = setInterval(() => { if (refresh()) { quiet = 0; if (!root.hidden && root.offsetParent) render(); } else if (++quiet > 30) clearInterval(poll); }, 1000);

  const label = it => it.cat === 'drums' ? it.name : it.cat === 'instruments' ? prettyName(it.name) : it.name;
  const groupLabel = (cat, g) => cat === 'drums' ? machineLabel(g) : g;
  const matches = it => !st.q || `${it.name} ${it.group} ${it.cat === 'drums' ? machineLabel(it.group) : ''}`.toLowerCase().includes(st.q);
  const inCat = it => st.cat === 'favs' ? st.favs.has(it.key) : it.cat === st.cat;
  // la ricerca attraversa tutte le categorie; senza ricerca si sfoglia categoria e gruppo
  function visible() {
    if (st.q) return items.filter(matches);
    const list = items.filter(it => inCat(it));
    if (st.cat === 'favs' || st.group === '*') return list;
    return list.filter(it => it.group === st.group);
  }
  function groups() {
    const g = new Map();
    for (const it of items) if (it.cat === st.cat && matches(it)) g.set(it.group, (g.get(it.group) || 0) + 1);
    return [...g.entries()];
  }
  const px = (it, w) => `<img class="px" alt="" data-art="${esc(it.key)}" data-w="${w}">`;
  // a machine or family icon: the first item of the group stands for it
  const groupPx = (cat, g, w) => { const it = items.find(x => x.cat === cat && x.group === g); return it ? px(it, w) : ''; };

  function render() {
    refresh();
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, items.filter(it => it.cat === c).length]));
    const gs = st.cat === 'favs' || st.q ? [] : groups();
    if (gs.length && st.group !== '*' && !gs.some(([g]) => g === st.group)) st.group = gs[0][0];
    const list = visible();
    const sel = st.sel && byKey.get(st.sel);
    root.innerHTML = `
      <div class="sb-top">
        <input class="sb-search" type="search" value="${esc(st.q)}" placeholder="${esc(t('sbSearch', { n: items.length.toLocaleString() }))}" aria-label="${esc(t('sbSearchAria'))}">
        <div class="chips" role="group" aria-label="${esc(t('sbView'))}">${['cards', 'list', 'pads'].map(v => `<button class="chip" data-sb-view="${v}" aria-pressed="${st.view === v}">${t('sbView_' + v)}</button>`).join('')}</div>
      </div>
      ${st.q ? `<p class="lbl sb-found">${t('sbFound', { n: list.length, q: esc(st.q) })}</p>` : ''}
      <div class="chips sb-cats">${CATEGORIES.map(c => `<button class="chip" data-sb-cat="${c}" aria-pressed="${!st.q && st.cat === c}">${t('sbCat_' + c)} <small>${counts[c]}</small></button>`).join('')}<button class="chip" data-sb-cat="favs" aria-pressed="${st.cat === 'favs'}">★ ${t('sbFavs')} <small>${st.favs.size}</small></button></div>
      <div class="sb-body${gs.length ? '' : ' nogroups'}">
        ${gs.length ? `<div class="sb-groups" role="list">${gs.map(([g, n]) => `<button class="sb-group" data-sb-group="${esc(g)}" aria-current="${st.group === g}"><span>${groupPx(st.cat, g, 24)}</span>${esc(groupLabel(st.cat, g))}<small>${n}</small></button>`).join('')}</div>` : ''}
        <div class="sb-results">${results(list)}</div>
      </div>
      ${inspector(sel)}`;
    hydrate();
  }
  function results(list) {
    if (!list.length) return `<p class="note">${t(items.length ? 'sbNone' : 'sbLoading')}</p>`;
    if (st.view === 'pads') {
      const page = list.slice(st.page * 16, st.page * 16 + 16), pages = Math.ceil(list.length / 16);
      return `<div class="sb-pads">${page.map((it, i) => `<button class="sb-pad" data-sb-pad="${esc(it.key)}" aria-current="${st.sel === it.key}"><b>${esc(label(it))}</b><small>${PAD_KEYS[i].toUpperCase()}</small></button>`).join('')}</div>
        <div class="sb-padnav"><button class="btn small" data-sb-page="-1" ${st.page ? '' : 'disabled'}>◀</button><span class="lbl">${t('sbPage', { a: st.page + 1, b: pages })} · ${t('sbPadKeys')}</span><button class="btn small" data-sb-page="1" ${st.page < pages - 1 ? '' : 'disabled'}>▶</button></div>`;
    }
    const n = PAGE[st.view] + st.limit, shown = list.slice(0, n);
    const more = list.length > n ? `<button class="btn small sb-more" data-sb-more>${t('sbMore', { n: list.length - n })}</button>` : '';
    if (st.view === 'list') return `<div class="sb-list">${shown.map(it => `<button class="sb-row" data-sb-item="${esc(it.key)}" aria-current="${st.sel === it.key}"><span class="sb-play">▶</span><span class="sb-ico">${px(it, 24)}</span><span class="sb-name">${esc(label(it))}</span><span class="sb-meta">${st.q ? esc(t('sbCat_' + it.cat)) + ' · ' : ''}${esc(groupLabel(it.cat, it.group))}</span><span class="sb-meta">${it.n > 1 ? it.n : ''}</span><span class="sb-fav">${st.favs.has(it.key) ? '★' : ''}</span></button>`).join('')}</div>${more}`;
    return `<div class="sb-cards">${shown.map(it => `<button class="sb-card" data-sb-item="${esc(it.key)}" aria-current="${st.sel === it.key}"><span class="sb-art">${px(it, 40)}</span><span class="sb-cname"><b>${esc(label(it))}</b><small>${it.n > 1 ? t('sbVariants', { n: it.n }) : esc(groupLabel(it.cat, it.group))}</small></span>${st.favs.has(it.key) ? '<span class="sb-star">★</span>' : ''}</button>`).join('')}</div>${more}`;
  }
  function inspector(it) {
    if (!it) return `<div class="card sb-insp"><p class="note">${t('sbPick')}</p></div>`;
    const photo = it.cat === 'drums' && PHOTOS[it.group];
    const modes = it.cat === 'drums' || it.cat === 'samples' || it.cat === 'acoustic' || it.cat === 'yours' ? ['auto', 'variants'] : it.group === 'Noise' ? [] : ['auto', 'notes'];
    const use = { drums: 'sbUseKit', instruments: 'sbUseSound', synths: 'sbUseSound', samples: 'sbUseTexture', acoustic: 'sbUseTexture', yours: 'sbUseTexture' }[it.cat];
    return `<div class="card sb-insp">
      <div class="sb-photo">${photo ? `<img src="${photo.file}" alt="${esc(machineLabel(it.group))}"><a class="sb-credit" href="${photo.page}" target="_blank" rel="noopener">${esc(photo.credit)}</a>` : px(it, 64)}</div>
      <div class="sb-info"><b>${esc(it.cat === 'drums' ? `${machineLabel(it.group)} · ${it.name}` : label(it))}</b><span class="lbl">${esc(t('sbCat_' + it.cat))} · ${esc(groupLabel(it.cat, it.group))}${it.n > 1 ? ' · ' + t('sbVariants', { n: it.n }) : ''}</span>
        <code>${esc(usageCode(it))}</code>
        ${modes.length ? `<div class="chips">${modes.map(m => `<button class="chip" data-sb-mode="${m}" aria-pressed="${st.mode === m}">${t('sbMode_' + (m === 'auto' ? (it.cat === 'instruments' || it.cat === 'synths' ? 'chords' : 'rhythm') : m))}</button>`).join('')}${it.cat === 'drums' ? `<button class="chip" data-sb-groove>${t('sbGroove')}</button>` : ''}</div>` : ''}
      </div>
      <div class="sb-actions"><button class="btn primary" data-sb-play>${t('sbPlay')}</button><button class="btn" data-sb-stop>${t('stop')}</button><button class="btn" data-sb-use>${t(use)}</button><button class="btn" data-sb-copy>${t('copy')}</button><button class="btn" data-sb-fav aria-pressed="${st.favs.has(it.key)}">${st.favs.has(it.key) ? '★' : '☆'} ${t('sbFav')}</button></div>
    </div>`;
  }
  function hydrate() {
    root.querySelectorAll('img.px:not([src])').forEach(img => {
      const it = byKey.get(img.dataset.art); if (!it) return;
      pixelArt(`${it.cat}:${it.group}:${it.cat === 'drums' ? '' : it.name}`, artFor(it), +img.dataset.w).then(src => { if (src) img.src = src; });
    });
  }
  const audition = it => play(auditionCode(it, st.mode), label(it));
  const oneShot = it => {
    try {
      const ctx = globalThis.getAudioContext(), v = it.cat === 'drums' ? { s: it.name, bank: it.group } : it.cat === 'instruments' || it.cat === 'synths' ? { s: it.name, note: 57 } : { s: it.name, n: 0 };
      Promise.resolve(globalThis.initAudio && globalThis.initAudio()).then(() => globalThis.superdough(v, ctx.currentTime + .02, .4));
    } catch (e) { audition(it); }
  };
  const select = (key, then) => { st.sel = key; st.mode = 'auto'; render(); if (then) then(byKey.get(key)); };
  const saveFavs = () => store.set('coding-misk-favs', [...st.favs]);

  root.addEventListener('input', e => {
    if (!e.target.matches('.sb-search')) return;
    st.q = e.target.value.trim().toLowerCase(); st.limit = 0; st.page = 0;
    const pos = e.target.selectionStart; render();
    const s = root.querySelector('.sb-search'); s.focus(); s.setSelectionRange(pos, pos);
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.sbView) { st.view = d.sbView; st.page = 0; store.set('coding-misk-snd-view', st.view); return render(); }
    if (d.sbCat) { st.cat = d.sbCat; st.group = ''; st.q = ''; st.limit = 0; st.page = 0; return render(); }
    if (d.sbGroup) { st.group = d.sbGroup; st.limit = 0; st.page = 0; return render(); }
    if (d.sbMore !== undefined) { st.limit += PAGE[st.view]; return render(); }
    if (d.sbPage) { st.page += +d.sbPage; return render(); }
    if (d.sbItem) return select(d.sbItem, audition);
    if (d.sbPad) { const it = byKey.get(d.sbPad); oneShot(it); st.sel = it.key; root.querySelectorAll('.sb-pad').forEach(p => p.setAttribute('aria-current', p === b)); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); const ins = root.querySelector('.sb-insp'); if (ins) { ins.outerHTML = inspector(it); hydrate(); } return; }
    const it = st.sel && byKey.get(st.sel); if (!it) return;
    if (d.sbMode) { st.mode = d.sbMode; audition(it); return render(); }
    if (d.sbGroove !== undefined) return play(grooveCode(it.group, items.filter(x => x.cat === 'drums' && x.group === it.group).map(x => x.name)), machineLabel(it.group));
    if (d.sbPlay !== undefined) return audition(it);
    if (d.sbStop !== undefined) return stop();
    if (d.sbUse !== undefined) return toast(useSound(it));
    if (d.sbCopy !== undefined) { try { navigator.clipboard.writeText(usageCode(it)).then(() => toast(t('copied')), () => toast(t('copyNo'))); } catch (err) { toast(t('copyNo')); } return; }
    if (d.sbFav !== undefined) { if (st.favs.has(it.key)) st.favs.delete(it.key); else st.favs.add(it.key); saveFavs(); return render(); }
  });
  // pads with the keyboard: 1-4, Q-R, A-F, Z-V (only in the pads view, not while typing)
  document.addEventListener('keydown', e => {
    if (st.view !== 'pads' || root.hidden || !root.offsetParent || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable], strudel-editor')) return;
    const i = PAD_KEYS.indexOf(e.key.toLowerCase()); if (i < 0) return;
    const pad = root.querySelectorAll('.sb-pad')[i]; if (!pad) return;
    e.preventDefault(); pad.click();
  });
  return { render, refresh };
}
