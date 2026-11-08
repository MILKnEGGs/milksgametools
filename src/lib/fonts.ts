// Fonts a profile can pick. They are bundled (Latin subset only) so they work offline.
// `scale` evens out how big the life total looks, since some faces are much wider than others.

import '@fontsource/bangers/latin-400.css';
import '@fontsource/bebas-neue/latin-400.css';
import '@fontsource/cinzel/latin-800.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/orbitron/latin-800.css';
import '@fontsource/permanent-marker/latin-400.css';
import '@fontsource/pirata-one/latin-400.css';
import '@fontsource/press-start-2p/latin-400.css';

export type Font = { id: string; label: string; family: string; weight: number; scale: number };

export const FONTS: Font[] = [
  { id: 'classic', label: 'Classic', family: 'system-ui, -apple-system, sans-serif', weight: 800, scale: 1 },
  { id: 'bebas', label: 'Bold', family: "'Bebas Neue', sans-serif", weight: 400, scale: 1.2 },
  { id: 'cinzel', label: 'Fantasy', family: "'Cinzel', serif", weight: 800, scale: 0.95 },
  { id: 'pirata', label: 'Gothic', family: "'Pirata One', serif", weight: 400, scale: 1.05 },
  { id: 'marker', label: 'Marker', family: "'Permanent Marker', cursive", weight: 400, scale: 0.9 },
  { id: 'bangers', label: 'Comic', family: "'Bangers', cursive", weight: 400, scale: 1.05 },
  { id: 'fredoka', label: 'Round', family: "'Fredoka', sans-serif", weight: 600, scale: 1 },
  { id: 'orbitron', label: 'Tech', family: "'Orbitron', sans-serif", weight: 800, scale: 0.8 },
  { id: 'pixel', label: 'Pixel', family: "'Press Start 2P', monospace", weight: 400, scale: 0.6 },
];

export const fontById = (id: string | undefined) => FONTS.find((f) => f.id === id) ?? FONTS[0];
