// The peak of the master output (level-headroom): what the listener and an exported file really get. Shared by the
// level tools and the browser checks. A track line above 1.0 is not clipping by itself: every line passes the master
// level (MASTER in src/main.js) first, and the audio graph is floating point. Only the output, and a file, can clip.
//
// In the page: tapOutput(page) puts one analyser per channel on Strudel's output (destinationGain, after the master
// level and the master limiter, before the app's volume), and keeps the highest sample it saw. outputPeak(page)
// returns it and starts again. limiterInput(page) does the same before the limiter (the master level times the
// style's push, src/sounds/limiter.js): above LIMIT.ceiling the limiter works, and without it the output would clip
// above 1.0. renderPeak(page) does the same for the fast export: the float buffers the render page sends back,
// before they are encoded (a 16 bit file cannot hold a sample above full scale).
// In Node: filePeak(file) reads an audio file with ffmpeg (both channels) and returns its peak, the time of the first
// sample at full scale and how many there are. songHeadroom(song) is the line peak above which a check warns: the
// highest `headroom` among the song's styles (tags.styles), 1.0 when none sets it.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs'), path = require('node:path');

// above this the output clips; in a 16 bit file a sample at full scale (32767) counts as clipped
const CLIP = 1, FULL = 32767 / 32768;

async function tapOutput(page) {
  await page.evaluate(() => {
    if (globalThis.miskOutPeak) return;
    const st = { node: null, an: [], buf: new Float32Array(4096), peak: 0, pre: { node: null, an: [], peak: 0 } };
    // an analyser keeps the last fftSize samples: 4096 at 48 kHz is 85 ms, read every 40 ms, so no sample is missed
    const tap = (node, t) => {
      const ctx = node.context, split = ctx.createChannelSplitter(2);
      node.connect(split);
      t.an = [0, 1].map(c => { const a = ctx.createAnalyser(); a.fftSize = 4096; split.connect(a, c); return a; });
      t.node = node;
    };
    const hook = () => {
      const ctl = globalThis.getSuperdoughAudioController && globalThis.getSuperdoughAudioController();
      const out = ctl && ctl.output, node = out && out.destinationGain, pre = out && out.miskMaster && out.miskMaster.level;
      if (node && node !== st.node) tap(node, st);
      if (pre && pre !== st.pre.node) tap(pre, st.pre);
    };
    const scan = t => { for (const a of t.an) { a.getFloatTimeDomainData(st.buf); for (const v of st.buf) { const x = Math.abs(v); if (x > t.peak) t.peak = x; } } };
    const read = () => { try { hook(); } catch (e) {} scan(st); scan(st.pre); };
    setInterval(read, 40);
    globalThis.miskOutPeak = { read, take: () => { read(); const p = st.peak; st.peak = 0; return p; }, takePre: () => { read(); const p = st.pre.peak; st.pre.peak = 0; return p; } };
  });
}
// the highest output sample since the last call (or since tapOutput), rounded to 0.01; starts again
const outputPeak = page => page.evaluate(() => Math.round((globalThis.miskOutPeak ? globalThis.miskOutPeak.take() : 0) * 100) / 100);
// the same before the master limiter (the level into it); starts again
const limiterInput = page => page.evaluate(() => Math.round((globalThis.miskOutPeak ? globalThis.miskOutPeak.takePre() : 0) * 100) / 100);

// the fast export's float buffers, block by block, as the render page posts them to the app
async function tapRender(page) {
  await page.evaluate(() => {
    if (globalThis.miskRenderPeak) return;
    const st = { peak: 0 };
    addEventListener('message', e => {
      const d = e.data;
      if (!d || !d.codingMiskRender || !d.done || !d.channels) return;
      for (const c of d.channels) for (const v of c) { const x = Math.abs(v); if (x > st.peak) st.peak = x; }
    });
    globalThis.miskRenderPeak = { take: () => { const p = st.peak; st.peak = 0; return p; } };
  });
}
const renderPeak = page => page.evaluate(() => Math.round((globalThis.miskRenderPeak ? globalThis.miskRenderPeak.take() : 0) * 1000) / 1000);

// an audio file: { peak, at: seconds of the first sample at full scale (or null), clipped: how many samples }
function filePeak(file) {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '2', '-ar', '48000', '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  const a = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  let peak = 0, at = null, clipped = 0;
  for (let i = 0; i < a.length; i++) {
    const x = Math.abs(a[i]);
    if (x > peak) peak = x;
    if (x >= FULL) { clipped++; if (at === null) at = Math.floor(i / 2) / 48000; }
  }
  return { peak: Math.round(peak * 1000) / 1000, at, clipped };
}

async function songHeadroom(song) {
  const { HEADROOM, styleId } = await import('../src/endless/recipe.js');
  let room = HEADROOM.default;
  for (const id of (song && song.tags && song.tags.styles) || []) {
    const f = path.join(__dirname, '..', 'styles', `${styleId(id)}.json`);
    try { const h = JSON.parse(fs.readFileSync(f, 'utf8')).headroom; if (typeof h === 'number') room = Math.max(room, Math.min(HEADROOM.max, h)); } catch (e) {}
  }
  return room;
}

module.exports = { CLIP, FULL, tapOutput, outputPeak, limiterInput, tapRender, renderPeak, filePeak, songHeadroom };
