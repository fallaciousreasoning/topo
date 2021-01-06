<script lang="ts">
    import Control from "../ol/Control.svelte";

    let clazz;
    export { clazz as class };
</script>

<Control>
    <button
        on:click
        class={`w-11 py-2 px-4 bg-background hover:bg-background-hover focus:outline-none ease-in border-foreground text-foreground shadow text-sm font-medium rounded button ${clazz}`}>
        <slot />
    </button>
</Control>
