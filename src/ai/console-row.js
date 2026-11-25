// The assistant's row in the Radio console (ai-assistant D5): one compact line at the top of the console, a request
// field with one menu icon, and one answer line under it with a chip per command. The element lives across the
// console's rebuilds (mount puts it back in the slot, focus and text kept).
//   radio: { ready(), state(), ctx(), api, label(cmd) } from src/radio/radio.js: the song on air for the prompt, the
//   validation context (playing tracks, fitting patterns, the console's reasons) and the buttons' functions
import { precheck, readAnswer, applyItems, reviewAnswer, directAnswer } from './commands.js';
import { answerSchema, initialPrompts, requestText, fitPrompt } from './generate.js';
import { areaSettings, setArea, engineFor } from './areas.js';
import { deadline, TIMEOUT_MS, FIRST_TIMEOUT_MS } from './engine.js';

const MENU = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="currentColor"><circle cx="3" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/><circle cx="13" cy="8" r="1.5"/></svg>';

export function createAskRow({ t, esc, store, getLang, openSettings = () => {}, radio }) {
  const el = document.createElement('div');
  el.className = 'ask-row';
  el.innerHTML = `<div class="ask-line"><input type="text" class="ask-input" data-ask-input maxlength="200" autocomplete="off" spellcheck="false"><button class="mini ask-menu-btn" data-ask-menu aria-expanded="false"></button></div><div class="ask-menu" hidden></div><div class="ask-answer" aria-live="polite" hidden></div>`;
  const input = el.querySelector('.ask-input'), menuBtn = el.querySelector('[data-ask-menu]'), menu = el.querySelector('.ask-menu'), answer = el.querySelector('.ask-answer');
  let lastText = '', status = { state: 'unknown' }, statusAt = 0, busy = null, last = null, lastSent = '', proposal = null;
  const settings = () => areaSettings(store, 'radio');
  const engine = () => engineFor(store, 'radio');

  function paintField() {
    const it = getLang() === 'it', s = status.state;
    input.placeholder = `${t(it ? 'aiAskIt' : 'aiAsk')} · ${t('aiEngine:nano')}`;
    input.title = t(it ? 'aiAskTipIt' : 'aiAskTip');
    input.disabled = s === 'unavailable' || s === 'download' || s === 'downloading';
    menuBtn.innerHTML = busy ? '<span class="ask-spin" aria-hidden="true"></span>' : MENU;
    const lab = busy ? t('aiCancel') : t('aiMenu');
    menuBtn.title = lab; menuBtn.setAttribute('aria-label', lab);
    el.classList.toggle('busy', !!busy);
  }
  async function refreshStatus(force = false) {
    const e = engine();
    if (!e) { status = { state: 'unavailable', detail: 'none' }; paint(); return status; }
    if (!force && performance.now() - statusAt < 10000 && status.state !== 'unknown') return status;
    statusAt = performance.now();
    status = await e.status();
    paint();
    return status;
  }
  // the line under the field: the engine's state when it cannot answer, else the last answer
  function paint() {
    paintField();
    const s = status.state;
    if (s === 'unavailable') return line(`${esc(t(`aiUnavailable:${status.detail || 'device'}`))} <button class="btn small" data-ask-settings>${esc(t('aiSettings'))}</button>`);
    if (s === 'download') return line(`<button class="btn small" data-ask-download>${esc(t('aiDownload'))}</button> <span class="muted">${esc(t('aiDownloadHint'))}</span>`);
    if (s === 'downloading') { const p = engine() && engine().progress; return line(`${esc(t('aiDownloading', { p: p ?? 0 }))} <progress max="100" value="${p ?? 0}"></progress>`); }
    if (busy) return line(`<span class="muted">${esc(t('aiThinking'))}</span>`);
    if (!last) { answer.hidden = true; answer.innerHTML = ''; return; }
    line(last);
  }
  function line(html) { answer.hidden = false; answer.innerHTML = `${html}<button class="mini ask-close" data-ask-close aria-label="${esc(t('aiClose'))}" title="${esc(t('aiClose'))}">✕</button>`; }
  const reasonOf = it => (it.error ? t(`aiWhy:${it.error}`, it.vars || {}) : it.why ? t(`steerWhy:${it.why}`, { type: it.cmd && (it.cmd.part || it.cmd.type) ? t(`inst:${it.cmd.part || it.cmd.type}`) : '' }) : it.applied === false ? t('aiNotApplied') : '');
  const labelOf = it => { if (it.cmd) try { const l = radio.label(it.cmd); if (l) return l; } catch (e) { /* fall back */ } return it.entry ? it.entry.button : String(it.kind || '?'); };
  function chips(items, mode) {
    return items.map((it, i) => {
      const why = reasonOf(it), state = why ? 'struck' : mode === 'ask' ? 'proposed' : 'applied';
      const drop = mode === 'ask' && !why ? `<button class="ask-drop" data-ask-drop="${i}" aria-label="${esc(t('aiDrop'))}" title="${esc(t('aiDrop'))}">✕</button>` : '';
      return `<span class="chip small ask-chip ${state}" title="${esc(why || t(`aiChip:${state}`))}">${esc(labelOf(it))}${why ? ` <small>· ${esc(why)}</small>` : ''}${drop}</span>`;
    }).join('');
  }
  // flag: 'vague' (a vague request) or 'check' (the answer may not match the request, D4 checks 4 and 5)
  function showResult(r, mode, flag) {
    const note = r.note ? `<span class="ask-note muted">${esc(r.note)}</span>` : '';
    if (mode === 'ask') {
      const any = r.items.some(it => it.cmd && !it.why && !it.error);
      last = `${flag ? `<span class="ask-vague">${esc(t(flag === 'check' ? 'aiCheck' : 'aiVague'))}</span>` : ''}${chips(r.items, 'ask')}${note}${any ? `<button class="btn small primary" data-ask-apply title="Enter">${esc(t('aiApply'))}</button>` : ''}<button class="btn small" data-ask-dismiss title="Escape">${esc(t('aiDismiss'))}</button>`;
    } else last = `${chips(r.items, 'now')}${note}`;
    paint();
    if (mode === 'ask') { const b = answer.querySelector('[data-ask-apply]') || answer.querySelector('[data-ask-dismiss]'); if (b) b.focus(); }
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    lastText = text;
    if (!radio.ready()) { last = esc(t('aiNoSong')); proposal = null; return paint(); }
    proposal = null;
    const ctx = radio.ctx(), pre = precheck(text, ctx);
    if (pre.cannot) { last = `<span class="ask-note">${esc(t('aiCannot', { note: pre.cannot }))}</span>`; return paint(); }
    // a spoken line after a colon or in quotes, or a request for the drop: the app's own answer, no engine (D4 checks 6, 8)
    if (pre.say || pre.direct) {
      const json = directAnswer(text), r = readAnswer(json, ctx);
      lastSent = '';
      if (settings().apply === 'ask') { proposal = { json, flag: null }; showResult(r, 'ask', null); return; }
      applyItems(r.items, radio.api);
      showResult(r, 'now', null);
      return;
    }
    const st = await refreshStatus(true);
    if (st.state !== 'ready') return;
    const e = engine(), state = radio.state(), window = e.window || 9216, fit = fitPrompt(window, state, text);
    const initial = initialPrompts(fit), input = requestText(state, text), schema = answerSchema(ctx);
    lastSent = `${initial.map(x => `[${x.role}] ${x.content}`).join('\n')}\n[user] ${input}`;
    const ctrl = new AbortController(), d = deadline(e.first ? FIRST_TIMEOUT_MS : TIMEOUT_MS, ctrl.signal);
    busy = ctrl; last = null; paint();
    let res = null, failed = null;
    try { res = await e.prompt({ initial, input, schema, signal: d.signal }); } catch (err) { failed = err; }
    d.done(); busy = null;
    if (failed) { last = failed.name === 'AbortError' && ctrl.signal.aborted && !(ctrl.signal.reason && ctrl.signal.reason.name === 'TimeoutError') ? esc(t('aiCancelled')) : `${esc(t(failed.name === 'TimeoutError' ? 'aiTimeout' : 'aiFailed'))} <button class="btn small" data-ask-retry>${esc(t('aiRetry'))}</button>`; return paint(); }
    if (!radio.ready()) { last = esc(t('aiNoSong')); return paint(); }
    const now = radio.ctx(), review = reviewAnswer(text, res.json, now);
    const r = readAnswer(review.json, now);
    if (r.invalid) { last = `${esc(t('aiNotUnderstood'))} <button class="btn small" data-ask-retry>${esc(t('aiRetry'))}</button>`; return paint(); }
    if (r.cannot) { last = `<span class="ask-note">${esc(t('aiCannot', { note: r.note || t('aiCannotDefault') }))}</span>`; return paint(); }
    const flag = pre.vague ? 'vague' : review.check ? 'check' : null;
    const mode = flag ? 'ask' : settings().apply;
    if (mode === 'ask') { proposal = { json: review.json, flag }; showResult(r, 'ask', flag); return; }
    applyItems(r.items, radio.api);
    showResult(r, 'now', null);
  }
  // Apply on a proposal: checked again against the song as it is now (D4)
  function applyProposal() {
    if (!proposal) return;
    const r = readAnswer(proposal.json, radio.ctx());
    proposal = null;
    applyItems(r.items, radio.api);
    showResult(r, 'now', null);
  }
  function openMenu(open) {
    menu.hidden = !open; menuBtn.setAttribute('aria-expanded', String(open));
    if (!open) return;
    const s = settings();
    menu.innerHTML = `<div class="ask-menu-row"><span class="lbl">${esc(t('aiEngineLbl'))}</span> ${esc(t('aiEngine:nano'))}</div>
      <div class="ask-menu-row" role="group" aria-label="${esc(t('aiMode'))}">${['now', 'ask'].map(m => `<button class="chip small" data-ask-mode="${m}" aria-pressed="${s.apply === m}">${esc(t(`aiMode:${m}`))}</button>`).join('')}</div>
      <p class="muted small">${esc(t('aiModeHint'))}</p>
      <div class="ask-menu-row"><button class="btn small" data-ask-sent${lastSent ? '' : ' disabled'}>${esc(t('aiWhatSent'))}</button><button class="btn small" data-ask-settings>${esc(t('aiSettings'))}</button></div>
      <pre class="ask-sent" hidden></pre>`;
  }

  el.addEventListener('keydown', e => {
    if (e.target === input && e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); return send(input.value); }
    if (e.key === 'Escape') { e.stopPropagation(); if (proposal) { proposal = null; last = null; return paint(); } if (e.target === input) { input.value = ''; } openMenu(false); }
  });
  el.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    e.stopPropagation();
    if (b.dataset.askMenu !== undefined) { if (busy) { busy.abort(); return; } return openMenu(menu.hidden); }
    if (b.dataset.askClose !== undefined) { last = null; proposal = null; return paint(); }
    if (b.dataset.askRetry !== undefined) { return send(lastText); }
    if (b.dataset.askApply !== undefined) return applyProposal();
    if (b.dataset.askDismiss !== undefined) { proposal = null; last = null; return paint(); }
    if (b.dataset.askDrop !== undefined && proposal) {
      const i = +b.dataset.askDrop; proposal.json = { ...proposal.json, commands: proposal.json.commands.filter((_, k) => k !== i) };
      const r = readAnswer(proposal.json, radio.ctx());
      if (!r.items.length) { proposal = null; last = null; return paint(); }
      return showResult(r, 'ask', proposal.flag);
    }
    if (b.dataset.askMode) { setArea(store, 'radio', { apply: b.dataset.askMode }); return openMenu(true); }
    if (b.dataset.askSent !== undefined) { const p = menu.querySelector('.ask-sent'); p.textContent = lastSent; p.hidden = !p.hidden; return; }
    if (b.dataset.askSettings !== undefined) { openMenu(false); return openSettings(); }
    if (b.dataset.askDownload !== undefined) {
      const eng = engine(); if (!eng) return;
      const off = eng.onProgress(() => { status = { state: 'downloading' }; paint(); });
      status = { state: 'downloading' }; paint();
      try { await eng.download(initialPrompts()); } catch (err) { status = { state: 'unavailable', detail: 'error' }; off(); return paint(); }
      off(); await refreshStatus(true);
    }
  });

  return {
    el,
    // the field's focus and caret, read before the console is drawn again (the rebuild takes the row out of the page)
    focusState: () => (document.activeElement === input ? { a: input.selectionStart, z: input.selectionEnd } : null),
    // puts the row in the console's slot after a rebuild, the focus and the caret given back
    mount(slot, focus = null) {
      if (!slot) return;
      slot.replaceWith(el);
      if (focus) { input.focus({ preventScroll: true }); try { input.setSelectionRange(focus.a, focus.z); } catch (e) { /* ignore */ } }
      refreshStatus();
      paintField();
    },
    send, refreshStatus,
    get busy() { return !!busy; },
    get lastSent() { return lastSent; },
    release() { const e = engine(); if (e && e.release) e.release(); },
  };
}
