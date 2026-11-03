// Fair random picks plus a little "roulette" animation that slows down and lands on the pick,
// so the table can see the choice being made instead of it just appearing.

export function randomIndex(n: number): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0] % n;
}

/** Highlight order for a spin: starts at `start`, goes around at least `minSteps` times, ends on `winner`. */
export function spinPath(n: number, start: number, winner: number, minSteps = 14): number[] {
  const path: number[] = [];
  let i = start;
  while (path.length < minSteps || path[path.length - 1] !== winner) {
    path.push(i);
    i = (i + 1) % n;
  }
  return path;
}

/** Runs the spin, calling `tick` with each highlighted index and `done` with the winner. Returns a cancel function. */
export function spin(n: number, tick: (i: number) => void, done: (i: number) => void): () => void {
  const path = spinPath(n, randomIndex(n), randomIndex(n));
  let k = 0;
  let timer: ReturnType<typeof setTimeout>;
  const step = () => {
    tick(path[k]);
    if (k === path.length - 1) {
      timer = setTimeout(() => done(path[k]), 350);
      return;
    }
    // Ease out: quick at first, then each step a little slower.
    const left = path.length - 1 - k++;
    timer = setTimeout(step, 70 + Math.max(0, 8 - left) * 45);
  };
  step();
  return () => clearTimeout(timer);
}
