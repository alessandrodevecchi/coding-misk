// Tema "hardware": manopole al posto dei cursori e LED di attività per ogni canale.
// I cursori originali restano nel DOM (nascosti nel tema hardware) e continuano a gestire stato e tastiera:
// la manopola li legge e li scrive, così il resto dell'app non sa che esistono.

const SPAN = 180; // pixel di trascinamento per tutta la corsa
const CHANNEL_IDS = {
  drums: ['kick', 'snare', 'hats'], 'ch-bass': ['bass'], 'ch-guitar': ['guitar'], 'ch-arp': ['arp'],
  'ch-hook': ['hook'], 'ch-pad': ['pad'], 'ch-texture': ['fx'], 'ch-riser': ['riser'],
};

function setValue(input, v) {
  const min = +input.min || 0, max = +input.max || 1, step = +input.step || .01;
  const q = Math.min(max, Math.max(min, Math.round((v - min) / step) * step + min));
  if (+input.value === q) return;
  input.value = q;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function attachKnob(input) {
  if (input.dataset.knob) return;
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
    document.querySelectorAll('input[type=range]').forEach(attachKnob);
    for (const id of Object.keys(CHANNEL_IDS)) {
      const head = document.querySelector(`#${id} .chhead`);
      if (head && !head.querySelector('.act')) { const s = document.createElement('span'); s.className = 'act'; s.setAttribute('aria-hidden', 'true'); head.insertBefore(s, head.children[1]); }
    }
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
  const lv = {};
  (function frame() {
    requestAnimationFrame(frame);
    if (document.documentElement.dataset.ui !== 'hw') return;
    document.querySelectorAll('input[data-knob]').forEach(input => {
      const k = input.nextElementSibling; if (!k || !k.classList.contains('knob')) return;
      const min = +input.min || 0, max = +input.max || 1, p = ((+input.value) - min) / (max - min || 1);
      const s = p.toFixed(3);
      if (k.dataset.p !== s) { k.dataset.p = s; k.style.setProperty('--p', s); }
      k.classList.toggle('off', input.closest('.end')?.hidden || false);
    });
    const A = window.analysers;
    for (const [id, ids] of Object.entries(CHANNEL_IDS)) {
      const led = document.querySelector(`#${id} .act`); if (!led) continue;
      const v = A ? Math.max(...ids.map(x => (A[x] ? peak(x) : 0))) : 0;
      lv[id] = Math.max(Math.min(1, v * 2.2), (lv[id] || 0) * .86);
      led.style.setProperty('--lv', lv[id].toFixed(2));
    }
  })();
}
