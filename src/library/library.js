// Shared pieces of the Styles and Artists tabs (#35): the user's items in browser storage,
// duplicate, export and import as JSON files, and the edit panel (form plus advanced JSON view).

// download one JSON file
export function downloadJson(name, data) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2) + '\n'], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `${name}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// read JSON files chosen by the user
export function pickJsonFiles(onLoad) {
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json'; input.multiple = true;
  input.addEventListener('change', async () => {
    for (const f of input.files) {
      try { onLoad(JSON.parse(await f.text()), f.name); } catch (e) { onLoad(null, f.name, e); }
    }
  });
  input.click();
}

// The user's items of one kind (styles or artists) kept in browser storage, next to read-only built-ins.
export function userStore(store, key) {
  let items = store.get(key, []);
  if (!Array.isArray(items)) items = [];
  return {
    get all() { return items; },
    put(item) { const i = items.findIndex(x => x.id === item.id); if (i >= 0) items[i] = item; else items.push(item); store.set(key, items); },
    remove(id) { items = items.filter(x => x.id !== id); store.set(key, items); },
  };
}

// a free id based on another one: "synthwave" → "synthwave-2"
export function freeId(base, taken) {
  const root = base.replace(/-\d+$/, '');
  let n = 2;
  while (taken.includes(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}

// errors of the validator as a map path → messages, for showing them next to fields
export const errorsByPath = list => list.reduce((m, e) => { (m[e.path] = m[e.path] || []).push(e.msg); return m; }, {});
