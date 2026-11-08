<script lang="ts">
  import { fontById } from '../../lib/fonts';
  import { imageUrl } from '../../lib/images.svelte';
  import { persisted } from '../../lib/persisted.svelte';
  import { blankProfile, profileById, profiles, removeProfile, type Profile } from '../../lib/profiles.svelte';
  import { spin } from '../../lib/random';
  import { keepAwake } from '../../lib/wakeLock';
  import {
    assignSeat,
    fresh,
    MAX_PLAYERS,
    MIN_PLAYERS,
    repair,
    resetLife,
    seats,
    START_OPTIONS,
    unseat,
    type LifeState,
  } from './life';
  import ProfileEditor from './ProfileEditor.svelte';

  let { onexit }: { onexit: () => void } = $props();

  const s = persisted<LifeState>('mtg-life', () => fresh(), repair);
  let menu = $state(false);
  let board: HTMLDivElement;

  const layout = $derived(seats(s.count));

  /** How a seat looks: its profile if one is seated there, otherwise the guest name and colour. */
  function look(i: number) {
    const p = s.players[i];
    const prof = profileById(p.profileId);
    return {
      name: prof?.name ?? p.name,
      color: prof?.color ?? p.color,
      font: fontById(prof?.font),
      bg: imageUrl(prof?.bg?.image),
      credit: prof?.bg?.credit,
    };
  }

  // Profile editor, opened from the menu. Null while closed.
  let editing = $state<{ profile: Profile; existing: boolean } | null>(null);
  function deleteEditing() {
    if (!editing || !confirm(`Delete the profile "${editing.profile.name}"?`)) return;
    unseat(s, editing.profile.id);
    removeProfile(editing.profile.id);
    editing = null;
  }

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

  // A tap counts 1. Holding turns it into steps of 10: the first step tops the tap up to
  // exactly 10, then another 10 follows every REPEAT ms until the finger lifts.
  // Each finger (pointerId) gets its own timers, so several players can tap or hold at once.
  const HOLD_DELAY = 500;
  const REPEAT = 700;
  const STEP = 10;
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
      delay: setTimeout(() => {
        change(i, d * (STEP - 1));
        h.repeat = setInterval(() => change(i, d * STEP), REPEAT);
      }, HOLD_DELAY),
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

  // Random first player: a highlight runs around the table and stops on someone, who then
  // gets a "Goes first" banner. Player indexes 0..count-1 already run around the table.
  let lit = $state<number | null>(null);
  let first = $state<number | null>(null);
  let firstTimer: ReturnType<typeof setTimeout>;
  let cancelSpin = () => {};
  $effect(() => () => {
    cancelSpin();
    clearTimeout(firstTimer);
  });

  function pickFirst() {
    menu = false;
    first = null;
    cancelSpin();
    cancelSpin = spin(
      s.count,
      (i) => (lit = i),
      (i) => {
        lit = null;
        first = i;
        clearTimeout(firstTimer);
        firstTimer = setTimeout(() => (first = null), 3500);
      },
    );
  }
</script>

<div class="board" bind:this={board} style:grid-template-columns="repeat({layout.columns}, 1fr)">
  {#each layout.seats as seat (seat.player)}
    {@const p = s.players[seat.player]}
    {@const lk = look(seat.player)}
    {@const d = deltas[seat.player]}
    <div class="seat" style:grid-row={seat.row} style:grid-column={seat.column} style:--c={lk.color}>
      <div
        class="panel"
        class:turned={seat.turned}
        class:dead={p.life <= 0}
        class:lit={lit === seat.player}
        class:pic={!!lk.bg}
        style:background-image={lk.bg ? `url("${lk.bg}")` : undefined}
      >
        {#if lk.bg}<div class="shade"></div>{/if}
        {#if first === seat.player}
          <div class="banner">Goes first!</div>
        {/if}
        <button
          class="hit minus"
          aria-label="{lk.name} loses 1 life (hold for 10)"
          onpointerdown={(e) => press(e, seat.player, -1)}
          onpointerup={release}
          onpointercancel={release}
          onlostpointercapture={release}
          oncontextmenu={(e) => e.preventDefault()}><span>−</span></button
        >
        <button
          class="hit plus"
          aria-label="{lk.name} gains 1 life (hold for 10)"
          onpointerdown={(e) => press(e, seat.player, 1)}
          onpointerup={release}
          onpointercancel={release}
          onlostpointercapture={release}
          oncontextmenu={(e) => e.preventDefault()}><span>+</span></button
        >
        <div class="info" style:font-family={lk.font.family} style:--fw={lk.font.weight} style:--fs={lk.font.scale}>
          <div class="name">{lk.name}</div>
          <div class="life">{p.life}</div>
          <div class="delta" class:show={d !== 0}>{d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '·'}</div>
        </div>
        {#if lk.credit}<div class="credit">{lk.credit}</div>{/if}
      </div>
    </div>
  {/each}
</div>

<button class="menu-btn" aria-label="Menu" onclick={() => (menu = true)}>
  <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></svg>
</button>

{#if editing}
  <ProfileEditor
    profile={editing.profile}
    onclose={() => (editing = null)}
    ondelete={editing.existing ? deleteEditing : undefined}
  />
{:else if menu}
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

      <h3>Seats</h3>
      <p class="hint">Seats remember who sits there, so the next game starts with the same people.</p>
      <div class="names">
        {#each s.players.slice(0, s.count) as p, i (i)}
          <div class="seat-row" style:--c={look(i).color}>
            <span class="dot"></span>
            <select
              value={p.profileId ?? ''}
              aria-label="Who sits in seat {i + 1}"
              onchange={(e) => assignSeat(s, i, e.currentTarget.value || undefined)}
            >
              <option value="">Guest</option>
              {#each profiles.list as prof (prof.id)}
                <option value={prof.id}>{prof.name}</option>
              {/each}
            </select>
            {#if !p.profileId}
              <input bind:value={p.name} maxlength="20" aria-label="Seat {i + 1} guest name" />
            {/if}
          </div>
        {/each}
      </div>

      <h3>Profiles</h3>
      <div class="row">
        {#each profiles.list as prof (prof.id)}
          <button
            class="btn chip"
            style:--c={prof.color}
            onclick={() => (editing = { profile: prof, existing: true })}
          >
            <span class="dot"></span>{prof.name}
          </button>
        {/each}
        <button class="btn" onclick={() => (editing = { profile: blankProfile(), existing: false })}>+ New profile</button>
      </div>

      <div class="gap"></div>
      <div class="row">
        <button class="btn wide" onclick={pickFirst}>🎲 Random first player</button>
      </div>
      <div class="row" style:margin-top="8px">
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
  .panel.pic {
    background-size: cover;
    background-position: center;
  }
  /* Tint over a picture so the life total reads on any image; a hint of the profile colour keeps seats apart. */
  .shade {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(color-mix(in srgb, var(--c) 25%, rgb(0 0 0 / 35%)), rgb(0 0 0 / 50%));
  }
  .panel.pic .info {
    text-shadow: 0 2px 10px rgb(0 0 0 / 70%);
  }
  .credit {
    position: absolute;
    left: 12px;
    bottom: 8px;
    font-size: 11px;
    color: rgb(255 255 255 / 70%);
    pointer-events: none;
  }
  .panel.turned {
    transform: rotate(180deg);
  }
  .panel.dead {
    filter: grayscale(0.85) brightness(0.6);
  }
  .panel.lit {
    box-shadow: inset 0 0 0 6px #fff;
    background: color-mix(in srgb, var(--c) 80%, #fff);
  }
  .banner {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: grid;
    place-items: center;
    background: color-mix(in srgb, var(--c) 85%, #fff);
    color: #111;
    font-size: min(20cqh, 12cqw);
    font-weight: 800;
    pointer-events: none;
    animation: banner 3.5s ease-out forwards;
  }
  @keyframes banner {
    0% {
      opacity: 0;
      transform: scale(0.9);
    }
    10%,
    80% {
      opacity: 1;
      transform: none;
    }
    100% {
      opacity: 0;
    }
  }
  .hit {
    /* Positioned so the +/− marks paint above a picture's tint. */
    position: relative;
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
    font-size: calc(min(46cqh, 30cqw) * var(--fs, 1));
    font-weight: var(--fw, 800);
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
  .seat-row {
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
  .names input,
  .names select {
    flex: 1;
    min-width: 0;
    padding: 8px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-2);
  }
  .names select {
    flex: 0 1 45%;
  }
  .hint {
    margin: -4px 0 10px;
    color: var(--muted);
    font-size: 13px;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
</style>
