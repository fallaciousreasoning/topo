<script lang="ts">
    import slide from "../transitions/slide";
    import { expoInOut as easing } from 'svelte/easing';
    import fragment from '../stores/fragment';

    export let page: string;
    $: currentPage = $fragment.page;
</script>

{#if currentPage === page}
    <div
        transition:slide={{ easing }}
        class="bg-background p-2 z-20 shadow h-screen max-w-md w-screen absolute left-0 top-0">
        <slot />
    </div>
{/if}
