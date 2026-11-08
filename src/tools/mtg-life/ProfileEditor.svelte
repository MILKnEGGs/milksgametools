<script lang="ts">
  import { untrack } from 'svelte';
  import { FONTS, fontById } from '../../lib/fonts';
  import { deleteImage, imageUrl, putImage, shrink } from '../../lib/images.svelte';
  import { PROFILE_COLORS, saveProfile, type Profile } from '../../lib/profiles.svelte';
  import { artFor, downloadArt, suggestNames, type Art } from './scryfall';

  let {
    profile,
    onclose,
    ondelete,
  }: { profile: Profile; onclose: () => void; ondelete?: () => void } = $props();

  // Edit a copy; nothing changes until Save.
  const original: Profile = untrack(() => JSON.parse(JSON.stringify(profile)));
  const draft = $state<Profile>(untrack(() => JSON.parse(JSON.stringify(profile))));
  // Pictures stored while editing, so Cancel can throw them away again.
  const created: string[] = [];

  let busy = $state(false);
  let error = $state('');

  async function setPicture(blob: Blob, source: 'photo' | 'art', credit?: string) {
    const image = await putImage(blob);
    created.push(image);
    draft.bg = { image, source, credit };
  }

  // Photos
  let fileInput: HTMLInputElement;
  async function onPhoto() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    busy = true;
    error = '';
    try {
      await setPicture(await shrink(file), 'photo');
    } catch {
      error = "Couldn't read that picture. Try a different one.";
    } finally {
      busy = false;
    }
  }

  // Card art search: type a name → pick a suggestion → pick one of its arts.
  let searching = $state(false);
  let query = $state('');
  let names = $state<string[]>([]);
  let arts = $state<Art[] | null>(null);
  let artName = $state('');
  let typing: ReturnType<typeof setTimeout>;

  function onQuery() {
    arts = null;
    clearTimeout(typing);
    const q = query;
    typing = setTimeout(async () => {
      try {
        const found = await suggestNames(q);
        if (q === query) names = found;
        error = '';
      } catch {
        error = 'Card search needs an internet connection.';
      }
    }, 250);
  }
  async function pickName(name: string) {
    artName = name;
    names = [];
    busy = true;
    error = '';
    try {
      arts = await artFor(name);
    } catch {
      error = 'Card search needs an internet connection.';
    } finally {
      busy = false;
    }
  }
  async function pickArt(a: Art) {
    busy = true;
    error = '';
    try {
      await setPicture(await downloadArt(a.url), 'art', a.artist ? `Art: ${a.artist}` : undefined);
      searching = false;
      arts = null;
      query = '';
    } catch {
      error = "Couldn't download that art. Check the connection and try again.";
    } finally {
      busy = false;
    }
  }

  function save() {
    draft.name = draft.name.trim() || 'Player';
    const keep = draft.bg?.image;
    if (original.bg && original.bg.image !== keep) void deleteImage(original.bg.image);
    for (const id of created) if (id !== keep) void deleteImage(id);
    saveProfile(draft);
    onclose();
  }
  function cancel() {
    for (const id of created) void deleteImage(id);
    onclose();
  }

  const font = $derived(fontById(draft.font));
  const bgUrl = $derived(imageUrl(draft.bg?.image));
</script>

<div class="sheet-backdrop" role="presentation">
  <div class="sheet" role="dialog" aria-label="Edit profile">
    <h2>{ondelete ? 'Edit profile' : 'New profile'}</h2>

    <div
      class="preview"
      style:--c={draft.color}
      style:background-image={bgUrl ? `url("${bgUrl}")` : undefined}
      style:font-family={font.family}
      style:font-weight={font.weight}
      style:--fs={font.scale}
    >
      <div class="shade" class:pic={!!bgUrl}></div>
      <div class="p-name">{draft.name || 'Name'}</div>
      <div class="p-life">40</div>
      {#if draft.bg?.credit}<div class="p-credit">{draft.bg.credit}</div>{/if}
    </div>

    <h3>Name</h3>
    <input class="text" bind:value={draft.name} maxlength="20" placeholder="Name" />

    <h3>Colour</h3>
    <div class="swatches">
      {#each PROFILE_COLORS as c (c)}
        <button
          class="swatch"
          class:on={draft.color === c}
          style:background={c}
          aria-label="Colour {c}"
          onclick={() => (draft.color = c)}
        ></button>
      {/each}
    </div>

    <h3>Font</h3>
    <div class="fonts">
      {#each FONTS as f (f.id)}
        <button
          class="btn font"
          class:on={draft.font === f.id}
          style:font-family={f.family}
          style:font-weight={f.weight}
          onclick={() => (draft.font = f.id)}>{f.label} 40</button
        >
      {/each}
    </div>

    <h3>Background</h3>
    <div class="row">
      <button class="btn wide" class:on={!draft.bg} onclick={() => (draft.bg = undefined)}>None</button>
      <button class="btn wide" class:on={draft.bg?.source === 'photo'} disabled={busy} onclick={() => fileInput.click()}>
        📷 Photo
      </button>
      <button class="btn wide" class:on={draft.bg?.source === 'art' || searching} onclick={() => (searching = !searching)}>
        🃏 Card art
      </button>
    </div>
    <input bind:this={fileInput} type="file" accept="image/*" hidden onchange={onPhoto} />

    {#if searching}
      <div class="search">
        <input class="text" bind:value={query} oninput={onQuery} placeholder="Card name, e.g. Atraxa" autocomplete="off" />
        {#if names.length}
          <ul class="names">
            {#each names as n (n)}
              <li><button onclick={() => pickName(n)}>{n}</button></li>
            {/each}
          </ul>
        {/if}
        {#if arts}
          {#if arts.length}
            <p class="hint">{artName}: tap an art</p>
            <div class="arts">
              {#each arts as a (a.url)}
                <button class="art" disabled={busy} onclick={() => pickArt(a)} title="{a.set} · {a.artist}">
                  <img src={a.url} alt="{artName} art by {a.artist}" loading="lazy" />
                </button>
              {/each}
            </div>
          {:else}
            <p class="hint">No art found for {artName}.</p>
          {/if}
        {/if}
        <p class="hint small">Card art from Scryfall. It's saved on this device, so it works offline afterwards.</p>
      </div>
    {/if}

    {#if busy}<p class="hint">Working…</p>{/if}
    {#if error}<p class="error">{error}</p>{/if}

    <div class="row" style:margin-top="20px">
      <button class="btn wide primary" style:--accent={draft.color} disabled={busy} onclick={save}>Save</button>
      <button class="btn wide" onclick={cancel}>Cancel</button>
    </div>
    {#if ondelete}
      <button class="delete" onclick={ondelete}>Delete profile</button>
    {/if}
  </div>
</div>

<style>
  .preview {
    position: relative;
    height: 150px;
    border-radius: 18px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, var(--c) 55%, #111);
    background-size: cover;
    background-position: center;
    color: #fff;
    line-height: 1;
  }
  .shade.pic {
    position: absolute;
    inset: 0;
    background: linear-gradient(color-mix(in srgb, var(--c) 25%, rgb(0 0 0 / 35%)), rgb(0 0 0 / 50%));
  }
  .p-name,
  .p-life,
  .p-credit {
    position: relative;
    text-shadow: 0 2px 8px rgb(0 0 0 / 60%);
  }
  .p-name {
    font-size: 18px;
  }
  .p-life {
    font-size: calc(72px * var(--fs));
    margin-top: 6px;
  }
  .p-credit {
    position: absolute;
    left: 10px;
    bottom: 6px;
    font: 11px var(--font);
    opacity: 0.75;
  }
  .text {
    width: 100%;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--border);
    background: var(--surface-2);
  }
  .swatches {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 8px;
  }
  .swatch {
    aspect-ratio: 1;
    border-radius: 50%;
    border: 3px solid transparent;
  }
  .swatch.on {
    border-color: var(--text);
  }
  .fonts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  }
  .font {
    padding: 10px 6px;
    font-size: 15px;
    white-space: nowrap;
    overflow: hidden;
  }
  .btn:disabled {
    opacity: 0.5;
  }
  .search {
    margin-top: 10px;
  }
  .names {
    list-style: none;
    margin: 6px 0 0;
    padding: 0;
    border-radius: 10px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .names button {
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    background: var(--surface-2);
    border-bottom: 1px solid var(--border);
  }
  .arts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .art {
    padding: 0;
    border-radius: 10px;
    overflow: hidden;
    aspect-ratio: 626 / 457;
    background: var(--surface-2);
  }
  .art img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .hint {
    margin: 8px 0;
    color: var(--muted);
    font-size: 14px;
  }
  .hint.small {
    font-size: 12px;
  }
  .error {
    margin: 8px 0;
    color: #f87171;
    font-size: 14px;
  }
  .delete {
    display: block;
    margin: 14px auto 0;
    padding: 6px 12px;
    color: #f87171;
    font-size: 14px;
  }
</style>
