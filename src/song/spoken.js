// Voice instrument (voice-instrument, #39): a track of type "spoken" whose lines are part of the music, apart from the
// narrator (voice tracks, which speak the comments of a live build). A pattern is a line:
//   { "text": { "en": "…", "it": "…" } | "…" | "vocab:<group>", "way": "passage" | "refrain" | "chop" | "opening",
//     "every": 4, "slices": 8, "rhythm": "0 1 0 1 2 2 3 ~", "before": "<track id>" }
// Clips place lines like any pattern; the compiler resolves each clip to bars (placeSpoken) and writes one sample line
// per way with a mask lane, on orbits 13 and 14 (the narrator speaks on 15 and up). Samples are made offline by
// `npm run voices` (tools/voice.mjs); a line without its sample stays silent. Pure: the app and the Node checks resolve
// the same lines and bars.
import { normalizeSong, VOICE_DEFAULT, VOICE_LIMITS } from './format.js';
import { meterSteps, rle } from '../music.js';
import { stream } from '../endless/random.js';
import { rackCode } from './rack.js';
import { getLang, t } from '../i18n.js';
import { VOCABULARY, VOCAB_GROUPS, POETIC } from './vocabulary.js';
import { SPEAKERS, saySlug, sayBank, buildSteps } from './build.js';

export const WAYS = ['passage', 'refrain', 'chop', 'opening'];
export const NARRATOR_STYLES = ['explain', 'poetic'];
export const MAX_WORDS = 12;
// a sample's length when it is not measured: about 0.38 s a word, plus the attack and the tail
const SECONDS_PER_WORD = 0.38;
// sections whose role is quiet (intro, break, outro), by name; the director names its sections after their role
const QUIET_NAME = /intro|break|pausa|outro|coda|fine/i;
// sections whose role is busy (voice-full-controls D7): a drop or a peak
const BUSY_NAME = /drop|peak|picco|climax/i;
export const SPOKEN_ORBIT = 13;

// What the compiler knows about the samples on this machine. files: the custom samples manifest ({ bank: [files] });
// null (the default, Node checks and snapshots) assumes every sample exists, numbered by the sorted texts of the song,
// so the code does not depend on the machine. lengths: { "say_en_eddy/the_city.wav": seconds } (tools/voice.mjs).
// lang: the language of the lines (default: the app's). styles: { id: recipe }, for the style's lines and speakers.
export const spokenContext = { files: null, lengths: {}, lang: null, styles: {} };
export function setSpokenContext(o) { Object.assign(spokenContext, o); }

const words = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
export const isSpoken = tr => !!tr && tr.type === 'spoken';
const textOf = (txt, lang) => (!txt ? '' : typeof txt === 'string' ? txt : txt[lang] || txt.en || Object.values(txt)[0] || '');
const langOf = () => spokenContext.lang || getLang() || 'en';
const styleRecipes = song => ((song.tags && song.tags.styles) || []).map(id => (spokenContext.styles || {})[id]).filter(Boolean);
const rngOf = (song, sub) => stream(String((song && song.id) || 'song'), 'spoken').fork(sub);

// ---------- texts ----------
// the line of a pattern: { text: { en, it } } (a whole sample) or { parts: [{ en, it }] } (vocabulary entries, one per
// beat). Own text, else the style's lines for the way, else the vocabulary drawn with the song's seed.
export function lineOf(song, track, key, pat) {
  const way = WAYS.includes(pat.way) ? pat.way : 'passage';
  if (pat.text && !(typeof pat.text === 'string' && pat.text.startsWith('vocab:'))) return { text: typeof pat.text === 'string' ? { en: pat.text } : pat.text };
  const r = rngOf(song, `${track.id}:${key}`);
  const fromStyle = styleRecipes(song).flatMap(x => (x.spoken && x.spoken.lines && x.spoken.lines[way]) || []);
  if (!pat.text && fromStyle.length) return { text: r.pick(fromStyle) };
  const asked = typeof pat.text === 'string' ? pat.text.slice(6) : '';
  const styleGroup = styleRecipes(song).map(x => x.spoken && x.spoken.vocab).find(g => VOCAB_GROUPS.includes(g));
  const group = VOCAB_GROUPS.includes(asked) ? asked : styleGroup || r.pick(VOCAB_GROUPS);
  const list = VOCABULARY[group];
  // a chop is one entry; a refrain or an opening two or three; a passage three or four
  const n = way === 'chop' ? 1 : way === 'passage' ? r.int(3, 4) : r.int(2, 3);
  const parts = r.shuffle(list).slice(0, n);
  return n === 1 ? { text: parts[0], generated: true } : { parts };
}
// the texts of a line in a language (one per sample)
export const lineTexts = (line, lang) => (line.parts ? line.parts.map(p => textOf(p, lang)) : [textOf(line.text, lang)]).filter(Boolean);

// ---------- speakers ----------
// the narrator's speaker ('' the default voice); the voice instrument's: its own setting, else a draw from the style's
// speakers, else from every speaker, never the narrator's (design D4)
export const narratorSpeaker = song => { const v = (song.tracks || []).find(x => x.type === 'voice'); return (v && v.settings && v.settings.speaker) || ''; };
export function speakerOf(song, track) {
  const own = track.settings && track.settings.speaker;
  if (own) return own;
  const nar = narratorSpeaker(song);
  const style = [...new Set(styleRecipes(song).flatMap(x => (x.spoken && x.spoken.speakers) || []))].filter(x => x && x !== nar);
  const all = SPEAKERS.filter(x => x !== nar);
  return rngOf(song, `speaker:${track.id}`).pick(style.length ? style : all);
}

// ---------- samples ----------
// the sample of a text: { bank, n } or null. With files null every sample exists, numbered in the sorted list of the
// texts the song speaks with that bank (virtual).
function sampleOf(text, bank, virtual) {
  const slug = saySlug(text);
  if (spokenContext.files === null) { const list = virtual.get(bank) || []; const n = list.indexOf(slug); return n >= 0 ? { bank, n } : null; }
  for (const b of [bank, bank.replace(/_[a-z]+$/, '')]) {
    const list = (spokenContext.files || {})[b] || [];
    const n = list.findIndex(f => decodeURI(f).endsWith(`/${slug}.wav`));
    if (n >= 0) return { bank: b, n };
  }
  return null;
}
// a placed line (placeSpoken) with a sample for at least one of its texts: the compiler writes code for it (without
// one it writes only the comment, "no sample"); with files null every sample exists
export const lineSounds = p => spokenContext.files === null || p.texts.some(x => !!sampleOf(x, p.bank, new Map()));
// a text's length in seconds: measured by tools/voice.mjs, else estimated from its words
const secondsOf = (text, bank) => { const m = (spokenContext.lengths || {})[`${bank}/${saySlug(text)}.wav`]; return Number.isFinite(m) && m > 0 ? m : words(text) * SECONDS_PER_WORD + 0.3; };

// ---------- placement ----------
// tracks that count as playing in a section: neither voice nor spoken, with a clip there (from the clips, so every
// state of a live build places the lines on the same bars)
const over = (c, s) => c.start < s.start + s.bars && c.start + c.bars > s.start;
export function sectionFacts(n) {
  const plays = n.tracks.filter(x => x.type !== 'voice' && x.type !== 'spoken' && x.clips.length);
  const counts = n.sections.map(s => plays.filter(x => x.clips.some(c => over(c, s))).length);
  const most = Math.max(0, ...counts);
  const quiet = n.sections.map((s, i) => counts[i] <= most / 2 || QUIET_NAME.test(s.name || ''));
  // the kind of each section (D7): quiet (as before), busy (three quarters of the most tracks at least, or a drop or a
  // peak), medium (the rest)
  const kinds = n.sections.map((s, i) => (quiet[i] ? 'quiet' : counts[i] >= most * 0.75 || BUSY_NAME.test(s.name || '') ? 'busy' : 'medium'));
  return { counts, quiet, kinds };
}
// the kinds a spoken track may speak in (voiceOptions.where), quiet only by default
export const whereOfTrack = tr => { const w = tr && tr.voiceOptions && Array.isArray(tr.voiceOptions.where) ? ['quiet', 'medium', 'busy'].filter(x => tr.voiceOptions.where.includes(x)) : []; return w.length ? w : ['quiet']; };
const secAt = (n, bar) => n.sections.find(s => bar >= s.start && bar < s.start + s.bars) || n.sections[n.sections.length - 1];
const beatsOf = sec => meterSteps(sec.meter) / 4;
const secPerBeat = sec => 60 / (sec.bpm || 120);
// where a track enters at or after a bar (a clip that starts where it was not playing the bar before)
export function entryAfter(n, id, from) {
  const tr = n.tracks.find(x => x.id === id);
  if (!tr) return null;
  const starts = tr.clips.map(c => c.start).filter(b => b > from && !tr.clips.some(c => c.start < b && c.start + c.bars >= b)).sort((a, b) => a - b);
  return starts.length ? starts[0] : null;
}

// Every line of the song's spoken tracks, placed: [{ track, ti, orbit, key, way, line, speaker, texts, beats, starts:
// [{ bar, late }] }]. beats: the line's length in beats (at the tempo where it starts); late: a fraction of a bar.
// input: a song or a state of a live build; input.whole (optional): the song with every track, when input keeps only
// some (the fast export), so quiet sections stay the same.
export function placeSpoken(input, lang = langOf()) {
  const n = normalizeSong(input), ref = input.whole ? normalizeSong(input.whole) : n;
  const facts = sectionFacts(ref), out = [];
  const growthBars = input.onAir && input.crescendo && Number.isFinite(input.crescendo.growth) ? input.crescendo.growth : 0;
  let k = 0;
  n.tracks.forEach((tr, ti) => {
    if (!isSpoken(tr)) return;
    const orbit = SPOKEN_ORBIT + Math.min(1, k++), speaker = speakerOf(input, tr), v = { ...VOICE_DEFAULT, ...(tr.settings || {}) };
    tr.clips.forEach((clip, ci) => {
      const pat = (tr.patterns || {})[clip.pattern];
      if (!pat || !WAYS.includes(pat.way)) return;
      const line = lineOf(input, tr, clip.pattern, pat), texts = lineTexts(line, lang);
      if (!texts.length) return;
      const bank = sayBank(lang, speaker), first = secAt(n, clip.start);
      // length in beats: the sample (or the entries one beat apart) slowed or sped up by the voice tempo
      const sec = line.parts ? (texts.length - 1) * secPerBeat(first) + secondsOf(texts[texts.length - 1], bank) : secondsOf(texts[0], bank);
      const beats = sec / (v.tempo || 1) / secPerBeat(first);
      const end = clip.start + clip.bars, starts = [];
      const lenBars = at => beats / beatsOf(secAt(n, at));
      // an entry line: it ends one beat before the bound track comes in
      const entry = () => {
        const e = pat.before !== undefined ? entryAfter(ref, pat.before, clip.start) : null;
        if (e === null) return false;
        const bpb = beatsOf(secAt(n, e - 1)), at = Math.floor((e * bpb - 1 - beats) * 4) / 4;
        let bar = Math.floor(at / bpb), late = (at - bar * bpb) / bpb;
        if (bar < clip.start) { bar = clip.start; late = 0; }
        starts.push({ bar, late: Math.round(late * 10000) / 10000 });
        return true;
      };
      if (pat.way === 'opening') { if (!entry()) starts.push({ bar: clip.start, late: 0 }); }
      else if (pat.way === 'passage') {
        if (!entry()) {
          // the quietest section the clip covers (fewest tracks; the first of equals)
          const cand = n.sections.map((s, i) => ({ s, i })).filter(({ s }) => s.start < end && s.start + s.bars > clip.start);
          const best = cand.reduce((a, b) => (facts.counts[b.i] < facts.counts[a.i] ? b : a), cand[0]);
          starts.push({ bar: Math.max(clip.start, best.s.start), late: 0 });
        }
      } else if (pat.way === 'refrain') {
        const every = Number.isInteger(pat.every) && pat.every > 0 ? pat.every : 4, kinds = whereOfTrack(tr);
        n.sections.forEach((s, i) => {
          // (a refrain repeats in the sections of the kinds its track may speak in, quiet only by default, D7)
          // (in a song grown on air the growth's sections look busy by their clips, which run under its steps: a refrain
          // the radio placed in a quiet phrase of the growth repeats there, after-tests-oct28 D3)
          if (!kinds.includes(facts.kinds[i]) && !(growthBars > 0 && s.start < growthBars)) return;
          const a = Math.max(s.start, clip.start), z = Math.min(s.start + s.bars, end);
          // the line ends before the section does: it stops when the song gets full again
          for (let b = a; b < z; b += every) if (b + Math.ceil(lenBars(b) - 1e-9) <= s.start + s.bars) starts.push({ bar: b, late: 0 });
        });
      } else if (pat.way === 'chop') for (let b = clip.start; b < end; b++) starts.push({ bar: b, late: 0 });
      // (ci: the clip's index among the track's clips sorted by bar, for the phrase list)
      if (starts.length) out.push({ track: tr.id, name: tr.name || tr.id, ti, ci, orbit, key: clip.pattern, way: pat.way, pat, line, speaker, bank, texts, beats, starts, settings: v, rack: tr.rack, mute: !!tr.mute });
    });
  });
  return out;
}

// the bars where spoken lines sound: { bar: true }, for the narrator to yield (D5). Tracks muted in the state are
// silent; a line sounds from the bar it starts on to the bar its last beat falls in
export function spokenBars(input, lang = langOf()) {
  const n = normalizeSong(input), out = new Set();
  for (const p of placeSpoken(input, lang)) {
    if (p.mute) continue;
    for (const s of p.starts) {
      const bpb = beatsOf(secAt(n, s.bar)), last = s.bar + Math.max(0, Math.ceil((s.late * bpb + (p.way === 'chop' ? bpb : p.beats)) / bpb - 1e-9) - 1);
      for (let b = s.bar; b <= last; b++) out.add(b);
    }
  }
  return out;
}

// ---------- code ----------
const f3 = x => Math.round(x * 1000) / 1000;
const clampV = (k, x) => (VOICE_LIMITS[k] ? Math.max(VOICE_LIMITS[k][0], Math.min(VOICE_LIMITS[k][1], x)) : x);
// effects of a line: the voice settings within the voice limits (chops may go further), a passage lightly treated
export function spokenFx(v, way, rack) {
  const s = { ...v };
  if (way !== 'chop') for (const k of Object.keys(VOICE_LIMITS)) if (Number.isFinite(s[k])) s[k] = clampV(k, s[k]);
  if (way === 'passage') { s.drive = 0; s.room = Math.min(s.room || 0, 0.3); s.delay = Math.min(s.delay || 0, 0.15); }
  const shift = f3(s.pitch / s.tempo);
  return (s.tempo !== 1 ? `.speed(${f3(s.tempo)})` : '') + (shift !== 1 ? `.stretch(${shift})` : '') + (s.cutoff < 18000 ? `.lpf(${s.cutoff})` : '') + (s.hpf > 0 ? `.hpf(${s.hpf})` : '')
    + (s.drive > 0 ? `.distort(${s.drive})` : '') + (s.delay > 0 ? `.delay(${s.delay}).delaysync(0.1875).delayfeedback(0.4)` : '') + (s.room > 0 ? `.room(${s.room})` : '')
    + (way === 'passage' ? '' : rackCode(rack, 'voice'));
}
const lane = (bars, total) => { const v = Array(total).fill('0'); for (const b of bars) if (b >= 0 && b < total) v[b] = '1'; return rle(v); };

// the code of one spoken track: its lines, one `$:` per way and offset, with comments that quote them. lines: the
// placed lines of this track (placeSpoken); total: the song's bars; label: "$:" or "S$:"
export function spokenCode(lines, total, lang = langOf()) {
  const out = [];
  // virtual numbering (no manifest): the sorted texts of the song per bank
  const virtual = new Map();
  for (const p of lines) for (const x of p.texts) { const l = virtual.get(p.bank) || []; if (!l.includes(saySlug(x))) l.push(saySlug(x)); virtual.set(p.bank, l); }
  for (const l of virtual.values()) l.sort();
  for (const p of lines) {
    // the bars it starts on, runs joined with a dash ("9–16"; an ASCII hyphen would read as a clip's range)
    const runs = []; for (const b of [...new Set(p.starts.map(s => s.bar + 1))].sort((a, z) => a - z)) { const r = runs[runs.length - 1]; if (r && r[1] === b - 1) r[1] = b; else runs.push([b, b]); }
    const quote = p.texts.join(' · '), bars = runs.map(([a, z]) => (z > a + 1 ? `${a}–${z}` : z > a ? `${a}, ${z}` : `${a}`)).join(', ');
    const samples = p.texts.map(x => sampleOf(x, p.bank, virtual));
    const missing = samples.every(x => !x);
    out.push(`// "${quote.replace(/"/g, "'")}" · ${t(`way:${p.way}`)} · ${t('cSpokenBars', { bars })}${missing ? ` · ${t('cNoSample')}` : ''}`);
    if (missing) continue;
    // a generated line: one entry per beat of the bar; a whole line: one sample
    const bank = (samples.find(Boolean) || {}).bank || p.bank;
    const head = p.line.parts ? `s("${bank}").n("${samples.map(x => (x ? x.n : '~')).concat(Array(Math.max(0, 4 - samples.length)).fill('~')).join(' ')}")` : `s("${bank}").n(${samples[0].n})`;
    const chop = p.way === 'chop' ? `.slice(${p.pat.slices || 8}, "${p.pat.rhythm || '0 1 2 3 4 5 6 7'}").clip(1)` : '';
    const fx = spokenFx(p.settings, p.way, p.rack) + `.postgain(${p.settings.gain}).orbit(${p.orbit}).analyze("fx")`;
    // starts with the same offset share one line
    const byLate = new Map();
    for (const s of p.starts) { if (!byLate.has(s.late)) byLate.set(s.late, []); byLate.get(s.late).push(s.bar); }
    for (const [late, list] of byLate) out.push(`$: ${head}${chop}${late ? `.late(${late})` : ''}.mask("${lane(list, total)}")${fx}`);
  }
  return out;
}

// ---------- poetic narrator ----------
// the narrator style of a song: "explain" (default) or "poetic"; song.narrator is a style name or { style, lines }
export const narratorStyle = song => { const n = song && song.narrator; const s = typeof n === 'string' ? n : n && n.style; return s === 'poetic' ? 'poetic' : 'explain'; };
// a song with the narrator style a profile asks for (voice-controls): 'auto' (or nothing) keeps the song's own; the
// song's own short images stay with it
export function withNarratorStyle(song, style) {
  if (!song || !NARRATOR_STYLES.includes(style) || narratorStyle(song) === style) return song;
  const n = song.narrator, lines = n && typeof n === 'object' && n.lines ? n.lines : null;
  return { ...song, narrator: lines ? { style, lines } : style };
}
// the track a step brings in (add, clone, unmute), or null. The unsolo of the last line played alone (after-tests-oct28
// D5) brings in every track that was on and silenced by the solo: the first of them in the order they came in
export function enteringTrack(song, step) {
  const id = step.add !== undefined ? [].concat(step.add)[0] : step.clone ? step.clone.track : step.unmute !== undefined ? [].concat(step.unmute)[0] : null;
  if (id === null || id === undefined) return step.unsolo !== undefined ? releasedTrack(song, step) : null;
  return (song.tracks || []).find(x => x.id === id) || null;
}
// (kept per song and step: the narrator asks for every step of every state)
const releasedMemo = new WeakMap();
function releasedTrack(song, step) {
  const key = `${step.i}|${step.at}|${JSON.stringify(step.unsolo)}`, memo = releasedMemo.get(song) || new Map();
  releasedMemo.set(song, memo);
  if (!memo.has(key)) memo.set(key, releasedNow(song, step));
  return memo.get(key);
}
function releasedNow(song, step) {
  const steps = buildSteps(song), k = Number.isInteger(step.i) ? steps.findIndex(x => x.i === step.i) : steps.findIndex(x => x.at === step.at && JSON.stringify(x.unsolo) === JSON.stringify(step.unsolo));
  if (k < 0) return null;
  const added = new Set(steps.flatMap(x => [...(x.add !== undefined ? [].concat(x.add) : []), ...(x.clone ? [x.clone.track] : [])]));
  const on = new Map((song.tracks || []).filter(t => !added.has(t.id) && !t.mute).map((t, n) => [t.id, -1 - n])), alone = new Set((song.tracks || []).filter(t => t.alone).map(t => t.id));
  for (let j = 0; j <= k; j++) {
    const x = steps[j], ids = v => (v === undefined ? [] : [].concat(v));
    if (j === k) {
      const left = new Set([...alone].filter(id => !ids(x.unsolo).includes(id)));
      if (!alone.size || left.size) return null;
      const freed = [...on.entries()].filter(([id]) => !alone.has(id)).sort((p, q) => p[1] - q[1]).map(([id]) => (song.tracks || []).find(t => t.id === id));
      return freed.find(t => t && t.type !== 'voice' && t.type !== 'spoken') || null;
    }
    ids(x.add).forEach(id => { if (!on.has(id)) on.set(id, j); });
    if (x.clone && !on.has(x.clone.track)) on.set(x.clone.track, j);
    ids(x.remove).forEach(id => on.delete(id));
    ids(x.solo).forEach(id => alone.add(id));
    ids(x.unsolo).forEach(id => alone.delete(id));
  }
  return null;
}
// a short image for a track that comes in: the song's lines for its type, the style's, else the vocabulary's
export function poeticLine(song, step, index) {
  const tr = enteringTrack(song, step);
  if (!tr) return null;
  const own = song.narrator && typeof song.narrator === 'object' && song.narrator.lines ? song.narrator.lines : {};
  const style = styleRecipes(song).map(x => (x.narrator && typeof x.narrator === 'object' && x.narrator.lines) || {});
  const pools = [own, ...style, POETIC];
  const list = pools.map(p => p[tr.type] || null).find(x => x && x.length) || pools.map(p => p.any || null).find(x => x && x.length) || POETIC.any;
  return rngOf(song, `poetic:${index}`).pick(list);
}
// every poetic line a song writes itself (for tools/voice.mjs)
export function songPoeticTexts(song) {
  const own = song.narrator && typeof song.narrator === 'object' && song.narrator.lines ? Object.values(song.narrator.lines).flat() : [];
  return own;
}

// ---------- checks ----------
// checks for a spoken track's patterns and for a song's or a recipe's narrator; err/warn take (path, message)
export function checkSpokenPattern(pat, p, ids, err, warn) {
  if (!WAYS.includes(pat.way)) err(`${p}.way`, `one of ${WAYS.join(', ')}`);
  const texts = pat.text === undefined ? [] : typeof pat.text === 'string' ? [pat.text] : pat.text && typeof pat.text === 'object' && !Array.isArray(pat.text) ? Object.entries(pat.text) : null;
  if (texts === null) err(`${p}.text`, 'a line, one per language { "en": "…", "it": "…" }, or "vocab:<group>"');
  else if (typeof pat.text === 'string' && pat.text.startsWith('vocab:')) { if (!VOCAB_GROUPS.includes(pat.text.slice(6))) err(`${p}.text`, `a vocabulary group: ${VOCAB_GROUPS.map(g => `vocab:${g}`).join(', ')}`); }
  else for (const x of texts) {
    const [k, v] = Array.isArray(x) ? x : ['', x];
    const q = k ? `${p}.text.${k}` : `${p}.text`;
    if (k && !['en', 'it'].includes(k)) warn(q, 'a language: en or it');
    if (typeof v !== 'string' || !v.trim()) err(q, 'a non-empty line');
    else if (words(v) > MAX_WORDS) err(q, `at most ${MAX_WORDS} words (${words(v)})`);
  }
  if (pat.every !== undefined && (!Number.isInteger(pat.every) || pat.every < 1 || pat.every > 64)) err(`${p}.every`, 'bars between two refrains: a whole number from 1 to 64');
  if (pat.slices !== undefined && (!Number.isInteger(pat.slices) || pat.slices < 2 || pat.slices > 32)) err(`${p}.slices`, 'slices of a chop: a whole number from 2 to 32');
  if (pat.rhythm !== undefined) {
    const toks = typeof pat.rhythm === 'string' ? pat.rhythm.trim().split(/\s+/) : null, n = pat.slices || 8;
    if (!toks || !toks.length || toks.some(x => x !== '~' && !(/^\d+$/.test(x) && +x < n))) err(`${p}.rhythm`, `slice numbers from 0 to ${n - 1} and rests "~", one per step, for example "0 1 0 1 2 2 3 ~"`);
  }
  if (pat.before !== undefined && !ids.includes(pat.before)) err(`${p}.before`, `unknown track "${pat.before}"; tracks: ${ids.join(', ')}`);
  if (pat.way && pat.way !== 'chop' && (pat.slices !== undefined || pat.rhythm !== undefined)) warn(p, 'slices and rhythm are for chops');
  if (pat.way && pat.way !== 'refrain' && pat.every !== undefined) warn(`${p}.every`, 'every is for refrains');
  if (pat.way && !['passage', 'opening'].includes(pat.way) && pat.before !== undefined) warn(`${p}.before`, 'before is for passages and openings');
}
export function checkNarrator(v, p, err) {
  if (v === undefined) return;
  if (typeof v === 'string') { if (!NARRATOR_STYLES.includes(v)) err(p, `one of ${NARRATOR_STYLES.join(', ')}`); return; }
  if (!v || typeof v !== 'object' || Array.isArray(v)) { err(p, '"explain", "poetic" or { "style": "poetic", "lines": { "bass": [{ "en": "…", "it": "…" }] } }'); return; }
  if (!NARRATOR_STYLES.includes(v.style)) err(`${p}.style`, `one of ${NARRATOR_STYLES.join(', ')}`);
  if (v.lines !== undefined) {
    if (!v.lines || typeof v.lines !== 'object' || Array.isArray(v.lines)) { err(`${p}.lines`, 'short images by track type: { "bass": [{ "en": "…", "it": "…" }], "any": […] }'); return; }
    for (const [k, list] of Object.entries(v.lines)) {
      if (!Array.isArray(list) || !list.length) { err(`${p}.lines.${k}`, 'a non-empty list of lines'); continue; }
      list.forEach((x, i) => { if (!x || typeof x !== 'object' || typeof x.en !== 'string' || !x.en.trim() || words(x.en) > MAX_WORDS || (x.it !== undefined && (typeof x.it !== 'string' || words(x.it) > MAX_WORDS))) err(`${p}.lines.${k}[${i}]`, `{ "en": "…", "it": "…" }, at most ${MAX_WORDS} words`); });
    }
  }
}
