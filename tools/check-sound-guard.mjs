// Checks for the sound guard (#54): the register of broken sounds and its stand-ins, the error kinds it learns, zone
// learning from a font file, the sound wrapper and the decode guard; the voice helper's local say_* banks never learned
// (#82); the reverb impulse responses kept and reused (#82); the samples a code plays, for the preload (#82). No browser.
//   npm run check:sound-guard      exit 1 when any check fails
import { createIrCache, installReverbCache } from '../src/sounds/reverb-cache.js';
import { createRegister, isBrokenError, indexOf, zoneOf, guardSounds, guardDecode, HEALTH_KEY, fixSampleUrl, fixSampleBank, isLocalBank, servesAudio, freshUrl, samplesIn } from '../src/sounds/sound-guard.js';

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
  'local say_* banks: never learned, stored entries dropped on load (#82)'() {
    assert(isLocalBank('say_en_kathy') && isLocalBank('say_it') && !isLocalBank('bd') && !isLocalBank('gm_say'), 'say_* only');
    const store = memStore();
    store.setItem(HEALTH_KEY, JSON.stringify({ version: 'v1', broken: [{ name: 'say_en_kathy', index: 324 }, { name: 'x', index: 0 }, { name: 'say_it', index: 3 }] }));
    const r = createRegister({ version: 'v1', store, known: [] });
    assert(!r.broken('say_en_kathy', 324) && r.standIn('say_en_kathy', 400, 324, null) === 324, 'poisoned entry dropped');
    assert(r.broken('x', 0), 'other entries kept');
    assert(JSON.parse(store.getItem(HEALTH_KEY)).broken.map(e => e.name).join() === 'x', 'store healed');
    assert(!r.add({ name: 'say_en', index: 2 }) && !r.broken('say_en', 2) && !store.getItem(HEALTH_KEY).includes('say_'), 'never added');
  },
  async 'wrapper: a local say_* sample retried once from a fresh address, never a neighbour (#82)'() {
    const urls = [];
    let fail = 1;
    const say = { onTrigger: async (t, v) => { const n = indexOf(v.n, 3); urls.push(say.data.samples[n]); if (fail-- > 0) throw Object.assign(new Error('Unable to decode audio data'), { name: 'EncodingError' }); return { n }; }, data: { type: 'sample', samples: ['/samples/say_en/a.wav', '/samples/say_en/b.wav', '/samples/say_en/c.wav'] } };
    const map = soundMapOf({ say_en: say });
    const register = createRegister({ version: 't', known: [] }), replaced = [];
    guardSounds({ soundMap: map, registerSound: (k, f, d) => { say.data = d; map.setKey(k, { onTrigger: f, data: d }); }, register, onReplace: (...a) => replaced.push(a), probe: async () => true });
    const r = await map.get().say_en.onTrigger(0, { n: 1 }, () => {});
    assert(r.n === 1 && !replaced.length && !register.learned().length, 'own sample, nothing learned');
    assert(urls[0] === '/samples/say_en/b.wav' && /\/b\.wav\?cmRetry=\d+$/.test(urls[1]), 'fresh address: ' + urls.join());
    fail = 5;
    let threw = false; try { await map.get().say_en.onTrigger(0, { n: 2 }, () => {}); } catch (e) { threw = true; }
    assert(threw && !register.learned().length && !replaced.length, 'still failing: an error, no neighbour, nothing learned');
    assert(freshUrl('/a.wav?cmRetry=1', 2) === '/a.wav?cmRetry=2' && freshUrl('/a?x=1', 3) === '/a?x=1&cmRetry=3', 'freshUrl');
  },
  async 'wrapper: a note a font has no zone for plays from a font that has one, nothing learned (#82)'() {
    const played = [], replaced = [];
    const bells = { onTrigger: async (t, v) => { const n = indexOf(v.n, 3); played.push(n); if (n === 0 && v.note < 27) throw new Error('no soundfont zone found for preset '); return { n }; }, data: { type: 'soundfont', fonts: ['a', 'b', 'c'] } };
    const map = soundMapOf({ bells });
    const register = createRegister({ version: 't', known: [] });
    let asked = 0;
    guardSounds({ soundMap: map, registerSound: (k, f, d) => map.setKey(k, { onTrigger: f, data: d }), register, onReplace: (...a) => replaced.push(a.join(' ')), zone: async (font, midi) => { asked++; return font === 'c' ? { low: 0, high: 60 } : null; } });
    const r = await map.get().bells.onTrigger(0, { n: 0, note: 24 }, () => {});
    assert(r.n === 2 && replaced.join() === 'bells 0 2 24' && !register.learned().length, `stand-in with a zone, nothing learned: ${r.n} ${replaced}`);
    played.length = 0; const a0 = asked;
    await map.get().bells.onTrigger(0, { n: 0, note: 24 }, () => {});
    assert(played.join() === '2' && asked === a0, 'the same note again goes to it at once');
    played.length = 0;
    await map.get().bells.onTrigger(0, { n: 0, note: 60 }, () => {});
    assert(played.join() === '0', 'other notes keep their font');
  },
  async 'wrapper: a page answered for a sample is not a broken sample (#82)'() {
    const bad = { onTrigger: async () => { throw Object.assign(new Error('Unable to decode audio data'), { name: 'EncodingError' }); }, data: { type: 'sample', samples: ['/samples/mine/a.wav', '/samples/mine/b.wav'] } };
    const map = soundMapOf({ mine: bad });
    const register = createRegister({ version: 't', known: [] });
    let answer = { ok: true, headers: { get: () => 'text/html; charset=utf-8' } };
    const probe = url => servesAudio(url, async () => answer);
    guardSounds({ soundMap: map, registerSound: (k, f, d) => map.setKey(k, { onTrigger: f, data: d }), register, probe });
    let threw = false; try { await map.get().mine.onTrigger(0, { n: 0 }, () => {}); } catch (e) { threw = true; }
    assert(threw && !register.learned().length, 'HTML not learned');
    answer = { ok: false, status: 404, headers: { get: () => 'text/plain' } };
    threw = false; try { await map.get().mine.onTrigger(0, { n: 0 }, () => {}); } catch (e) { threw = true; }
    assert(threw && !register.learned().length, '404 not learned');
    assert(await servesAudio('x', async () => { throw new TypeError('Failed to fetch'); }) === null, 'offline: unknown');
    answer = { ok: true, headers: { get: () => 'audio/wav' } };
    await map.get().mine.onTrigger(0, { n: 0 }, () => {}).catch(() => {});
    assert(register.broken('mine', 0), 'audio that does not decode is learned');
  },
  'sample addresses: VCSL from jsDelivr, tom_mallet path, # and % encoded'() {
    const R = 'https://raw.githubusercontent.com/sgossner/VCSL/master/', C = 'https://cdn.jsdelivr.net/gh/sgossner/VCSL@master/';
    assert(fixSampleUrl(R + 'Membranophones/Struck%20Membranophones/Snare%20Drum%2C%20Modern%201/a.wav') === C + 'Membranophones/Struck%20Membranophones/Snare%20Drum%2C%20Modern%201/a.wav', 'jsDelivr');
    assert(fixSampleUrl(R + 'Struck%20Membranophones/Tom%201/Mallet/x.wav') === C + 'Membranophones/Struck%20Membranophones/Tom%201/Mallet/x.wav', 'tom_mallet');
    const D = 'https://raw.githubusercontent.com/tidalcycles/Dirt-Samples/master/';
    assert(fixSampleUrl(D + 'mute/000_FH A#2 SCF.wav') === D + 'mute/000_FH A%232 SCF.wav', 'hash');
    assert(fixSampleUrl(D + 'h/001_0_da0-200%_1000_0_R.wav') === D + 'h/001_0_da0-200%25_1000_0_R.wav', 'percent');
    assert(fixSampleUrl(D + 'bd/BT0A0A7.wav') === D + 'bd/BT0A0A7.wav' && fixSampleUrl(R + 'x/a%20b.wav').endsWith('x/a%20b.wav'), 'others unchanged');
    const bank = [D + 'mute/A#2.wav', D + 'bd/x.wav'], pitched = { c3: [D + 'p/C#3.wav'] };
    assert(fixSampleBank(bank) && bank[0].endsWith('A%232.wav') && fixSampleBank(pitched) && pitched.c3[0].endsWith('C%233.wav') && !fixSampleBank([D + 'bd/x.wav']), 'banks in place');
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
  'reverb cache: a small LRU by count and length'() {
    const buf = s => ({ length: s * 100, sampleRate: 100 }), c = createIrCache({ max: 3, maxSeconds: 10 });
    c.put('a', buf(2)); c.put('b', buf(2)); c.put('c', buf(2)); c.get('a'); c.put('d', buf(2));
    assert(c.size === 3 && c.get('b') === null && c.get('a'), 'the least used goes first');
    c.put('e', buf(6));
    assert(c.seconds <= 10 && c.get('e') && c.get('c') === null && c.size === 3, `bounded by length (${c.seconds} s, ${c.keys()})`);
    c.put('f', buf(11));
    assert(c.get('f') === null, 'a response longer than the bound is not kept');
  },
  async 'reverb cache: per context, the same response reused, the newest asked wins, superdough kept aside'() {
    class Ctx { constructor(rate) { this.sampleRate = rate; } createConvolver() { return { connect() {} }; } adjustLength(d, ir) { return { adjusted: ir, d }; } }
    let made = 0;
    const pending = [];
    const generate = (p, cb) => { made++; const b = { length: p.decayTime * 1.5 * p.audioContext.sampleRate, sampleRate: p.audioContext.sampleRate, p }; pending.push(() => cb(b)); };
    const flush = () => { while (pending.length) pending.shift()(); };
    const proto = Ctx.prototype, theirs = function () { return 'theirs'; };
    proto.createReverb = theirs;
    const rc = installReverbCache({ proto, generate });
    assert(rc && proto.__reverbCache.theirs.value === theirs, 'superdough before: kept aside');
    proto.createReverb = function () { return 'later'; };
    assert(proto.createReverb !== theirs && proto.__reverbCache.theirs() === 'later', 'superdough after: kept aside too');
    const a = new Ctx(48000), b = new Ctx(44100);
    const r1 = a.createReverb(2, 0.1, 15000, 1000); flush();
    const first = r1.buffer;
    assert(made === 1 && first && r1.duration === 2 && r1.lp === 15000 && r1.dim === 1000, 'made once, fields as superdough sets them');
    const r2 = a.createReverb(2, 0.1, 15000, 1000);
    assert(made === 1 && r2.buffer === undefined, 'asked again: not made again, not set in the same task');
    await tick();
    assert(r2.buffer === first, 'the same response, in a task of its own');
    const r3 = b.createReverb(2, 0.1, 15000, 1000); flush();
    assert(made === 2 && r3.buffer !== first, 'another context makes its own');
    r1.generate(3, 0.1, 15000, 1000); r1.generate(2, 0.1, 15000, 1000); flush(); await tick();
    assert(r1.buffer === first && r1.duration === 2, 'the newest asked wins over an older one still being made');
    const r4 = a.createReverb(2, 0.1, 15000, 1000, 'file', 1, 0);
    assert(r4.buffer && r4.buffer.adjusted === 'file', 'a response from a file is made as before');
  },
  // (#82: a song's own drum machine loaded on its first note; the preload reads the samples from the code)
  'samples of a code: drum machines in lower case, sample numbers, no other sounds'() {
    const map = { rolandtr808_bd: 12, rolandtr808_hh: 3, oberheimdmx_cp: 2, numbers: 9, bd: 20 }, count = n => map[n] || 0;
    const code = '$: s("[bd ~ bd bd]*4").bank("RolandTR808").gain(1)\n$: s("hh*8, cp").bank("OberheimDMX")\n$: s("numbers").n("3 <7 12>")\n$: s("bd:3 ~")\n$: note("c3").s("gm_piano")\n$: s("sawtooth")';
    const got = samplesIn(code, count).map(x => `${x.s}:${x.n}`).join(' ');
    assert(got === 'rolandtr808_bd:0 oberheimdmx_cp:0 numbers:3 numbers:7 bd:3', got);
    assert(samplesIn('$: s("bd").n("0 1 2 3 4 5")', count, 4).length === 4, 'at most `most` numbers');
  },
};
let failed = 0;
for (const [name, fn] of Object.entries(CHECKS)) {
  try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); }
}
console.log(`${Object.keys(CHECKS).length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
