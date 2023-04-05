<script lang="ts">
    import { Route } from '../../stores/mountains'
    export let route: Route;
</script>

<div class="w-full bg-white shadow-md rounded overflow-hidden">
    {#if route.image}
        <img class="max-h-64 w-full object-cover object-top" src={route.image} />
    {/if}
    <div class="p-2">
        <h3 class="font-bold text-lg">
        <span class="grade">{route.grade}</span> {route.name} ({route.length})</h3>
        <div>
        {route.description}
        </div>
    </div>
</div>
  