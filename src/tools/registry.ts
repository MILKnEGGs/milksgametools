// Every tool in the app. To add one: make a folder under src/tools with a Svelte component
// that fills the screen, then list it here. Tools load on demand, so the home screen stays fast.

import type { Component } from 'svelte';

export type Tool = {
  id: string;
  /** Groups tools on the home screen, e.g. "Digimon". Use "General" for game-agnostic tools. */
  game: string;
  name: string;
  blurb: string;
  accent: string;
  emoji: string;
  load: () => Promise<{ default: Component<{ onexit: () => void }> }>;
};

export const TOOLS: Tool[] = [
  {
    id: 'digimon-memory',
    game: 'Digimon',
    name: 'Memory Gauge',
    blurb: 'Shared memory track between two players. Tap a number to move it; the turn passes automatically.',
    accent: '#f97316',
    emoji: '🦖',
    load: () => import('./digimon-memory/MemoryGauge.svelte'),
  },
  {
    id: 'mtg-life',
    game: 'Magic: The Gathering',
    name: 'Life Counter',
    blurb: '2–6 players on one tablet. Everyone can tap at the same time.',
    accent: '#a855f7',
    emoji: '❤️',
    load: () => import('./mtg-life/LifeCounter.svelte'),
  },
];

export const toolById = (id: string) => TOOLS.find((t) => t.id === id);
