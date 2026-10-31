// One clock for the original and the code (track-to-code D12). Both run on Strudel's AudioContext: one cycle per bar
// (`setcpm(bpm/4)`), cycle c = (f − downbeat) / barSeconds for file time f. A play from file time f starts Strudel's
// scheduler at cycle c, then starts the original's source at the audio time the scheduler plays cycle c, with offset f.
// Seeking stops both and starts both again. The cycle ↔ time maths are pure; the source is a thin wrapper.

export const cycleOfFile = (model, f) => (f - model.downbeat) / model.barSeconds;
export const fileOfCycle = (model, c) => model.downbeat + c * model.barSeconds;

// the audio time at which Strudel's scheduler (cyclist) plays cycle c, from its anchor: the cycle and the clock phase of
// its first tick since the last tempo change, plus its fixed latency
export function audioTimeOfCycle(s, c) {
  if (!s || !(s.cps > 0) || !Number.isFinite(s.seconds_at_cps_change)) return null;
  return (c - s.num_cycles_at_cps_change) / s.cps + s.seconds_at_cps_change + (Number.isFinite(s.latency) ? s.latency : 0.1);
}
// the file time heard now (audio time `now`) when the source started at audio time `at` from file offset `from`
export const fileTimeAt = (src, now) => (src ? src.from + Math.max(0, now - src.at) : 0);

// a meta for the player (parseSong's shape) over the whole file: bars from the first downbeat, one tempo
export function decodeMeta(model) {
  const barSec = model.barSeconds || 2, bars = Math.max(1, Math.ceil((model.duration - model.downbeat) / barSec)), bpm = model.bpm || 120;
  const clampBar = c => Math.max(0, Math.min(bars, c));
  return {
    sections: [{ key: 'track', label: 'Track', start: 0, len: bars }], bpm: Array(bars).fill(bpm), bars,
    secondsAt: c => clampBar(c) * barSec, sectionAt: c => (c < bars ? 0 : -1), seconds: bars * barSec, bpmLabel: `${Math.round(bpm * 100) / 100}`,
  };
}

// the original's source: start at an audio time from a file offset, stop now or at a time (a handoff to a new source
// stops the old one at the exact time the new one starts, so a restart is seamless)
export function createOriginal(ctx, buffer, dest) {
  let src = null, info = null;
  const stop = (when = 0) => { if (!src) return; try { src.stop(when || 0); } catch (e) {} if (!when) { try { src.disconnect(); } catch (e) {} } src = null; info = null; };
  return {
    start(at, from) {
      const old = src;
      src = ctx.createBufferSource(); src.buffer = buffer; src.connect(dest);
      const when = Math.max(ctx.currentTime, at);
      src.start(when, Math.max(0, from + (when - at)));
      if (old) { try { old.stop(when); } catch (e) {} setTimeout(() => { try { old.disconnect(); } catch (e) {} }, Math.max(0, (when - ctx.currentTime) * 1000) + 200); }
      info = { at: when, from: Math.max(0, from + (when - at)) };
      src.onended = () => { if (info && src && src.buffer === buffer && ctx.currentTime >= info.at + buffer.duration - info.from - 0.05) info.ended = true; };
      return info;
    },
    stop,
    get playing() { return !!src; },
    get info() { return info; },
    now: () => (info ? Math.min(buffer.duration, fileTimeAt(info, ctx.currentTime)) : null),
  };
}
