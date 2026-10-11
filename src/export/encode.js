// Audio files from rendered samples (#8): WAV (16 bit, written here), FLAC, MP3 and Opus (Mediabunny with its LAME
// and libFLAC encoders, WebCodecs for Opus). Mediabunny loads only when one of those formats is used.

export const FORMATS = ['wav', 'flac', 'mp3', 'opus'];
export const MP3_RATES = [320, 192];
export const EXT = { wav: 'wav', flac: 'flac', mp3: 'mp3', opus: 'ogg' };
export const formatOf = v => (FORMATS.includes(v) ? v : 'wav');

// channels: Float32Array per channel (1 or 2), interleaved as 16 bit integers
function interleave16(channels) {
  const ch = Math.min(2, channels.length), n = channels[0].length, out = new Int16Array(n * ch);
  for (let i = 0, o = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, channels[c][i])); out[o++] = Math.round(v < 0 ? v * 0x8000 : v * 0x7fff); }
  return out;
}
export function wavFromChannels(channels, sampleRate) {
  const ch = Math.min(2, channels.length), pcm = interleave16(channels), data = new DataView(new ArrayBuffer(44 + pcm.byteLength));
  const str = (o, s) => [...s].forEach((c, i) => data.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); data.setUint32(4, 36 + pcm.byteLength, true); str(8, 'WAVE'); str(12, 'fmt ');
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, ch, true); data.setUint32(24, sampleRate, true);
  data.setUint32(28, sampleRate * ch * 2, true); data.setUint16(32, ch * 2, true); data.setUint16(34, 16, true); str(36, 'data'); data.setUint32(40, pcm.byteLength, true);
  new Int16Array(data.buffer, 44).set(pcm);
  return new Blob([data.buffer], { type: 'audio/wav' });
}

let registered = null;
async function bunny(format) {
  const mb = await import('mediabunny');
  if (!registered) registered = {};
  if (format === 'mp3' && !registered.mp3) { (await import('@mediabunny/mp3-encoder')).registerMp3Encoder(); registered.mp3 = true; }
  if (format === 'flac' && !registered.flac) { (await import('@mediabunny/flac-encoder')).registerFlacEncoder(); registered.flac = true; }
  return mb;
}
// can this browser make the format? (Opus needs WebCodecs)
export async function canEncode(format) {
  if (format === 'wav') return true;
  try { const mb = await bunny(format); return await mb.canEncodeAudio(format, { numberOfChannels: 2, sampleRate: 48000 }); } catch (e) { return false; }
}

// encode: channels (Float32Array per channel) at sampleRate into the format; opts.mp3Rate in kbps.
// Returns { blob, ext }.
export async function encode(channels, sampleRate, format, { mp3Rate = 320 } = {}) {
  format = formatOf(format);
  if (format === 'wav') return { blob: wavFromChannels(channels, sampleRate), ext: 'wav' };
  const mb = await bunny(format);
  const out = {
    flac: () => new mb.FlacOutputFormat(),
    mp3: () => new mb.Mp3OutputFormat(),
    opus: () => new mb.OggOutputFormat(),
  }[format]();
  const output = new mb.Output({ format: out, target: new mb.BufferTarget() });
  const bitrate = format === 'mp3' ? (MP3_RATES.includes(mp3Rate) ? mp3Rate : 320) * 1000 : format === 'opus' ? 192000 : undefined;
  const source = new mb.AudioSampleSource({ codec: format, ...(bitrate ? { quality: new mb.Quality({ bitrate, bitrateMode: 'constant' }) } : {}) });
  output.addAudioTrack(source);
  await output.start();
  // 16 bit samples, a second at a time (FLAC keeps 16 bit, the lossy encoders do not care)
  const ch = Math.min(2, channels.length), n = channels[0].length, step = sampleRate;
  for (let i = 0; i < n; i += step) {
    const part = channels.slice(0, ch).map(c => c.subarray(i, Math.min(n, i + step)));
    const sample = new mb.AudioSample({ data: interleave16(part), format: 's16', numberOfChannels: ch, sampleRate, timestamp: i / sampleRate });
    await source.add(sample);
    sample.close();
  }
  await output.finalize();
  const type = { flac: 'audio/flac', mp3: 'audio/mpeg', opus: 'audio/ogg' }[format];
  return { blob: new Blob([output.target.buffer], { type }), ext: EXT[format] };
}
