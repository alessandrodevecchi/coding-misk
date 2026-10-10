// The soul as a scene of the visual stage (#46, phase 1): the song playing drawn in one of the ten views, fitted
// into the stage with its own colours bleeding into the free sides. Picks the song's default view unless locked,
// types an "analyzing" line when the song changes and glitches with a "recalibrating" line when steering changes it.
import { soulData, defaultView, VIEWS, VIEW_NAMES, PHRASES, RECAL } from './data.js';
import { createSoulRenderer } from './views.js';

// accent hue of each visual look, for the colour views (degrees, shift from the views' own hues)
const LOOK_HUE = { palco: 130, pixel: 120, tramonto: 140, montagne: 0, spazio: 70, sonar: -40, edgerunners: -120, studio: -150 };
const ANALYZE = 1.6, GLITCH = 0.7, FPS = 30;

// getSource(cyc): { key, song, ctx, bar } of the song playing, or null. store: the app's browser storage.
// onChange(): the view or the lock changed (for the controls on the stage).
export function createSoulScene({ getSource, store, isHw, baseLook, onChange = () => {} }) {
  const phone = matchMedia('(max-width: 640px)').matches;
  const R = createSoulRenderer({ phone });
  const amb = document.createElement('canvas'), ag = amb.getContext('2d');
  amb.width = 48; amb.height = 30;
  let locked = !!store.get('coding-misk-soul-lock', false), view = store.get('coding-misk-soul-view', '');
  if (!VIEWS.includes(view)) view = '';
  let ambAt = -1, data = null, key = null, songRef = null, overlay = null, lastRender = -1, shown = false, phrase = 0, word = 0;
  const t0 = performance.now(), now = () => (performance.now() - t0) / 1000;

  const analyze = () => { overlay = { kind: 'analyzing', at: now(), phrase: PHRASES[phrase++ % PHRASES.length] }; };
  const recalibrate = () => { if (!overlay || overlay.kind !== 'analyzing') overlay = { kind: 'glitch', at: now(), word: RECAL[word++ % RECAL.length] }; };

  // follow the song playing: a new song is analyzed (and gets its own view unless locked), a steered one recalibrates
  function follow(cyc) {
    const src = getSource(cyc);
    if (!src || !src.song) return src;
    if (src.key !== key) {
      key = src.key; songRef = src.song;
      try { data = soulData(src.song, src.ctx); } catch (e) { data = null; }
      if (data && (!locked || !view)) { view = defaultView(data); onChange(); }
      analyze();
    } else if (src.song !== songRef) {
      songRef = src.song;
      try { data = soulData(src.song, src.ctx); } catch (e) { /* keep the last soul */ }
      recalibrate();
    }
    return src;
  }

  // draw into the stage: cx a 2D context in CSS pixels, W×H the stage size, dpr the device pixel ratio
  function draw(cx, W, H, dpr, cyc, playing) {
    if (!shown) { shown = true; analyze(); }
    const src = follow(cyc), t = now();
    if (t - lastRender >= 1 / FPS - 0.004 || lastRender < 0) {
      lastRender = t;
      let o;
      if (overlay) {
        const k = (t - overlay.at) / (overlay.kind === 'analyzing' ? ANALYZE : GLITCH);
        if (k >= 1) overlay = null;
        else o = overlay.kind === 'analyzing' ? { analyzing: k, phrase: overlay.phrase } : { glitch: k, word: overlay.word };
      }
      const D = data, bpb = D ? (parseInt(D.meter, 10) || 4) : 4, bar = src && src.bar !== undefined ? src.bar : 0;
      const scale = Math.min(W / R.W, H / R.H) * dpr;
      R.render({ data: D, view: view || 'a', t, bar, beat: playing ? bar * bpb : undefined, bpb, hw: isHw(), hue: LOOK_HUE[baseLook()] ?? 0, overlay: o }, scale);
    }
    // fit: the whole screen inside the stage, the free sides filled with a blurred, darkened copy
    const s = Math.min(W / R.W, H / R.H), w = R.W * s, h = R.H * s, x = (W - w) / 2, y = (H - h) / 2;
    cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    if (w < W - 2 || h < H - 2) {
      if (lastRender !== ambAt) { ambAt = lastRender; ag.filter = 'blur(2px)'; ag.clearRect(0, 0, amb.width, amb.height); ag.drawImage(R.canvas, -4, -3, amb.width + 8, amb.height + 6); ag.filter = 'none'; }
      cx.save(); cx.globalAlpha = 0.4; cx.imageSmoothingEnabled = true; cx.drawImage(amb, 0, 0, W, H); cx.restore();
      cx.fillStyle = 'rgba(0,0,0,.35)'; cx.fillRect(0, 0, W, H);
    }
    cx.drawImage(R.canvas, x, y, w, h);
  }

  function pick(v, manual = true) {
    view = v;
    if (manual) store.set('coding-misk-soul-view', v);
    analyze(); onChange();
  }
  const step = d => pick(VIEWS[(VIEWS.indexOf(view || 'a') + d + VIEWS.length) % VIEWS.length]);
  return {
    draw, analyze, recalibrate,
    next: () => step(1), prev: () => step(-1), pick,
    // the stage stopped showing the soul: the next time it shows, it types its line again
    hide() { shown = false; },
    get view() { return view || 'a'; },
    get label() { const v = view || 'a'; return `${v.toUpperCase()} · ${VIEW_NAMES[v]}`; },
    get locked() { return locked; },
    set locked(v) { locked = !!v; store.set('coding-misk-soul-lock', locked); if (locked) store.set('coding-misk-soul-view', view || 'a'); onChange(); },
    get data() { return data; },
    // the overlay showing ('analyzing', 'glitch' or null), for checks
    get overlay() { return overlay ? overlay.kind : null; },
  };
}
