// Card art lookup through Scryfall's free API (https://scryfall.com/docs/api). Only used while
// setting up a profile; the chosen art is then downloaded and stored on the device.
// Scryfall asks for under 10 requests a second and for the artist to be credited.

const API = 'https://api.scryfall.com';

export type Art = { url: string; artist: string; set: string };

type Face = { image_uris?: { art_crop?: string }; artist?: string };
type Card = Face & { set_name: string; card_faces?: Face[] };

async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Scryfall said ${res.status}`);
  return res.json();
}

/** Card names starting with (or close to) what was typed. */
export async function suggestNames(q: string): Promise<string[]> {
  if (q.trim().length < 2) return [];
  const j = await getJson<{ data: string[] }>(`${API}/cards/autocomplete?q=${encodeURIComponent(q.trim())}`);
  return j?.data.slice(0, 8) ?? [];
}

/** Every distinct piece of art for an exact card name (both faces for double-faced cards). */
export async function artFor(name: string): Promise<Art[]> {
  const q = encodeURIComponent(`!"${name}"`);
  const j = await getJson<{ data: Card[] }>(`${API}/cards/search?q=${q}&unique=art&order=released`);
  const out: Art[] = [];
  for (const card of j?.data ?? []) {
    for (const face of card.card_faces?.some((f) => f.image_uris) ? card.card_faces : [card]) {
      const url = face.image_uris?.art_crop;
      if (url && !out.some((a) => a.url === url)) out.push({ url, artist: face.artist ?? card.artist ?? '', set: card.set_name });
    }
  }
  return out;
}

export async function downloadArt(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not download the art (${res.status})`);
  return res.blob();
}
