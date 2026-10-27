# Milk's Game Tools

Table-side helpers for card games, as one offline PWA. All state stays in the browser (localStorage).

## Tools

- **Digimon: Memory Gauge.** One phone lies between two players. Tap any number to move the shared memory; the turn passes on its own when memory reaches the other player's side (at 0 it stays with the current player). There are ±1 nudges, undo, a new-game button that asks who goes first, and a choice to turn the top half to face across the table.
- **Magic: Life Counter.** 2–6 players on one tablet (20/30/40 life). Every finger is tracked on its own, so all players can tap or hold at once. Tap for ±1, or hold to repeat. A running "+3 / −5" shows briefly after changes.

Both trackers keep the screen awake while open.

### iPad tip

iPadOS uses 4- and 5-finger swipes and pinches for multitasking. Taps don't trigger them, but if a whole table is grabbing the iPad, turn them off in Settings → Multitasking & Gestures. Guided Access (Settings → Accessibility) also locks the iPad to this app.

## Adding a tool

1. Make a folder in `src/tools/<id>/` with a full-screen Svelte component that takes an `onexit` prop.
2. Add it to `TOOLS` in `src/tools/registry.ts`. The home screen groups tools by `game`.
3. For saved state, use `persisted(key, init)` from `src/lib/persisted.svelte.ts`; for an always-on screen, use `keepAwake()` from `src/lib/wakeLock.ts`.

## Development

```
npm.cmd install
npm.cmd run dev      # http://localhost:5173 (or F5 in Visual Studio)
npm.cmd test
npm.cmd run build
```

Pushing to `main` deploys to GitHub Pages (Settings → Pages → Source: GitHub Actions, one time).
