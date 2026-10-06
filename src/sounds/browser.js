// Sound browser (Sounds tab): search, categories, a library of instruments, three views (cards, list, pads)
// and an inspector for the selected instrument or sound.
// Pictures: pixel art drawn from src/sounds/art.js everywhere, a free photo when one exists (drum machines).
import { CATEGORIES, buildCatalog, auditionCode, usageCode, grooveCode, machineLabel, prettyName } from './catalog.js';
import { artFor, pixelArt } from './art.js';
import { PHOTOS } from './photos.js';

const PAD_KEYS = '1234qwerasdfzxcv';
const PAGE = { cards: 48, list: 150 };
const LIB = '*lib'; // group value for the library view (all instruments of a category)

export function createSoundBrowser({ root, store, t, tx, esc, getCustom, play, stop, useSound, toast }) {
  const st = { cat: 'drums', group: LIB, qRaw: '', q: '', view: store.get('coding-misk-snd-view', 'cards'), sel: null, mode: 'auto', variant: null, limit: 0, page: 0, favs: new Set(store.get('coding-misk-favs', [])) };
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

  const label = it => it.cat === 'instruments' ? prettyName(it.name) : it.name;
  const groupLabel = (cat, g) => cat === 'drums' ? machineLabel(g) : g;
  const photoOf = (cat, g) => (cat === 'drums' && PHOTOS[g]) || null;
  // drum abbreviations, so "bass drum", "kick" or "hihat" find bd and hh; every word of the search must match
  const WORDS = { bd: 'bass drum kick', sd: 'snare drum', hh: 'hihat hi-hat closed hat', oh: 'open hihat hat', cp: 'clap handclap', rim: 'rimshot', rs: 'rimshot', cr: 'crash cymbal', rd: 'ride cymbal', lt: 'low tom', mt: 'mid tom', ht: 'high tom', cb: 'cowbell', sh: 'shaker', perc: 'percussion', tb: 'tambourine', misc: 'various' };
  const haystack = it => `${it.name} ${prettyName(it.name)} ${WORDS[it.name] || ''} ${it.group} ${it.cat === 'drums' ? machineLabel(it.group) : ''}`.toLowerCase();
  const matches = it => !st.q || st.q.split(/\s+/).every(w => haystack(it).includes(w));
  const groupItems = (cat, g) => items.filter(x => x.cat === cat && x.group === g);
  function groups() {
    const g = new Map();
    for (const it of items) if (it.cat === st.cat) g.set(it.group, (g.get(it.group) || 0) + 1);
    return [...g.entries()];
  }
  // what the results area shows: search matches, favourites, the library of groups, or the sounds of one group
  function visible() {
    if (st.q) return items.filter(matches);
    if (st.cat === 'favs') return items.filter(it => st.favs.has(it.key));
    return items.filter(it => it.cat === st.cat && it.group === st.group);
  }
  const libraryMode = () => !st.q && st.cat !== 'favs' && st.group === LIB;
  const px = (it, w) => it ? `<img class="px" alt="" data-art="${esc(it.key)}" data-w="${w}">` : '';
  const groupPx = (cat, g, w) => px(items.find(x => x.cat === cat && x.group === g), w);
  // picture of a group: the photo when there is one, otherwise the pixel art
  const groupPic = (cat, g, w) => { const p = photoOf(cat, g); return p ? `<img class="photo" src="${p.file}" alt="">` : groupPx(cat, g, w); };

  function render() {
    refresh();
    const counts = Object.fromEntries(CATEGORIES.map(c => [c, items.filter(it => it.cat === c).length]));
    const gs = st.cat === 'favs' || st.q ? [] : groups();
    if (gs.length && st.group !== LIB && !gs.some(([g]) => g === st.group)) st.group = LIB;
    const lib = libraryMode(), list = lib ? [] : visible();
    const libLabel = t('sbLib_' + st.cat) || t('sbLibrary');
    root.innerHTML = `
      <div class="sb-top">
        <input class="sb-search" type="search" value="${esc(st.qRaw)}" placeholder="${esc(t('sbSearch', { n: items.length.toLocaleString() }))}" aria-label="${esc(t('sbSearchAria'))}">
        <div class="chips" role="group" aria-label="${esc(t('sbView'))}">${['cards', 'list', 'pads'].map(v => `<button class="chip" data-sb-view="${v}" aria-pressed="${st.view === v}">${t('sbView_' + v)}</button>`).join('')}</div>
      </div>
      ${st.q ? `<p class="lbl sb-found">${t('sbFound', { n: list.length, q: esc(st.q) })}</p>` : ''}
      <div class="chips sb-cats">${CATEGORIES.map(c => `<button class="chip" data-sb-cat="${c}" aria-pressed="${!st.q && st.cat === c}">${t('sbCat_' + c)} <small>${counts[c]}</small></button>`).join('')}<button class="chip" data-sb-cat="favs" aria-pressed="${!st.q && st.cat === 'favs'}">★ ${t('sbFavs')} <small>${st.favs.size}</small></button></div>
      <div class="sb-body${gs.length ? '' : ' nogroups'}">
        ${gs.length ? `<div class="sb-groups" role="list"><button class="sb-group lib" data-sb-group="${LIB}" aria-current="${st.group === LIB}"><span>▦</span>${esc(libLabel)}<small>${gs.length}</small></button>${gs.map(([g, n]) => `<button class="sb-group" data-sb-group="${esc(g)}" aria-current="${st.group === g}"><span>${groupPx(st.cat, g, 24)}</span>${esc(groupLabel(st.cat, g))}<small>${n}</small></button>`).join('')}</div>` : ''}
        <div class="sb-results">${lib ? library(gs) : results(list)}</div>
      </div>
      ${inspector()}`;
    hydrate();
    if (!lib && !st.q && st.cat !== 'favs') warmGroup(st.cat, st.group);
  }
  // the library: every instrument of the category as a card (photo or pixel art) or a row
  function library(gs) {
    if (!gs.length) return `<p class="note">${t(items.length ? 'sbNone' : 'sbLoading')}</p>`;
    if (st.view === 'list') return `<div class="sb-list">${gs.map(([g, n]) => `<button class="sb-row lib" data-sb-open="${esc(g)}"><span class="sb-ico">${groupPic(st.cat, g, 24)}</span><span class="sb-name">${esc(groupLabel(st.cat, g))}</span><span class="sb-meta">${t('sbSounds', { n })}</span><span class="sb-meta">${photoOf(st.cat, g) ? t('sbPhoto') : ''}</span></button>`).join('')}</div>`;
    return `<div class="sb-cards lib">${gs.map(([g, n]) => `<button class="sb-card lib" data-sb-open="${esc(g)}"><span class="sb-art">${groupPic(st.cat, g, 48)}</span><span class="sb-cname"><b>${esc(groupLabel(st.cat, g))}</b><small>${t('sbSounds', { n })}</small></span></button>`).join('')}</div>`;
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
    if (st.view === 'list') return `<div class="sb-list">${shown.map(it => `<button class="sb-row" data-sb-item="${esc(it.key)}" aria-current="${st.sel === it.key}"><span class="sb-play">▶</span><span class="sb-ico">${px(it, 24)}</span><span class="sb-name">${esc(label(it))}</span><span class="sb-meta">${st.q ? esc(t('sbCat_' + it.cat)) + ' · ' : ''}${esc(groupLabel(it.cat, it.group))}</span><span class="sb-meta">${it.n > 1 ? t('sbVariants', { n: it.n }) : ''}</span><span class="sb-fav">${st.favs.has(it.key) ? '★' : ''}</span></button>`).join('')}</div>${more}`;
    return `<div class="sb-cards">${shown.map(it => `<button class="sb-card" data-sb-item="${esc(it.key)}" aria-current="${st.sel === it.key}"><span class="sb-art">${px(it, 40)}</span><span class="sb-cname"><b>${esc(label(it))}</b><small>${it.n > 1 ? t('sbVariants', { n: it.n }) : esc(groupLabel(it.cat, it.group))}</small></span>${st.favs.has(it.key) ? '<span class="sb-star">★</span>' : ''}</button>`).join('')}</div>${more}`;
  }
  // picture block of the inspector: the whole photo (click to enlarge) or the pixel art, credit below
  function picture(cat, g, it) {
    const p = photoOf(cat, g);
    if (p) return `<button class="sb-photo" data-sb-zoom="${esc(g)}" aria-label="${esc(t('sbZoom'))}"><img src="${p.file}" alt="${esc(groupLabel(cat, g))}"></button>`;
    return `<div class="sb-photo">${it ? px(it, 64) : groupPx(cat, g, 64)}</div>`;
  }
  const credit = (cat, g) => { const p = photoOf(cat, g); return p ? `<p class="sb-credit">${t('sbPhotoBy')} <a href="${p.page}" target="_blank" rel="noopener">${esc(p.credit)}</a>, Wikimedia Commons</p>` : ''; };
  function inspector() {
    const it = st.sel && byKey.get(st.sel);
    if (it) return soundInspector(it);
    if (!st.q && st.cat !== 'favs' && st.group !== LIB) return groupInspector(st.cat, st.group);
    return `<div class="card sb-insp empty"><p class="note">${t(libraryMode() ? 'sbPickLib' : 'sbPick')}</p></div>`;
  }
  // a machine or family: its picture, its sounds as one-shot chips, a groove, use as kit
  function groupInspector(cat, g) {
    const list = groupItems(cat, g);
    const code = cat === 'drums' ? `s("${list.slice(0, 4).map(x => x.name).join(' ')}").bank("${g}")` : list[0] ? usageCode(list[0]) : '';
    return `<div class="card sb-insp">
      ${picture(cat, g)}
      <div class="sb-info"><b>${esc(groupLabel(cat, g))}</b><span class="lbl">${esc(t('sbCat_' + cat))} · ${t('sbSounds', { n: list.length })}</span>
        <code>${esc(code)}</code>
        <div class="chips sb-snds">${list.slice(0, 40).map(x => `<button class="chip small" data-sb-shot="${esc(x.key)}">${esc(label(x))}</button>`).join('')}</div>
        <div class="sb-actions">${cat === 'drums' ? `<button class="btn primary" data-sb-groove="${esc(g)}">${t('sbGroove')}</button><button class="btn" data-sb-stop>${t('stop')}</button><button class="btn" data-sb-usekit="${esc(g)}">${t('sbUseKit')}</button>` : `<button class="btn" data-sb-stop>${t('stop')}</button>`}</div>
      </div>
      ${credit(cat, g)}
    </div>`;
  }
  function soundInspector(it) {
    const modes = it.cat === 'drums' || it.cat === 'samples' || it.cat === 'acoustic' || it.cat === 'yours' ? ['auto', 'variants'] : it.group === 'Noise' ? [] : ['auto', 'notes'];
    const use = { drums: 'sbUseKit', instruments: 'sbUseSound', synths: 'sbUseSound', samples: 'sbUseTexture', acoustic: 'sbUseTexture', yours: 'sbUseTexture' }[it.cat];
    const code = usageCode(it) + (st.variant ? `.n(${st.variant})` : '');
    return `<div class="card sb-insp">
      ${picture(it.cat, it.group, it)}
      <div class="sb-info"><b>${esc(it.cat === 'drums' ? `${machineLabel(it.group)} · ${it.name}` : label(it))}</b><span class="lbl">${esc(t('sbCat_' + it.cat))} · ${esc(groupLabel(it.cat, it.group))}${it.n > 1 ? ' · ' + t('sbVariants', { n: it.n }) : ''}</span>
        <code>${esc(code)}</code>
        ${modes.length ? `<div class="chips">${modes.map(m => `<button class="chip" data-sb-mode="${m}" aria-pressed="${st.mode === m}">${t('sbMode_' + (m === 'auto' ? (it.cat === 'instruments' || it.cat === 'synths' ? 'chords' : 'rhythm') : m))}</button>`).join('')}${it.cat === 'drums' ? `<button class="chip" data-sb-groove="${esc(it.group)}">${t('sbGroove')}</button>` : ''}</div>` : ''}
        ${it.n > 1 ? `<div class="sb-vars"><span class="lbl">${t('sbVariantPick')}</span><div class="chips">${Array.from({ length: Math.min(it.n, 32) }, (_, i) => `<button class="chip small" data-sb-var="${i}" aria-pressed="${(st.variant || 0) === i}">${i}</button>`).join('')}</div><p class="note">${t('sbVariantHint')}</p></div>` : ''}
        <div class="sb-actions"><button class="btn primary" data-sb-play>${t('sbPlay')}</button><button class="btn" data-sb-stop>${t('stop')}</button><button class="btn" data-sb-use>${t(use)}</button><button class="btn" data-sb-copy>${t('copy')}</button><button class="btn" data-sb-fav aria-pressed="${st.favs.has(it.key)}">${st.favs.has(it.key) ? '★' : '☆'} ${t('sbFav')}</button></div>
      </div>
      ${credit(it.cat, it.group)}
    </div>`;
  }
  function hydrate() {
    root.querySelectorAll('img.px:not([src])').forEach(img => {
      const it = byKey.get(img.dataset.art); if (!it) return;
      pixelArt(`${it.cat}:${it.group}:${it.cat === 'drums' ? '' : it.name}`, artFor(it), +img.dataset.w).then(src => { if (src) img.src = src; });
    });
  }
  // the photo in large, in a modal (Commons serves a bigger version)
  function zoom(g) {
    const p = PHOTOS[g]; if (!p) return;
    const file = decodeURIComponent(p.page.split('File:')[1] || '');
    const box = document.createElement('div');
    box.className = 'sb-modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', machineLabel(g));
    box.innerHTML = `<figure><img src="https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1400" alt="${esc(machineLabel(g))}" onerror="this.src='${p.file}'"><figcaption>${esc(machineLabel(g))} · ${t('sbPhotoBy')} <a href="${p.page}" target="_blank" rel="noopener">${esc(p.credit)}</a></figcaption></figure><button class="btn" data-close>${t('sbClose')}</button>`;
    const close = () => { box.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(box); box.querySelector('[data-close]').focus();
  }
  const voice = (it, extra = {}) => it.cat === 'drums' ? { s: it.name, bank: it.group, ...extra } : it.cat === 'instruments' || it.cat === 'synths' ? { s: it.name, note: 57, ...extra } : { s: it.name, n: 0, ...extra };
  const fire = (v, at = .02, dur = .4) => Promise.resolve(globalThis.initAudio && globalThis.initAudio()).then(() => globalThis.superdough(v, globalThis.getAudioContext().currentTime + at, dur));
  // Strudel loads each variant the first time it is asked for, and skips it if it is late:
  // load them silently first, so the "Variants" audition plays every one
  // a silent trigger makes Strudel download the sample (or the soundfont) ahead of time
  // superdough resolves once the sample is loaded: keep that promise per sound and variant.
  // The silent trigger is scheduled far ahead, so it never counts as late.
  const warmed = new Map();
  const warm = (it, n = 0) => { const k = `${it.key}|${n}`; if (!warmed.has(k)) warmed.set(k, fire(voice(it, { n, gain: 0 }), 3, .05).catch(() => {})); return warmed.get(k); };
  // opening a machine or a family loads all its sounds, so the first click already plays
  let warmedGroup = '';
  const warmGroup = (cat, g) => { if (`${cat}:${g}` === warmedGroup) return; warmedGroup = `${cat}:${g}`; groupItems(cat, g).slice(0, 40).forEach(it => warm(it)); };
  const preloadAll = it => Promise.all(Array.from({ length: Math.min(it.n || 1, 16) }, (_, i) => warm(it, i)));
  // play once the sound is loaded: immediately if it already is, a moment later the first time
  const audition = it => (st.mode === 'variants' && it.n > 1 ? preloadAll(it) : warm(it)).then(() => play(auditionCode(it, st.mode), label(it)));
  const oneShot = (it, extra = {}) => { try { warm(it, extra.n || 0).then(() => fire(voice(it, extra))); } catch (e) { audition(it); } };
  const select = (key, then) => { st.sel = key; st.mode = 'auto'; st.variant = null; render(); if (then) then(byKey.get(key)); };
  const saveFavs = () => store.set('coding-misk-favs', [...st.favs]);
  const refreshInspector = () => { const ins = root.querySelector('.sb-insp'); if (ins) { ins.outerHTML = inspector(); hydrate(); } };

  root.addEventListener('pointerover', e => { const el = e.target.closest('[data-sb-item], [data-sb-pad], [data-sb-shot]'); if (!el) return; const it = byKey.get(el.dataset.sbItem || el.dataset.sbPad || el.dataset.sbShot); if (it && globalThis.getAudioContext && globalThis.getAudioContext().state === 'running') warm(it); });
  root.addEventListener('input', e => {
    if (!e.target.matches('.sb-search')) return;
    // the field keeps what is typed (spaces too); matching uses the trimmed text
    st.qRaw = e.target.value; st.q = st.qRaw.trim().toLowerCase(); st.limit = 0; st.page = 0;
    const pos = e.target.selectionStart; render();
    const s = root.querySelector('.sb-search'); s.focus(); s.setSelectionRange(pos, pos);
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const d = b.dataset;
    if (d.sbView) { st.view = d.sbView; st.page = 0; store.set('coding-misk-snd-view', st.view); return render(); }
    if (d.sbCat) { st.cat = d.sbCat; st.group = LIB; st.qRaw = st.q = ''; st.sel = null; st.limit = 0; st.page = 0; return render(); }
    if (d.sbGroup) { st.group = d.sbGroup; st.sel = null; st.limit = 0; st.page = 0; return render(); }
    if (d.sbOpen) { st.group = d.sbOpen; st.sel = null; st.limit = 0; st.page = 0; return render(); }
    if (d.sbMore !== undefined) { st.limit += PAGE[st.view]; return render(); }
    if (d.sbPage) { st.page += +d.sbPage; return render(); }
    if (d.sbZoom) return zoom(d.sbZoom);
    if (d.sbGroove) return play(grooveCode(d.sbGroove, groupItems('drums', d.sbGroove).map(x => x.name)), machineLabel(d.sbGroove));
    if (d.sbUsekit) { const first = groupItems('drums', d.sbUsekit)[0]; return first && toast(useSound(first)); }
    if (d.sbShot) return oneShot(byKey.get(d.sbShot));
    if (d.sbStop !== undefined) return stop();
    if (d.sbItem) return select(d.sbItem, audition);
    if (d.sbPad) { const it = byKey.get(d.sbPad); oneShot(it); st.sel = it.key; st.variant = null; root.querySelectorAll('.sb-pad').forEach(p => p.setAttribute('aria-current', p === b)); b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 120); return refreshInspector(); }
    const it = st.sel && byKey.get(st.sel); if (!it) return;
    if (d.sbMode) { st.mode = d.sbMode; audition(it); return refreshInspector(); }
    if (d.sbVar !== undefined) { st.variant = +d.sbVar || null; oneShot(it, { n: +d.sbVar }); return refreshInspector(); }
    if (d.sbPlay !== undefined) return audition(it);
    if (d.sbUse !== undefined) return toast(useSound(it));
    if (d.sbCopy !== undefined) { const code = usageCode(it) + (st.variant ? `.n(${st.variant})` : ''); try { navigator.clipboard.writeText(code).then(() => toast(t('copied')), () => toast(t('copyNo'))); } catch (err) { toast(t('copyNo')); } return; }
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
