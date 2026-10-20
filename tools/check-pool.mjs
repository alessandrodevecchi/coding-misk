// Worker processes for the slow checks (faster-checks). No browser.
// runPool(module, tasks) hands tasks (one song, one check) to worker processes that import the module once and call its
// runTask(task); the results come back in task order, so a check gives the same result on any number of workers.
// Workers run at low priority: `taskpolicy -b` on macOS (background: efficiency cores, throttled disk), `nice -n 10`
// elsewhere. How many workers:
//   - weekdays 08:00-20:00 local time: 4; Saturday and Sunday 08:00-20:00: 6; at night: all cores but one;
//   - CHECK_WORKERS=n overrides the time rules;
//   - the file .check-workers at the repository root (git-ignored), holding a number, wins over both. It is read again
//     before each task is handed out (and every 2 seconds): lower it and busy workers finish their task, then stop;
//     raise it and new workers start. Delete it to go back to the rules.
// CHECK_PRIORITY=nice (nice also on macOS) or normal changes the priority. On Apple silicon `taskpolicy -b` keeps the
// workers on the efficiency cores: quiet, but each worker is about three times slower than at normal priority.
// The longest tasks of the last run go first (times in .cache/checks/timings.json).
//   node tools/check-pool.mjs           print the number of workers a check would start now, and why
//   npm run check:workers               test: the control file changed during a run (temporary file, dummy tasks)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, CACHE_DIR, addStats } from './code-cache.mjs';

export const CONTROL_FILE = path.join(ROOT, '.check-workers');
const WORKER = fileURLToPath(new URL('./check-worker.mjs', import.meta.url));
const TIMINGS = path.join(CACHE_DIR, 'timings.json');

// the workers the time rules give: { n, why }
export function ruleWorkers(now = new Date(), cpus = os.cpus().length) {
  const h = now.getHours(), weekend = now.getDay() === 0 || now.getDay() === 6;
  if (h >= 8 && h < 20) return weekend ? { n: Math.min(6, cpus), why: 'weekend day: 6' } : { n: Math.min(4, cpus), why: 'weekday 08:00-20:00: 4' };
  return { n: Math.max(1, cpus - 1), why: `night: all cores but one (${cpus} - 1)` };
}
const posInt = v => (/^\s*\d+\s*$/.test(String(v ?? '')) && +v >= 1 ? +v : null);
// the workers at start: CHECK_WORKERS or the time rules
export function startWorkers(env = process.env, now = new Date()) {
  const n = posInt(env.CHECK_WORKERS);
  return n ? { n, why: `CHECK_WORKERS=${n}` } : ruleWorkers(now);
}
// the workers now: the control file when it holds a number, else the start number
export function workersNow(start, file = CONTROL_FILE) {
  let v = null;
  try { v = posInt(fs.readFileSync(file, 'utf8')); } catch (e) { /* no file */ }
  return v ? { n: v, why: `${path.basename(file)}: ${v}` } : start;
}
// the command that starts a node process at low priority. CHECK_PRIORITY=nice uses nice on macOS too (the workers
// keep the performance cores: faster, less quiet), CHECK_PRIORITY=normal starts them as they are
function lowCommand() {
  const want = process.env.CHECK_PRIORITY || 'background';
  if (want === 'background' && process.platform === 'darwin' && fs.existsSync('/usr/sbin/taskpolicy')) return ['/usr/sbin/taskpolicy', ['-b', process.execPath], 'taskpolicy -b'];
  if (want !== 'normal' && spawnSync('sh', ['-c', 'command -v nice'], { stdio: 'ignore' }).status === 0) return ['nice', ['-n', '10', process.execPath], 'nice -n 10'];
  return [process.execPath, [], 'normal priority'];
}
// lower the priority of the calling process too (it only hands out tasks)
export function lowerSelf() { try { os.setPriority(10); } catch (e) { /* not allowed */ } }

function readTimings() { try { return JSON.parse(fs.readFileSync(TIMINGS, 'utf8')); } catch (e) { return {}; } }
function writeTimings(name, times) {
  try { const all = readTimings(); all[name] = { ...(all[name] || {}), ...times }; fs.mkdirSync(path.dirname(TIMINGS), { recursive: true }); fs.writeFileSync(TIMINGS, JSON.stringify(all, null, 1)); } catch (e) { /* timings are a hint */ }
}

// runs tasks ([{ id, ... }]) on worker processes that import `module` (a path) and call its runTask(task).
// → results in task order. Options: name (for the timings), log (a line when the worker count changes),
// control (the control file), start ({ n, why }), onDone(i, result, ms).
export function runPool(module, tasks, opts = {}) {
  const name = opts.name || path.basename(module), log = opts.log || (s => console.error(s));
  const control = opts.control || CONTROL_FILE, start = opts.start || startWorkers();
  const [cmd, pre, how] = lowCommand();
  const known = (readTimings()[name]) || {};
  // the longest tasks first (unknown ones first of all: they may be new and long)
  const queue = tasks.map((t, i) => i).sort((a, b) => (known[tasks[b].id] ?? Infinity) - (known[tasks[a].id] ?? Infinity) || a - b);
  const results = new Array(tasks.length), times = {}, alive = new Set();
  let busy = 0, lastN = null, finished = false, maxSeen = 0;
  return new Promise((resolve, reject) => {
    const limit = () => {
      const w = workersNow(start, control);
      if (w.n !== lastN) { log(`      workers: ${w.n} (${w.why}, ${how})`); lastN = w.n; }
      return w.n;
    };
    const stop = w => { alive.delete(w); w.retired = true; try { w.proc.disconnect(); } catch (e) { /* gone */ } };
    const end = err => {
      if (finished) return;
      finished = true; clearInterval(timer);
      for (const w of [...alive]) { w.retired = true; try { w.proc.kill(); } catch (e) { /* gone */ } }
      alive.clear();
      if (err) return reject(err);
      if (!opts.noTimings) writeTimings(name, times);
      resolve(results);
    };
    const feed = w => {
      if (finished) return;
      if (!queue.length || alive.size > limit()) stop(w);
      else {
        const i = queue.shift();
        w.task = i; w.t = Date.now(); busy++;
        w.proc.send({ i, task: tasks[i] });
      }
      if (!queue.length && !busy) return end();
      grow();
    };
    const spawnOne = () => {
      const proc = spawn(cmd, [...pre, '--no-warnings', WORKER, module], { cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit', 'ipc'] });
      const w = { proc, ready: false, task: null };
      alive.add(w);
      maxSeen = Math.max(maxSeen, alive.size);
      proc.on('message', m => {
        if (m.ready) { w.ready = true; return feed(w); }
        busy--;
        addStats(m.stats);
        if (!m.ok) return end(new Error(`worker failed on ${tasks[m.i].id}: ${m.error}`));
        const ms = Date.now() - w.t;
        results[m.i] = m.result; times[tasks[m.i].id] = ms; w.task = null;
        if (opts.onDone) opts.onDone(m.i, m.result, ms);
        feed(w);
      });
      proc.on('exit', (code, sig) => { if (!w.retired && !finished) end(new Error(`worker exited (${code ?? sig}) during ${w.task !== null ? tasks[w.task].id : 'start'}`)); });
    };
    const grow = () => {
      if (finished) return;
      const n = limit();
      let starting = [...alive].filter(w => !w.ready).length;
      while (alive.size < n && queue.length > starting) { spawnOne(); starting++; }
    };
    const timer = setInterval(grow, 2000);
    if (!tasks.length) return end();
    grow();
  }).finally(() => { runPool.maxSeen = maxSeen; });
}

// ---------- test and status ----------
// a dummy task for the test: wait, then say who ran it and when
export async function runTask(task) {
  const t0 = Date.now();
  await new Promise(r => setTimeout(r, task.ms));
  return { id: task.id, pid: process.pid, t0, t1: Date.now() };
}
async function selfTest() {
  const assert = (ok, msg) => { if (!ok) throw new Error(msg); };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-workers-')), control = path.join(dir, 'control');
  const ms = 500, tasks = Array.from({ length: 24 }, (_, k) => ({ id: `t${k}`, ms }));
  const lines = [];
  fs.writeFileSync(control, '3\n');
  const t0 = Date.now(), marks = {};
  // 1.2 s in: down to 1 worker; 4 s in: up to 4
  setTimeout(() => { fs.writeFileSync(control, '1\n'); marks.low = Date.now(); }, 1200);
  setTimeout(() => { fs.writeFileSync(control, '4\n'); marks.high = Date.now(); }, 4000);
  const out = await runPool(fileURLToPath(import.meta.url), tasks, { name: 'self-test', noTimings: true, control, start: { n: 2, why: 'test start' }, log: s => lines.push(s.trim()) });
  fs.rmSync(dir, { recursive: true, force: true });
  // tasks running at a time t
  const at = t => out.filter(r => r.t0 <= t && r.t1 > t).length;
  const during = (a, b) => { let m = 0; for (let t = a; t < b; t += 20) m = Math.max(m, at(t)); return m; };
  assert(out.every((r, k) => r.id === `t${k}`), 'results not in task order');
  assert(during(t0, marks.low) === 3, `3 workers from the file at start (it wins over the start number 2): ${during(t0, marks.low)}`);
  // lowered: within one task per worker (plus the 2 s timer is not needed: each hand-out reads the file) one worker
  assert(during(marks.low + ms + 150, marks.high) <= 1, `after lowering to 1: ${during(marks.low + ms + 150, marks.high)} at a time`);
  const pidsBefore = new Set(out.filter(r => r.t0 < marks.high).map(r => r.pid)), pidsAfter = new Set(out.filter(r => r.t0 >= marks.high).map(r => r.pid));
  assert(during(marks.high, Date.now()) >= 3, `after raising to 4: ${during(marks.high, Date.now())} at a time`);
  assert([...pidsAfter].some(p => !pidsBefore.has(p)), 'raising started no new worker');
  console.log(`ok    control file: 3 at start, 1 after ${marks.low - t0} ms (one at a time from +${ms + 150} ms), 4 after ${marks.high - t0} ms; ${new Set(out.map(r => r.pid)).size} worker processes, results in order`);
  console.log(`      ${lines.join(' | ')}`);
  const day = ruleWorkers(new Date(2026, 9, 20, 15), 10), sat = ruleWorkers(new Date(2026, 9, 24, 15), 10), night = ruleWorkers(new Date(2026, 9, 20, 23), 10), early = ruleWorkers(new Date(2026, 9, 20, 7, 59), 10);
  assert(day.n === 4 && sat.n === 6 && night.n === 9 && early.n === 9, `rules: ${day.n} ${sat.n} ${night.n} ${early.n}`);
  assert(startWorkers({ CHECK_WORKERS: '8' }).n === 8 && startWorkers({ CHECK_WORKERS: 'x' }, new Date(2026, 9, 20, 15)).n === Math.min(4, os.cpus().length), 'CHECK_WORKERS');
  console.log('ok    rules: weekday 15:00 → 4, Saturday 15:00 → 6, 23:00 and 07:59 → cores - 1, CHECK_WORKERS=8 → 8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--test')) {
    selfTest().then(() => { console.log('\nall worker checks passed'); process.exit(0); }, e => { console.log(`FAIL  ${e.message}`); process.exit(1); });
  } else {
    const s = startWorkers(), w = workersNow(s);
    console.log(`${w.n} workers now (${w.why}); ${os.cpus().length} cores; ${lowCommand()[2]}`);
  }
}
