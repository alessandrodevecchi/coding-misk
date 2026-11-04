// The page's recent load, for the entry of a console change (console-add-ahead D2): the main thread's long tasks
// (PerformanceObserver) and the scheduler windows Strudel skipped ("skip query: too late", logged by its cyclist) over
// the last seconds. A change enters on a boundary only when the page was quiet just before it.
export function createLoadMonitor({ now = () => performance.now(), keep = 10000 } = {}) {
  const tasks = [], skips = [];
  const trim = () => { const lo = now() - keep; while (tasks.length && tasks[0].end < lo) tasks.shift(); while (skips.length && skips[0] < lo) skips.shift(); };
  try {
    if (typeof PerformanceObserver !== 'undefined') new PerformanceObserver(l => { for (const e of l.getEntries()) tasks.push({ start: e.startTime, end: e.startTime + e.duration, d: e.duration }); trim(); }).observe({ type: 'longtask', buffered: false });
  } catch (e) {}
  // (the cyclist writes its skip with console.log; the message passes on unchanged)
  if (typeof console !== 'undefined' && !console.log.__loadMonitor) {
    const orig = console.log;
    const wrap = function (...a) { if (a[0] === 'skip query: too late') { skips.push(now()); trim(); } return orig.apply(this, a); };
    wrap.__loadMonitor = true;
    console.log = wrap;
  }
  return {
    // quiet: no task over `task` ms and no skipped window in the last `ms` milliseconds
    quiet(ms = 2000, task = 50) { const lo = now() - ms; return !tasks.some(x => x.end >= lo && x.d > task) && !skips.some(t => t >= lo); },
    // for the checks: what the monitor saw in the last ms
    seen(ms = 2000) { const lo = now() - ms; return { tasks: tasks.filter(x => x.end >= lo).map(x => Math.round(x.d)), skips: skips.filter(t => t >= lo).length }; },
  };
}
