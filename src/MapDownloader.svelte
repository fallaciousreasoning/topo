<script lang="ts">
  import Control from "./ol/Control.svelte";
  import { getOlContext } from "./ol/Map.svelte";
  import { TileDownloader } from "./utils/tileDownloader";
  const { getMap } = getOlContext();
</script>

<Control control>
  <button
    on:click={() => {
      const view = getMap().getView();
      const extent = view.calculateExtent();
      const downloader = new TileDownloader(extent, view.getZoom());

      const message = `Would you like to download tiles?\nThis will use approximately ${downloader.estimatedSize()} bytes of storage.`
      if (!window.confirm(message)) return;

      // downloader.downloadTiles()
    }}>
    ⤓
  </button>
</Control>
