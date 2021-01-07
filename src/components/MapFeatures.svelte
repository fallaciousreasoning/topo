<script lang="ts">
    import { all } from "ol/events/condition";

    import { preventDefault } from "ol/events/Event";

    import BaseLayer from "ol/layer/Base";
    import Layer from "ol/layer/Layer";
    import { get } from "ol/proj";
    import LayerGroup from "ol/layer/Group";

    import { getOlContext } from "../ol/Map.svelte";
    import Button from "./Button.svelte";
    import MapControl from "./MapControl.svelte";
import { key } from "localforage";

    const { map } = getOlContext();
    let open = true;

    const getAllLayers = (): BaseLayer[] =>
        map
            .getLayers()
            .getArray()
            .reduce(
                (prev, next) => [
                    ...prev,
                    ...[next, ...next.getLayersArray()].filter((l) => l),
                ],
                []
            )
            .filter((l) => l.get("title"));
    let allLayers = getAllLayers();
    map.getLayers().on("change", () => (allLayers = getAllLayers()));
    $: {
        for (const layer of allLayers) {
            layer.once("change", () => (allLayers = getAllLayers()));
        }
    }

    const noGroups = (layers: BaseLayer[]) => layers.filter(l => !(l instanceof LayerGroup));

    const getLayersOfType = (type: "base" | "feature") =>
        allLayers
            .filter((l) => !(l instanceof LayerGroup))
            .filter((l) => {
                const layerType = l.get("type");
                if (type === "base") return layerType === type;
                return layerType !== "base";
            });

    let baseLayers = noGroups(allLayers).filter(l => l.get('type') === "base");
    let selectedBaseLayer = baseLayers.findIndex((l) => l.get("visible"));
    $: {
        // Handle selecting a different base layer.
        for (const baseLayer of baseLayers) baseLayer.set("visible", false);
        baseLayers[selectedBaseLayer].set("visible", true);
    }

    $: featureLayers = noGroups(allLayers).filter(l => l.get('type') !== 'base');
</script>

<MapControl position="topright">
    <button class="map-button" on:click={(e) => (open = !open)}>
        <span class="-ml-1">↔️</span>
    </button>
    {#if open}
        <div class="w-52 bg-background py-2 px-4 rounded-b">
            <h4 class="text-foreground font-bold">Base Maps</h4>
            {#each baseLayers as layer, index}
                <div>
                    <label>
                        <input
                            type="radio"
                            bind:group={selectedBaseLayer}
                            value={index} />
                        {layer.get('title')}
                    </label>
                </div>
            {/each}
            <div class="w-auto border-t border-foreground my-2" />
            <h4 class="text-foreground font-bold">Features</h4>
            {#each featureLayers as layer}
                <div>
                    <label>
                        <input
                            type="checkbox"
                            checked={layer.get('visible')}
                            on:change={(e) => {
                                layer.set('visible', e.target['checked']);
                            }} />
                        {layer.get('title')}
                    </label>
                </div>
            {/each}
        </div>
    {/if}
</MapControl>
