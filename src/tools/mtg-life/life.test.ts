import { describe, expect, it } from 'vitest';
import { fresh, repair, resetLife, seats } from './life';

describe('mtg life', () => {
  it('seats everyone exactly once, split across both edges', () => {
    for (let n = 2; n <= 6; n++) {
      const { seats: list } = seats(n);
      expect(list.map((s) => s.player).sort()).toEqual([...Array(n).keys()]);
      expect(list.filter((s) => s.turned).length).toBe(Math.floor(n / 2));
    }
  });

  it('gives a lone top seat the full width with 3 players', () => {
    const { columns, seats: list } = seats(3);
    expect(columns).toBe(2);
    expect(list.find((s) => s.turned)?.column).toBe('1 / span 2');
  });

  it('fills uneven rows with 5 players', () => {
    const { columns, seats: list } = seats(5);
    expect(columns).toBe(6);
    expect(list.filter((s) => !s.turned).map((s) => s.column)).toEqual(['1 / span 2', '3 / span 2', '5 / span 2']);
    expect(list.filter((s) => s.turned).map((s) => s.column)).toEqual(['4 / span 3', '1 / span 3']);
  });

  it('repairs bad saved data', () => {
    const s = repair({ count: 99, startLife: 20, players: [{ name: 'Ana', life: 7, color: '#fff' }] });
    expect(s.count).toBe(6);
    expect(s.players).toHaveLength(6);
    expect(s.players[0].name).toBe('Ana');
    expect(s.players[1].life).toBe(20);
  });

  it('resets everyone to the starting life', () => {
    const s = fresh(4, 40);
    s.players[0].life = 3;
    s.startLife = 20;
    resetLife(s);
    expect(s.players.every((p) => p.life === 20)).toBe(true);
  });
});
