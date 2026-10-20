// A worker process of tools/check-pool.mjs (faster-checks): imports the module named on the command line once, then
// runs each task it is sent with the module's runTask(task) and sends the result back. Not run by hand.
import { pathToFileURL } from 'node:url';
import { cacheStats } from './code-cache.mjs';

const mod = await import(pathToFileURL(process.argv[2]).href);
let last = cacheStats();
process.on('message', async ({ i, task }) => {
  let msg;
  try { msg = { i, ok: true, result: await mod.runTask(task) }; } catch (e) { msg = { i, ok: false, error: (e && e.stack) || String(e) }; }
  const now = cacheStats();
  msg.stats = { hits: now.hits - last.hits, misses: now.misses - last.misses };
  last = now;
  process.send(msg);
});
process.on('disconnect', () => process.exit(0));
process.send({ ready: true });
