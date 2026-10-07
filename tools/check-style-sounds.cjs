// Checks that every sound and drum machine named by the style recipes is in the app's loaded sound map.
// Usage: PLAYWRIGHT_CORE=... node tools/check-style-sounds.cjs   (dev server on :5173); exit 1 when a sound is missing
const { chromium } = require(process.env.PLAYWRIGHT_CORE || 'playwright-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const { loadStyles } = await import('./styles-dir.mjs');
  const { recipeSounds } = await import('../src/endless/recipe.js');
  const { GUITAR_TYPES, GROOVES } = await import('../src/music.js');
  const recipes = loadStyles();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/');
  let keys = [];
  for (let i = 0; i < 30 && keys.length < 500; i++) { await sleep(1000); keys = await page.evaluate(() => Object.keys((globalThis.soundMap && globalThis.soundMap.get()) || {})); }
  await browser.close();
  const have = new Set(keys);
  let missing = 0;
  for (const r of recipes) {
    const sounds = recipeSounds(r);
    for (const g of (r.guitar && r.guitar.types) || []) sounds.push(...GUITAR_TYPES[g][1].split(','));
    const lost = [...new Set(sounds)].filter(s => !have.has(s));
    const kits = ((r.drums && r.drums.kits) || []).filter(k => !keys.some(x => x.startsWith(`${k.toLowerCase()}_`) || x.startsWith(`${k}_`)));
    // every drum row a groove plays must exist in every kit of the recipe (for example a ride for jazz)
    for (const k of (r.drums && r.drums.kits) || []) for (const g of r.drums.grooves) for (const [row, steps] of Object.entries(GROOVES[g][1]))
      if (steps.includes('x') && !have.has(`${k}_${row}`) && !have.has(`${k.toLowerCase()}_${row}`)) kits.push(`${k}_${row}(${g})`);
    missing += lost.length + kits.length;
    console.log(`${r.id.padEnd(16)} ${lost.length || kits.length ? `MISSING ${[...lost, ...kits].join(' ')}` : `ok (${sounds.length} sounds, ${((r.drums && r.drums.kits) || []).length} kits)`}`);
  }
  console.log(`${keys.length} sounds loaded; ${missing} missing`);
  process.exit(missing ? 1 : 0);
})();
