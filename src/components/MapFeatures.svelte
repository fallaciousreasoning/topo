<script lang="ts">
    import BaseLayer from "ol/layer/Base";
    import LayerGroup from "ol/layer/Group";
    import { onMount } from "svelte";
    import { getOlContext } from "../ol/Map.svelte";
    import MapControl from "./MapControl.svelte";
    import grow from "../transitions/grow";
    import fragment from "../stores/fragment";

    const { map } = getOlContext();
    let open = false;

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
    // Handle layers changing.
    map.getLayers().on("change", () => (allLayers = getAllLayers()));
    $: {
        for (const layer of allLayers) {
            layer.once("change", () => (allLayers = getAllLayers()));
        }
    }

    $: nonGroupLayers = allLayers.filter((l) => !(l instanceof LayerGroup));

    $: baseLayers = nonGroupLayers.filter((l) => l.get("type") === "base");
    // let selectedBaseLayer = $fragment.baseLayer;
    // fragment.subscribe((s) => (selectedBaseLayer = $fragment.baseLayer));
    $: {
        // Handle selecting a different base layer.
        for (const baseLayer of baseLayers) baseLayer.set("visible", false);
        baseLayers[$fragment.baseLayer].set("visible", true);
    }

    $: featureLayers = nonGroupLayers.filter((l) => l.get("type") !== "base");
    $: canSelectAllFeatures = featureLayers.find((l) => !l.get("visible"));
    $: canSelectNoFeatures = featureLayers.find((l) => l.get("visible"));
    const toggleAllFeatures = (visible: boolean) =>
        featureLayers.forEach((l) => l.set("visible", visible));
</script>

<MapControl position="topright">
    <div
        class="shadow rounded"
        on:mouseenter={(e) => (open = true)}
        on:mouseleave={(e) => (open = false)}>
        <button class="map-button"> <span class="-ml-1">↔️</span> </button>
        {#if open}
            <div
                transition:grow
                class="flex overflow-hidden w-52 bg-background py-2 px-4 rounded-b">
                <div class="flex-shrink-0">
                    <h4 class="text-foreground font-bold">Base Maps</h4>
                    {#each baseLayers as layer, index}
                        <div>
                            <label>
                                <input
                                    type="radio"
                                    bind:group={$fragment.baseLayer}
                                    value={index} />
                                {layer.get('title')}
                            </label>
                        </div>
                    {/each}
                    <div class="w-auto border-t border-foreground my-2" />
                    <h4 class="text-foreground font-bold">
                        Features
                        {#if canSelectAllFeatures}
                            <button
                                class="appearance-none text-blue-500 active:text-blue-400 hover:underline focus:outline-none"
                                on:click={() => toggleAllFeatures(true)}>
                                All
                            </button>
                        {/if}
                        {#if canSelectNoFeatures}
                            <button
                                class="appearance-none text-blue-500 active:text-blue-400 hover:underline focus:outline-none"
                                on:click={() => toggleAllFeatures(false)}>
                                None
                            </button>
                        {/if}
                    </h4>
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
            </div>
        {/if}
    </div>
</MapControl>
