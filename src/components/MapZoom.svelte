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
            class="w-full py-2 px-4 hover:bg-background-hover focus:outline-none ease-in rounded-t button"
            on:click={(e) => adjustZoom(1)}>+</button>
        <button
            class="w-full py-2 px-4 hover:bg-background-hover focus:outline-none ease-in rounded-b border-t button"
            on:click={(e) => adjustZoom(-1)}>-</button>
    </div>
</MapControl>
