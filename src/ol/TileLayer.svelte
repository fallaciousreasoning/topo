<script lang="ts">
  import { onMount, onDestroy, getContext } from "svelte";
  import { Tile, XYZ } from "ol/source";
  import TileLayer from "ol/layer/Tile";
  import LayerGroup from "ol/layer/Group";
import { getOlContext } from "./Map.svelte";

  export let title: string = "";
  export let type: "base" | undefined = undefined;
  export let source: Tile | string;
  export let visible: boolean = true;
  export let opacity = 1;

  const { addLayer, removeLayer } = getOlContext();
  const layer = new TileLayer({
    ["title" as any]: title,
    ["type" as any]: type,
    ["visible" as any]: visible,
    opacity,
    source: typeof source === "string" ? new XYZ({ url: source }) : source,
  });

  onMount(() => {
    addLayer(layer);
    return () => removeLayer(layer);
  });
</script>
