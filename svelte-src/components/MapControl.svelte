<script lang="ts">
    import Control from "../ol/Control.svelte";

    export let position: 'topleft' | 'topright' | 'bottomleft' = 'topleft';
</script>

<Control position={position}>
    <div class="bg-background min-w-11 border-foreground text-foreground shadow-l text-sm font-medium rounded">
        <slot/>
    </div>
</Control>
