// Speakers registry (spoken-text-on-stage D11): every kind of voice that can speak in a song, with its precedence rank,
// its caption look (icon, style, colour, default mark) and two flags for voices to come. The schedule of what is heard
// (spokenSchedule in build.js) writes each line with a one-letter code (N, T); the registry maps the codes to kinds, so a
// new kind needs one entry here and its lines in the schedule to be captioned.
//
// Today's rules, read from here: the voice track (rank 2) outranks the narrator (rank 1), so the narrator yields on the
// bars where the voice track sounds; the narrator says at most one line per bar (perBar); the step's own line comes
// after both (it is the narrator's explaining line when nothing outranks it, else a small tag on the stage).
//
// exclusive: while a line of this kind sounds, the lines of lower ranks go quiet (off by default).
// multiCaption: one caption row per active speaker, ordered by rank, at most three; off: the highest rank's line only.
// future: groundwork for a kind nothing plays yet (a singing voice); its entry gives it a caption look already.
export const SPEAKER_KINDS = {
  narrator: { code: 'N', rank: 1, icon: 'mic', style: 'italic', colour: 'cyan', mark: 'icon+style', perBar: 1, exclusive: false, multiCaption: true },
  voice: { code: 'T', rank: 2, icon: 'wave', style: 'quoted', colour: 'magenta', mark: 'icon+style', exclusive: false, multiCaption: true },
  singing: { code: 'S', rank: 3, icon: 'note', style: 'sung', colour: 'amber', mark: 'icon+style', future: true, exclusive: false, multiCaption: false },
};
// how a speaker's caption is marked (D12): nothing, the style only, a text label, the icon, the icon and the style
export const MARKS = ['none', 'style', 'label', 'icon', 'icon+style'];
export const MAX_ROWS = 3;

// the kind of a schedule code ('N', 'T', …), or null
export function kindOf(code, kinds = SPEAKER_KINDS) {
  for (const [k, v] of Object.entries(kinds)) if (v.code === code) return k;
  return null;
}
// whether kind a outranks kind b (a speaks, b yields on a shared bar)
export const outranks = (a, b, kinds = SPEAKER_KINDS) => !!(kinds[a] && kinds[b] && kinds[a].rank > kinds[b].rank);
// the most lines a kind says on one bar (Infinity when the registry sets no limit)
export const perBar = (kind, kinds = SPEAKER_KINDS) => (kinds[kind] && Number.isFinite(kinds[kind].perBar) ? kinds[kind].perBar : Infinity);

// The exclusive rule over a schedule of captions ([{ at, until, kind }] in bars): a line of a lower rank that overlaps
// a line of an exclusive kind is left out (it is silent there). Returns a new list.
export function applyExclusive(lines, kinds = SPEAKER_KINDS) {
  const ex = lines.filter(x => kinds[x.kind] && kinds[x.kind].exclusive);
  if (!ex.length) return lines.slice();
  return lines.filter(x => !ex.some(e => e !== x && outranks(e.kind, x.kind, kinds) && x.at < e.until && e.at < x.until));
}
// The caption rows of a moment from the active lines: ordered by rank (highest first); the highest kind without
// multiCaption keeps its own line only; at most MAX_ROWS rows, and one row per kind (its latest line).
export function captionRows(active, kinds = SPEAKER_KINDS) {
  const byKind = new Map();
  for (const x of active) { const p = byKind.get(x.kind); if (!p || x.at >= p.at) byKind.set(x.kind, x); }
  const rows = [...byKind.values()].sort((a, b) => ((kinds[b.kind] || {}).rank || 0) - ((kinds[a.kind] || {}).rank || 0));
  if (!rows.length) return rows;
  const top = kinds[rows[0].kind] || {};
  return top.multiCaption === false ? rows.slice(0, 1) : rows.slice(0, MAX_ROWS);
}
