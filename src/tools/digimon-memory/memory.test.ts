import { describe, expect, it } from 'vitest';
import { fresh, mineFor, newGame, nudge, setMemory, undo } from './memory';

describe('digimon memory', () => {
  it('passes the turn when memory crosses to the other side', () => {
    const s = fresh('bottom');
    setMemory(s, 3);
    expect(s.active).toBe('bottom');
    setMemory(s, -2);
    expect(s.active).toBe('top');
  });

  it('keeps the turn at exactly 0', () => {
    const s = fresh('top');
    setMemory(s, 0);
    setMemory(s, -4);
    setMemory(s, 0);
    expect(s.active).toBe('top');
  });

  it('clamps to 10 either way', () => {
    const s = fresh();
    setMemory(s, 14);
    expect(s.memory).toBe(10);
    nudge(s, 'bottom', -30);
    expect(s.memory).toBe(-10);
  });

  it('nudges relative to the player', () => {
    const s = fresh('top');
    nudge(s, 'top', 2);
    expect(s.memory).toBe(-2);
    expect(mineFor('top', s.memory)).toBe(2);
  });

  it('undoes memory and turn together', () => {
    const s = fresh('bottom');
    setMemory(s, 2);
    setMemory(s, -3);
    undo(s);
    expect(s).toMatchObject({ memory: 2, active: 'bottom' });
    undo(s);
    undo(s);
    expect(s.memory).toBe(0);
  });

  it('new game resets but keeps the facing setting', () => {
    const s = fresh();
    s.facing = false;
    setMemory(s, 5);
    newGame(s, 'top');
    expect(s).toMatchObject({ memory: 0, active: 'top', history: [], facing: false });
  });
});
