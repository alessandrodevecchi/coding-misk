// Checks for the endless scrolling visuals (procedural-visuals): the same bar draws the same frame, zones never come
// twice in a row, the caravan's crew changes at the stops, a frame stays cheap. No browser: a recording canvas.
//   npm run check:scroll      exit 1 when any check fails
import { createHash } from 'node:crypto';

// a canvas that records what is drawn
class Rec {
  constructor(w, h) { this.width = w; this.height = h; this.log = []; const self = this; this.ctx = new Proxy({ log: this.log }, { get(t, k) { if (k in t) return t[k]; return (...a) => { self.log.push(`${String(k)}(${a.map(v => (typeof v === 'object' ? 'img' : typeof v === 'number' ? Math.round(v * 100) / 100 : v)).join(',')})`); }; }, set(t, k, v) { self.log.push(`${String(k)}=${v}`); return true; } }); }
  getContext() { return this.ctx; }
}
globalThis.OffscreenCanvas = Rec;
const { createCaravan, personFrom } = await import('../src/visuals/caravan.js');
const { createNeonCity } = await import('../src/visuals/neon-city.js');

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const frame = (sc, cyc, lv = { kick: 0.7, bass: 0.5, hats: 0.4 }) => { const c = sc.canvas; c.log.length = 0; sc.render({ cyc, lv, kick: 0.5, playing: true }); return createHash('sha1').update(c.log.join(';')).digest('hex'); };
const CHECKS = {
  'the same bar draws the same frame, in a new scroller too'() {
    for (const make of [createCaravan, createNeonCity]) {
      const a = make(), b = make();
      for (const cyc of [0, 13.5, 77.25, 400.8]) assert(frame(a, cyc) === frame(b, cyc) && frame(a, cyc) === frame(a, cyc), `${make.name} bar ${cyc}`);
      // and a seek back gives the same frame again
      const before = frame(a, 20); frame(a, 300); assert(frame(a, 20) === before, `${make.name}: seek`);
    }
  },
  'frames change with the bar and with the music'() {
    const a = createCaravan();
    assert(frame(a, 10) !== frame(a, 10.5), 'the road moves');
    assert(frame(a, 10, {}) !== frame(a, 10, { kick: 1, bass: 1, hats: 1 }), 'the music shows');
  },
  'zones: never twice in a row, every place comes in an hour'() {
    for (const make of [createCaravan, createNeonCity]) {
      const sc = make(), seen = new Set();
      for (let k = 0; k < 120; k++) { const z = sc.zoneId(k); assert(k === 0 || z !== sc.zoneId(k - 1), `${make.name} zone ${k} twice`); seen.add(z); }
      assert(seen.size >= 6, `${make.name}: ${[...seen].join(', ')}`);
    }
  },
  'caravan: a city every other zone, the crew grows and changes'() {
    const sc = createCaravan();
    for (let k = 0; k < 20; k++) assert((sc.zoneId(k) === 'country') === (k % 2 === 1), `zone ${k}: ${sc.zoneId(k)}`);
    const a = personFrom('p1'), b = personFrom('p1'), c = personFrom('p2');
    assert(JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c), 'people from seeds');
  },
  'a frame draws a few thousand operations at most'() {
    for (const make of [createCaravan, createNeonCity]) { const sc = make(); let max = 0; for (let c = 0; c < 200; c += 7.3) { frame(sc, c); max = Math.max(max, sc.canvas.log.length); } assert(max < 30000, `${make.name}: ${max}`); }
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) { try { fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}: ${e.message}`); } }
console.log(failed ? `\n${failed} check(s) failed` : `\nall ${Object.keys(CHECKS).length} checks passed`);
process.exit(failed ? 1 : 0);
