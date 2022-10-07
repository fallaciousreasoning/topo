<script lang="ts">
    let clazz = '';
    export { clazz as class };
</script>

<button
    on:click
    class={`z-10 py-2 px-4 text-sm font-medium relative overflow-hidden text-white duration-200 ease-in bg-primary hover:bg-primary-hover hover:elevation-5 elevation-3 rounded button ${clazz}`}>
    <slot/>
</button>
