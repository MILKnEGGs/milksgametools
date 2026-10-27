// Small tool state kept in localStorage. Each tool owns one key; the whole object is
// re-saved whenever anything inside it changes. Storage can be missing (private mode),
// in which case the tool still works, it just forgets on reload.

const PREFIX = 'mgt:';

export function persisted<T extends object>(key: string, init: () => T, fix?: (v: T) => T): T {
  let initial = init();
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw) initial = { ...initial, ...JSON.parse(raw) };
  } catch {
    // Unreadable or corrupt: start fresh.
  }
  if (fix) initial = fix(initial);
  const state = $state(initial);
  $effect.root(() => {
    $effect(() => {
      const json = JSON.stringify(state);
      try {
        localStorage.setItem(PREFIX + key, json);
      } catch {
        // Ignore: storage full or blocked.
      }
    });
  });
  return state;
}
