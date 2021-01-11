<script lang="ts">
    export let checked = false;
    export let label: string;
</script>

<label>
    <input type="checkbox" bind:checked on:change>
    {label}
</label>