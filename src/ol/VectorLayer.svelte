<script lang="ts">
  import { getOlContext } from "./Map.svelte";
  import { createEventDispatcher, onMount, setContext } from "svelte";
  import VectorLayer from "ol/layer/Vector";
  import VectorSource from "ol/source/Vector";
  import { Feature } from "ol";
  import type { StyleLike } from "ol/style/Style";
  import { click } from "ol/events/condition";
import onMountTick from "../utils/onMountTick";

  export let source = new VectorSource({ features: [] });
  export let style: StyleLike = undefined;
  export let title: string = undefined;
  export let visible: boolean = true;

  const dispatch = createEventDispatcher();
  const { addLayer, removeLayer, getMap } = getOlContext();

  const layer = new VectorLayer({
    source,
    updateWhileAnimating: true,
    updateWhileInteracting: true,
    style,
    ["title" as any]: title,
    visible,
  });

  const featureClickHandler = (event) => {
    event.map.forEachFeatureAtPixel(event.pixel, (feature, clickedLayer) => {
      if (layer !== clickedLayer) return;
      dispatch("featureClick", {
        feature: feature,
        layer: clickedLayer,
      });
    });
  };

  onMountTick(() => {
    const map = getMap();
    const handler = map.on("click", featureClickHandler);

    addLayer(layer);
    return () => {
      map.un("click", featureClickHandler);
      removeLayer(layer);
    };
  });

  setContext("vector-layer", {
    addFeature: (feature: Feature) => source.addFeature(feature),
    removeFeature: (feature: Feature) => source.removeFeature(feature),
  });
</script>

<slot />
