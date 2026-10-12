// Checks for the sound guard (#54): the register of broken sounds and its stand-ins, the error kinds it learns, zone
// learning from a font file, the sound wrapper and the decode guard. No browser.
//   npm run check:sound-guard      exit 1 when any check fails
import { createRegister, isBrokenError, indexOf, zoneOf, guardSounds, guardDecode, HEALTH_KEY } from '../src/sounds/sound-guard.js';

const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
const memStore = () => { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };
// a sound map like superdough's (a nanostores map): get, setKey, listen
function soundMapOf(entries) {
  let state = { ...entries }; const ls = new Set();
  return { get: () => state, setKey: (k, v) => { state = { ...state, [k]: v }; ls.forEach(f => f(state)); }, listen: f => { ls.add(f); return () => ls.delete(f); } };
}
const FONT = 'var _tone_0110_JCLive_sf2_file={zones:[{keyRangeLow:0,keyRangeHigh:83,file:"x"},{keyRangeLow:84,keyRangeHigh:108,file:""}]};';
const tick = () => new Promise(r => setTimeout(r, 0));

const CHECKS = {
  'register: known parts and stand-ins'() {
    const r = createRegister({ version: 'v1' });
    assert(r.broken('gm_vibraphone', 0, 96) && !r.broken('gm_vibraphone', 0, 60), 'zone only');
    assert(r.standIn('gm_vibraphone', 3, 0, 96) === 2, 'preferred stand-in');
    assert(r.standIn('gm_vibraphone', 3, 0, 60) === 0, 'sound notes keep their font');
    assert(r.standIn('gm_electric_bass_finger', 2, 1, 40) === 0, 'whole font broken');
  },
  'register: learned parts persist per library version'() {
    const store = memStore(), r = createRegister({ version: 'v1', store, known: [] });
    assert(r.add({ name: 'x', index: 0 }) && !r.add({ name: 'x', index: 0 }), 'add once');
    assert(r.standIn('x', 3, 0, null) === 1, 'next index');
    assert(createRegister({ version: 'v1', store, known: [] }).broken('x', 0), 'kept after reload');
    assert(!createRegister({ version: 'v2', store, known: [] }).broken('x', 0), 'new version starts again');
    assert(JSON.parse(store.getItem(HEALTH_KEY)).version === 'v1', 'stored with version');
    r.add({ name: 'x', index: 1 }); r.add({ name: 'x', index: 2 });
    assert(r.standIn('x', 3, 0, null) === null, 'all broken');
  },
  'errors: broken vs network'() {
    assert(isBrokenError(new Error('no soundfont buffer found for preset x')), 'decode');
    assert(isBrokenError(Object.assign(new Error('Unable to decode audio data'), { name: 'EncodingError' })), 'encoding');
    assert(isBrokenError(new SyntaxError("Unexpected token '<'")), 'font file is a 404 page');
    assert(!isBrokenError(new TypeError('Failed to fetch')), 'network');
    assert(indexOf(5, 3) === 2 && indexOf(-1, 3) === 2 && indexOf(undefined, 3) === 0, 'index');
  },
  async 'zones: range from the font file'() {
    const z = await zoneOf('0110_JCLive_sf2_file', 96, async () => FONT);
    assert(z && z.low === 84 && z.high === 108, JSON.stringify(z));
    assert(await zoneOf('x', 96, async () => '<html>Not found</html>') === null, '404');
  },
  async 'wrapper: learns a broken zone and plays the stand-in'() {
    const played = [], replaced = [];
    const vib = { onTrigger: async (t, v) => { const n = indexOf(v.n, 3); played.push(n); if (n === 1 && (v.note ?? 60) >= 84) throw new Error('no soundfont buffer found'); return { n }; }, data: { type: 'soundfont', fonts: ['a', 'b', 'c'] } };
    const net = { onTrigger: async () => { throw new TypeError('Failed to fetch'); }, data: { type: 'sample', samples: ['1.wav', '2.wav'] } };
    const map = soundMapOf({ vib, net, sine: { onTrigger: async () => 'synth', data: { type: 'synth' } } });
    const register = createRegister({ version: 't', known: [] });
    const stop = guardSounds({ soundMap: map, registerSound: (k, f, d) => map.setKey(k, { onTrigger: f, data: d }), register, onReplace: (...a) => replaced.push(a.join(' ')), zone: async () => ({ low: 84, high: 108 }) });
    const g = map.get();
    assert(g.vib.data.cmGuard && g.net.data.cmGuard && !g.sine.data.cmGuard, 'wraps soundfonts and samples only');
    const r1 = await g.vib.onTrigger(0, { n: 1, note: 96 }, () => {});
    assert(r1.n === 2 && register.broken('vib', 1, 100) && !register.broken('vib', 1, 60), 'zone learned, stand-in played');
    played.length = 0;
    await g.vib.onTrigger(0, { n: 1, note: 90 }, () => {});
    assert(played.join() === '2', 'next note in the zone goes to the stand-in at once');
    await g.vib.onTrigger(0, { n: 1, note: 60 }, () => {});
    assert(played.at(-1) === 1, 'notes outside the zone keep their font');
    let threw = false; try { await g.net.onTrigger(0, { n: 0 }, () => {}); } catch (e) { threw = true; }
    assert(threw && register.learned().every(e => e.name !== 'net'), 'network errors are not learned');
    map.setKey('late', { onTrigger: async () => 1, data: { type: 'sample', samples: ['x.wav'] } });
    await tick();
    assert(map.get().late.data.cmGuard, 'sounds registered later are wrapped');
    assert(replaced.length >= 2, 'stand-ins reported');
    stop();
  },
  async 'decode guard: a failure without an error callback reaches the success callback as null'() {
    const proto = { decodeAudioData(data, ok, err) { const p = Promise.reject(new Error('EncodingError')); if (err) p.catch(err); return p; } };
    assert(guardDecode(proto) && !guardDecode(proto), 'installs once');
    const got = await new Promise(res => proto.decodeAudioData(new ArrayBuffer(1), res));
    assert(got === null, 'null buffer');
    let errCalled = false;
    await proto.decodeAudioData(new ArrayBuffer(1), () => {}, () => { errCalled = true; }).catch(() => {});
    assert(errCalled, 'own error callbacks untouched');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
