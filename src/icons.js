// Small drawn icons (no emoji): they take the text colour.
const svg = (vb, body, cls) => `<svg class="ico ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
// a die showing five
export const DICE = svg('0 0 16 16', '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.2" cy="5.2" r="1.2" fill="currentColor"/><circle cx="10.8" cy="5.2" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="5.2" cy="10.8" r="1.2" fill="currentColor"/><circle cx="10.8" cy="10.8" r="1.2" fill="currentColor"/>', 'ico-dice');
export const LOCK = svg('0 0 12 14', '<path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="6" width="9" height="7" rx="1.4" fill="currentColor"/>', 'lock-ico');
// an open lock: the shackle lifted (radio-arrangement D12: the director may change the instrument)
export const LOCK_OPEN = svg('0 0 12 14', '<path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.5-.7" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="1.5" y="6" width="9" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/>', 'lock-ico lock-open');
// a closed lock drawn in outline: some tracks of an instrument locked, not all (D12 half state)
export const LOCK_HALF = svg('0 0 12 14', '<path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="6" width="9" height="7" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.3"/><rect x="1.5" y="9.5" width="9" height="3.5" rx="1.2" fill="currentColor"/>', 'lock-ico lock-half');
// a gear (settings of a feature)
export const GEAR = svg('0 0 16 16', '<path d="M8 1.6l1.1 1.6 1.9-.4.5 1.9 1.8.8-.6 1.8 1.2 1.5-1.4 1.3.3 1.9-1.9.4-.8 1.8-1.8-.7L8 14.4l-1.3-1.4-1.8.7-.8-1.8-1.9-.4.3-1.9L1.1 8.3l1.2-1.5-.6-1.8 1.8-.8.5-1.9 1.9.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>', 'ico-gear');
// a curved arrow back (revert to the default)
export const REVERT = svg('0 0 16 16', '<path d="M5.5 3.5L2.5 6.5l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.8 6.5h6.7a3.6 3.6 0 0 1 0 7.2H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>', 'ico-revert');
// a circular arrow (back to the song's own configuration, song-own-settings)
export const RESET_CONFIG = svg('0 0 16 16', '<path d="M3.3 9.2A4.9 4.9 0 1 0 4.6 4.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M4.4 1.6l.3 2.9-2.9.4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-reset');
// a trash can (delete a song, the trash, #68)
export const BIN = svg('0 0 16 16', '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.8 9.5h6.4L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-bin');
// a note with a spark (compose a part, material-generator)
export const COMPOSE = svg('0 0 16 16', '<ellipse cx="5" cy="12.2" rx="2.4" ry="1.8" fill="currentColor"/><path d="M7.3 12V3.2l4.2 1.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 8.6v3.4M10.8 10.3h3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', 'ico-compose');
// steps in a row, some lit (keep the rhythm)
export const RHYTHM = svg('0 0 16 16', '<rect x="1" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/><rect x="4.8" y="6" width="2.6" height="4" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="8.6" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/><rect x="12.4" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/>', 'ico-rhythm');
// two notes on a beam (keep the notes)
export const NOTES = svg('0 0 16 16', '<ellipse cx="4" cy="12" rx="2.2" ry="1.6" fill="currentColor"/><ellipse cx="11.4" cy="10.4" rx="2.2" ry="1.6" fill="currentColor"/><path d="M6 11.8V3.6l7.4-1.6v8.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>', 'ico-notes');
// a triangle: this becomes what the main player plays (play a pattern in a loop, pattern-library; pattern-preview D10)
export const PLAY = svg('0 0 16 16', '<path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/>', 'ico-play');
// a square (stop)
export const STOP = svg('0 0 16 16', '<rect x="3.5" y="3.5" width="9" height="9" rx="1.2" fill="currentColor"/>', 'ico-stop');
// headphones: a preview, a second player that leaves the main one alone (pattern-preview D10)
export const LISTEN = svg('0 0 16 16', '<path d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="1.8" y="9" width="3.4" height="5" rx="1.2" fill="currentColor"/><rect x="10.8" y="9" width="3.4" height="5" rx="1.2" fill="currentColor"/>', 'ico-listen');
// a step grid with a plus (save a pattern)
// the button that opens a pattern in the Patterns tab, in the Groove Lab (pattern-preview D10: the headphones mean a
// preview, a second player that leaves the main one alone)
export const FLASK = svg('0 0 16 16', '<path d="M6 1.8h4M6.6 1.8v4.4L2.6 12.6a1.1 1.1 0 0 0 .9 1.6h9a1.1 1.1 0 0 0 .9-1.6L9.4 6.2V1.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.4 10h7.2l1.4 2.6a.6.6 0 0 1-.5.9H3.5a.6.6 0 0 1-.5-.9z" fill="currentColor"/>', 'ico-flask');

export const KEEP = svg('0 0 16 16', '<rect x="1.5" y="2" width="3" height="3" rx=".6" fill="currentColor"/><rect x="6" y="2" width="3" height="3" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1.5" y="6.5" width="3" height="3" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="6" y="6.5" width="3" height="3" rx=".6" fill="currentColor"/><path d="M12 8.5v6M9 11.5h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', 'ico-keep');
// a pencil (rename)
export const PENCIL = svg('0 0 16 16', '<path d="M3 13l.6-3 7.2-7.2 2.4 2.4L6 12.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.6 4l2.4 2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>', 'ico-pencil');
// an arrow into a box (add to the song open in Compose)
export const ADD_TO = svg('0 0 16 16', '<path d="M2.5 9.5v4h11v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 2v8M5 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-add');
// a wavy line with a spark (vary a part: new notes, radio-variation)
export const VARY = svg('0 0 16 16', '<path d="M1.5 10.5c1.6-3.2 3.2-3.2 4.6 0s3 3.2 4.6 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M12.8 1.8v4.4M10.6 4h4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>', 'ico-vary');
// two arrows that trade places (swap a part for another ready one, radio-variation)
export const SWAP = svg('0 0 16 16', '<path d="M2.5 5.5h10M10 3l2.5 2.5L10 8M13.5 10.5h-10M6 8l-2.5 2.5L6 13" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-swap');
// a chevron pointing right (a section that folds: turned down when open)
export const CHEVRON = svg('0 0 16 16', '<path d="M6 3.5L10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-chevron');
// three sliders (a set of controls of one's own: the radio's Custom profile)
export const SLIDERS = svg('0 0 16 16', '<path d="M2.5 4h11M2.5 8h11M2.5 12h11" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><circle cx="5.5" cy="4" r="1.7" fill="var(--panel, #160f26)" stroke="currentColor" stroke-width="1.3"/><circle cx="10.5" cy="8" r="1.7" fill="var(--panel, #160f26)" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="12" r="1.7" fill="var(--panel, #160f26)" stroke="currentColor" stroke-width="1.3"/>', 'ico-sliders');
// a sprout in a turning ring (a song growing away from the page, growth-in-background): the ring turns with CSS
export const GROWING = svg('0 0 16 16', '<path class="grow-ring" d="M8 1.4a6.6 6.6 0 1 1-6.2 4.4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M8 11.8V7.6" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M8 8.4c0-1.7 1.2-2.7 2.9-2.7 0 1.7-1.2 2.7-2.9 2.7z" fill="currentColor"/><path d="M8 9.7c0-1.3-.9-2.1-2.3-2.1 0 1.3.9 2.1 2.3 2.1z" fill="currentColor"/>', 'ico-growing');
// a small cross (remove a style from a pattern, pattern-followups)
export const CROSS = svg('0 0 16 16', '<path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>', 'ico-cross');
// a power symbol (the on/off switch of a voice, voice-full-controls D15)
export const POWER = svg('0 0 16 16', '<path d="M8 2v5.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M4.6 4.2a5 5 0 1 0 6.8 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', 'ico-power');
