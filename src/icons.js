// Small drawn icons (no emoji): they take the text colour.
const svg = (vb, body, cls) => `<svg class="ico ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
// a die showing five
export const DICE = svg('0 0 16 16', '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.2" cy="5.2" r="1.2" fill="currentColor"/><circle cx="10.8" cy="5.2" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="5.2" cy="10.8" r="1.2" fill="currentColor"/><circle cx="10.8" cy="10.8" r="1.2" fill="currentColor"/>', 'ico-dice');
export const LOCK = svg('0 0 12 14', '<path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="6" width="9" height="7" rx="1.4" fill="currentColor"/>', 'lock-ico');
// a gear (settings of a feature)
export const GEAR = svg('0 0 16 16', '<path d="M8 1.6l1.1 1.6 1.9-.4.5 1.9 1.8.8-.6 1.8 1.2 1.5-1.4 1.3.3 1.9-1.9.4-.8 1.8-1.8-.7L8 14.4l-1.3-1.4-1.8.7-.8-1.8-1.9-.4.3-1.9L1.1 8.3l1.2-1.5-.6-1.8 1.8-.8.5-1.9 1.9.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>', 'ico-gear');
// a curved arrow back (revert to the default)
export const REVERT = svg('0 0 16 16', '<path d="M5.5 3.5L2.5 6.5l3 3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.8 6.5h6.7a3.6 3.6 0 0 1 0 7.2H7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>', 'ico-revert');
// a trash can (delete a song, the trash, #68)
export const BIN = svg('0 0 16 16', '<path d="M2.5 4h11M6 4V2.5h4V4M4 4l.8 9.5h6.4L12 4M6.8 6.5v4.5M9.2 6.5v4.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-bin');
// a note with a spark (compose a part, material-generator)
export const COMPOSE = svg('0 0 16 16', '<ellipse cx="5" cy="12.2" rx="2.4" ry="1.8" fill="currentColor"/><path d="M7.3 12V3.2l4.2 1.6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 8.6v3.4M10.8 10.3h3.4" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>', 'ico-compose');
// steps in a row, some lit (keep the rhythm)
export const RHYTHM = svg('0 0 16 16', '<rect x="1" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/><rect x="4.8" y="6" width="2.6" height="4" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="8.6" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/><rect x="12.4" y="6" width="2.6" height="4" rx=".6" fill="currentColor"/>', 'ico-rhythm');
// two notes on a beam (keep the notes)
export const NOTES = svg('0 0 16 16', '<ellipse cx="4" cy="12" rx="2.2" ry="1.6" fill="currentColor"/><ellipse cx="11.4" cy="10.4" rx="2.2" ry="1.6" fill="currentColor"/><path d="M6 11.8V3.6l7.4-1.6v8.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>', 'ico-notes');
// a triangle (play a pattern in a loop, pattern-library)
export const PLAY = svg('0 0 16 16', '<path d="M4.5 2.8v10.4L13 8z" fill="currentColor"/>', 'ico-play');
// a square (stop)
export const STOP = svg('0 0 16 16', '<rect x="3.5" y="3.5" width="9" height="9" rx="1.2" fill="currentColor"/>', 'ico-stop');
// headphones (listen to a track's pattern in the Patterns tab)
export const LISTEN = svg('0 0 16 16', '<path d="M2.5 10V8a5.5 5.5 0 0 1 11 0v2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="1.8" y="9" width="3.4" height="5" rx="1.2" fill="currentColor"/><rect x="10.8" y="9" width="3.4" height="5" rx="1.2" fill="currentColor"/>', 'ico-listen');
// a step grid with a plus (save a pattern)
export const KEEP = svg('0 0 16 16', '<rect x="1.5" y="2" width="3" height="3" rx=".6" fill="currentColor"/><rect x="6" y="2" width="3" height="3" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="1.5" y="6.5" width="3" height="3" rx=".6" fill="none" stroke="currentColor" stroke-width="1"/><rect x="6" y="6.5" width="3" height="3" rx=".6" fill="currentColor"/><path d="M12 8.5v6M9 11.5h6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>', 'ico-keep');
// a pencil (rename)
export const PENCIL = svg('0 0 16 16', '<path d="M3 13l.6-3 7.2-7.2 2.4 2.4L6 12.4z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M9.6 4l2.4 2.4" fill="none" stroke="currentColor" stroke-width="1.4"/>', 'ico-pencil');
// an arrow into a box (add to the song open in Compose)
export const ADD_TO = svg('0 0 16 16', '<path d="M2.5 9.5v4h11v-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 2v8M5 7l3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>', 'ico-add');
