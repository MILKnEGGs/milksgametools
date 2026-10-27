<script lang="ts">
  import { persisted } from '../../lib/persisted.svelte';
  import { keepAwake } from '../../lib/wakeLock';
  import { fresh, MAX_PLAYERS, MIN_PLAYERS, repair, resetLife, seats, START_OPTIONS, type LifeState } from './life';

  let { onexit }: { onexit: () => void } = $props();

  const s = persisted<LifeState>('mtg-life', () => fresh(), repair);
  let menu = $state(false);
  let board: HTMLDivElement;

  const layout = $derived(seats(s.count));

  $effect(() => keepAwake());

  // A finger resting on the board must never scroll, zoom or select: block the browser's
  // own touch handling. Pointer events below still fire for every finger independently.
  $effect(() => {
    const block = (e: TouchEvent) => e.preventDefault();
    board.addEventListener('touchstart', block, { passive: false });
    board.addEventListener('touchmove', block, { passive: false });
    return () => {
      board.removeEventListener('touchstart', block);
      board.removeEventListener('touchmove', block);
    };
  });

  // Recent change per player ("−3"), shown until they stop tapping for a moment.
  const deltas = $state<number[]>(Array(MAX_PLAYERS).fill(0));
  const deltaTimers: ReturnType<typeof setTimeout>[] = [];

  function change(i: number, d: number) {
    s.players[i].life += d;
    deltas[i] += d;
    clearTimeout(deltaTimers[i]);
    deltaTimers[i] = setTimeout(() => (deltas[i] = 0), 1800);
  }

  // Each finger (pointerId) gets its own hold-to-repeat timer, so several players can
  // tap or hold at once without interfering with each other.
  const HOLD_DELAY = 450;
  const REPEAT = 110;
  const holds = new Map<number, { delay: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> }>();

  function press(e: PointerEvent, i: number, d: number) {
    e.preventDefault();
    try {
      // Keeps pointerup on this button even if the finger slides off it.
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone; the tap still counts.
    }
    release(e);
    change(i, d);
    const h: { delay: ReturnType<typeof setTimeout>; repeat?: ReturnType<typeof setInterval> } = {
      delay: setTimeout(() => (h.repeat = setInterval(() => change(i, d), REPEAT)), HOLD_DELAY),
    };
    holds.set(e.pointerId, h);
  }
  function release(e: PointerEvent) {
    const h = holds.get(e.pointerId);
    if (!h) return;
    clearTimeout(h.delay);
    clearInterval(h.repeat);
    holds.delete(e.pointerId);
  }
  $effect(() => () => {
    for (const h of holds.values()) {
      clearTimeout(h.delay);
      clearInterval(h.repeat);
    }
    deltaTimers.forEach(clearTimeout);
  });

  function newGame() {
    resetLife(s);
    deltas.fill(0);
    menu = false;
  }
</script>

<div class="board" bind:this={board} style:grid-template-columns="repeat({layout.columns}, 1fr)">
  {#each layout.seats as seat (seat.player)}
    {@const p = s.players[seat.player]}
    {@const d = deltas[seat.player]}
    <div class="seat" style:grid-row={seat.row} style:grid-column={seat.column} style:--c={p.color}>
      <div class="panel" class:turned={seat.turned} class:dead={p.life <= 0}>
        <button
          class="hit minus"
          aria-label="{p.name} loses 1 life"
          onpointerdown={(e) => press(e, seat.player, -1)}
          onpointerup={release}
          onpointercancel={release}
          onlostpointercapture={release}
          oncontextmenu={(e) => e.preventDefault()}><span>−</span></button
        >
        <button
          class="hit plus"
          aria-label="{p.name} gains 1 life"
          onpointerdown={(e) => press(e, seat.player, 1)}
          onpointerup={release}
          onpointercancel={release}
          onlostpointercapture={release}
          oncontextmenu={(e) => e.preventDefault()}><span>+</span></button
        >
        <div class="info">
          <div class="name">{p.name}</div>
          <div class="life">{p.life}</div>
          <div class="delta" class:show={d !== 0}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '·'}</div>
        </div>
      </div>
    </div>
  {/each}
</div>

<button class="menu-btn" aria-label="Menu" onclick={() => (menu = true)}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
</button>

{#if menu}
  <div class="sheet-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (menu = false)}>
    <div class="sheet" role="dialog" aria-label="Life counter menu">
      <h2>Life Counter</h2>

      <h3>Players</h3>
      <div class="row">
        {#each Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS) as n (n)}
          <button class="btn" class:on={s.count === n} onclick={() => (s.count = n)}>{n}</button>
        {/each}
      </div>

      <h3>Starting life</h3>
      <div class="row">
        {#each START_OPTIONS as n (n)}
          <button class="btn" class:on={s.startLife === n} onclick={() => (s.startLife = n)}>{n}</button>
        {/each}
      </div>

      <h3>Names</h3>
      <div class="names">
        {#each s.players.slice(0, s.count) as p, i (i)}
          <label style:--c={p.color}>
            <span class="dot"></span>
            <input bind:value={p.name} maxlength="20" aria-label="Player {i + 1} name" />
          </label>
        {/each}
      </div>

      <h3>&nbsp;</h3>
      <div class="row">
        <button class="btn wide primary" style:--accent="#a855f7" onclick={newGame}>New game ({s.startLife} life)</button>
      </div>
      <div class="row" style:margin-top="8px">
        <button class="btn wide" onclick={() => (menu = false)}>Close</button>
        <button class="btn wide" onclick={onexit}>All tools</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .board {
    display: grid;
    grid-template-rows: 1fr 1fr;
    gap: 6px;
    padding: calc(env(safe-area-inset-top) + 6px) calc(env(safe-area-inset-right) + 6px)
      calc(env(safe-area-inset-bottom) + 6px) calc(env(safe-area-inset-left) + 6px);
    background: #000;
  }
  .seat {
    position: relative;
    min-width: 0;
    min-height: 0;
  }
  .panel {
    position: absolute;
    inset: 0;
    display: flex;
    border-radius: 22px;
    overflow: hidden;
    background: color-mix(in srgb, var(--c) 55%, #111);
    container-type: size;
    transition: filter 0.3s;
  }
  .panel.turned {
    transform: rotate(180deg);
  }
  .panel.dead {
    filter: grayscale(0.85) brightness(0.6);
  }
  .hit {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0 7cqw;
    font-size: min(22cqh, 14cqw);
    font-weight: 300;
    color: rgb(255 255 255 / 55%);
    touch-action: none;
  }
  .hit.plus {
    justify-content: flex-end;
  }
  .hit:active {
    background: rgb(255 255 255 / 10%);
  }
  .info {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    line-height: 1;
    color: #fff;
  }
  .name {
    font-size: min(9cqh, 6cqw);
    font-weight: 600;
    opacity: 0.85;
    max-width: 60cqw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .life {
    font-size: min(46cqh, 30cqw);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.03em;
    margin: 2cqh 0;
  }
  .delta {
    font-size: min(11cqh, 7cqw);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    opacity: 0;
    transition: opacity 0.25s;
  }
  .delta.show {
    opacity: 0.9;
  }
  .menu-btn {
    position: fixed;
    left: 50%;
    top: 50%;
    z-index: 10;
    width: 52px;
    height: 52px;
    margin: -26px 0 0 -26px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #111;
    border: 3px solid #000;
    box-shadow: 0 2px 10px rgb(0 0 0 / 50%);
  }
  .menu-btn svg {
    width: 24px;
    fill: #fff;
  }
  .names {
    display: grid;
    gap: 8px;
  }
  .names label {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--c);
    flex: none;
  }
  .names input {
    flex: 1;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-2);
  }
</style>
