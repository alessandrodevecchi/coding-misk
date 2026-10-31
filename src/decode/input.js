// Opening a file in the Decode tab (track-to-code D2, D3): tags and length read by mediabunny before decoding, the
// 10-minute limit, decoding (decodeAudioData, or mediabunny's audio sink for video files and files the browser refuses),
// title and artist from the tags or the file name, the mono analysis copy and the fingerprint. The file's bytes and its
// audio stay in memory only.

export const MAX_SECONDS = 600;
export const ANALYSIS_RATE = 44100;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm|mkv|avi)$/i;

// "Artist - Title.ext" → { title, artist }; no " - ": the whole name is the title, no artist (spec: Title and artist)
export function titleFromName(name) {
  const base = String(name || '').replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').trim();
  const at = base.indexOf(' - ');
  if (at > 0) return { title: base.slice(at + 3).trim() || base, artist: base.slice(0, at).trim() };
  return { title: base || 'Untitled', artist: '' };
}

// size, length in ms and a SHA-256 of three 64 KB slices at 10, 50 and 90 % (D3): the name does not count
export async function fingerprint(file, durationMs) {
  const size = file.size, slice = 65536, parts = [];
  for (const at of [0.1, 0.5, 0.9]) { const a = Math.max(0, Math.min(size - slice, Math.floor(size * at))); parts.push(new Uint8Array(await file.slice(a, a + slice).arrayBuffer())); }
  const all = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', all));
  const hex = [...h.slice(0, 12)].map(b => b.toString(16).padStart(2, '0')).join('');
  return { key: `${size}-${hex}`, size, durationMs: Math.round(durationMs) };
}
// a file matches a stored track: same size and slices, and a length within 0.1 s (decoders round differently)
export const sameFile = (fp, rec) => !!(fp && rec && fp.key === rec.fp && Math.abs((fp.durationMs || 0) - (rec.durationMs || 0)) <= 100);

// tags, length and what the file holds, before any decoding. → { title, artist, duration, video, audio } or { error }
export async function probe(file) {
  const named = titleFromName(file.name);
  try {
    const mb = await import('mediabunny');
    const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
    const [audio, video] = await Promise.all([input.getPrimaryAudioTrack().catch(() => null), input.getPrimaryVideoTrack().catch(() => null)]);
    let duration = null;
    try { duration = await input.computeDuration(); } catch (e) { duration = null; }
    let tags = {};
    try { tags = (await input.getMetadataTags()) || {}; } catch (e) {}
    const title = typeof tags.title === 'string' && tags.title.trim() ? tags.title.trim() : named.title;
    const artist = typeof tags.artist === 'string' && tags.artist.trim() ? tags.artist.trim() : typeof tags.title === 'string' && tags.title.trim() ? '' : named.artist;
    return { title, artist, duration, video: !!video, audio: !!audio, input, track: audio };
  } catch (e) {
    // a format mediabunny does not know: the browser may still decode it
    return { ...named, duration: null, video: VIDEO_EXT.test(file.name), audio: true, input: null, track: null, unknown: true };
  }
}

// decodes the file's sound. → AudioBuffer, or throws { code: 'format' | 'nosound' | 'memory' | 'long' }
export async function decode(file, ctx, info) {
  const fail = code => Object.assign(new Error(code), { code });
  if (info && info.video && !info.audio) throw fail('nosound');
  if (info && info.duration > MAX_SECONDS + 1) throw fail('long');
  let buf = null, err = null;
  if (!(info && info.video)) {
    try { buf = await ctx.decodeAudioData(await file.arrayBuffer()); } catch (e) { err = e; }
  }
  if (!buf && info && info.track) {
    try { buf = await sinkDecode(info.track, ctx); } catch (e) { err = e; }
  }
  if (!buf) throw fail(err && /memory|allocation|RangeError/i.test(`${err.name} ${err.message}`) ? 'memory' : info && info.video && !info.audio ? 'nosound' : 'format');
  if (buf.duration > MAX_SECONDS + 1) throw fail('long');
  return buf;
}
// a video's (or an odd file's) audio track through WebCodecs, gathered into one AudioBuffer
async function sinkDecode(track, ctx) {
  const mb = await import('mediabunny');
  const sink = new mb.AudioBufferSink(track), parts = [];
  let rate = 0, ch = 0, len = 0;
  for await (const w of sink.buffers()) { const b = w.buffer; rate = b.sampleRate; ch = Math.max(ch, b.numberOfChannels); parts.push({ b, at: w.timestamp }); len = Math.max(len, Math.round((w.timestamp + b.duration) * rate)); }
  if (!parts.length) throw Object.assign(new Error('nosound'), { code: 'nosound' });
  const out = ctx.createBuffer(Math.min(2, ch), len, rate);
  for (const { b, at } of parts) { const o = Math.max(0, Math.round(at * rate)); for (let c = 0; c < out.numberOfChannels; c++) out.getChannelData(c).set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)).subarray(0, Math.max(0, len - o)), o); }
  return out;
}
// the mono analysis copy at 44.1 kHz (D2): channels averaged, resampled when the file has another rate
export async function analysisCopy(buffer) {
  if (buffer.sampleRate === ANALYSIS_RATE) {
    const n = buffer.length, out = new Float32Array(n), k = 1 / buffer.numberOfChannels;
    for (let c = 0; c < buffer.numberOfChannels; c++) { const d = buffer.getChannelData(c); for (let i = 0; i < n; i++) out[i] += d[i] * k; }
    return out;
  }
  const n = Math.ceil((buffer.duration * ANALYSIS_RATE)), off = new OfflineAudioContext(1, n, ANALYSIS_RATE), src = off.createBufferSource();
  src.buffer = buffer; src.connect(off.destination); src.start();
  return (await off.startRendering()).getChannelData(0);
}
