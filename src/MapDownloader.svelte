<script lang="ts">
  import Control from "./ol/Control.svelte";
  import { getOlContext } from "./ol/Map.svelte";
  import { TileDownloader } from "./utils/tileDownloader";
  import { tileUrlFunction } from "./layers/linzTopoSource";
  import { friendlyBytes } from "./utils/bytes";
  import { onMount } from "svelte";
  import onMountTick from "./utils/onMountTick";
  import Spinner from "./components/Spinner.svelte";

  const { map } = getOlContext();

  let zoom = map.getView().getZoom();
  let downloading = false;

  onMountTick(() => {
    const handler = () => {
      zoom = map.getView().getZoom();
    };
    map.on("moveend", handler);
    return () => map.un("moveend", handler);
  });
</script>

{#if zoom >= 11 || downloading}
  <Control control>
    {#if !downloading}
      <button
        on:click={async () => {
          const view = map.getView();
          const extent = view.calculateExtent();
          const downloader = new TileDownloader(extent, view.getZoom());
          const message = `Would you like to download tiles?\nThis will use approximately ${friendlyBytes(downloader.estimatedSize())} of storage.`;
          if (!window.confirm(message)) return;
          downloading = true;
          await downloader.downloadTiles(tileUrlFunction, console.log);
          downloading = false;
          alert('Downloaded tiles!');
        }}>
        ⤓
      </button>
    {:else}
      <Spinner />
    {/if}
  </Control>
{/if}
