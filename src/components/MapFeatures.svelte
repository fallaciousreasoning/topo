<script lang="ts">
import { getOlContext } from "../ol/Map.svelte";
import Button from "./Button.svelte";
import MapControl from "./MapControl.svelte";

    const { map } = getOlContext();
</script>

<MapControl position="topright">
    <button class="map-button">
        <span class="-ml-1">↔️</span>
    </button>
</MapControl>