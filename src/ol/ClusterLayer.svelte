<script lang="ts">
  import VectorSource from "ol/source/Vector";
  import Feature from "ol/Feature";
  import { getOlContext } from "../ol/Map.svelte";

  import VectorLayer from "../ol/VectorLayer.svelte";
  import onMountTick from "../utils/onMountTick";
  import { Cluster } from "ol/source";
  import type { StyleLike } from "ol/style/Style";

  export let distance = 50;
  export let features: Feature[];
  export let style: StyleLike = undefined;
  export let title: string = undefined;
  export let visible: boolean = true;

  const { getMap } = getOlContext();

  const clusters = new Cluster({
    distance,
    source: new VectorSource({
      features,
    }),
  });
</script>

<VectorLayer source={clusters} {style} {title} {visible} />
