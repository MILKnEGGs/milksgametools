<script lang="ts">
  import { registerSW } from 'virtual:pwa-register';
  import { TOOLS, toolById } from './tools/registry';

  let updateReady = $state(false);
  const updateSW = registerSW({
    onNeedRefresh: () => (updateReady = true),
    onRegisteredSW(_url, registration) {
      // Check for a new version hourly while the app stays open. Failures (no signal) are harmless.
      if (registration) setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  // Routes: "#/" is the home screen, "#/t/<tool id>" opens a tool.
  let hash = $state(location.hash);
  $effect(() => {
    const onHash = () => (hash = location.hash);
    addEventListener('hashchange', onHash);
    return () => removeEventListener('hashchange', onHash);
  });
  const tool = $derived(toolById(hash.match(/^#\/t\/([\w-]+)/)?.[1] ?? ''));

  const groups = $derived(
    [...new Set(TOOLS.map((t) => t.game))].map((game) => ({ game, tools: TOOLS.filter((t) => t.game === game) })),
  );

  function exit() {
    // Go back if we came from home, so the browser history doesn't fill with tool visits.
    if (history.length > 1 && history.state?.fromHome) history.back();
    else location.hash = '#/';
  }
  function open(id: string) {
    history.pushState({ fromHome: true }, '', `#/t/${id}`);
    hash = location.hash;
  }
</script>

{#if tool}
  {#await tool.load() then mod}
    <mod.default onexit={exit} />
  {/await}
{:else}
  <main class="home">
    <header>
      <h1>Milk's Game Tools</h1>
      <p class="sub">Helpers for the table. Everything works offline.</p>
    </header>

    {#each groups as g (g.game)}
      <section>
        <h2>{g.game}</h2>
        <div class="grid">
          {#each g.tools as t (t.id)}
            <button class="card" style:--accent={t.accent} onclick={() => open(t.id)}>
              <span class="emoji" aria-hidden="true">{t.emoji}</span>
              <span class="text">
                <span class="name">{t.name}</span>
                <span class="blurb">{t.blurb}</span>
              </span>
            </button>
          {/each}
        </div>
      </section>
    {/each}

    <footer>
      <p>
        Tip: on iPhone or iPad, open this in Safari and use Share → Add to Home Screen for full-screen trackers.
      </p>
      <p class="ver">v{__APP_VERSION__}</p>
    </footer>
  </main>
{/if}

{#if updateReady}
  <div class="update">
    <span>A new version is ready.</span>
    <button onclick={() => updateSW(true)}>Update</button>
    <button class="ghost" onclick={() => (updateReady = false)}>Later</button>
  </div>
{/if}

<style>
  .home {
    max-width: 760px;
    margin: 0 auto;
    padding: calc(env(safe-area-inset-top) + 28px) 16px calc(env(safe-area-inset-bottom) + 24px);
  }
  h1 {
    margin: 0;
    font-size: 30px;
    letter-spacing: -0.02em;
  }
  .sub {
    margin: 4px 0 0;
    color: var(--muted);
  }
  h2 {
    margin: 28px 0 10px;
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 12px;
  }
  .card {
    display: flex;
    gap: 14px;
    align-items: center;
    text-align: left;
    padding: 16px;
    border-radius: var(--radius);
    background: var(--surface);
    border: 1px solid var(--border);
    border-left: 5px solid var(--accent);
    color: inherit;
  }
  .card:active {
    background: var(--surface-2);
  }
  .emoji {
    font-size: 34px;
    line-height: 1;
  }
  .text {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  .name {
    font-weight: 700;
    font-size: 18px;
  }
  .blurb {
    color: var(--muted);
    font-size: 14px;
  }
  footer {
    margin-top: 36px;
    color: var(--muted);
    font-size: 13px;
  }
  .ver {
    opacity: 0.6;
  }
  .update {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom) + 16px);
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 12px 10px 16px;
    border-radius: 999px;
    background: var(--text);
    color: var(--bg);
    z-index: 100;
    white-space: nowrap;
  }
  .update button {
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--bg);
    color: var(--text);
    font-weight: 600;
  }
  .update .ghost {
    background: transparent;
    color: var(--bg);
  }
</style>
