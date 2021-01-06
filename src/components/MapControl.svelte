<script lang="ts">
    import Control from "../ol/Control.svelte";
</script>

<Control>
    <div class="bg-background w-11 border-foreground text-foreground shadow text-sm font-medium rounded">
        <slot/>
    </div>
</Control>
