import { describe, expect, it } from 'vitest';
import { randomIndex, spinPath } from './random';

describe('random', () => {
  it('lands on the winner after going around', () => {
    for (let n = 2; n <= 6; n++) {
      for (let start = 0; start < n; start++) {
        for (let winner = 0; winner < n; winner++) {
          const path = spinPath(n, start, winner);
          expect(path[0]).toBe(start);
          expect(path.at(-1)).toBe(winner);
          expect(path.length).toBeGreaterThanOrEqual(14);
          expect(path.length).toBeLessThan(14 + n);
        }
      }
    }
  });

  it('picks every index', () => {
    const seen = new Set<number>();
    for (let k = 0; k < 500; k++) seen.add(randomIndex(4));
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });
});
