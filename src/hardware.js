// Tema "hardware": manopole al posto dei cursori e LED di attività per ogni canale.
// I cursori originali restano nel DOM (nascosti nel tema hardware) e continuano a gestire stato e tastiera:
// la manopola li legge e li scrive, così il resto dell'app non sa che esistono.

const SPAN = 180; // pixel di trascinamento per tutta la corsa
// ogni elemento con data-act-ids="kick,snare" riceve un LED acceso dai livelli di quegli strumenti (righe della griglia)

function setValue(input, v) {
  const min = +input.min || 0, max = +input.max || 1, step = +input.step || .01;
  const q = Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
  if (+input.value === q) return;
  input.value = q;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

// A fader (voice-full-controls D17): a range input with data-fader="h" (or "v") becomes a slot with a cap, driving the
// hidden input exactly as a knob does (the same value, the same keyboard, the same input events). Used where knobs
// cost height (the Sound parts of the voices); outside the hardware theme it is the usual slider.
function attachFader(input) {
  input.dataset.knob = '1';
  const vert = input.dataset.fader === 'v', fader = document.createElement('div');
  fader.className = `fader${vert ? ' v' : ''}`;
  fader.setAttribute('aria-hidden', 'true');
  fader.innerHTML = '<span class="fader-slot"><i class="fader-fill"></i></span><span class="fader-cap"></span>';
  input.insertAdjacentElement('afterend', fader);
  const at = e => {
    const r = fader.getBoundingClientRect(), min = +input.min || 0, max = +input.max || 1;
    const p = vert ? 1 - (e.clientY - r.top) / (r.height || 1) : (e.clientX - r.left) / (r.width || 1);
    setValue(input, min + Math.max(0, Math.min(1, p)) * (max - min));
  };
  fader.addEventListener('pointerdown', e => {
    if (input.disabled) return;
    e.preventDefault(); input.focus({ preventScroll: true });
    fader.setPointerCapture(e.pointerId); fader.classList.add('turning'); at(e);
  });
  fader.addEventListener('pointermove', e => { if (fader.hasPointerCapture(e.pointerId)) at(e); });
  const end = e => { if (fader.hasPointerCapture(e.pointerId)) { fader.releasePointerCapture(e.pointerId); input.dispatchEvent(new Event('change', { bubbles: true })); } fader.classList.remove('turning'); };
  fader.addEventListener('pointerup', end); fader.addEventListener('pointercancel', end);
}

function attachKnob(input) {
  if (input.dataset.knob) return;
  if (input.dataset.fader) return attachFader(input);
  input.dataset.knob = '1';
  const knob = document.createElement('div');
  knob.className = 'knob';
  knob.setAttribute('aria-hidden', 'true');
  knob.innerHTML = '<span class="knob-cap"><i></i></span>';
  input.insertAdjacentElement('afterend', knob);
  let startY = 0, startV = 0;
  knob.addEventListener('pointerdown', e => {
    e.preventDefault(); input.focus({ preventScroll: true });
    knob.setPointerCapture(e.pointerId); startY = e.clientY; startV = +input.value;
    knob.classList.add('turning');
  });
  knob.addEventListener('pointermove', e => {
    if (!knob.hasPointerCapture(e.pointerId)) return;
    const range = (+input.max || 1) - (+input.min || 0);
    setValue(input, startV + (startY - e.clientY) / SPAN * range * (e.shiftKey ? .2 : 1));
  });
  const end = e => { if (knob.hasPointerCapture(e.pointerId)) knob.releasePointerCapture(e.pointerId); knob.classList.remove('turning'); };
  knob.addEventListener('pointerup', end); knob.addEventListener('pointercancel', end);
  knob.addEventListener('wheel', e => {
    e.preventDefault();
    const range = (+input.max || 1) - (+input.min || 0);
    setValue(input, +input.value - Math.sign(e.deltaY) * range / 40);
  }, { passive: false });
}

export function startHardware() {
  const enhance = () => {
    document.querySelectorAll('input[type=range]:not([data-no-knob])').forEach(attachKnob);
    document.querySelectorAll('[data-act-ids]').forEach(head => {
      if (!head.querySelector('.act')) { const s = document.createElement('span'); s.className = 'act'; s.setAttribute('aria-hidden', 'true'); head.prepend(s); }
    });
  };
  enhance();
  new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });

  // a ogni frame: rotazione delle manopole dai valori dei cursori, LED dai livelli degli strumenti
  const peak = id => {
    try {
      const d = window.getAnalyzerData('time', id); let m = 0;
      for (let i = 0; i < d.length; i += 16) m = Math.max(m, Math.abs(d[i]));
      return m;
    } catch (e) { return 0; }
  };
  (function frame() {
    requestAnimationFrame(frame);
    if (document.documentElement.dataset.ui !== 'hw') return;
    document.querySelectorAll('input[data-knob]').forEach(input => {
      const k = input.nextElementSibling; if (!k || !(k.classList.contains('knob') || k.classList.contains('fader'))) return;
      const min = +input.min || 0, max = +input.max || 1, p = ((+input.value) - min) / (max - min || 1);
      const s = p.toFixed(3);
      if (k.dataset.p !== s) { k.dataset.p = s; k.style.setProperty('--p', s); }
      k.classList.toggle('off', input.closest('.end')?.hidden || false);
      k.classList.toggle('dis', input.disabled);
    });
    const A = window.analysers;
    document.querySelectorAll('[data-act-ids]').forEach(head => {
      const led = head.querySelector('.act'); if (!led) return;
      const key = head.dataset.actIds, ids = key.split(',');
      const v = A ? Math.max(...ids.map(x => (A[x] ? peak(x) : 0))) : 0;
      const prev = +(led.dataset.lv || 0), now = Math.max(Math.min(1, v * 2.2), prev * .86);
      led.dataset.lv = now.toFixed(3);
      led.style.setProperty('--lv', now.toFixed(2));
    });
  })();
}
