// Player profiles, kept on this device and shared by any tool that wants them.
// A profile is a look (name, colour, font, background picture); tools decide where it shows.

import { deleteImage } from './images.svelte';
import { persisted } from './persisted.svelte';

export type Background = {
  /** Picture id in the image store. */
  image: string;
  source: 'photo' | 'art';
  /** Shown on the panel for card art, e.g. "Art: Victor Adame Minguez". */
  credit?: string;
};

export type Profile = { id: string; name: string; color: string; font: string; bg?: Background };

export const PROFILE_COLORS = [
  '#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#eab308', '#ec4899',
  '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#64748b', '#b45309',
];

export const profiles = persisted<{ list: Profile[] }>('profiles', () => ({ list: [] }));

export const profileById = (id: string | undefined) => (id ? profiles.list.find((p) => p.id === id) : undefined);

export function blankProfile(): Profile {
  const used = new Set(profiles.list.map((p) => p.color));
  return {
    id: crypto.randomUUID(),
    name: '',
    color: PROFILE_COLORS.find((c) => !used.has(c)) ?? PROFILE_COLORS[0],
    font: 'classic',
  };
}

export function saveProfile(p: Profile): void {
  const i = profiles.list.findIndex((x) => x.id === p.id);
  if (i >= 0) profiles.list[i] = p;
  else profiles.list.push(p);
}

export function removeProfile(id: string): void {
  const p = profileById(id);
  if (p?.bg) void deleteImage(p.bg.image);
  profiles.list = profiles.list.filter((x) => x.id !== id);
}
