<script lang="ts">
import { linzTopo } from "../layers/layerDefinitions";

  import { getOlContext } from "../ol/Map.svelte";
  import { friendlyBytes } from "../utils/bytes";
  import onMountTick from "../utils/onMountTick";
  import { TileDownloader } from "../utils/tileDownloader";
  import MapControl from "./MapControl.svelte";
  import Spinner from "./Spinner.svelte";

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
  <MapControl>
    {#if !downloading}
      <button
        class="map-button"
        on:click={async () => {
          const view = map.getView();
          const extent = view.calculateExtent();
          const downloader = new TileDownloader(extent, view.getZoom());
          const message = `Would you like to download tiles?\nThis will use approximately ${friendlyBytes(downloader.estimatedSize())} of storage.`;
          if (!window.confirm(message)) return;
          downloading = true;
          await downloader.downloadTiles(linzTopo.url, console.log);
          downloading = false;
          alert('Downloaded tiles!');
        }}>
        ⤓
      </button>
    {:else}
      <div class="w-11">
        <Spinner />
      </div>
    {/if}
  </MapControl>
{/if}
