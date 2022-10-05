<script lang="ts">
    import Route from "./Route.svelte"
    import slide from "../transitions/slide";
    import { expoInOut as easing } from 'svelte/easing';
    import fragment from "../stores/fragment";

    export let page: string;
    export let title = '';
    export let closable = true;
</script>

<Route path={page}>
    <div
        transition:slide={{ easing }}
        class="bg-gray-100 px-4 py-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0">
        <h2 class="font-semibold text-lg">
            {#if closable}
                <button on:click={e => $fragment.page = null}>☰</button>
            {/if}
            {title}
        </h2>
        <slot />
    </div>
</Route>
