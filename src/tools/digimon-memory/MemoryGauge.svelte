<script lang="ts">
  import { persisted } from '../../lib/persisted.svelte';
  import { keepAwake } from '../../lib/wakeLock';
  import { fresh, mineFor, newGame, nudge, setMemory, undo, valueOf, type MemoryState, type Side } from './memory';

  let { onexit }: { onexit: () => void } = $props();

  const s = persisted<MemoryState>('digimon-memory', () => fresh());
  let menu = $state(false);

  $effect(() => keepAwake());

  const COLOR: Record<Side, string> = { bottom: '#f97316', top: '#3b82f6' };
  const NEAR = [1, 2, 3, 4, 5];
  const FAR = [6, 7, 8, 9, 10];

  function cellState(side: Side, n: number) {
    const mine = mineFor(side, s.memory);
    return mine === n ? 'on' : mine > n ? 'fill' : '';
  }
  function start(first: Side) {
    newGame(s, first);
    menu = false;
  }
</script>

{#snippet cells(side: Side, row: number[])}
  <div class="cells">
    {#each row as n (n)}
      <button
        class="cell {cellState(side, n)}"
        aria-label="Set memory to {n} for the {side} player"
        onpointerdown={() => setMemory(s, valueOf(side, n))}>{n}</button
      >
    {/each}
  </div>
{/snippet}

{#snippet half(side: Side)}
  {@const turned = side === 'top' && s.facing}
  {@const flat = side === 'top' && !s.facing}
  {@const mine = mineFor(side, s.memory)}
  <div class="half" class:turned class:flat class:active={s.active === side} style:--c={COLOR[side]}>
    {@render cells(side, flat ? [...NEAR].reverse() : NEAR)}
    {@render cells(side, flat ? [...FAR].reverse() : FAR)}
    <div class="controls">
      <button class="nudge" aria-label="Pay 1 memory" onpointerdown={() => nudge(s, side, -1)}>−</button>
      <div class="status">
        {#if s.active === side}
          <strong>Your turn</strong>
          <span>{Math.max(mine, 0)} memory</span>
        {:else}
          <span class="wait">Opponent's turn</span>
        {/if}
      </div>
      <button class="nudge" aria-label="Gain 1 memory" onpointerdown={() => nudge(s, side, 1)}>+</button>
    </div>
  </div>
{/snippet}

<div class="board">
  {@render half('top')}
  <div class="middle">
    <button class="side-btn" disabled={!s.history.length} onclick={() => undo(s)}>Undo</button>
    <button
      class="cell zero"
      class:on={s.memory === 0}
      style:--c={COLOR[s.active]}
      aria-label="Set memory to 0"
      onpointerdown={() => setMemory(s, 0)}>0</button
    >
    <button class="side-btn" onclick={() => (menu = true)}>Menu</button>
  </div>
  {@render half('bottom')}
</div>

{#if menu}
  <div class="sheet-backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && (menu = false)}>
    <div class="sheet" role="dialog" aria-label="Memory gauge menu">
      <h2>Memory Gauge</h2>
      <h3>New game: who goes first?</h3>
      <div class="row">
        <button class="btn wide" style:background={COLOR.bottom} style:color="#111" onclick={() => start('bottom')}>
          Bottom (orange)
        </button>
        <button class="btn wide" style:background={COLOR.top} style:color="#111" onclick={() => start('top')}>
          Top (blue)
        </button>
      </div>
      <h3>Top player's numbers</h3>
      <div class="row">
        <button class="btn wide" class:on={s.facing} onclick={() => (s.facing = true)}>Face them (across)</button>
        <button class="btn wide" class:on={!s.facing} onclick={() => (s.facing = false)}>Face me (same side)</button>
      </div>
      <h3>&nbsp;</h3>
      <div class="row">
        <button class="btn wide" onclick={() => (menu = false)}>Close</button>
        <button class="btn wide" onclick={onexit}>All tools</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .board {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: calc(env(safe-area-inset-top) + 8px) calc(env(safe-area-inset-right) + 8px)
      calc(env(safe-area-inset-bottom) + 8px) calc(env(safe-area-inset-left) + 8px);
    max-width: 720px;
    margin: 0 auto;
  }
  .half {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 0;
    padding: 8px;
    border-radius: 20px;
    background: var(--surface);
    transition: background 0.25s, box-shadow 0.25s;
  }
  .half.active {
    background: color-mix(in srgb, var(--c) 16%, var(--surface));
    box-shadow: inset 0 0 0 3px var(--c);
  }
  .half.turned {
    transform: rotate(180deg);
  }
  .half.flat {
    flex-direction: column-reverse;
  }
  .cells {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    min-height: 0;
  }
  .cell {
    min-height: 0;
    border-radius: 14px;
    background: var(--surface-2);
    font-size: clamp(22px, 6vmin, 44px);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
    transition: background 0.12s, color 0.12s, transform 0.12s;
  }
  .cell:active {
    transform: scale(0.94);
  }
  .cell.fill {
    background: color-mix(in srgb, var(--c) 30%, var(--surface-2));
    color: var(--text);
  }
  .cell.on {
    background: var(--c);
    color: #111;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 40%, transparent), 0 0 24px var(--c);
  }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
    height: clamp(52px, 10vmin, 72px);
  }
  .nudge {
    height: 100%;
    aspect-ratio: 1.4;
    border-radius: 14px;
    background: var(--surface-2);
    font-size: 30px;
    font-weight: 700;
  }
  .status {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.15;
  }
  .status strong {
    font-size: 20px;
    color: var(--c);
  }
  .status span {
    font-size: 15px;
  }
  .status .wait {
    color: var(--muted);
  }
  .middle {
    display: flex;
    align-items: stretch;
    gap: 8px;
    height: clamp(60px, 11vmin, 84px);
  }
  .zero {
    flex: 1.4;
    --c: #f4f4f5;
  }
  .side-btn {
    flex: 1;
    border-radius: 14px;
    background: var(--surface);
    font-weight: 600;
    color: var(--muted);
  }
  .side-btn:disabled {
    opacity: 0.4;
  }
</style>
