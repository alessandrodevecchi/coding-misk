// Sound guard (#54, #61): a broken sound in the library must not hold a note or an export. Three parts:
// - the decode guard: Strudel's soundfont loader decodes with a success callback only, so a zone that cannot be decoded
//   waits forever; with the guard the failure reaches the loader as "no buffer" and the note fails like any other;
// - the register: broken sounds (a soundfont font, or one zone of it, or one sample of a bank), the known ones
//   (SOUNDFONT_FIX) plus the ones learned while playing, kept in the browser with the library version;
// - the sound wrapper: every soundfont and sample sound plays its stand-in when the register knows it is broken, and a
//   note that fails to load is learned and played again from the stand-in (another font of the instrument, another
//   sample of the bank). Network errors are not learned: offline is not broken.
// The voice helper's own banks (say_*, made on this machine while the page runs) are never learned by index (#82): their
// files change under the same index, and a sample fetched before it could be served came back as the page (HTML); such a
// load is tried again once from a fresh address instead, and stored entries of those banks are dropped on load.
// Pure apart from the decode guard and the store: checked in Node (tools/check-sound-guard.mjs).
import { SOUNDFONT_FIX, midiOf } from './soundfont-fix.js';

export const HEALTH_KEY = 'coding-misk-sound-health';
// the banks the voice helper makes locally (say_<lang>[_<speaker>]): never in the register
export const isLocalBank = name => /^say_/.test(String(name || ''));
export const SOUNDFONT_URL = 'https://felixroos.github.io/webaudiofontdata/sound';

// decoders called with a success callback and no error callback get the failure as a null buffer, not silence forever
export function guardDecode(proto = globalThis.BaseAudioContext && globalThis.BaseAudioContext.prototype) {
  if (!proto || !proto.decodeAudioData || proto.decodeAudioData.cmGuard) return false;
  const orig = proto.decodeAudioData;
  const guarded = function (data, ok, err) {
    const p = orig.call(this, data, ok, err);
    if (typeof ok === 'function' && typeof err !== 'function' && p && p.catch) p.catch(() => ok(null));
    return p;
  };
  guarded.cmGuard = true;
  proto.decodeAudioData = guarded;
  return true;
}

// a load error that means the sound itself is broken: a buffer that does not decode, a font file that does not parse
export function isBrokenError(e) {
  if (!e) return false;
  if (e.name === 'EncodingError' || e.name === 'SyntaxError') return true;
  return /no soundfont buffer|unable to decode|decod|unexpected token|is not valid|could not load soundfont/i.test(String(e.message || e));
}

// sample addresses that never load as the library writes them (#54), fixed before the first note:
// - the VCSL banks come from jsDelivr: raw.githubusercontent.com sends Content-Disposition twice for paths with a comma,
//   and Chrome refuses those responses;
// - tom_mallet's path lacks the "Membranophones/" folder;
// - "#" and a "%" that starts no escape are encoded in the file name (Dirt-Samples mute, pluck, h).
const VCSL_RAW = 'https://raw.githubusercontent.com/sgossner/VCSL/master/', VCSL_CDN = 'https://cdn.jsdelivr.net/gh/sgossner/VCSL@master/';
export function fixSampleUrl(url) {
  if (typeof url !== 'string') return url;
  let u = url;
  if (u.startsWith(VCSL_RAW)) u = VCSL_CDN + u.slice(VCSL_RAW.length);
  if (u.startsWith(VCSL_CDN + 'Struck%20Membranophones/')) u = VCSL_CDN + 'Membranophones/' + u.slice(VCSL_CDN.length);
  const i = u.lastIndexOf('/');
  return u.slice(0, i + 1) + u.slice(i + 1).replace(/%(?![0-9A-Fa-f]{2})/g, '%25').replace(/#/g, '%23');
}
// fixes a sample bank's addresses in place (the sampler keeps the same list); true when one changed
export function fixSampleBank(bank) {
  let changed = false;
  const fix = list => { for (let i = 0; i < list.length; i++) { const v = fixSampleUrl(list[i]); if (v !== list[i]) { list[i] = v; changed = true; } } };
  if (Array.isArray(bank)) fix(bank);
  else if (bank && typeof bank === 'object') for (const v of Object.values(bank)) if (Array.isArray(v)) fix(v);
  return changed;
}

// the index a value plays among `count` fonts or samples (as Strudel's getSoundIndex)
export const indexOf = (n, count) => { const i = Math.round(Number.isFinite(+n) ? +n : 0); return ((i % count) + count) % count; };

// entries: { name, index, low?, high?, use? } (low and high: the MIDI key range of a broken zone; use: a preferred stand-in)
export function createRegister({ version = '', store = null, known = SOUNDFONT_FIX } = {}) {
  const base = known.map(f => ({ name: f.name, index: f.font, ...(f.low !== undefined ? { low: f.low, high: f.high } : {}), ...(f.use !== undefined ? { use: f.use } : {}) }));
  let learned = [];
  const save = () => { try { if (store) store.setItem(HEALTH_KEY, JSON.stringify({ version, broken: learned })); } catch (e) {} };
  // (entries of the local say_* banks stored by an older version are dropped, and the store written again without them)
  const load = () => {
    try {
      const s = store && JSON.parse(store.getItem(HEALTH_KEY) || 'null');
      const all = s && s.version === version && Array.isArray(s.broken) ? s.broken : [];
      learned = all.filter(e => !(e && isLocalBank(e.name)));
      if (learned.length !== all.length) save();
    } catch (e) {}
  };
  load();
  const all = () => [...base, ...learned];
  const hit = (e, name, index, midi) => e.name === name && e.index === index && (e.low === undefined || midi == null || (midi >= e.low && midi <= e.high));
  const broken = (name, index, midi) => all().some(e => hit(e, name, index, midi));
  return {
    broken,
    list: all,
    learned: () => learned.slice(),
    // reads the stored entries again (another page of the app learned some)
    reload: load,
    // adds a broken part; false when it was known or belongs to a local say_* bank
    add(entry) {
      if (isLocalBank(entry.name)) return false;
      if (all().some(e => e.name === entry.name && e.index === entry.index && e.low === entry.low && e.high === entry.high)) return false;
      learned.push(entry);
      save();
      return true;
    },
    // the index to play for `index` (itself when sound), or null when every one is broken
    standIn(name, count, index, midi) {
      if (!broken(name, index, midi)) return index;
      const pref = all().find(e => hit(e, name, index, midi) && e.use !== undefined);
      if (pref && pref.use < count && !broken(name, pref.use, midi)) return pref.use;
      for (let k = 1; k < count; k++) { const i = (index + k) % count; if (!broken(name, i, midi)) return i; }
      return null;
    },
  };
}

const fetchText = url => fetch(url).then(r => r.text());
// the key ranges of a soundfont font's zones ([] when the font file cannot be read)
export async function zonesOf(font, get = fetchText) {
  try {
    const txt = await get(`${SOUNDFONT_URL}/${font}.js`);
    // the file is "var _tone_…={zones:[…]}": as Strudel reads it, the block evaluates to the zones array
    const zones = (0, eval)('{' + txt.split('={')[1]);
    return Array.isArray(zones) ? zones.map(z => ({ low: z.keyRangeLow, high: z.keyRangeHigh })) : [];
  } catch (e) { return []; }
}
// the key range of the zone of a soundfont that holds a MIDI note (null when the font file cannot be read)
export async function zoneOf(font, midi, get = fetchText) {
  return (await zonesOf(font, get)).find(z => z.low <= midi && z.high + 1 >= midi) || null;
}

// the soundfonts a piece of Strudel code plays (as the compiler writes them: .s("gm_…"), alone or layered)
export const soundfontsIn = code => [...new Set(String(code).match(/\bgm_[a-z0-9_]+/g) || [])];

// the samples a piece of Strudel code plays, as the compiler writes them (#82): per line, the sounds of s("…") (or
// sound("…")), with the drum machine of .bank("…") in front ("RolandTR808" and "hh" are "rolandtr808_hh", the sound map's
// lower-case key) and the sample numbers of "name:n" or of .n("…") (every number of its string, at most `most`; 0 when
// there is none). count(name): how many samples the sound map holds for a sample sound, 0 for any other sound (a
// soundfont, a synth, a name it does not know). Returns [{ s, n }], each once, in the order of the code.
export function samplesIn(code, count, most = 12) {
  const out = [], seen = new Set();
  const add = (s, n) => { const c = count(s); if (!c) return; const i = indexOf(n, c), k = `${s}:${i}`; if (!seen.has(k)) { seen.add(k); out.push({ s, n: i }); } };
  for (const line of String(code).split('\n')) {
    const m = /\b(?:s|sound)\(\s*"([^"]*)"/.exec(line);
    if (!m) continue;
    const b = /\.bank\(\s*"([^"]+)"/.exec(line), bank = b ? b[1].toLowerCase() : '';
    const nm = /\.n\(\s*"([^"]*)"/.exec(line);
    const ns = nm ? [...new Set((nm[1].match(/-?\d+/g) || []).map(Number))].slice(0, most) : [0];
    for (const w of m[1].match(/[A-Za-z_][\w]*(?::\d+)?/g) || []) {
      const [word, idx] = w.split(':'), name = (bank ? `${bank}_${word}` : word).toLowerCase();
      if (idx !== undefined) add(name, +idx);
      else for (const n of ns.length ? ns : [0]) add(name, n);
    }
  }
  return out;
}

// loads every zone of the first font of each soundfont, one silent note per zone, one at a time with a pause, so a broken
// zone is learned (and its stand-in loaded) before a song needs it. play(value): superdough at gain 0 a little ahead.
// Decoding runs off the main thread; the pauses keep the live scheduler on time.
export async function preloadFonts(names, { soundMap, play, pause = 30, get = fetchText, sleep = ms => new Promise(r => setTimeout(r, ms)) }) {
  let notes = 0;
  for (const name of names) {
    const s = soundMap.get()[name];
    if (!s || !s.data || !Array.isArray(s.data.fonts)) continue;
    for (const z of await zonesOf(s.data.fonts[0], get)) {
      try { await play({ s: name, note: z.low, gain: 0 }); } catch (e) {}
      notes++;
      await sleep(pause);
    }
  }
  return notes;
}

// whether a sample's address serves audio: false for a page (text/html, the dev server's fallback for a file it does not
// list yet) or an error status; null when it cannot be asked (offline: not broken either)
export async function servesAudio(url, get = u => fetch(u, { method: 'HEAD', cache: 'no-store' })) {
  try {
    const r = await get(url);
    if (!r || !r.ok) return false;
    const type = String((r.headers && r.headers.get && r.headers.get('content-type')) || '').toLowerCase();
    return !/text\/html/.test(type);
  } catch (e) { return null; }
}
// the same address made new, for superdough's sampler: it keeps each address's load, a failed one too, for the whole page
// session in a private cache with no way to clear it (superdough 1.3.0 sampler.mjs loadCache); a new address is a new load
export const freshUrl = (url, k = Date.now()) => {
  const u = String(url).replace(/([?&])cmRetry=\d+(&|$)/, (m, a, b) => (b ? a : ''));
  return `${u}${u.includes('?') ? '&' : '?'}cmRetry=${k}`;
};

// wraps the soundfont and sample sounds of a sound map (superdough's soundMap and registerSound), now and as more are
// registered. now(): the audio clock, to skip a stand-in that would come too late; onReplace(name, from, to, midi): a
// stand-in played (on every such note; midi: set when the font has no zone for that note). Returns a function that stops
// watching.
// A soundfont font that has no zone for a note ("no soundfont zone found", #82: a low note of the tubular bells, every
// phrase, silent) plays from the first other font of the instrument that has one; not learned, as the font is sound.
export function guardSounds({ soundMap, registerSound, register, now = () => 0, onReplace = () => {}, zone = zoneOf, probe = servesAudio }) {
  const wrapOne = (key, s) => {
    if (s.data.type === 'sample') fixSampleBank(s.data.samples);
    const type = s.data.type, fonts = type === 'soundfont' ? s.data.fonts : null;
    const list = type === 'sample' && Array.isArray(s.data.samples) ? s.data.samples : null;
    const count = fonts ? fonts.length : list ? list.length : 1;
    const play = s.onTrigger, local = isLocalBank(key);
    // (the font of the instrument that has a zone for a note, by font and note: an index, or -1 for none)
    const zoneFont = new Map();
    const inRange = async (idx, midi) => {
      const k = `${idx}:${midi}`;
      if (!zoneFont.has(k)) { let j = -1; for (let d = 1; d < count && j < 0; d++) { const c = (idx + d) % count; if (!register.broken(key, c, midi) && (await zone(fonts[c], midi))) j = c; } zoneFont.set(k, j); }
      return zoneFont.get(k);
    };
    registerSound(key, async (time, v, onended) => {
      const midi = fonts ? midiOf(v) : null;
      const want = indexOf(v.n, count);
      let idx = local ? want : register.standIn(key, count, want, midi);
      if (idx === null) idx = want;
      else if (idx !== want) onReplace(key, want, idx);
      // (a note this font has no zone for, met before: straight to the font that has one)
      if (fonts) { const j = zoneFont.get(`${idx}:${midi}`); if (j !== undefined && j >= 0) idx = j; }
      let fresh = false;
      for (let tries = 0; ; tries++) {
        try { return await play(time, idx === want ? v : { ...v, n: idx }, onended); }
        catch (e) {
          // a local say_* sample: never another index; once more from a new address (the list is the sampler's own)
          if (local) {
            if (fresh || !list || typeof list[idx] !== 'string') throw e;
            fresh = true;
            list[idx] = freshUrl(list[idx]);
            continue;
          }
          if (fonts && count > 1 && tries < 3 && /no soundfont zone/i.test(String((e && e.message) || e))) {
            const j = await inRange(idx, midi);
            if (j < 0 || now() > time) throw e;
            onReplace(key, idx, j, midi);
            idx = j;
            continue;
          }
          if (!isBrokenError(e) || count < 2 || tries >= 3) throw e;
          // a page or an error answered for a sample is not a broken sample
          if (list && typeof list[idx] === 'string' && (await probe(list[idx])) !== true) throw e;
          const range = fonts ? await zone(fonts[idx], midi) : null;
          register.add({ name: key, index: idx, ...(range || {}) });
          const next = register.standIn(key, count, idx, midi);
          if (next === null || next === idx) throw e;
          onReplace(key, idx, next);
          idx = next;
          if (now() > time) throw e;
        }
      }
    }, { ...s.data, cmGuard: true });
  };
  let queued = false;
  const wrap = () => {
    queued = false;
    for (const [key, s] of Object.entries(soundMap.get())) {
      if (!s || !s.data || s.data.cmGuard || (s.data.type !== 'soundfont' && s.data.type !== 'sample')) continue;
      wrapOne(key, s);
    }
  };
  wrap();
  return soundMap.listen(() => { if (!queued) { queued = true; queueMicrotask(wrap); } });
}
