// THROWAWAY mockup: the proposed settings injected into the real Settings page (Italian UI), neon and HW.
// usage: node settings.cjs <outdir>
const L = require('./lib.cjs');
const OUT = process.argv[2];
const inject = () => {
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const seg = (items, cur) => `<div class="langs" role="group">${items.map(l => `<button aria-pressed="${l === cur}">${esc(l)}</button>`).join('')}</div>`;
  const row = (label, html, hint = '') => `<div class="set-row"><span class="lbl">${esc(label)}</span><div class="set-ctrl">${html}${hint ? `<p class="hint muted">${esc(hint)}</p>` : ''}</div></div>`;
  const sel = (opts, cur) => `<select data-no-knob>${opts.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
  const num = (v, a, b) => `<input type="number" min="${a}" max="${b}" value="${v}" data-no-knob style="width:5em">`;
  const chk = (l, on) => `<label class="rx-opt"><input type="checkbox"${on ? ' checked' : ''} data-no-knob> <span>${esc(l)}</span></label>`;
  const card = document.createElement('div');
  card.className = 'card set-card'; card.id = 'mock-code-over';
  card.innerHTML = `<h3>Codice sopra <span class="badge" style="margin-left:8px">proposta</span></h3>
    <p class="muted">Il codice disegnato sopra la scena, una fascia per riga larga quanto il testo. Sul palco, nei video, nei frammenti e nell'uscita live.</p>
    ${row('Sul palco', seg(['Sì', 'No'], 'No'), 'Anche con il tasto «Codice sopra» nella barra del palco e a schermo intero.')}
    ${row('Lato del codice (16:9)', seg(['Sinistra', 'Destra', 'Tutta la larghezza'], 'Sinistra'))}
    ${row('Opacità delle fasce', seg(['Bassa', 'Media', 'Alta'], 'Media'), 'Colori dal tema del codice.')}
    ${row('Riga in modifica', seg(['Sì', 'No'], 'Sì'), 'Fascia di un altro colore e cursore a blocco mentre il coder scrive.')}
    ${row('Righe lunghe', seg(['Tagliate con …', 'A capo'], 'Tagliate con …'), 'Solo in questo layout: l’editor mostra sempre la riga intera.')}
    <div class="actions"><button class="btn">Valori di serie</button></div>`;
  const anchor = document.getElementById('set-widgets');
  anchor.parentNode.insertBefore(card, anchor);
  // lit notes in the code theme rows
  const dim = document.querySelector('[data-set-code-dim]');
  if (dim) { const r = document.createElement('div'); r.innerHTML = row('Note accese', seg(['Contorno', 'Piene'], 'Contorno'), 'Come Strudel disegna le note che suonano: un riquadro, oppure riempite.'); dim.closest('.set-row').after(r.firstChild); }
  // app widgets section in the code widgets card
  const sec = document.createElement('details'); sec.className = 'cw-sec'; sec.open = true;
  sec.innerHTML = `<summary>Widget dell'app <span class="badge" style="margin-left:8px">proposta</span></summary>
    <p class="hint muted">Disegnati dai hap del codice, uguali nel video veloce. Scritti nel codice come <code>._rhythm()</code> e <code>._chroma()</code>; i parametri scritti nella riga vincono su questi.</p>
    <div class="cw-checks">${chk('Griglia ritmo', true)}${chk('Croma ASCII', true)}</div>
    <h4 style="margin:12px 0 4px">Griglia ritmo</h4>
    ${row('Passi per battuta', sel(['8', '12', '16', '32'], '16'), '12 nei tempi ternari.')}
    ${row('Battute mostrate', sel(['1', '2', '4'], '1'))}
    ${row('Nomi delle righe', seg(['Brevi (bd sd hh)', 'Strumenti'], 'Brevi (bd sd hh)'))}
    ${row('Righe in più', chk('basso', false) + chk('arpeggio', false), 'Strumenti melodici mostrati come ritmo.')}
    ${row('Stile', seg(['Automatico', 'Blocchi', 'Caratteri'], 'Automatico'), 'Automatico: caratteri con i render ASCII e Terminale, blocchi altrove.')}
    ${row('Scia del passo', num(2, 0, 8))}
    <h4 style="margin:12px 0 4px">Croma ASCII</h4>
    ${row('Strumenti', sel(['Tutti i melodici', 'Pad e accordi', 'Basso', 'Tema', 'Arpeggio', 'Chitarra'], 'Tutti i melodici'))}
    ${row('Colonne', num(40, 16, 64))}
    ${row('Battute mostrate', sel(['1', '2', '4'], '2'))}
    ${row('Caratteri', '<input type="text" value=" .:-=+*#%@" data-no-knob style="font-family:var(--mono);width:9em"> <span class="muted">anteprima</span> <code style="letter-spacing:.1em"> .:-=+*#%@</code>')}
    ${row('Intensità', seg(['Per colonna', 'Sulla finestra'], 'Per colonna'), 'Per colonna fa spiccare le note dell’accordo; sulla finestra segue il volume.')}
    ${row('Scia', num(0.25, 0, 2), 'In cicli, dopo la fine della nota.')}
    ${row('Ordine', seg(['Acute in alto', 'Gravi in alto'], 'Acute in alto'))}
    ${row('Etichette e accordo', chk('Etichette', true) + chk('Nome dell’accordo', true))}
`;
  const w = document.getElementById('set-widgets');
  w.querySelector('.actions').before(sec);
  w.querySelectorAll('details.cw-sec').forEach(d => { if (d !== sec) d.open = false; });
};
(async () => {
  for (const theme of ['neon', 'hw']) {
    const { browser, page, errors } = await L.open({ width: 1440, height: 1000 });
    await L.ui(page, theme);
    await page.click('#open-settings'); await L.sleep(1500);
    await page.evaluate(inject); await L.sleep(500);
    await page.evaluate(() => { for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if ((p === 'fixed' || p === 'sticky') && !el.querySelector('#set-widgets')) el.style.visibility = 'hidden'; } });
    const shoot = async (sel, f) => { const el = await page.$(sel); await el.scrollIntoViewIfNeeded(); await L.sleep(300); await el.screenshot({ path: `${OUT}/${f}` }); };
    await shoot('#mock-code-over', `settings-code-over-${theme}.png`);
    await shoot('#set-widgets', `settings-app-widgets-${theme}.png`);
    const dimRow = await page.$('[data-set-code-dim]');
    if (dimRow) { const card = await dimRow.evaluateHandle(e => e.closest('.card')); await card.asElement().screenshot({ path: `${OUT}/settings-lit-notes-${theme}.png` }); }
    console.log(theme, errors.slice(0, 3));
    await browser.close();
  }
})().catch(e => { console.error(e); process.exit(1); });
