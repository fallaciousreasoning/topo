<script lang="ts">
    import slide from "../transitions/slide";
    import { expoInOut as easing } from 'svelte/easing';
    import onMountTick from "../utils/onMountTick";

    export let page: string;
    let fragment = window.location.hash;
    $: searchParams = new URLSearchParams(fragment);
    $: currentPage = searchParams.get('page');
    
    onMountTick(() => {
        const listener =  () => fragment = window.location.hash;
        window.addEventListener('hashchange', listener);
        return () => {
            window.removeEventListener('hashchange', listener);
        }
    })
</script>

{#if currentPage === page}
    <div
        transition:slide={{ easing }}
        class="bg-background p-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0">
        <slot />
    </div>
{/if}
