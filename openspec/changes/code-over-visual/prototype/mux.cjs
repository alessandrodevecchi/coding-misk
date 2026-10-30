// THROWAWAY: align a raw recording (flash in the video, beep in the audio), cut every screen and join them into one mp4.
// usage: node mux.cjs <rawdir> <out.mp4>
const { spawnSync, execFileSync } = require('child_process');
const fs = require('fs');
const [D, OUT] = process.argv.slice(2);
const run = args => String(spawnSync('ffmpeg', ['-hide_banner', ...args, '-f', 'null', '-'], { maxBuffer: 1 << 28 }).stderr);
const { marks } = JSON.parse(fs.readFileSync(D + '/marks.json'));
const v = run(['-i', D + '/video.webm', '-vf', 'scale=96:54,signalstats,metadata=print:key=lavfi.signalstats.YAVG']);
const flashes = []; let t = 0;
for (const l of v.split('\n')) { const m = l.match(/pts_time:([\d.]+)/); if (m) t = +m[1]; const y = l.match(/YAVG=([\d.]+)/); if (y && +y[1] > 200 && t > 2 && (!flashes.length || t - flashes.at(-1) > 1)) flashes.push(t); }
const beep = approx => { const a = run(['-ss', String(Math.max(0, approx - 1)), '-t', '2', '-i', D + '/audio.webm', '-af', 'bandpass=f=1000:width_type=q:w=8,silencedetect=n=-30dB:d=0.03']);
  const m = [...a.matchAll(/silence_end: ([\d.]+)/g)].map(x => +x[1] + Math.max(0, approx - 1)); return m.find(x => x > approx - 0.5); };
const b0 = beep(marks[0].t), b1 = beep(marks.at(-1).t);
const off0 = flashes[0] - b0, off1 = flashes.at(-1) - b1, off = (off0 + off1) / 2; // video time = audio time + off (linear between the marks)
const offAt = a => off0 + (off1 - off0) * (a - b0) / (b1 - b0);
console.log('flashes', flashes.map(x => x.toFixed(2)).join(' '), 'beeps', b0 && b0.toFixed(2), b1 && b1.toFixed(2), 'offset', off.toFixed(3));
// audio time of a mark: the beep's audio time + (mark wall time - marker wall time); both marks are taken just after a flash
const audioAt = m => b0 + (m.t - marks[0].t);
const parts = [];
marks.filter(m => m.secs).forEach((m, i) => {
  const a = audioAt(m), f = `${D}/part-${i}.mp4`;
  execFileSync('ffmpeg', ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', '-ss', (a + offAt(a)).toFixed(3), '-i', D + '/video.webm', '-ss', a.toFixed(3), '-i', D + '/audio.webm',
    '-t', String(m.secs), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '30',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', f]);
  parts.push(f);
});
fs.writeFileSync(D + '/list.txt', parts.map(p => `file '${p}'`).join('\n'));
execFileSync('ffmpeg', ['-nostdin', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', D + '/list.txt', '-c', 'copy', '-movflags', '+faststart', OUT]);
console.log('wrote', OUT, parts.length, 'parts');
