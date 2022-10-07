<script lang="ts">
    import { Interaction } from "ol/interaction"
    import { createEventDispatcher } from "svelte/types/runtime/internal/lifecycle"
    import { getOlContext } from "./Map.svelte"

    export let interaction: Interaction;
    let oldInteraction: Interaction;


    const { map } = getOlContext();

    $: {
        if (oldInteraction) {
            map.removeInteraction(oldInteraction);
        }

        map.addInteraction(interaction);
        oldInteraction = interaction;
    }
</script>
