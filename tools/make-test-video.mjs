#!/usr/bin/env node
// Test videos for the Video look (stage-video task 1.1), drawn by this script and encoded with ffmpeg: no third-party
// content. Each frame is a solid colour of its file (hue per file, so a check can tell which file shows), a centred
// 4 × 4 grid of blocks that spells the frame number in binary (white = 1, black = 0, bit 0 at the top left, read row
// by row), and the frame's second in big digits under it. The grid sits in the middle third of the picture, so it
// survives Fill's crop on wide and tall stages.
//
//   node tools/make-test-video.mjs [--out .cache/stage-video] [--4k] [--force]
//
// Files (git-ignored .cache/stage-video/ by default):
//   red.webm      640 × 360, 30 fps, 6 s, VP9 with a loud 440 Hz Opus tone
//   green.mp4     640 × 360, 30 fps, 6 s, H.264 with a loud 660 Hz AAC tone
//   blue.mp4      640 × 360, 30 fps, 6 s, H.264 with a tone
//   tall.mp4      360 × 640, 30 fps, 4 s, H.264 (9:16) with a tone
//   silent.mp4    640 × 360, 30 fps, 5 s, H.264, no audio track
//   track.mp4     640 × 360, 30 fps, 32 s, H.264 with a generated song in AAC (tools/decode-audio.mjs): a video file
//                 for Decode, its picture on the stage while Decode plays it
//   short.mp4     3 s of picture and 10 s of the same song: the picture ends before the sound
//   track.wav     the same song alone, an audio file for Decode
//   broken.mkv    random bytes: a file no browser can play
//   uhd.mp4       3840 × 2160, 30 fps, 4 s, H.264 (only with --4k)
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = resolve(arg('--out', '.cache/stage-video'));
const FORCE = process.argv.includes('--force'), UHD = process.argv.includes('--4k');

// a 3 × 5 bitmap of each digit
const DIGITS = ['111101101101111', '010110010010111', '111001111100111', '111001111001111', '101101111001001', '111100111001111', '111100111101111', '111001001001001', '111101111101111', '111101111001111'];

export const FILE_RGB = { red: [200, 40, 50], green: [40, 170, 70], blue: [40, 80, 200], tall: [190, 150, 30], silent: [140, 60, 170], uhd: [30, 150, 160] };

// one RGB frame: the file's colour, the frame-number grid, the second's digits
export function drawFrame(w, h, rgb, n, fps) {
  const px = Buffer.alloc(w * h * 3);
  const shade = 0.85 + 0.15 * Math.sin(n / fps * Math.PI);
  for (let y = 0; y < h; y++) {
    const k = shade * (0.8 + 0.2 * y / h);
    for (let x = 0; x < w; x++) { const o = (y * w + x) * 3; px[o] = rgb[0] * k; px[o + 1] = rgb[1] * k; px[o + 2] = rgb[2] * k; }
  }
  const box = (x0, y0, bw, bh, v) => { for (let y = Math.max(0, y0); y < Math.min(h, y0 + bh); y++) for (let x = Math.max(0, x0); x < Math.min(w, x0 + bw); x++) { const o = (y * w + x) * 3; px[o] = px[o + 1] = px[o + 2] = v; } };
  // the grid: a third of the shorter side, centred, with a grey frame around it
  const side = Math.floor(Math.min(w, h) / 3), cell = Math.floor(side / 4), gx = Math.floor((w - cell * 4) / 2), gy = Math.floor((h - cell * 4) / 2);
  box(gx - 4, gy - 4, cell * 4 + 8, cell * 4 + 8, 128);
  for (let b = 0; b < 16; b++) box(gx + (b % 4) * cell, gy + Math.floor(b / 4) * cell, cell, cell, (n >> b) & 1 ? 255 : 0);
  // the second in digits under the grid
  const s = String(Math.floor(n / fps)), dot = Math.max(2, Math.floor(cell / 6)), dw = dot * 4;
  const dx0 = Math.floor((w - s.length * dw) / 2), dy0 = gy + cell * 4 + dot * 3;
  [...s].forEach((c, i) => { const m = DIGITS[+c]; for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if (m[r * 3 + q] === '1') box(dx0 + i * dw + q * dot, dy0 + r * dot, dot, dot, 255); });
  return px;
}

function encode(file, { w, h, fps = 30, seconds, rgb, tone = 0, codec = 'h264', wav = null, shortest = true }) {
  return new Promise((ok, fail) => {
    const vcodec = codec === 'vp9' ? ['-c:v', 'libvpx-vp9', '-b:v', '600k', '-deadline', 'realtime', '-cpu-used', '8'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-g', String(fps)];
    const audio = wav ? ['-i', wav] : tone ? ['-f', 'lavfi', '-i', `sine=frequency=${tone}:sample_rate=48000:duration=${seconds}`] : [];
    const acodec = wav ? ['-c:a', 'aac', '-b:a', '160k'] : tone ? (codec === 'vp9' ? ['-c:a', 'libopus', '-b:a', '96k', '-af', 'volume=6dB'] : ['-c:a', 'aac', '-b:a', '128k', '-af', 'volume=6dB']) : ['-an'];
    const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${w}x${h}`, '-r', String(fps), '-i', 'pipe:0', ...audio, ...vcodec, ...acodec, ...(shortest ? ['-shortest'] : ['-t', '10']), file], { stdio: ['pipe', 'inherit', 'inherit'] });
    p.on('error', fail);
    p.on('close', c => (c === 0 ? ok() : fail(new Error(`ffmpeg exited ${c} for ${file}`))));
    (async () => {
      for (let n = 0; n < Math.round(fps * seconds); n++) {
        if (!p.stdin.write(drawFrame(w, h, rgb, n, fps))) await new Promise(r => p.stdin.once('drain', r));
      }
      p.stdin.end();
    })().catch(fail);
  });
}

const JOBS = [
  ['red.webm', { w: 640, h: 360, seconds: 6, rgb: FILE_RGB.red, tone: 440, codec: 'vp9' }],
  ['green.mp4', { w: 640, h: 360, seconds: 6, rgb: FILE_RGB.green, tone: 660 }],
  ['blue.mp4', { w: 640, h: 360, seconds: 6, rgb: FILE_RGB.blue, tone: 550 }],
  ['tall.mp4', { w: 360, h: 640, seconds: 4, rgb: FILE_RGB.tall, tone: 330 }],
  ['silent.mp4', { w: 640, h: 360, seconds: 5, rgb: FILE_RGB.silent }],
  ...(UHD ? [['uhd.mp4', { w: 3840, h: 2160, seconds: 4, rgb: FILE_RGB.uhd }]] : []),
];

if (import.meta.url === `file://${process.argv[1]}`) {
  mkdirSync(OUT, { recursive: true });
  for (const [name, o] of JOBS) {
    const f = join(OUT, name);
    if (existsSync(f) && !FORCE) { console.log(`kept   ${f}`); continue; }
    const t0 = Date.now();
    await encode(f, o);
    console.log(`wrote  ${f} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  }
  // a song for Decode: the repository's generated test music
  const wav = join(OUT, 'track.wav');
  if (!existsSync(wav) || FORCE) {
    const { renderSong, writeWav } = await import('./decode-audio.mjs');
    const D = { bd: 'x...x...x...x...', cp: '....x.......x...', hh: '..x...x...x...x.' };
    writeWav(wav, renderSong({ bpm: 124, bars: 16, lead: 0.3, seed: 7, chords: ['Am', 'F', 'C', 'G'], drums: D, bass: 'x..x..x...x.x...' }).pcm);
    console.log(`wrote  ${wav}`);
  }
  const track = join(OUT, 'track.mp4');
  if (!existsSync(track) || FORCE) { await encode(track, { w: 640, h: 360, seconds: 32, rgb: [180, 90, 40], wav }); console.log(`wrote  ${track}`); }
  const short = join(OUT, 'short.mp4');
  if (!existsSync(short) || FORCE) { await encode(short, { w: 640, h: 360, seconds: 3, rgb: [60, 160, 160], wav, shortest: false }); console.log(`wrote  ${short}`); }
  const bad = join(OUT, 'broken.mkv');
  if (!existsSync(bad) || FORCE) { const b = Buffer.alloc(64 * 1024); for (let i = 0; i < b.length; i++) b[i] = (i * 2654435761) >>> 24; writeFileSync(bad, b); console.log(`wrote  ${bad}`); }
}
