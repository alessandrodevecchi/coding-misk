// Long exports written to disk while they render (#61): the browser asks where to save when the export starts, then
// the file is written piece by piece (File System Access API), so memory stays flat whatever the length.
export const LONG_SECONDS = 10 * 60;
// { writable, name } to write into, null when the browser cannot (the export keeps the file in memory as before),
// or false when the listener cancelled the dialog. Call it right after the click: the dialog needs the gesture.
export async function askDiskFile(name, type, ext) {
  if (typeof globalThis.showSaveFilePicker !== 'function') return null;
  try {
    const h = await globalThis.showSaveFilePicker({ suggestedName: name, types: [{ description: ext.toUpperCase(), accept: { [type]: [`.${ext}`] } }] });
    return { writable: await h.createWritable(), name: h.name };
  } catch (e) { return e && e.name === 'AbortError' ? false : null; }
}
