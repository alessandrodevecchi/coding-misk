// Code themes in the browser (code-themes D1): the theme, font and size installed on the code panel's editor, the CSS
// variables of the panel, and the resolved colours for the widgets and the videos.
//
// `<strudel-editor>` (@strudel/repl) bundles its own CodeMirror and its own themes, so a theme registered from the
// app never reaches it. Strudel's themes go through the editor's public setTheme(name). Ours are built with the
// editor's own classes, reached from the live view: the editor theme class (view.constructor.theme), the highlight
// style class and the theme compartment (from Strudel's theme in place), rebuilt in the structure of Strudel's
// createTheme. When that fails the panel keeps Strudel's default and the console has one warning.
import { CT_KEY, codeThemeSettings, resolveTheme, fontPx, FONTS, NEON_TOKENS, themeName } from './themes.js';

// the tags of strudelTheme's highlight style, in its order (@strudel/codemirror themes/strudel-theme.mjs), by name
// (modified tags carry a *): used to find the tags the roles colour
const STRUDEL_TAGS = ['atom|bool|variableName*', 'labelName', 'keyword', 'operator', 'variableName*', 'typeName', 'atom', 'number', 'variableName*', 'string', 'string*', 'comment', 'variableName', 'tagName', 'bracket', 'meta', 'attributeName', 'propertyName', 'className', 'invalid', 'unit|punctuation'];
const tagName = t => [t].flat().map(x => x.name + (x.modified && x.modified.length ? '*' : '')).join('|');
// the lines of a muted block: a `_$:` line and the indented lines below it
const START = /^\s*(_?)\$:/;

export function createCodeThemes({ store, root = document.documentElement, host = () => document.getElementById('edhost'), full = () => false }) {
  let ed = null, kit = null, installed = '', fontKey = '', state = null, warned = false, dimOn = false, dimTried = false;
  const listeners = new Set();
  const settings = () => codeThemeSettings(store.get(CT_KEY, null));
  // the look's tokens, resolved (Neon reads them)
  // light-theme: the Neon code theme keeps neon's colours in LIGHT, where they are the --dk-* tokens
  const tokens = () => { const cs = getComputedStyle(root), v = k => cs.getPropertyValue(`--dk-${k}`).trim() || cs.getPropertyValue(`--${k}`).trim(); const o = {}; for (const k of Object.keys(NEON_TOKENS)) o[k] = v(k) || NEON_TOKENS[k]; return o; };
  // our :root variables: the panel's ground, the flash, the muted outline; for our themes also the variables Strudel's
  // activateTheme writes for its own (container ground, playing-note outline), after Strudel's style so they win
  const varsEl = (() => { let el = document.getElementById('misk-code-theme-vars'); if (!el) { el = document.createElement('style'); el.id = 'misk-code-theme-vars'; document.head.append(el); } return el; })();
  function writeVars(cur) {
    const R = cur.roles, own = cur.theme.kind === 'own';
    const text = `:root { --code-bg: ${R.bg}; --code-flash: ${R.flash}; --code-muted: ${R.widget.muted}; --code-ink: ${R.text}; --code-font: ${cur.family}; }`
      + (own ? `\n:root { --background: ${R.bg} !important; --foreground: ${R.outline} !important; --caret: ${R.caret} !important; --selection: ${R.selection} !important; --lineBackground: transparent !important; --lineHighlight: transparent !important; --gutterBackground: transparent !important; --gutterForeground: ${R.gutter} !important; }` : '');
    // after Strudel's own variables (its style comes when the editor starts), rewritten only when it changes
    const sv = document.getElementById('strudel-theme-vars');
    if (sv && (sv.compareDocumentPosition(varsEl) & Node.DOCUMENT_POSITION_PRECEDING)) document.head.append(varsEl);
    if (varsEl.textContent !== text) varsEl.textContent = text;
  }

  // ---------- the editor's own classes (D1) ----------
  function findTheme(view) {
    for (const [c, ext] of view.state.config.compartments) {
      const fp = [ext].flat(3).find(x => x && x.facet && x.value && x.value.specs);
      if (fp) return { c, fp, old: [ext].flat(5) };
    }
    return null;
  }
  function capture() {
    if (kit) return kit;
    const view = ed.editor;
    let hit = findTheme(view);
    // the tags are read from strudelTheme's style: another Strudel theme in place is swapped for it first
    if (!hit || hit.fp.value.specs.map(s => tagName(s.tag)).join() !== STRUDEL_TAGS.join()) { ed.setTheme('strudelTheme'); hit = findTheme(view); }
    if (!hit || hit.fp.value.specs.map(s => tagName(s.tag)).join() !== STRUDEL_TAGS.join()) throw new Error('theme compartment or highlight tags not found');
    const T = i => hit.fp.value.specs[i].tag;
    const tags = { comment: T(11), string: [T(9), T(10)], number: [T(7), T(6)], label: T(1), keyword: T(2), variable: [T(12), T(8), T(4)], method: T(17), punct: [T(14), T(3), T(20)], invalid: T(19), atom: T(0) };
    const HS = hit.fp.value.constructor, V = view.constructor;
    if (typeof HS.define !== 'function' || typeof V.theme !== 'function') throw new Error('editor classes not found');
    kit = { hit, tags, HS, V };
    return kit;
  }
  function installOwn(R, light) {
    const { hit, tags, HS, V } = capture(), view = ed.editor;
    const hs = HS.define([
      { tag: tags.comment, color: R.comment, fontStyle: 'italic' }, { tag: tags.string, color: R.string }, { tag: tags.number, color: R.number },
      { tag: tags.label, color: R.label, fontWeight: '700' }, { tag: tags.keyword, color: R.keyword }, { tag: tags.variable, color: R.variable },
      { tag: tags.atom, color: R.number }, { tag: tags.method, color: R.method }, { tag: tags.punct, color: R.punct }, { tag: tags.invalid, color: light ? '#c00030' : '#ff3355' },
    ]);
    const theme = V.theme({
      '&': { color: R.text, backgroundColor: R.bg }, '.cm-gutters': { backgroundColor: 'transparent', color: R.gutter, border: 'none' },
      '.cm-content': { caretColor: R.caret, textShadow: R.glow || 'none' }, '.cm-cursor, .cm-dropCursor': { borderLeftColor: R.caret },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'transparent' },
      '&.cm-focused .cm-selectionBackground, & .cm-line::selection, & .cm-selectionLayer .cm-selectionBackground, .cm-content ::selection': { background: R.selection + ' !important' },
    }, { dark: !light });
    // Strudel's theme structure, with the new style and its CSS module in place of the old ones
    const oldHs = hit.fp.value;
    const hl = hit.old.filter(x => x && x.facet && x.value === oldHs.module).map(x => x.facet.of(hs.module));
    view.dispatch({ effects: hit.c.reconfigure([theme, ...hit.old.filter(x => x && !x.facet), ...hl, hit.fp.facet.of(hs)]) });
  }

  // ---------- the text of muted lines (Q7): a line decoration made with the editor's own Decoration class ----------
  // The class is found on a decoration in place: the flash of an evaluation gives one, and so does a flash asked for
  // here (the panel is hidden then, at the start)
  function decorationClass(view) {
    for (const d of view.state.facet(view.constructor.decorations)) {
      if (!d || typeof d === 'function' || !d.iter) continue;
      try { const it = d.iter(); if (it.value) { const D = Object.getPrototypeOf(it.value.constructor); if (D && typeof D.line === 'function' && typeof D.set === 'function') return D; } } catch (e) {}
    }
    return null;
  }
  function addDim() {
    if (dimOn) return true;
    const view = ed.editor, c = [...view.state.config.compartments.keys()][0];
    if (!c) return false;
    let D = decorationClass(view);
    if (!D && ed.flash) { ed.flash(1); D = decorationClass(view); }
    if (!D) return false;
    const mark = D.line({ class: 'ct-muted' });
    let lastDoc = null, lastSet = null;
    const build = v => {
      const doc = v.state.doc;
      if (doc === lastDoc) return lastSet;
      const ranges = [];
      let muted = false;
      for (let i = 1; i <= doc.lines; i++) {
        const ln = doc.line(i), m = START.exec(ln.text);
        if (m) muted = m[1] === '_'; else if (!/^\s+\S/.test(ln.text)) muted = false;
        if (muted) ranges.push(mark.range(ln.from));
      }
      lastDoc = doc; lastSet = D.set(ranges);
      return lastSet;
    };
    const SE = c.reconfigure([]).constructor;
    if (!SE || !SE.appendConfig) return false;
    view.dispatch({ effects: SE.appendConfig.of(view.constructor.decorations.of(build)) });
    dimOn = true;
    return true;
  }

  // ---------- apply ----------
  function current() {
    const S = settings(), cur = resolveTheme(S, root.dataset.ui || 'neon', tokens()), f = FONTS[S.font] || FONTS.jetbrains;
    return { ...cur, S, family: f.family, px: fontPx(S, full()), dim: S.dim };
  }
  function installEditor(cur) {
    if (!ed || !ed.editor) return;
    const key = cur.theme.kind === 'strudel' ? cur.id : `${cur.id}:${JSON.stringify(cur.roles)}`;
    if (key !== installed) {
      try {
        if (cur.theme.kind === 'strudel') ed.setTheme(cur.id);
        else installOwn(cur.roles, cur.light);
        installed = key;
      } catch (e) {
        if (!warned) { warned = true; console.warn(`[code themes] cannot install the code theme "${cur.id}", the panel keeps Strudel's default:`, e.message || e); }
        try { ed.setTheme('strudelTheme'); } catch (err) {}
        installed = 'strudelTheme';
      }
    }
    const fk = `${cur.family}/${cur.px}`;
    if (fk !== fontKey) {
      fontKey = fk;
      try { ed.setFontFamily(cur.family); ed.setFontSize(cur.px); ed.editor.requestMeasure(); } catch (e) {}
    }
    // (tried once: a missing class would otherwise flash the code at every change)
    if (!dimOn && !dimTried) { dimTried = true; let ok = false; try { ok = addDim(); } catch (e) {} if (!ok) console.warn('[code themes] cannot dim the text of muted lines in the panel'); }
    const h = host();
    if (h) { h.classList.toggle('ct-dim', !!cur.dim); h.classList.toggle('ct-light', !!cur.light); h.dataset.codeTheme = installed.split(':')[0]; }
  }
  // Strudel's own saved editor settings: the next start opens in the chosen Strudel theme and font, without the default
  function writeStrudelSettings(cur) {
    try {
      const old = JSON.parse(localStorage.getItem('codemirror-settings') || '{}') || {};
      const next = { ...old, theme: cur.theme.kind === 'strudel' ? cur.id : 'strudelTheme', fontFamily: cur.family, fontSize: cur.px };
      if (JSON.stringify(next) !== JSON.stringify(old)) localStorage.setItem('codemirror-settings', JSON.stringify(next));
    } catch (e) {}
  }
  // the app sets data-look and data-ui again on many changes: nothing to do when nothing that matters moved
  let lastKey = '';
  function apply() {
    const key = `${root.dataset.ui}|${root.dataset.look}|${JSON.stringify(settings())}|${full()}|${!!ed}`;
    if (key === lastKey && state) return state;
    lastKey = key;
    const cur = current();
    writeVars(cur);
    installEditor(cur);
    if (ed) writeStrudelSettings(cur);
    const changed = !state || state.id !== cur.id || JSON.stringify(state.roles) !== JSON.stringify(cur.roles) || state.family !== cur.family || state.dim !== cur.dim;
    state = cur;
    if (changed) for (const f of listeners) try { f(cur); } catch (e) {}
    return cur;
  }

  // the app theme (data-ui) and the look (data-look, for Neon) change the theme in use; the full view, the size
  new MutationObserver(() => apply()).observe(root, { attributes: true, attributeFilter: ['data-ui', 'data-look'] });
  apply();

  return {
    // the editor is there: install, then show the panel (hidden until now, so the default theme never flashes)
    attach(editor) {
      ed = editor;
      apply();
      const h = host(); if (h) h.classList.remove('ct-wait');
      const col = h && h.closest('.codecol');
      if (col) new MutationObserver(() => apply()).observe(col, { attributes: true, attributeFilter: ['class'] });
    },
    apply, settings,
    set(patch) { store.set(CT_KEY, codeThemeSettings({ ...settings(), ...patch })); return apply(); },
    // again even when nothing seems to have changed (the look's tokens read anew)
    refresh() { lastKey = ''; return apply(); },
    // the theme in use: { id, auto, theme, light, roles, S, family, px, dim }
    get current() { return state || apply(); },
    // what Automatic uses now, by name
    autoName: lang => themeName(resolveTheme({ ...settings(), theme: 'auto' }, root.dataset.ui || 'neon').id, lang),
    get installed() { return installed; },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
  };
}
