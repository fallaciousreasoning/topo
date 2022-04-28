<script lang="ts">
    import { getOlContext } from "../ol/Map.svelte";
    import MapControl from "./MapControl.svelte";

    const { map } = getOlContext();
    const resetRotation = () => {
        const view = map.getView();
        view.setRotation(0);
    };

    let view = map.getView();
    let rotation = view.getRotation();
    
    view.addEventListener('change:rotation', e => {
        rotation = view.getRotation();
        return false;
    })
</script>

{#if rotation != 0}
    <MapControl position="topright">
        <div class="flex flex-col">
            <button class="map-button" on:click={resetRotation}>
                <div style={`transform:rotate(${rotation + Math.PI/2}rad); transform-origin:center`}>⥷</div>
            </button>
        </div>
    </MapControl>
{/if}
