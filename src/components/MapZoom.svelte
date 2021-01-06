<script lang="ts">
    import { getOlContext } from "../ol/Map.svelte";
    import MapControl from "./MapControl.svelte";

    const { map } = getOlContext();
    const adjustZoom = (delta: number) => {
        const view = map.getView();
        view.animate({ zoom: view.getZoom() + delta, duration: 250 });
    };
</script>

<MapControl>
    <div class="flex flex-col">
        <button
            class="map-button rounded-b-none"
            on:click={(e) => adjustZoom(1)}>+</button>
        <button
            class="map-button border-t border-gray-300 rounded-t-none"
            on:click={(e) => adjustZoom(-1)}>-</button>
    </div>
</MapControl>
