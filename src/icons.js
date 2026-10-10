// Small drawn icons (no emoji): they take the text colour.
const svg = (vb, body, cls) => `<svg class="ico ${cls}" viewBox="${vb}" aria-hidden="true">${body}</svg>`;
// a die showing five
export const DICE = svg('0 0 16 16', '<rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="5.2" cy="5.2" r="1.2" fill="currentColor"/><circle cx="10.8" cy="5.2" r="1.2" fill="currentColor"/><circle cx="8" cy="8" r="1.2" fill="currentColor"/><circle cx="5.2" cy="10.8" r="1.2" fill="currentColor"/><circle cx="10.8" cy="10.8" r="1.2" fill="currentColor"/>', 'ico-dice');
export const LOCK = svg('0 0 12 14', '<path d="M3.2 6V4.2a2.8 2.8 0 0 1 5.6 0V6" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="1.5" y="6" width="9" height="7" rx="1.4" fill="currentColor"/>', 'lock-ico');
// a gear (settings of a feature)
export const GEAR = svg('0 0 16 16', '<path d="M8 1.6l1.1 1.6 1.9-.4.5 1.9 1.8.8-.6 1.8 1.2 1.5-1.4 1.3.3 1.9-1.9.4-.8 1.8-1.8-.7L8 14.4l-1.3-1.4-1.8.7-.8-1.8-1.9-.4.3-1.9L1.1 8.3l1.2-1.5-.6-1.8 1.8-.8.5-1.9 1.9.4z" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><circle cx="8" cy="8" r="2.2" fill="none" stroke="currentColor" stroke-width="1.3"/>', 'ico-gear');
// a video camera (record a video, #27)
export const VIDEO = svg('0 0 18 14', '<rect x="1.2" y="3" width="11" height="8.6" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M12.6 6.2l4-2.3v6.8l-4-2.3z" fill="currentColor"/><circle cx="4.4" cy="6" r="1.1" fill="currentColor"/>', 'ico-video');
