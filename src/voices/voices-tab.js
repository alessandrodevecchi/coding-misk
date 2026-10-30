// The Voci tab of the Groove Lab (my-phrases D9): four sections as chips, the last one open remembered in this browser
// (coding-misk-voices-sub, not in the backup).
//   mine:    Le mie frasi: search, kind chips with counts, Quanto usarle, groups by kind and tag, rows, the form
//   vocab:   Vocabolari inclusi: the built-in lines, read-only, with Copia nelle mie frasi
//   voices:  Voci e suoni: the speakers, the voice styles to hear, a test bench
//   samples: Campioni: space by class and bank, missing samples, orphan cleanup, temporary samples
// The per-song voice controls stay in Compose and the radio. Strings in both languages (src/i18n.js), drawn icons only.
import { KINDS, TAGS, LANGS, SHARE_LEVELS, groupsOf, matches, textIn, textsOf, textError, overCap, MAX_WORDS } from './phrases.js';
import { MOMENT_GROUPS, POETIC_TAGS } from './moments.js';
import { builtinKeys, classify, totals, phraseFiles, sizeText, CLASSES, bankLang, mineKeys } from './samples.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from '../song/vocabulary.js';
import { PHRASES, SPEAKERS, saySlug, sayBank } from '../song/build.js';
import { POOL } from '../endless/phrases.js';
import { VOICE_STYLES, VOICE_STYLE_IDS } from '../song/format.js';
import { LISTEN, PENCIL, BIN, LOCK, WAVE, MIC, QUILL, COPY, DISK, BROOM, SPARK, CLOCK, PLUS } from '../icons.js';

export const SUB_KEY = 'coding-misk-voices-sub';
export const SECTIONS = ['mine', 'vocab', 'voices', 'samples'];
const KIND_ICON = { voice: WAVE, explain: MIC, poetic: QUILL };
// the fixed test line of the speakers and the voice styles
export const TEST_LINE = { it: 'questa è la mia voce', en: 'this is my voice' };

// phr: the phrase service (service.js); store; t, tx, esc, getLang; helper(): the voice helper runs; files(): the samples
// manifest; recipes: the styles; songs: the built-in and example songs; library(): the user's songs; keys(except): the
// sample keys of D5 (builtin, mine without a phrase, songs); hear({ text, lang, speaker, settings }); samplesChanged():
// after a delete (manifest read again, songs written again); listTemp(text, lang, bank, song)
export function createVoicesTab({ root, phr, store, t, tx, esc, getLang, helper, files, recipes, songs, library, keys, hear, samplesChanged, toast }) {
  let sub = SECTIONS.includes(store.get(SUB_KEY, 'mine')) ? store.get(SUB_KEY, 'mine') : 'mine';
  const ui = { q: '', kind: 'all', form: null, confirm: null, vgroup: 'voice', bench: { text: '', speaker: '', style: 'clear' }, orphans: null, busy: '', usage: null, usageAt: 0 };
  const making = new Set();
  const has = (bank, text) => { const f = (files() || {})[bank] || []; const slug = saySlug(text); return f.some(x => decodeURI(x).endsWith(`/${slug}.wav`)); };
  const ico = (svg, label) => `<span class="vt-ico" title="${esc(label)}">${svg}</span>`;
  const kindLabel = k => t(`phKind:${k}`);
  const tagLabel = (kind, tag) => (!tag ? t('phTagAny') : kind === 'voice' ? t(`vocab:${tag}`) : kind === 'explain' ? t(`phMoment:${tag}`) : t(`phPoetic:${tag}`));
  const status = p => {
    const lang = getLang(), x = textIn(p, lang) || p.text, l = textIn(p, lang) ? lang : p.lang, bank = sayBank(l, '');
    if (has(bank, x)) return 'ok';
    return making.has(`${bank}/${saySlug(x)}`) ? 'wait' : 'none';
  };
  // the samples of a phrase (its text and translation, the default voice): made one at a time by the helper
  async function prepare(p) {
    if (!helper()) return;
    for (const [l, x] of textsOf(p)) {
      const bank = sayBank(l, ''), k = `${bank}/${saySlug(x)}`;
      if (has(bank, x) || making.has(k)) continue;
      making.add(k); render();
      try { await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: x, lang: l, speaker: '' }) }); } catch (e) { /* stays missing */ }
      making.delete(k);
    }
    await samplesChanged(); render();
  }
  async function usage(force = false) {
    if (!helper()) return null;
    if (!force && ui.usage && Date.now() - ui.usageAt < 5000) return ui.usage;
    try { const r = await fetch('/voice/usage'); if (r.ok) { ui.usage = await r.json(); ui.usageAt = Date.now(); } } catch (e) { /* no helper */ }
    return ui.usage;
  }

  // ---------- 1. Le mie frasi ----------
  const tagOptions = (kind, tag) => {
    const opt = (v, l) => `<option value="${esc(v)}"${(tag || '') === v ? ' selected' : ''}>${esc(l)}</option>`;
    if (kind === 'explain') return opt('', t('phTagAny')) + Object.entries(MOMENT_GROUPS).map(([g, list]) => `<optgroup label="${esc(t(`phMomentGroup:${g}`))}">${list.map(m => opt(m, t(`phMoment:${m}`))).join('')}</optgroup>`).join('');
    return opt('', t('phTagAny')) + (TAGS[kind] || []).map(x => opt(x, tagLabel(kind, x))).join('');
  };
  function formHtml() {
    const f = ui.form, p = f.id ? phr.items.find(x => x.id === f.id) : null, other = f.lang === 'it' ? 'en' : 'it';
    const styleChips = recipes.map(r => `<button type="button" class="chip small" data-ph-style="${esc(r.id)}" aria-pressed="${f.styles.includes(r.id)}">${esc(tx(r.name))}</button>`).join('');
    let cost = '';
    if (p) {
      const used = library().filter(s => JSON.stringify(s).includes(JSON.stringify(p.text).slice(1, -1))).length;
      const banks = (ui.usage && ui.usage.banks) ? Object.entries(ui.usage.banks).filter(([b, l]) => textsOf(p).some(([lg, x]) => bankLang(b) === lg && l.some(y => y.f === `${saySlug(x)}.wav`))).map(([b]) => b) : [];
      cost = `<p class="hint muted small">${esc(t('phWhere', { n: used }))}${banks.length ? ` · ${esc(t('phBanks', { list: banks.join(', ') }))}` : ''}</p>`;
    }
    return `<form class="card ph-form" data-ph-form>
      <h3>${esc(t(p ? 'phEditTitle' : 'phNewTitle'))}</h3>
      <label class="ctrl ph-text"><span class="lbl">${esc(t('phText'))}</span><input type="text" data-ph-f="text" maxlength="160" autocomplete="off" spellcheck="false" value="${esc(f.text)}" placeholder="${esc(t('plTextPh', { n: MAX_WORDS }))}"></label>
      <div class="ph-row">
        <label class="ctrl"><span class="lbl">${esc(t('phLang'))}</span><select data-ph-f="lang" data-no-knob>${LANGS.map(l => `<option value="${l}"${f.lang === l ? ' selected' : ''}>${esc(t(`phLang:${l}`))}</option>`).join('')}</select></label>
        <label class="ctrl ph-alt"><span class="lbl">${esc(t('phAlt', { lang: t(`phLang:${other}`) }))}</span><input type="text" data-ph-f="alt" maxlength="160" autocomplete="off" spellcheck="false" value="${esc(f.alt)}" placeholder="${esc(t('phAltPh'))}"></label>
      </div>
      <div class="ph-row">
        <label class="ctrl"><span class="lbl">${esc(t('phKindLbl'))}</span><select data-ph-f="kind" data-no-knob>${KINDS.map(k => `<option value="${k}"${f.kind === k ? ' selected' : ''}>${esc(kindLabel(k))}</option>`).join('')}</select></label>
        <label class="ctrl"><span class="lbl">${esc(t(`phTagLbl:${f.kind}`))}</span><select data-ph-f="tag" data-no-knob>${tagOptions(f.kind, f.tag)}</select></label>
        <label class="ctrl ph-on"><input type="checkbox" data-ph-f="on"${f.on ? ' checked' : ''}> <span>${esc(t('phOn'))}</span></label>
      </div>
      <div class="ph-styles"><span class="lbl">${esc(t('phStyles'))}</span> <span class="hint muted small">${esc(t('phStylesHint'))}</span><div class="chips">${styleChips}</div></div>
      ${p ? `<p class="hint muted small">${esc(t('phSampleLbl'))}: ${esc(t(`phSt:${status(p)}`))}</p>${cost}` : ''}
      <div class="actions"><button class="btn primary" type="submit" data-ph-save>${esc(t('phSaveBtn'))}</button><button class="btn" type="button" data-ph-cancel>${esc(t('nsCancel'))}</button>${p ? `<button class="btn danger" type="button" data-ph-del="${esc(p.id)}">${BIN} ${esc(t('phDelete'))}</button>` : ''}</div>
      <p class="hint muted small ph-err" data-ph-err></p>
    </form>`;
  }
  function confirmHtml() {
    const c = ui.confirm;
    return `<div class="card ph-confirm" role="alertdialog" aria-live="assertive"><p>${esc(c.msg)}</p><div class="actions"><button class="btn danger" data-ph-confirm-yes>${esc(c.yes)}</button><button class="btn" data-ph-confirm-no>${esc(t('nsCancel'))}</button></div></div>`;
  }
  function rowHtml(p) {
    const lang = getLang(), main = textIn(p, lang) || p.text, alt = textIn(p, lang) && p.lang !== lang ? p.text : textIn(p, lang === 'it' ? 'en' : 'it');
    const st = status(p), src = [t(`phSource:${p.source}`), p.from && p.from.song ? p.from.song : '', (p.styles || []).map(id => { const r = recipes.find(x => x.id === id); return r ? tx(r.name) : id; }).join(', ')].filter(Boolean).join(' · ');
    return `<div class="ph-item${p.on === false ? ' off' : ''}" data-ph-id="${esc(p.id)}">
      <div class="ph-acts"><button class="mini" data-ph-hear="${esc(p.id)}" title="${esc(t('phHear'))}" aria-label="${esc(t('phHear'))}">${LISTEN}</button><button class="mini" data-ph-edit="${esc(p.id)}" title="${esc(t('phEdit'))}" aria-label="${esc(t('phEdit'))}">${PENCIL}</button><button class="mini" data-ph-del="${esc(p.id)}" title="${esc(t('phDelete'))}" aria-label="${esc(t('phDelete'))}">${BIN}</button></div>
      <div class="ph-main">${ico(KIND_ICON[p.kind], kindLabel(p.kind))}<span class="ph-text">${esc(main)}</span>${alt ? `<span class="ph-alt muted small">${esc(alt)}</span>` : ''}</div>
      <div class="ph-meta muted small"><span>${esc(src)}</span><span>${esc(t('phUses', { n: p.uses || 0 }))}</span><span class="ph-st ${st}"><span class="ph-led" aria-hidden="true"></span>${esc(t(`phSt:${st}`))}</span>${p.on === false ? `<span>${esc(t('phOffShort'))}</span>` : ''}</div>
    </div>`;
  }
  function mineHtml() {
    const all = phr.items, list = all.filter(p => (ui.kind === 'all' || p.kind === ui.kind) && matches(p, ui.q));
    const counts = Object.fromEntries(KINDS.map(k => [k, all.filter(p => p.kind === k).length]));
    const share = phr.settings.share, over = overCap({ items: all });
    const kinds = [['all', all.length], ...KINDS.map(k => [k, counts[k]])].map(([k, n]) => `<button class="chip small" data-ph-kind="${k}" aria-pressed="${ui.kind === k}">${k === 'all' ? esc(t('phAll')) : `${KIND_ICON[k]} ${esc(kindLabel(k))}`} <span class="muted">${n}</span></button>`).join('');
    const seg = `<div class="ph-share seg" role="radiogroup" aria-label="${esc(t('phShareLbl'))}">${SHARE_LEVELS.map(l => `<button class="chip small" role="radio" data-ph-share="${l}" aria-checked="${share === l}" aria-pressed="${share === l}">${esc(t(`phShare:${l}`))}</button>`).join('')}</div>`;
    const groups = groupsOf(list).map(g => `<div class="ph-group"><h4 class="lbl">${KIND_ICON[g.kind]} ${esc(kindLabel(g.kind))} · ${esc(tagLabel(g.kind, g.tag))} <span class="muted">${g.items.length}</span></h4>${g.items.map(rowHtml).join('')}</div>`).join('');
    return `<div class="ph-top lib-top"><input type="search" class="sb-search" data-ph-q placeholder="${esc(t('phSearch'))}" aria-label="${esc(t('phSearch'))}" value="${esc(ui.q)}"><button class="btn primary" data-ph-new>${PLUS} ${esc(t('phNew'))}</button></div>
      <div class="chips ph-kinds">${kinds}</div>
      <div class="ph-share-row"><span class="lbl">${esc(t('phShareLbl'))}</span>${seg}<span class="hint muted small">${esc(t(`phShareHint:${share}`))}</span></div>
      ${over.length ? `<p class="hint ph-over">${esc(t('phOverCap', { n: over.length }))} <button class="btn small" data-ph-trim>${esc(t('phTrim', { n: over.length }))}</button></p>` : ''}
      ${ui.confirm ? confirmHtml() : ''}${ui.form ? formHtml() : ''}
      ${groups || `<p class="muted ph-empty">${esc(t(all.length ? 'phNoMatch' : 'phEmpty'))}</p>`}`;
  }

  // ---------- 2. Vocabolari inclusi ----------
  // [{ id, kind, title, rows: [{ en, it, kind, tag }] }]
  function vocabGroups() {
    const out = [];
    for (const g of VOCAB_GROUPS) out.push({ id: `voice-${g}`, family: 'voice', title: `${t('phKind:voice')} · ${t(`vocab:${g}`)}`, rows: VOCABULARY[g].map(x => ({ ...x, kind: 'voice', tag: g })) });
    const PM = { start: 'start', drums: 'drums', bass: 'bass', guitar: 'guitar', hook: 'lead', arp: 'arp', pad: 'pad', riser: 'riser', texture: 'texture', code: 'code', spoken: 'voice', less: 'less', breakdown: 'breakdown', end: 'end' };
    out.push({ id: 'explain-compose', family: 'explain', title: `${t('phKind:explain')} · ${t('phComposeMoments')}`, rows: Object.entries(PHRASES).map(([k, x]) => ({ ...x, kind: 'explain', tag: PM[k] })) });
    const RM = { 'song-start': 'start', 'song-end': 'end', 'add-drums': 'drums', 'add-bass': 'bass', 'add-lead': 'lead', 'add-pad': 'pad', 'add-guitar': 'guitar', 'add-texture': 'texture', 'add-riser': 'riser', strip: 'less', variation: 'variation', brighter: 'brighter', darker: 'darker', dirtier: 'dirtier', cleaner: 'cleaner', 'more-space': 'space', break: 'breakdown', drop: 'drop' };
    out.push({ id: 'explain-radio', family: 'explain', title: `${t('phKind:explain')} · ${t('phRadioMoves')}`, rows: Object.entries(POOL).flatMap(([k, l]) => l.map(([en, it]) => ({ en, it, kind: 'explain', tag: RM[k] }))) });
    out.push({ id: 'poetic-entries', family: 'poetic', title: `${t('phKind:poetic')} · ${t('phPoeticEntries')}`, rows: Object.entries(POETIC).filter(([k]) => k !== 'move').flatMap(([k, l]) => l.map(x => ({ ...x, kind: 'poetic', tag: k === 'any' ? null : k }))) });
    out.push({ id: 'poetic-move', family: 'poetic', title: `${t('phKind:poetic')} · ${t('phPoetic:move')}`, rows: POETIC.move.map(x => ({ ...x, kind: 'poetic', tag: 'move' })) });
    for (const r of recipes) {
      const rows = [];
      if (r.spoken && r.spoken.lines) for (const l of Object.values(r.spoken.lines)) for (const x of l || []) rows.push({ ...(typeof x === 'string' ? { en: x } : x), kind: 'voice', tag: VOCAB_GROUPS.includes(r.spoken.vocab) ? r.spoken.vocab : null, style: r.id });
      if (r.narrator && typeof r.narrator === 'object' && r.narrator.lines) for (const [k, l] of Object.entries(r.narrator.lines)) for (const x of l || []) rows.push({ ...x, kind: 'poetic', tag: POETIC_TAGS.includes(k) ? k : null, style: r.id });
      if (rows.length) out.push({ id: `style-${r.id}`, family: 'style', title: `${t('phFromStyle')} · ${tx(r.name)}`, rows });
    }
    return out;
  }
  function vocabHtml() {
    const groups = vocabGroups(), cur = groups.find(g => g.id === ui.vgroup) || groups[0], lang = getLang();
    const banks = [sayBank(lang, ''), ...SPEAKERS.map(s => sayBank(lang, s))];
    const nav = `<div class="vt-nav" role="tablist">${groups.map(g => `<button class="chip small" role="tab" data-vt-group="${esc(g.id)}" aria-pressed="${g.id === cur.id}" aria-selected="${g.id === cur.id}">${esc(g.title)} <span class="muted">${g.rows.length}</span></button>`).join('')}</div>`;
    const rows = cur.rows.map((x, i) => {
      const main = x[lang] || x.en, other = x[lang === 'it' ? 'en' : 'it'];
      const dots = banks.map(b => `<span class="vt-dot ${has(b, main) ? 'ok' : 'none'}" title="${esc(`${b}: ${t(has(b, main) ? 'phSt:ok' : 'phSt:none')}`)}"></span>`).join('');
      const mine = phr.isSaved(main, lang, x.kind);
      return `<div class="ph-item vt-row" data-vt-i="${i}">
        <div class="ph-acts"><button class="mini" data-vt-hear="${i}" title="${esc(t('phHear'))}" aria-label="${esc(t('phHear'))}">${LISTEN}</button><button class="mini" data-vt-copy="${i}" title="${esc(t('phCopy'))}" aria-label="${esc(t('phCopy'))}"${mine ? ' disabled' : ''}>${COPY}</button></div>
        <div class="ph-main">${ico(KIND_ICON[x.kind], kindLabel(x.kind))}<span class="ph-text">${esc(main || '')}</span>${other ? `<span class="ph-alt muted small">${esc(other)}</span>` : ''}</div>
        <div class="ph-meta muted small"><span>${esc(tagLabel(x.kind, x.tag))}</span><span class="vt-dots" aria-label="${esc(t('phBanksDots'))}">${dots}</span>${mine ? `<span>${esc(t('svTypedSaved'))}</span>` : ''}</div></div>`;
    }).join('');
    return `<p class="hint muted small">${LOCK} ${esc(t('phVocabIntro'))}</p>${nav}<div class="vt-list">${rows}</div>`;
  }

  // ---------- 3. Voci e suoni ----------
  function voicesHtml() {
    const u = ui.usage, banks = u ? u.banks : null, man = files() || {}, lang = getLang();
    const count = b => (banks ? (banks[b] || []).length : (man[b] || []).length);
    const cards = ['', ...SPEAKERS].map(sp => {
      const name = sp ? sp[0].toUpperCase() + sp.slice(1) : t('phDefaultVoice');
      const per = LANGS.map(l => {
        const sys = u && u.voices ? u.voices[l][sp] : undefined;
        const v = sys === undefined ? '' : sys ? esc(sys) : `<span class="ph-st none"><span class="ph-led"></span>${esc(t('phNotInstalled', { lang: t(`phLang:${l}`) }))}</span>`;
        return `<li><span class="lbl">${esc(t(`phLang:${l}`))}</span> ${v} <span class="muted small">${esc(t('phSamplesN', { n: count(sayBank(l, sp)) }))}</span></li>`;
      }).join('');
      return `<article class="card vt-speaker" data-vt-speaker="${esc(sp)}"><h4>${MIC} ${esc(name)} <button class="mini" data-vt-sp-hear="${esc(sp)}" title="${esc(t('phHearTest'))}" aria-label="${esc(t('phHearTest'))}">${LISTEN}</button></h4><ul class="vt-langs">${per}</ul></article>`;
    }).join('');
    const styles = VOICE_STYLE_IDS.map(id => `<button class="chip small vt-style" data-vt-style="${id}" title="${esc(t('phHearStyle'))}">${LISTEN} ${esc(t(`voiceStyle:${id}`))}</button>`).join('');
    const b = ui.bench;
    const bench = `<div class="card vt-bench"><h4>${SPARK} ${esc(t('phBench'))}</h4>
      <div class="ph-row"><label class="ctrl ph-text"><span class="lbl">${esc(t('phText'))}</span><input type="text" data-vt-bench="text" maxlength="160" autocomplete="off" spellcheck="false" value="${esc(b.text)}" placeholder="${esc(TEST_LINE[lang])}"></label></div>
      <div class="ph-row"><label class="ctrl"><span class="lbl">${esc(t('phSpeaker'))}</span><select data-vt-bench="speaker" data-no-knob>${['', ...SPEAKERS].map(sp => `<option value="${sp}"${b.speaker === sp ? ' selected' : ''}>${esc(sp ? sp[0].toUpperCase() + sp.slice(1) : t('phDefaultVoice'))}</option>`).join('')}</select></label>
      <label class="ctrl"><span class="lbl">${esc(t('phVoiceStyle'))}</span><select data-vt-bench="style" data-no-knob>${VOICE_STYLE_IDS.map(id => `<option value="${id}"${b.style === id ? ' selected' : ''}>${esc(t(`voiceStyle:${id}`))}</option>`).join('')}</select></label></div>
      <div class="actions"><button class="btn primary" data-vt-bench-hear>${LISTEN} ${esc(t('phListen'))}</button><button class="btn" data-vt-bench-save>${esc(t('phSaveMine'))}</button></div>
      <p class="hint muted small">${esc(t('phBenchHint'))}</p></div>`;
    return `<p class="hint muted small">${esc(t('phVoicesIntro'))}</p>${helper() ? '' : `<p class="hint">${esc(t('phNoHelper'))}</p>`}<div class="vt-speakers">${cards}</div>
      <div class="lbl">${esc(t('phVoiceStyles'))}</div><div class="chips vt-styles">${styles}</div>${bench}`;
  }

  // ---------- 4. Campioni ----------
  function missingList() {
    // my phrases first (their texts and translations), then the built-in lines, in the default voice's banks
    const lang = getLang(), out = [], seen = new Set();
    const push = (l, x, mine) => { const bank = sayBank(l, ''), k = `${bank}/${saySlug(x)}`; if (!x || seen.has(k) || has(bank, x) || textError(x)) return; seen.add(k); out.push({ text: x, lang: l, bank, mine }); };
    for (const p of phr.items) for (const [l, x] of textsOf(p)) push(l, x, true);
    // (a built-in line is missing when no voice of its language has it: the speakers' own banks are check:samples' job)
    const any = (l, x) => { const slug = saySlug(x); return Object.entries(files() || {}).some(([b, f]) => b.startsWith(`say_${l}`) && f.some(y => decodeURI(y).endsWith(`/${slug}.wav`))); };
    for (const g of vocabGroups()) for (const r of g.rows) for (const l of LANGS) if (r[l] && !any(l, r[l])) push(l, r[l], false);
    void lang;
    return out;
  }
  function samplesHtml() {
    const lang = getLang(), missing = missingList();
    if (!helper()) {
      const man = files() || {}, banks = Object.keys(man).filter(b => /^say_/.test(b)).sort();
      return `<p class="hint">${esc(t('phNoHelperSamples'))}</p><table class="vt-banks"><thead><tr><th>${esc(t('phBank'))}</th><th>${esc(t('phFiles'))}</th></tr></thead><tbody>${banks.map(b => `<tr><td>${esc(b)}</td><td>${man[b].length}</td></tr>`).join('')}</tbody></table>
        <p class="muted small">${esc(t('phMissingN', { n: missing.length }))}</p>`;
    }
    const u = ui.usage;
    if (!u) { usage().then(() => render()); return `<p class="muted">${esc(t('phLoading'))}</p>`; }
    const k = keys(), rows = classify(u.banks, { ...k, temp: u.temp || {} }), T = totals(rows);
    const cls = CLASSES.map(c => `<div class="vt-class vt-${c}"><span class="lbl">${esc(t(`phClass:${c}`))}</span><span class="vt-n">${T.classes[c].n}</span><span class="muted small">${esc(sizeText(T.classes[c].b))}</span></div>`).join('');
    const banks = Object.entries(T.banks).map(([b, x]) => `<tr><td>${esc(b)}</td><td>${x.n}</td><td>${esc(sizeText(x.b))}</td><td>${x.mine}</td><td>${x.temp}</td><td>${x.orphan}</td></tr>`).join('');
    const temp = Object.entries(u.temp || {}).filter(([rel]) => rows.some(r => r.rel === rel && r.cls === 'temp')).map(([rel, e]) => `<li data-vt-temp="${esc(rel)}">${CLOCK} <span class="ph-text">${esc(e.text || rel)}</span> <span class="muted small">${esc(rel)} · ${esc(t('phExpires', { at: new Date(e.expires).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' }) }))}</span>
      ${e.text ? `<button class="btn small" data-vt-temp-save="${esc(rel)}">${esc(t('phSaveMine'))}</button>` : ''}<button class="btn small" data-vt-temp-del="${esc(rel)}">${esc(t('phDeleteNow'))}</button></li>`).join('');
    const orphans = rows.filter(r => r.cls === 'orphan'), ob = orphans.reduce((a, r) => a + r.b, 0);
    const olist = ui.orphans ? `<div class="card vt-orphans"><p>${esc(t('phOrphansList', { n: orphans.length, size: sizeText(ob) }))}</p><ul class="vt-olist">${orphans.slice(0, 400).map(r => `<li><span>${esc(r.f.replace(/\.wav$/, ''))}</span> <span class="muted small">${esc(r.bank)} · ${esc(sizeText(r.b))}</span></li>`).join('')}</ul>
      <div class="actions">${orphans.length ? `<button class="btn danger" data-vt-orphans-yes>${BROOM} ${esc(t('phOrphansDelete', { n: orphans.length, size: sizeText(ob) }))}</button>` : ''}<button class="btn" data-vt-orphans-no>${esc(t('nsCancel'))}</button></div></div>` : '';
    return `<div class="vt-space"><span class="lbl">${DISK} ${esc(t('phSpace'))}</span><span class="vt-lcd">${esc(sizeText(T.total.b))} · ${T.total.n}</span></div>
      <div class="vt-classes">${cls}</div>
      <div class="actions"><button class="btn" data-vt-prepare${missing.length && !ui.busy ? '' : ' disabled'}>${SPARK} ${esc(ui.busy || t('phPrepare', { n: missing.length }))}</button><button class="btn" data-vt-orphans${ui.busy ? ' disabled' : ''}>${BROOM} ${esc(t('phOrphans', { n: orphans.length }))}</button></div>
      ${olist}
      <details class="vt-missing"><summary class="lbl">${esc(t('phMissingN', { n: missing.length }))}</summary><ul>${missing.slice(0, 200).map(x => `<li>${esc(x.text)} <span class="muted small">${esc(x.bank)}${x.mine ? ` · ${esc(t('phMine'))}` : ''}</span></li>`).join('')}</ul></details>
      <div class="lbl">${esc(t('phTemp'))}</div>${temp ? `<ul class="vt-temp">${temp}</ul>` : `<p class="muted small">${esc(t('phTempNone'))}</p>`}
      <div class="vt-table-wrap"><table class="vt-banks"><thead><tr><th>${esc(t('phBank'))}</th><th>${esc(t('phFiles'))}</th><th>${esc(t('phSize'))}</th><th>${esc(t('phClass:mine'))}</th><th>${esc(t('phClass:temp'))}</th><th>${esc(t('phClass:orphan'))}</th></tr></thead><tbody>${banks}</tbody></table></div>`;
  }

  // ---------- render ----------
  function render() {
    if (!root || root.hidden) return;
    const active = document.activeElement, keep = active && root.contains(active) && active.matches('input[type="text"], input[type="search"]') ? { sel: active.dataset.phF ? `[data-ph-f="${active.dataset.phF}"]` : active.dataset.vtBench ? `[data-vt-bench="${active.dataset.vtBench}"]` : active.matches('[data-ph-q]') ? '[data-ph-q]' : null, at: active.selectionStart } : null;
    const chips = SECTIONS.map(s => `<button class="chip vt-sub" role="tab" data-vt-sub="${s}" aria-pressed="${sub === s}" aria-selected="${sub === s}">${esc(t(`phSub:${s}`))}</button>`).join('');
    const body = sub === 'mine' ? mineHtml() : sub === 'vocab' ? vocabHtml() : sub === 'voices' ? voicesHtml() : samplesHtml();
    root.innerHTML = `<p class="intro">${esc(t('introVoices'))}</p><div class="chips vt-subs" role="tablist">${chips}</div><div class="vt-body vt-${sub}">${body}</div>`;
    if (keep && keep.sel) { const el = root.querySelector(keep.sel); if (el) { el.focus(); try { el.setSelectionRange(keep.at, keep.at); } catch (e) { /* number inputs */ } } }
    if ((sub === 'voices' || sub === 'samples') && helper() && !ui.usage) usage().then(u => { if (u) render(); });
  }
  function show(s) { if (SECTIONS.includes(s)) { sub = s; store.set(SUB_KEY, s); } ui.usage = null; render(); }

  // ---------- actions ----------
  async function deletePhrase(id) {
    const p = phr.items.find(x => x.id === id); if (!p) return;
    const u = await usage(true), k = keys(id), pf = u ? phraseFiles(p, u.banks, k) : { files: [], kept: [] };
    const songsWith = library().filter(s => JSON.stringify(s).includes(JSON.stringify(p.text).slice(1, -1))).length;
    const size = pf.files.reduce((a, x) => a + x.b, 0);
    ui.confirm = { msg: t('phDeleteAsk', { text: p.text, n: pf.files.length, size: sizeText(size), songs: songsWith }), yes: t('phDelete'), run: async () => {
      const r = phr.remove(id);
      if (pf.files.length && helper()) {
        try { await fetch('/voice/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: pf.files.map(x => x.rel), protect: [...k.builtin, ...k.mine, ...k.songs] }) }); } catch (e) { /* the files stay */ }
        await samplesChanged();
      }
      ui.usage = null; render();
      toast(t('phDeleted', { text: p.text }), [{ label: t('vinstUndo'), run: () => { phr.restore(r.removed, r.at); prepare(r.removed); } }]);
    } };
    ui.form = null; render();
  }
  function openForm(id = null) {
    const p = id ? phr.items.find(x => x.id === id) : null, lang = getLang();
    ui.form = p ? { id: p.id, text: p.text, lang: p.lang, alt: textIn(p, p.lang === 'it' ? 'en' : 'it') || '', kind: p.kind, tag: p.tag || '', styles: [...(p.styles || [])], on: p.on !== false }
      : { id: null, text: '', lang, alt: '', kind: 'explain', tag: '', styles: [], on: true };
    ui.confirm = null; sub = 'mine'; render();
    const i = root.querySelector('[data-ph-f="text"]'); if (i) i.focus();
  }
  function readForm() {
    const f = ui.form, v = sel => { const el = root.querySelector(`[data-ph-f="${sel}"]`); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
    for (const k of ['text', 'lang', 'alt', 'kind', 'tag', 'on']) { const x = v(k); if (x !== undefined) f[k] = x; }
  }
  async function saveForm() {
    readForm();
    const f = ui.form, other = f.lang === 'it' ? 'en' : 'it', err = textError(f.text) || (f.alt.trim() && textError(f.alt));
    const errEl = root.querySelector('[data-ph-err]');
    if (err) { if (errEl) errEl.textContent = t(`phErr:${err}`, { n: MAX_WORDS }); return; }
    const input = { text: f.text, lang: f.lang, alt: f.alt.trim() ? { [other]: f.alt.trim() } : {}, kind: f.kind, tag: f.tag || null, styles: f.styles, on: !!f.on };
    if (f.id) {
      const before = phr.items.find(x => x.id === f.id), u = before ? await usage(true) : null;
      const r = phr.edit(f.id, input);
      if (r.error) { if (errEl) errEl.textContent = t(r.error === 'exists' ? 'phErr:exists' : `phErr:${r.error}`, { n: MAX_WORDS }); return; }
      // a changed text: the old sample becomes temporary if nothing else uses it (D7)
      if (u && before && (before.text !== r.phrase.text || JSON.stringify(before.alt) !== JSON.stringify(r.phrase.alt))) {
        const k = keys(), stale = phraseFiles(before, u.banks, { ...k, mine: mineKeys(phr.items) }).files;
        if (stale.length && helper()) fetch('/voice/keep', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ add: stale.map(x => ({ file: x.rel, ms: phr.tempMs(), song: 'voci', text: before.text })) }) }).catch(() => {});
      }
      ui.form = null; render(); toast(t('phEdited')); prepare(r.phrase);
    } else {
      const r = phr.add({ ...input, source: 'tab' });
      if (r.error) { if (errEl) errEl.textContent = t(`phErr:${r.error}`, { n: MAX_WORDS }); return; }
      ui.form = null; render(); toast(r.added ? t('phAdded') : t('phKnown')); prepare(r.phrase);
    }
  }
  async function hearPhrase(p) {
    const lang = getLang(), x = textIn(p, lang) || p.text, l = textIn(p, lang) ? lang : p.lang;
    await hear({ text: x, lang: l, speaker: '' });
    render();
  }

  root.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b || !root.contains(b)) return;
    const d = b.dataset;
    if (d.vtSub) return show(d.vtSub);
    if (d.phKind) { ui.kind = d.phKind; return render(); }
    if (d.phShare) { phr.setSettings({ share: d.phShare }); return render(); }
    if (d.phNew !== undefined) return openForm();
    if (d.phEdit) return openForm(d.phEdit);
    if (d.phCancel !== undefined) { ui.form = null; return render(); }
    if (d.phSave !== undefined) { e.preventDefault(); return saveForm(); }
    if (d.phDel) return deletePhrase(d.phDel);
    if (d.phHear) { const p = phr.items.find(x => x.id === d.phHear); if (p) hearPhrase(p); return; }
    if (d.phStyle) { readForm(); const s = ui.form.styles, i = s.indexOf(d.phStyle); if (i >= 0) s.splice(i, 1); else s.push(d.phStyle); return render(); }
    if (d.phConfirmYes !== undefined) { const c = ui.confirm; ui.confirm = null; if (c) await c.run(); return render(); }
    if (d.phConfirmNo !== undefined) { ui.confirm = null; return render(); }
    if (d.phTrim !== undefined) {
      const over = overCap({ items: phr.items });
      ui.confirm = { msg: t('phTrimAsk', { n: over.length }), yes: t('phDelete'), run: async () => { for (const p of over) phr.remove(p.id); toast(t('phTrimmed', { n: over.length })); } };
      return render();
    }
    if (d.vtGroup) { ui.vgroup = d.vtGroup; return render(); }
    if (d.vtHear !== undefined || d.vtCopy !== undefined) {
      const g = vocabGroups().find(x => x.id === ui.vgroup) || vocabGroups()[0], r = g.rows[+(d.vtHear ?? d.vtCopy)], lang = getLang();
      if (!r) return;
      const main = r[lang] || r.en, l = r[lang] ? lang : 'en', other = l === 'it' ? 'en' : 'it';
      if (d.vtHear !== undefined) return hear({ text: main, lang: l, speaker: '' });
      const x = phr.add({ text: main, lang: l, alt: r[other] ? { [other]: r[other] } : {}, kind: r.kind, tag: r.tag || null, styles: r.style ? [r.style] : [], source: 'copy' });
      if (!x.error) { toast(t(x.added ? 'phCopied' : 'phKnown')); render(); }
      return;
    }
    if (d.vtSpHear !== undefined) { const lang = getLang(); return hear({ text: TEST_LINE[lang], lang, speaker: d.vtSpHear, temp: true }); }
    if (d.vtStyle) { const lang = getLang(); return hear({ text: TEST_LINE[lang], lang, speaker: '', settings: VOICE_STYLES[d.vtStyle], temp: true }); }
    if (d.vtBenchHear !== undefined || d.vtBenchSave !== undefined) {
      const lang = getLang(), text = (ui.bench.text || '').trim() || TEST_LINE[lang];
      if (textError(text)) return toast(t(`phErr:${textError(text)}`, { n: MAX_WORDS }));
      if (d.vtBenchHear !== undefined) return hear({ text, lang, speaker: ui.bench.speaker, settings: VOICE_STYLES[ui.bench.style], temp: true });
      const r = phr.add({ text, lang, kind: 'voice', tag: null, styles: [], source: 'tab' });
      if (!r.error) { toast(t(r.added ? 'phAdded' : 'phKnown')); prepare(r.phrase); }
      return;
    }
    if (d.vtPrepare !== undefined) {
      const list = missingList();
      for (let i = 0; i < list.length; i++) {
        ui.busy = t('phPreparing', { i: i + 1, n: list.length }); render();
        try { await fetch('/voice/say', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: list[i].text, lang: list[i].lang, speaker: '' }) }); } catch (err) { break; }
      }
      ui.busy = ''; await samplesChanged(); ui.usage = null; return render();
    }
    if (d.vtOrphans !== undefined) { ui.orphans = true; await usage(true); return render(); }
    if (d.vtOrphansNo !== undefined) { ui.orphans = null; return render(); }
    if (d.vtOrphansYes !== undefined) {
      const u = await usage(true), k = keys(), orphans = classify(u.banks, { ...k, temp: u.temp || {} }).filter(r => r.cls === 'orphan');
      try { await fetch('/voice/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: orphans.map(r => r.rel), protect: [...k.builtin, ...k.mine, ...k.songs] }) }); } catch (err) { /* nothing deleted */ }
      ui.orphans = null; ui.usage = null; await samplesChanged(); toast(t('phOrphansDone', { n: orphans.length })); return render();
    }
    if (d.vtTempDel) {
      const k = keys();
      try { await fetch('/voice/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ files: [d.vtTempDel], protect: [...k.builtin, ...k.mine, ...k.songs] }) }); } catch (err) { /* stays */ }
      ui.usage = null; await samplesChanged(); return render();
    }
    if (d.vtTempSave) {
      const u = await usage(true), e2 = u && u.temp ? u.temp[d.vtTempSave] : null;
      if (e2 && e2.text) { const r = phr.add({ text: e2.text, lang: e2.lang || bankLang(d.vtTempSave.split('/')[0]), kind: 'voice', tag: null, styles: [], source: 'tab' }); if (!r.error) toast(t('phSaved')); }
      ui.usage = null; return render();
    }
  });
  root.addEventListener('input', e => {
    const el = e.target;
    if (el.matches('[data-ph-q]')) { ui.q = el.value; render(); }
    else if (el.matches('[data-vt-bench="text"]')) ui.bench.text = el.value;
  });
  root.addEventListener('change', e => {
    const el = e.target;
    if (el.matches('[data-ph-f="kind"]')) { readForm(); ui.form.tag = ''; render(); }
    else if (el.matches('[data-ph-f="lang"]')) readForm();
    else if (el.matches('[data-vt-bench]')) ui.bench[el.dataset.vtBench] = el.value;
  });
  root.addEventListener('submit', e => { if (e.target.matches('[data-ph-form]')) { e.preventDefault(); saveForm(); } });
  phr.on(what => { if (what !== 'uses') render(); });
  return { render, show, get section() { return sub; }, openForm, prepare };
}
