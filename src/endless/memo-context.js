// A counter of the module settings the steering and the compiler read besides the spoken context, the language and my
// phrases (incremental-steering, steer-memo.js): the chord symbols Strudel knows and the speaker and voice style pairs.
// Raised by their setters; a leaf module, so they import it without a cycle.
let n = 0;
export const memoContextN = () => n;
export const bumpMemoContext = () => { n++; };
