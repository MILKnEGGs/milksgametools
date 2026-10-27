// Digimon memory gauge: one shared track from 10 on the top player's side, through 0, to
// 10 on the bottom player's side. Positive values are on the bottom player's side.
// The turn belongs to whoever has memory on their side; at 0 it stays with the current player.

export type Side = 'bottom' | 'top';

export type MemoryState = {
  memory: number;
  active: Side;
  /** Earlier memory/active pairs, newest last, for undo. */
  history: { memory: number; active: Side }[];
  /** Turn the top player's half around so it reads the right way up from across the table. */
  facing: boolean;
};

export const MAX = 10;
const HISTORY = 50;

export const fresh = (first: Side = 'bottom'): MemoryState => ({ memory: 0, active: first, history: [], facing: true });

export function activeFor(memory: number, current: Side): Side {
  return memory > 0 ? 'bottom' : memory < 0 ? 'top' : current;
}

/** Signed track value for cell `n` (1–10) on a side. */
export const valueOf = (side: Side, n: number) => (side === 'bottom' ? n : -n);

/** Memory as seen by one player: positive when it's on their side. */
export const mineFor = (side: Side, memory: number) => (side === 'bottom' ? memory : -memory);

export function setMemory(s: MemoryState, value: number): void {
  const v = Math.max(-MAX, Math.min(MAX, Math.round(value)));
  if (v === s.memory) return;
  s.history.push({ memory: s.memory, active: s.active });
  if (s.history.length > HISTORY) s.history.splice(0, s.history.length - HISTORY);
  s.active = activeFor(v, s.active);
  s.memory = v;
}

/** Move memory by `delta` toward `side` (positive gains for that player, negative pays). */
export const nudge = (s: MemoryState, side: Side, delta: number) => setMemory(s, s.memory + valueOf(side, delta));

export function undo(s: MemoryState): void {
  const prev = s.history.pop();
  if (!prev) return;
  s.memory = prev.memory;
  s.active = prev.active;
}

export function newGame(s: MemoryState, first: Side): void {
  Object.assign(s, { memory: 0, active: first, history: [] });
}
