<script lang="ts">
    import { preventDefault } from "ol/events/Event";

    import BaseLayer from "ol/layer/Base";

    import { getOlContext } from "../ol/Map.svelte";
    import Button from "./Button.svelte";
    import MapControl from "./MapControl.svelte";

    const { map } = getOlContext();
    let open = false;

    let layers: BaseLayer[] = map
        .getLayers()
        .getArray()
        .reduce(
            (prev, next) => [
                ...prev,
                ...[
                    next.get("type") === "base" && next,
                    ...next.getLayersArray(),
                ].filter((l) => l),
            ],
            []
        );
    let selectedBaseLayer = layers.findIndex(l => l.get('visible'));
    $: {
        for (const baseLayer of layers)
            baseLayer.set("visible", false);
        layers[selectedBaseLayer].set("visible", true);
    }
</script>

<MapControl position="topright">
    <button class="map-button" on:click={(e) => (open = !open)}>
        <span class="-ml-1">↔️</span>
    </button>
    {#if open}
        <div class="w-52 bg-background py-2 px-4 rounded-b">
            <h4 class="text-foreground font-bold">Base Maps</h4>
            {#each layers as layer, index}
                <div>
                    <label>
                        <input type="radio" bind:group={selectedBaseLayer} value={index}/>
                        {layer.get('title')}
                    </label>
                </div>
            {/each}
        </div>
    {/if}
</MapControl>
