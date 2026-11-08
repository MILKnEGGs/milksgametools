// Pictures (profile backgrounds) live in IndexedDB, since localStorage only holds a few MB.
// Each picture has an id; imageUrl(id) hands back an object URL once it has been read.

const DB = 'mgt-images';
const STORE = 'images';

let opening: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  return (opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const store = (await db()).transaction(STORE, mode).objectStore(STORE);
  return new Promise((resolve, reject) => {
    const req = fn(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putImage(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await run('readwrite', (s) => s.put(blob, id));
  // Ask the browser not to clear our storage when space runs low. Harmless if refused.
  void navigator.storage?.persist?.().catch(() => {});
  return id;
}

export async function deleteImage(id: string): Promise<void> {
  await run('readwrite', (s) => s.delete(id)).catch(() => {});
  if (urls[id]) URL.revokeObjectURL(urls[id]);
  delete urls[id];
  loading.delete(id);
}

const urls = $state<Record<string, string>>({});
const loading = new Set<string>();

/** Object URL for a stored picture; undefined until it has loaded (reactive, so it fills in). */
export function imageUrl(id: string | undefined): string | undefined {
  if (!id) return undefined;
  if (!urls[id] && !loading.has(id)) {
    loading.add(id);
    run<Blob | undefined>('readonly', (s) => s.get(id))
      .then((blob) => {
        if (blob) urls[id] = URL.createObjectURL(blob);
      })
      .catch(() => {});
  }
  return urls[id];
}

/** Shrink a photo so its long edge is at most `max` px, as a JPEG. Small images pass through. */
export async function shrink(file: Blob, max = 1600): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  if (scale === 1 && file.size < 1_500_000) {
    bmp.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that picture'))), 'image/jpeg', 0.85),
  );
}
