// Magic life counter for 2–6 players sharing one tablet lying flat on the table.
// Seats are split between the two long edges: the top row is turned 180° to face across.

export type Player = { name: string; life: number; color: string };

export type LifeState = {
  count: number;
  startLife: number;
  players: Player[];
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const START_OPTIONS = [20, 30, 40];
export const COLORS = ['#a855f7', '#22c55e', '#ef4444', '#3b82f6', '#eab308', '#ec4899'];

const player = (i: number, life: number): Player => ({ name: `Player ${i + 1}`, life, color: COLORS[i] });

export const fresh = (count = 4, startLife = 40): LifeState => ({
  count,
  startLife,
  players: Array.from({ length: MAX_PLAYERS }, (_, i) => player(i, startLife)),
});

/** Tidy up whatever came out of storage so the board can trust it. */
export function repair(s: LifeState): LifeState {
  const count = Math.min(MAX_PLAYERS, Math.max(MIN_PLAYERS, Math.round(s.count) || 4));
  const players = Array.from({ length: MAX_PLAYERS }, (_, i) => ({ ...player(i, s.startLife), ...s.players?.[i] }));
  return { ...s, count, players };
}

export function resetLife(s: LifeState): void {
  for (const p of s.players) p.life = s.startLife;
}

export type Seat = { player: number; turned: boolean; column: string; row: number };

/**
 * Grid placement for each seat. The top row gets ⌊n/2⌋ seats, the bottom row the rest;
 * both rows share one column grid (top × bottom wide when they differ) so uneven rows still fill the screen.
 * Player numbers run around the table, starting at the bottom-left seat.
 */
export function seats(count: number): { columns: number; seats: Seat[] } {
  const topN = Math.floor(count / 2);
  const bottomN = count - topN;
  const columns = topN === bottomN ? bottomN : topN * bottomN;
  const out: Seat[] = [];
  // Bottom row, left to right.
  for (let i = 0; i < bottomN; i++) {
    const span = columns / bottomN;
    out.push({ player: i, turned: false, row: 2, column: `${i * span + 1} / span ${span}` });
  }
  // Top row, right to left on screen (left to right from those players' point of view).
  for (let i = 0; i < topN; i++) {
    const span = columns / topN;
    const slot = topN - 1 - i;
    out.push({ player: bottomN + i, turned: true, row: 1, column: `${slot * span + 1} / span ${span}` });
  }
  return { columns, seats: out };
}
