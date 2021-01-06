<script lang="ts">
    import Button from "./Button.svelte";
    import Control from "../ol/Control.svelte";
    import { getOlContext } from "../ol/Map.svelte";

    const { map } = getOlContext();
    const adjustZoom = (delta: number) => {
        const view = map.getView();
        view.animate({ zoom: view.getZoom() + delta, duration: 250 });
    };
</script>

<Control>
    <div class="bg-gray-300 shadow text-sm font-medium rounded button flex flex-col">
        <button
            class="py-2 px-4 hover:bg-purple-600 ease-in rounded-t"
            on:click={(e) => adjustZoom(1)}>+</button>
        <button class="py-2 px-4 hover:bg-purple-600 ease-in rounded-b border-t"
            on:click={e => adjustZoom(-1)}>-</button>
    </div>
</Control>
