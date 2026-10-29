// The style maker (invented-styles, #51): a new style recipe mixed from the built-in styles, from a seed.
// Words, used with one meaning each: a genre is a broad family of music (fixed list, never invented); a style is a
// precise recipe inside one genre (what this module invents); an artist is an invented name that mixes styles.
// One built-in style is the base (tempo part and headroom), one or two others lend whole parts; lists are trimmed and the
// coherence rules read the built-in styles as a table of pairs that already work (two building blocks fit when a
// built-in style uses both). Pure: checked in Node (tools/check-invented.mjs), the same seed gives the same style.
import { stream } from './random.js';
import { PARTS, PART_NAMES, validateRecipe, withDefaults, recipeOrder, RECIPE_FORMAT } from './recipe.js';
import { GENRES } from '../song/format.js';

// raise it when an intended change moves the seed fixtures (tests/snapshots/invented-styles.json), like DIRECTOR_VERSION
export const STYLE_MAKER_VERSION = 1;
export const MAX_TRIES = 8;
// a style closer than this to an existing one is a copy: drawn again
export const COPY_LIMIT = 0.8;
// below this the closest genre is too far: the style goes in experimental
export const GENRE_FLOOR = 0.25;
const NEAR_DONOR = 0.65, HOME_MARGIN = 8, MIN_TEMPO = 4;
// the parts a donor may lend (the tempo part always comes from the base)
export const LENT_PARTS = PART_NAMES.filter(p => p !== 'tempo');
const INSTR = ['drums', 'bass', 'arp', 'hook', 'pad', 'guitar', 'texture', 'riser'];
// instruments dropped first when a style would have more than 6
const DROP_ORDER = ['riser', 'texture', 'guitar', 'arp'];
// how many items each list keeps of its source [low, high]
const TRIM = { kits: [1, 2], grooves: [1, 2], presets: [1, 3], waves: [1, 2], modes: [1, 2], samples: [1, 3], rhythms: [1, 2], patterns: [1, 3], types: [1, 2] };

// ---------- names ----------
// image words and motion words, translated in pairs; no free text, so no brand or person can appear
const IMAGES = [['Rust', 'ruggine'], ['Fog', 'nebbia'], ['Glass', 'vetro'], ['Salt', 'sale'], ['Ash', 'cenere'], ['Moss', 'muschio'], ['Copper', 'rame'], ['Velvet', 'velluto'], ['Ember', 'brace'], ['Frost', 'brina'], ['Smoke', 'fumo'], ['Iron', 'ferro'], ['Marble', 'marmo'], ['Amber', 'ambra'], ['Basalt', 'basalto'], ['Paper', 'carta'], ['Sand', 'sabbia'], ['Silk', 'seta'], ['Lichen', 'lichene'], ['Pollen', 'polline'], ['Flint', 'selce'], ['Rain', 'pioggia'], ['Dust', 'polvere'], ['Coral', 'corallo'], ['Ivory', 'avorio'], ['Tar', 'catrame'], ['Chalk', 'gesso'], ['Brass', 'ottone']];
const MOTIONS = [['Tide', 'Marea'], ['Drift', 'Deriva'], ['Spiral', 'Spirale'], ['Current', 'Corrente'], ['Ritual', 'Rito'], ['Orbit', 'Orbita'], ['Swarm', 'Sciame'], ['Ladder', 'Scala'], ['Haze', 'Foschia'], ['Loom', 'Telaio'], ['Bridge', 'Ponte'], ['Avalanche', 'Valanga'], ['Procession', 'Processione'], ['Mirage', 'Miraggio'], ['Ripple', 'Increspatura'], ['Furnace', 'Fornace'], ['Choir', 'Coro'], ['Lantern', 'Lanterna'], ['Engine', 'Motore'], ['Garden', 'Giardino']];
const SUFFIXES = ['wave', 'step', 'drive', 'pulse', 'core'];
// real genre names (and the app's genres): a name equal to one, or with one as a word, is never used
export const REAL_GENRES = ['vaporwave', 'chillwave', 'darkwave', 'coldwave', 'synthwave', 'retrowave', 'dreamwave', 'outrun', 'dubstep', 'brostep', 'trap', 'grime', 'drill', 'hardcore', 'nightcore', 'mathcore', 'metalcore', 'deathcore', 'grindcore', 'speedcore', 'breakcore', 'gabber', 'hardstyle', 'jungle', 'garage', 'footwork', 'juke', 'witch house', 'seapunk', 'steampunk', 'dub', 'glitch', 'idm', 'edm', 'shoegaze', 'emo', 'ska', 'punk', 'grunge', 'techno', 'trance', 'house', 'ambient', 'disco', 'funk', 'soul', 'blues', 'reggae', 'salsa', 'tango', 'rumba', 'drone', 'noise', 'krautrock', 'electro', 'eurobeat', 'hyperpop', 'phonk', 'lofi', 'lo-fi', 'jazz', 'rock', 'metal', 'country', 'folk', 'pop', 'rap', 'hip-hop', 'industrial', 'drum and bass', 'dnb', 'breakbeat', 'downtempo', 'trip-hop', 'chiptune', 'synthpop', 'cyberpunk', 'stoner', 'sludge', 'doom', 'post-rock', 'ebm', 'rave', 'acid', 'psytrance', 'goa', 'minimal', 'wave', 'dancehall', 'afrobeat', 'amapiano', 'crunk', 'horrorcore', 'darksynth', 'electropop', 'grindhouse', 'swing', 'gospel', 'opera', 'classical'];
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const words = s => String(s || '').toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
// names a style may not take: real genres, the app's genres, the given names (existing styles and artists)
export function forbiddenName(name, avoid = []) {
  const whole = new Set([...REAL_GENRES, ...GENRES, ...avoid].map(norm)), word = new Set([...REAL_GENRES, ...GENRES].map(norm));
  return [name.en, name.it].some(n => whole.has(norm(n)) || words(n).some(w => word.has(norm(w))));
}
function makeName(r) {
  const [ie, ii] = r.pick(IMAGES);
  if (r.chance(0.3)) { const n = `${ie}${r.pick(SUFFIXES)}`; return { en: n, it: n }; }
  const [me, mi] = r.pick(MOTIONS);
  return { en: `${ie} ${me}`, it: `${mi} di ${ii}` };
}
export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const idOf = (name, seed) => `${slug(name.en) || 'style'}-${String(seed).toLowerCase().replace(/[^a-z0-9]/g, '').slice(-4) || 'x'}`;

// ---------- the pair tables of the built-in styles ----------
const hull = (list, margin = 0) => (list.length ? [Math.min(...list.map(x => x[0])) - margin, Math.max(...list.map(x => x[1])) + margin] : null);
const inside = (a, b) => !!b && a[0] >= b[0] && a[1] <= b[1];
const cut = (a, b) => [Math.max(a[0], b[0]), Math.min(a[1], b[1])];
const width = a => a[1] - a[0];
let tableCache = null;
export function pairTables(pool) {
  const key = pool.map(r => r.id).join(',');
  if (tableCache && tableCache.key === key) return tableCache;
  const P = pool.map(withDefaults), grooveHome = {}, guitarHome = {}, kitGroove = new Set(), modeProg = new Set(), swingGroove = {};
  const gt = {}, gu = {};
  for (const r of P) {
    const d = r.drums || {};
    for (const g of d.grooves || []) { (gt[g] = gt[g] || []).push(r.tempo); for (const k of d.kits || []) kitGroove.add(`${k}|${g}`); if (r.swing && r.swing[1] > 0) swingGroove[g] = swingGroove[g] || r.swing; }
    for (const m of (r.hook && r.hook.modes) || []) for (const p of r.progressions || []) modeProg.add(`${m}|${p}`);
    for (const ty of (r.guitar && r.guitar.types) || []) (gu[ty] = gu[ty] || []).push(r.tempo);
  }
  for (const [g, l] of Object.entries(gt)) grooveHome[g] = hull(l, HOME_MARGIN);
  for (const [g, l] of Object.entries(gu)) guitarHome[g] = hull(l, HOME_MARGIN);
  tableCache = { key, grooveHome, guitarHome, kitGroove, modeProg, swingGroove, byId: Object.fromEntries(P.map(r => [r.id, r])) };
  return tableCache;
}

// The coherence rules (design D3) a recipe breaks, as short texts; [] when it fits. pool: the built-in styles.
export function styleCoherence(recipe, pool) {
  const T = pairTables(pool), out = [], R = withDefaults(recipe), d = R.drums || {};
  for (const g of d.grooves || []) if (!inside(R.tempo, T.grooveHome[g])) out.push(`groove ${g} at ${R.tempo.join('-')} BPM: home ${T.grooveHome[g] ? T.grooveHome[g].join('-') : 'none'}`);
  if (R.drums && !(d.kits || []).some(k => (d.grooves || []).some(g => T.kitGroove.has(`${k}|${g}`)))) out.push('no drum machine played with these grooves');
  if (R.swing && R.swing[1] > 0 && !(d.grooves || []).some(g => T.swingGroove[g])) out.push('swing without a swinging groove');
  for (const m of (R.hook && R.hook.modes) || []) if (!(R.progressions || []).some(p => T.modeProg.has(`${m}|${p}`))) out.push(`hook mode ${m} with none of the progressions`);
  for (const ty of (R.guitar && R.guitar.types) || []) if (!inside(R.tempo, T.guitarHome[ty])) out.push(`guitar ${ty} at ${R.tempo.join('-')} BPM`);
  const base = recipe.invented && T.byId[recipe.invented.from && recipe.invented.from.tempo];
  if (base && (R.shapes || []).some(s => !base.shapes.includes(s))) out.push('energy shapes not from the base');
  if ((R.meters || ['4/4']).some(m => m !== '4/4')) out.push('a meter other than 4/4');
  const u = R.tracks.usual;
  if (u[0] < 4 || u[1] > 5 || R.tracks.max > 8 || R.tracks.max < u[1]) out.push(`tracks usual ${u.join('-')}, max ${R.tracks.max}`);
  const ins = INSTR.filter(k => recipe[k]);
  if (!recipe.drums || !recipe.bass || !['hook', 'arp', 'pad'].some(k => recipe[k])) out.push('drums, bass and a hook, arp or pad');
  if (ins.length > 6) out.push(`${ins.length} instruments, at most 6`);
  return out;
}

// ---------- similarity, closest style and genre ----------
const jaccard = (a, b) => { const A = new Set(a || []), B = new Set(b || []); if (!A.size && !B.size) return 1; let n = 0; for (const x of A) if (B.has(x)) n++; return n / (A.size + B.size - n); };
const presetsOf = r => ['bass', 'arp', 'hook', 'pad'].flatMap(k => ((r[k] && r[k].presets) || []).map(p => `${k}:${p}`)).concat(((r.guitar && r.guitar.patterns) || []).map(p => `guitar:${p}`));
// how alike two styles are, 0 to 1: tempo overlap, shared grooves, drum machines, progressions and presets
export function similarity(a, b) {
  const ta = a.tempo, tb = b.tempo, over = Math.max(0, Math.min(ta[1], tb[1]) - Math.max(ta[0], tb[0])), uni = Math.max(ta[1], tb[1]) - Math.min(ta[0], tb[0]);
  const tempo = uni > 0 ? over / uni : ta[0] === tb[0] ? 1 : 0;
  return 0.2 * tempo + 0.2 * jaccard((a.drums || {}).grooves, (b.drums || {}).grooves) + 0.1 * jaccard((a.drums || {}).kits, (b.drums || {}).kits) + 0.2 * jaccard(a.progressions, b.progressions) + 0.3 * jaccard(presetsOf(a), presetsOf(b));
}
// the closest existing style and the closest genre (mean of the genre's two closest styles; experimental when far)
export function closestOf(recipe, pool) {
  const sims = pool.map(r => ({ id: r.id, genre: r.genre || 'experimental', s: similarity(recipe, r) })).sort((x, y) => y.s - x.s || (x.id < y.id ? -1 : 1));
  const byGenre = {};
  for (const x of sims) (byGenre[x.genre] = byGenre[x.genre] || []).push(x.s);
  let genre = 'experimental', best = -1;
  for (const g of GENRES) { const l = byGenre[g]; if (!l) continue; const top = l.slice(0, 2), m = top.reduce((a, b) => a + b, 0) / top.length; if (m > best + 1e-9) { best = m; genre = g; } }
  if (best < GENRE_FLOOR) genre = 'experimental';
  return { style: sims[0].id, styleSim: sims[0].s, genre, genreSim: best, max: sims[0].s };
}

// ---------- description ----------
const PART_WORDS = {
  en: { drums: 'drums', bass: 'bass', harmony: 'harmony', lead: 'melody', pads: 'pads', voice: 'voice' },
  it: { drums: 'batteria', bass: 'basso', harmony: 'armonia', lead: 'melodia', pads: 'pad', voice: 'voce' },
};
const andList = (l, lang) => (l.length < 2 ? l.join('') : `${l.slice(0, -1).join(', ')} ${lang === 'it' ? 'e' : 'and'} ${l[l.length - 1]}`);
// "Base Techno berlinese; batteria da Lo-fi, armonia e pad da Synthwave." from the origin of each part
export function describeInvented(from, nameOf, lang = 'en') {
  const L = lang === 'it' ? 'it' : 'en', base = from.tempo, by = {};
  for (const p of LENT_PARTS) if (from[p] && from[p] !== base) (by[from[p]] = by[from[p]] || []).push(PART_WORDS[L][p]);
  const lent = Object.entries(by).map(([id, ps]) => `${andList(ps, L)} ${L === 'it' ? 'da' : 'from'} ${nameOf(id)}`);
  return `${L === 'it' ? 'Base' : 'Based on'} ${nameOf(base)}${lent.length ? `; ${lent.join(', ')}` : ''}.`;
}

// ---------- the maker ----------
const clone = o => JSON.parse(JSON.stringify(o));
// some items of a list, in the source's order
function some(r, list, [lo, hi]) {
  if (!Array.isArray(list) || list.length <= lo) return list ? list.slice() : list;
  const n = Math.min(list.length, r.int(lo, hi)), keep = new Set(r.shuffle(list.map((_, i) => i)).slice(0, n));
  return list.filter((_, i) => keep.has(i));
}
function trimInstrument(r, part) {
  const out = clone(part);
  for (const [k, lim] of Object.entries(TRIM)) if (Array.isArray(out[k])) out[k] = some(r, out[k], lim);
  return out;
}
const gap = (a, b) => Math.max(0, Math.max(a[0], b[0]) - Math.min(a[1], b[1]));
const near = (a, b) => a.genre === b.genre || gap(a.tempo, b.tempo) <= 15;

// One draw: { recipe, why } (why: the reason it was refused, or '' when it fits)
function draw(seed, pool, { genre, base: baseId, avoid, kept, lang, nameOf }, T, label) {
  const r = stream(seed, `style-maker/${label}`);
  const P = pool.map(withDefaults);
  const bases = baseId ? P.filter(x => x.id === baseId) : genre ? P.filter(x => x.genre === genre) : P;
  if (!bases.length) return { recipe: null, why: 'no base' };
  const base = r.pick(bases);
  const others = P.filter(x => x.id !== base.id), donors = [];
  const nDonors = r.chance(0.5) ? 2 : 1;
  for (let i = 0; i < nDonors; i++) {
    const left = others.filter(x => !donors.includes(x)), nearL = left.filter(x => near(x, base));
    const from = r.chance(NEAR_DONOR) && nearL.length ? nearL : left;
    if (from.length) donors.push(r.pick(from));
  }
  // each lent part from the base or a donor; at least two from donors and two from the base
  const from = { tempo: base.id };
  for (const p of LENT_PARTS) from[p] = r.chance(0.5) ? base.id : r.pick(donors).id;
  const lent = () => LENT_PARTS.filter(p => from[p] !== base.id);
  for (const p of r.shuffle(LENT_PARTS)) { if (lent().length >= 2) break; if (from[p] === base.id) from[p] = r.pick(donors).id; }
  for (const p of r.shuffle(LENT_PARTS)) { if (LENT_PARTS.length - lent().length >= 2) break; if (from[p] !== base.id) from[p] = base.id; }
  return build({ r, base, from, P, T, genre, avoid, kept, lang, nameOf, seed });
}

// the recipe of a base and the origin of each part, trimmed and fitted to the rules
function build({ r, base, from, P, T, genre, avoid, kept, lang, nameOf, seed, fallback = false }) {
  const byId = Object.fromEntries(P.map(x => [x.id, x])), src = p => byId[from[p]];
  const raw = { format: RECIPE_FORMAT };
  // tempo part (the base): tempo cut below to the home tempo of the grooves
  let tempo = base.tempo.slice();
  // drums: the grooves must have a home tempo that holds the base's; else the base's drums
  let drums = src('drums').drums ? trimInstrument(r, src('drums').drums) : null;
  if (drums && from.drums !== base.id) {
    const ok = drums.grooves.filter(g => T.grooveHome[g] && width(cut(base.tempo, T.grooveHome[g])) >= MIN_TEMPO);
    let t = base.tempo.slice();
    const kept2 = [];
    for (const g of ok) { const c = cut(t, T.grooveHome[g]); if (width(c) >= MIN_TEMPO) { kept2.push(g); t = c; } }
    if (!kept2.length) { from.drums = base.id; drums = trimInstrument(r, base.drums); }
    else { drums.grooves = kept2; tempo = t; }
  }
  // (a kit that never played one of the grooves goes; the source pairs them, so one always stays)
  if (drums) { const kits = drums.kits.filter(k => drums.grooves.some(g => T.kitGroove.has(`${k}|${g}`))); drums.kits = kits.length ? kits : drums.kits; }
  if (LENT_PARTS.filter(p => from[p] !== base.id).length < (fallback ? 1 : 2)) return { recipe: null, why: 'too few lent parts after the groove rule' };
  // harmony
  const H = src('harmony');
  raw.keys = some(r, H.keys, [2, 4]);
  raw.progressions = some(r, H.progressions, [2, 3]);
  // swing only with a groove a swinging style plays
  const swingG = drums && drums.grooves.find(g => T.swingGroove[g]);
  // (and only when the harmony or the drums come from a style that swings: its range)
  const D = byId[from.drums], swings = x => x && x.swing && x.swing[1] > 0;
  if (swingG && (swings(H) || swings(D))) raw.swing = (swings(H) ? H.swing : D.swing).slice();
  // energy shapes: the base's shared with a donor, else the base's
  const donorIds = [...new Set(LENT_PARTS.map(p => from[p]).filter(id => id !== base.id))];
  const shared = base.shapes.filter(s => donorIds.some(id => byId[id].shapes.includes(s)));
  raw.shapes = shared.length ? shared : base.shapes.slice();
  raw.minutes = base.minutes.slice(); raw.phrase = base.phrase;
  const u = base.tracks.usual.map(x => Math.max(4, Math.min(5, x)));
  raw.tracks = { usual: u, max: Math.max(u[1], Math.min(8, base.tracks.max)) };
  if (base.energy) raw.energy = clone(base.energy);
  if (base.headroom !== undefined) raw.headroom = base.headroom;
  if (base.growthShapes) raw.growthShapes = clone(base.growthShapes);
  // instruments
  if (drums) raw.drums = drums;
  if (src('bass').bass) raw.bass = trimInstrument(r, src('bass').bass);
  for (const k of PARTS.lead) if (src('lead')[k]) raw[k] = trimInstrument(r, src('lead')[k]);
  for (const k of PARTS.pads) if (src('pads')[k]) raw[k] = trimInstrument(r, src('pads')[k]);
  // hook modes that some style plays over one of the progressions; none: the harmony source's own
  if (raw.hook && raw.hook.modes) {
    const fit = raw.hook.modes.filter(m => raw.progressions.some(p => T.modeProg.has(`${m}|${p}`)));
    const own = ((H.hook && H.hook.modes) || []).filter(m => raw.progressions.some(p => T.modeProg.has(`${m}|${p}`)));
    raw.hook.modes = fit.length ? fit : own.length ? some(r, own, [1, 2]) : raw.hook.modes;
  }
  // guitar types only at tempos a guitar style plays
  if (raw.guitar) { const ty = raw.guitar.types.filter(x => inside(tempo, T.guitarHome[x])); if (ty.length) raw.guitar.types = ty; else delete raw.guitar; }
  for (const k of DROP_ORDER) if (INSTR.filter(x => raw[x]).length > 6) delete raw[k];
  // voice part
  const V = src('voice');
  for (const k of PARTS.voice) if (V[k] !== undefined) raw[k] = clone(V[k]);
  raw.tempo = tempo;
  // title words: 3 to 6 per language from the styles used
  const used = [...new Set(PART_NAMES.map(p => from[p]))];
  raw.words = Object.fromEntries(['en', 'it', 'es'].map(l => { const all = [...new Set(used.flatMap(id => byId[id].words[l] || []))]; return [l, r.shuffle(all).slice(0, Math.min(all.length, r.int(3, 6)))]; }));
  // name, id, genre, description, origin
  const nr = stream(seed, 'style-maker/name');
  let name = makeName(nr);
  for (let i = 0; i < 40 && forbiddenName(name, avoid); i++) name = makeName(nr);
  const recipe = { format: RECIPE_FORMAT, id: idOf(name, seed), name };
  const c = closestOf({ ...raw, drums: raw.drums }, P);
  recipe.genre = fallback && genre ? genre : c.genre;
  recipe.description = describeInvented(from, nameOf, lang);
  const ordered = { ...recipe };
  for (const k of ['tempo', 'keys', 'progressions', 'swing', 'shapes', 'minutes', 'phrase', 'tracks', 'energy', 'headroom', 'growthShapes', ...INSTR, 'voice', 'spoken', 'narrator', 'words']) if (raw[k] !== undefined) ordered[k] = raw[k];
  ordered.invented = { seed: String(seed), maker: STYLE_MAKER_VERSION, from: { ...from }, closest: c.style, edited: false };
  // checks: valid, coherent, not a copy, in the asked genre
  const v = validateRecipe(ordered);
  if (v.errors.length || v.warnings.length) return { recipe: ordered, why: `invalid: ${[...v.errors, ...v.warnings].map(e => `${e.path} ${e.msg}`).join('; ')}` };
  const rules = styleCoherence(ordered, P);
  if (rules.length) return { recipe: ordered, why: `rule: ${rules.join('; ')}` };
  if (!fallback) {
    const copy = [...P, ...kept].find(x => similarity(ordered, x) >= COPY_LIMIT);
    if (copy) return { recipe: ordered, why: `copy of ${copy.id}` };
    if (genre && ordered.genre !== genre) return { recipe: ordered, why: `genre ${ordered.genre}, not ${genre}` };
  }
  return { recipe: ordered, why: '', sim: c };
}

// The fallback after MAX_TRIES refused draws: the base with one donor part that fits (always found in practice; the
// check counts it)
function fallbackDraw(seed, pool, opts, T) {
  const r = stream(seed, 'style-maker/fallback'), P = pool.map(withDefaults);
  const bases = opts.base ? P.filter(x => x.id === opts.base) : opts.genre ? P.filter(x => x.genre === opts.genre) : P;
  const base = r.pick(bases.length ? bases : P);
  for (const part of ['pads', 'harmony', 'bass', 'lead', 'voice', 'drums']) for (const d of P) {
    if (d.id === base.id) continue;
    const from = Object.fromEntries(PART_NAMES.map(p => [p, base.id]));
    from[part] = d.id;
    const res = build({ r: stream(seed, `style-maker/fallback/${part}/${d.id}`), base, from, P, T, genre: opts.genre, avoid: opts.avoid, kept: opts.kept, lang: opts.lang, nameOf: opts.nameOf, seed, fallback: true });
    if (res.recipe && !res.why) return res;
  }
  return null;
}

// inventStyle(seed, pool, { genre, base, avoid, kept, lang, nameOf }) → { recipe, report }
//   pool: the built-in styles (the ingredients; sorted here as recipeOrder sorts them, so every browser gets the same)
//   genre: the genre the style must land in (the Genres tab); base: a style id to start from (the radio's selection)
//   avoid: names never to take (existing styles and artists); kept: the user's styles a new one must not copy
//   lang: the description's language; nameOf(id): a style's name in that language
export function inventStyle(seed, pool, { genre = null, base = null, avoid = [], kept = [], lang = 'en', nameOf = null } = {}) {
  seed = String(seed);
  const P = pool.filter(x => x && !x.invented).slice().sort((a, b) => recipeOrder(a.id).localeCompare(recipeOrder(b.id)));
  const names = Object.fromEntries(P.map(x => [x.id, x.name]));
  const opts = { genre, base: base && P.some(x => x.id === base) ? base : null, avoid: [...avoid, ...P.flatMap(x => [x.name.en, x.name.it]), ...kept.flatMap(x => (x.name ? [x.name.en, x.name.it] : []))], kept: kept.map(withDefaults), lang, nameOf: nameOf || (id => (names[id] ? names[id][lang === 'it' ? 'it' : 'en'] : id)) };
  const T = pairTables(P), refused = [];
  for (let n = 0; n < MAX_TRIES; n++) {
    const res = draw(seed, P, opts, T, n === 0 ? 'draw' : `try/${n}`);
    if (res.recipe && !res.why) return { recipe: res.recipe, report: { tries: n + 1, fallback: false, refused, closest: res.sim } };
    refused.push(res.why);
  }
  const fb = fallbackDraw(seed, P, opts, T);
  if (!fb) throw new Error(`style maker: no style for seed ${seed}`);
  return { recipe: fb.recipe, report: { tries: MAX_TRIES + 1, fallback: true, refused, closest: fb.sim } };
}

// the description of an invented style in another language (the sheet shows it in the app's language)
export const inventedDescription = (recipe, nameOf, lang) => (recipe && recipe.invented && recipe.invented.from ? describeInvented(recipe.invented.from, nameOf, lang) : (recipe && recipe.description) || '');
